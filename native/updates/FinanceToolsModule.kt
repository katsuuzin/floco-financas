package br.com.kat.flocofinancas.updates
import android.content.Context
import android.os.Build
import android.util.Base64
import android.webkit.WebView
import android.webkit.WebViewClient
import android.print.PrintManager
import android.print.PrintDocumentAdapter
import android.print.PrintAttributes
import android.print.PageRange
import android.print.PrintDocumentInfo
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import com.facebook.react.bridge.*
import org.json.JSONObject
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.concurrent.Executors
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import javax.crypto.spec.GCMParameterSpec

class FinanceToolsModule(private val context:ReactApplicationContext):ReactContextBaseJavaModule(context){
 private val executor=Executors.newSingleThreadExecutor()
 override fun getName()="FlocoFinanceTools"
 private fun b64(b:ByteArray)=Base64.encodeToString(b,Base64.NO_WRAP)
 private fun bytes(s:String)=Base64.decode(s,Base64.NO_WRAP)
 private fun key(password:String,salt:ByteArray,kdf:String,iterations:Int):ByteArray{val spec=PBEKeySpec(password.toCharArray(),salt,iterations,256);return try{SecretKeyFactory.getInstance(kdf).generateSecret(spec).encoded}finally{spec.clearPassword()}}
 @ReactMethod fun encrypt(plain:String,password:String,p:Promise){executor.execute{try{if(password.length<12)throw Exception("Use uma senha com pelo menos 12 caracteres.");if(plain.length>20000000)throw Exception("Backup acima de 20 MB.");val random=SecureRandom();val salt=ByteArray(16).also{random.nextBytes(it)};val iv=ByteArray(12).also{random.nextBytes(it)};val kdf=if(Build.VERSION.SDK_INT>=26)"PBKDF2WithHmacSHA256" else "PBKDF2WithHmacSHA1";val derived=key(password,salt,kdf,600000);try{val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,SecretKeySpec(derived,"AES"),GCMParameterSpec(128,iv));val encrypted=cipher.doFinal(plain.toByteArray(Charsets.UTF_8));p.resolve(JSONObject().put("format","floco-encrypted").put("version",1).put("kdf",kdf).put("iterations",600000).put("salt",b64(salt)).put("iv",b64(iv)).put("data",b64(encrypted)).toString())}finally{derived.fill(0)}}catch(e:Exception){p.reject("ENCRYPT",e.message?:"Não foi possível criptografar.")}}}
 @ReactMethod fun decrypt(raw:String,password:String,p:Promise){executor.execute{try{if(raw.length>30000000)throw Exception("Arquivo acima do limite.");val obj=JSONObject(raw);val kdf=obj.getString("kdf");val iterations=obj.getInt("iterations");if(obj.getString("format")!="floco-encrypted"||obj.getInt("version")!=1||kdf !in listOf("PBKDF2WithHmacSHA256","PBKDF2WithHmacSHA1")||iterations !in 100000..2000000)throw Exception("Formato de backup inválido.");val salt=bytes(obj.getString("salt"));val iv=bytes(obj.getString("iv"));if(salt.size!=16||iv.size!=12)throw Exception("Backup inválido.");val derived=key(password,salt,kdf,iterations);try{val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,SecretKeySpec(derived,"AES"),GCMParameterSpec(128,iv));p.resolve(String(cipher.doFinal(bytes(obj.getString("data"))),Charsets.UTF_8))}finally{derived.fill(0)}}catch(_:Exception){p.reject("DECRYPT","Senha incorreta, arquivo danificado ou formato incompatível.")}}}
 private fun prefs()=context.getSharedPreferences("floco.pin",Context.MODE_PRIVATE)
 @ReactMethod fun pinStatus(p:Promise){val result=Arguments.createMap();result.putBoolean("enabled",prefs().contains("hash"));p.resolve(result)}
 private fun pinMatches(pin:String):Boolean{val prefs=prefs();if(!prefs.contains("hash"))return false;val until=prefs.getLong("until",0);if(System.currentTimeMillis()<until)throw Exception("Muitas tentativas. Aguarde um minuto.");val salt=bytes(prefs.getString("salt","")!!);val hash=key(pin,salt,"PBKDF2WithHmacSHA1",100000);val valid=MessageDigest.isEqual(hash,bytes(prefs.getString("hash","")!!));hash.fill(0);if(valid)prefs.edit().putInt("attempts",0).putLong("until",0).commit()else{val n=prefs.getInt("attempts",0)+1;prefs.edit().putInt("attempts",if(n>=5)0 else n).putLong("until",if(n>=5)System.currentTimeMillis()+60000 else 0).commit()};return valid}
 @ReactMethod fun verifyPin(pin:String,p:Promise){executor.execute{try{p.resolve(pinMatches(pin))}catch(e:Exception){p.reject("PIN",e.message)}}}
 @ReactMethod fun setPin(old:String,next:String,p:Promise){executor.execute{try{if(prefs().contains("hash")&&!pinMatches(old))throw Exception("PIN atual incorreto.");if(next.isEmpty()){check(prefs().edit().clear().commit());p.resolve(null);return@execute};if(!Regex("^[0-9]{6,12}$").matches(next))throw Exception("Use de 6 a 12 números no PIN.");val salt=ByteArray(16).also{SecureRandom().nextBytes(it)};val hash=key(next,salt,"PBKDF2WithHmacSHA1",100000);try{check(prefs().edit().putString("salt",b64(salt)).putString("hash",b64(hash)).putInt("attempts",0).putLong("until",0).commit())}finally{hash.fill(0)};p.resolve(null)}catch(e:Exception){p.reject("PIN",e.message?:"Falha ao guardar PIN.")}}}
 @ReactMethod fun printReport(html:String,p:Promise){UiThreadUtil.runOnUiThread{try{if(html.length>2000000)throw Exception("Relatório muito grande. Reduza o período.");val activity=context.currentActivity?:throw Exception("Abra o aplicativo.");val web=WebView(activity);web.settings.javaScriptEnabled=false;web.settings.allowFileAccess=false;web.settings.allowContentAccess=false;web.settings.blockNetworkLoads=true;web.webViewClient=object:WebViewClient(){override fun onPageFinished(view:WebView,url:String){try{val manager=activity.getSystemService(Context.PRINT_SERVICE) as PrintManager;val adapter=web.createPrintDocumentAdapter("Floco Finanças");manager.print("Floco Finanças",object:PrintDocumentAdapter(){override fun onStart(){adapter.onStart()};override fun onLayout(old:PrintAttributes?,new:PrintAttributes?,signal:CancellationSignal,callback:LayoutResultCallback,extras:Bundle?){adapter.onLayout(old,new,signal,callback,extras)};override fun onWrite(pages:Array<PageRange>,destination:ParcelFileDescriptor,signal:CancellationSignal,callback:WriteResultCallback){adapter.onWrite(pages,destination,signal,callback)};override fun onFinish(){adapter.onFinish();web.destroy()}},PrintAttributes.Builder().build());p.resolve(null)}catch(e:Exception){web.destroy();p.reject("PRINT",e.message)}}};web.loadDataWithBaseURL(null,html,"text/html","UTF-8",null)}catch(e:Exception){p.reject("PRINT",e.message)}}}
}
