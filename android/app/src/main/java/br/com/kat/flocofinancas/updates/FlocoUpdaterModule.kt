package br.com.kat.flocofinancas.updates

import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class FlocoUpdaterModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val executor=Executors.newSingleThreadExecutor()
  private val busy=AtomicBoolean(false)
  private val apk: File get()=File(context.cacheDir,"updates/Floco-Financas.apk")
  override fun getName()="FlocoUpdater"
  private fun digest(bytes: ByteArray)=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
  @Suppress("DEPRECATION")
  private fun signatures(info: PackageInfo): Set<String> = if(Build.VERSION.SDK_INT>=28) info.signingInfo?.apkContentsSigners?.map{digest(it.toByteArray())}?.toSet()?:emptySet() else info.signatures?.map{digest(it.toByteArray())}?.toSet()?:emptySet()
  @Suppress("DEPRECATION")
  private fun verify(file: File, mustBeNew: Boolean=true) {
    val flags=if(Build.VERSION.SDK_INT>=28) PackageManager.GET_SIGNING_CERTIFICATES else PackageManager.GET_SIGNATURES
    val archive=context.packageManager.getPackageArchiveInfo(file.absolutePath,flags)?:throw Exception("O arquivo baixado não é um APK válido.")
    val current=context.packageManager.getPackageInfo(context.packageName,flags)
    if(archive.packageName!=context.packageName)throw Exception("O APK pertence a outro aplicativo.")
    if(signatures(archive).isEmpty()||signatures(archive)!=signatures(current))throw Exception("A assinatura do APK não corresponde à instalação atual.")
    val nextVersion=if(Build.VERSION.SDK_INT>=28)archive.longVersionCode else archive.versionCode.toLong()
    val currentVersion=if(Build.VERSION.SDK_INT>=28)current.longVersionCode else current.versionCode.toLong()
    if(mustBeNew&&nextVersion<=currentVersion)throw Exception("O APK não é mais recente que a versão instalada.")
  }
  @ReactMethod fun canInstall(promise: Promise) { promise.resolve(Build.VERSION.SDK_INT<26||context.packageManager.canRequestPackageInstalls()) }
  @ReactMethod fun openInstallSettings(promise: Promise) { try { if(Build.VERSION.SDK_INT>=26)context.startActivity(Intent("android.settings.MANAGE_UNKNOWN_APP_SOURCES",Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));promise.resolve(null) }catch(e: Exception){promise.reject("INSTALL_PERMISSION","Abra as configurações do Android e permita instalações para o Floco Finanças.")} }
  @ReactMethod fun download(version: String,expectedHash: String,expectedSize: Double,promise: Promise){
    if(!busy.compareAndSet(false,true)){promise.reject("BUSY","Um download já está em andamento.");return}
    executor.execute {
      val partial=File(apk.parentFile,"download.part")
      try {
        if(!Regex("^v?[0-9]+[.][0-9]+[.][0-9]+$").matches(version)||!Regex("^[a-f0-9]{64}$").matches(expectedHash)||expectedSize<=0||expectedSize>250*1024*1024)throw Exception("Metadados da atualização inválidos.")
        var url=URL("https://github.com/katsuuzin/floco-financas/releases/download/$version/Floco-Financas.apk")
        var connection: HttpURLConnection?=null
        for(attempt in 0..5){
          if(url.protocol!="https"||!(url.host=="api.github.com"||url.host=="github.com"||url.host.endsWith(".githubusercontent.com")))throw Exception("O GitHub redirecionou para uma origem não permitida.")
          val current=(url.openConnection() as HttpURLConnection).apply{instanceFollowRedirects=false;connectTimeout=20000;readTimeout=60000;setRequestProperty("Accept","application/octet-stream");setRequestProperty("User-Agent","Floco-Financas-Android")}
          val code=current.responseCode
          if(code in listOf(301,302,303,307,308)){val location=current.getHeaderField("Location")?:throw Exception("Redirecionamento inválido.");current.disconnect();url=URL(url,location);continue}
          if(code!=200){current.disconnect();throw Exception("O download não está disponível (HTTP $code). Tente novamente mais tarde.")}
          connection=current;break
        }
        val active=connection?:throw Exception("Excesso de redirecionamentos no download.")
        apk.parentFile?.mkdirs()
        val hash=MessageDigest.getInstance("SHA-256");var received=0L;var lastProgress=-1
        try{active.inputStream.use{input->partial.outputStream().use{output->val buffer=ByteArray(65536);while(true){val count=input.read(buffer);if(count<0)break;received+=count;if(received>expectedSize.toLong())throw Exception("O tamanho do arquivo não corresponde à release.");hash.update(buffer,0,count);output.write(buffer,0,count);val progress=(received*100/expectedSize.toLong()).toInt();if(progress!=lastProgress){lastProgress=progress;context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("FlocoUpdateProgress",progress)}}}}}finally{active.disconnect()}
        if(received!=expectedSize.toLong()||hash.digest().joinToString(""){"%02x".format(it)}!=expectedHash)throw Exception("A verificação SHA-256 falhou. O APK não será instalado.")
        verify(partial)
        if(apk.exists()&&!apk.delete())throw Exception("Não foi possível substituir o download anterior.")
        if(!partial.renameTo(apk))throw Exception("Não foi possível finalizar o download.")
        promise.resolve(true)
      }catch(e: Exception){partial.delete();promise.reject("UPDATE_DOWNLOAD",if(e is java.io.IOException)"Falha de conexão ao baixar a atualização. Tente novamente." else e.message?:"Não foi possível verificar a atualização.")}finally{busy.set(false)}
    }
  }
  @ReactMethod fun install(promise: Promise){try{
    if(!apk.isFile)throw Exception("Baixe a atualização antes de instalar.")
    verify(apk)
    if(Build.VERSION.SDK_INT>=26&&!context.packageManager.canRequestPackageInstalls())throw Exception("Permita instalações para o Floco Finanças nas configurações do Android.")
    val uri=FileProvider.getUriForFile(context,"${context.packageName}.updates",apk)
    context.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
    promise.resolve(null)
  }catch(e: Exception){promise.reject("INSTALL_UPDATE",e.message?:"Não foi possível abrir o instalador do Android.")}}
}
