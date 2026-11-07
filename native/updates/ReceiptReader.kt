package br.com.kat.flocofinancas.updates

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.pdf.PdfRenderer
import android.media.ExifInterface
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.MediaStore
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.File
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class ReceiptReader(private val context:ReactApplicationContext):ReactContextBaseJavaModule(context){
 private val worker=Executors.newSingleThreadExecutor()
 private val busy=AtomicBoolean(false)
 private var cameraPromise:Promise?=null
 private var cameraFile:File?=null
 override fun getName()="FlocoReceiptReader"
 init{context.addActivityEventListener(object:BaseActivityEventListener(){override fun onActivityResult(activity:Activity,requestCode:Int,resultCode:Int,data:Intent?){if(requestCode!=7321)return;val p=cameraPromise?:return;cameraPromise=null;val file=cameraFile;cameraFile=null;if(resultCode!=Activity.RESULT_OK||file==null){file?.delete();p.resolve(null);return};read(Uri.fromFile(file),p,file)}})}
 @ReactMethod fun camera(p:Promise){try{if(cameraPromise!=null||busy.get())throw Exception("Já há uma leitura em andamento.");val activity=context.currentActivity?:throw Exception("Abra o aplicativo para usar a câmera.");val file=File(context.cacheDir,"updates/receipt-${System.currentTimeMillis()}.jpg");file.parentFile?.mkdirs();val uri=FileProvider.getUriForFile(context,"${context.packageName}.updates",file);val intent=Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT,uri).addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION);cameraPromise=p;cameraFile=file;activity.startActivityForResult(intent,7321)}catch(e:Exception){cameraPromise=null;cameraFile?.delete();cameraFile=null;p.reject("CAMERA",e.message?:"Câmera indisponível.")}}
 @ReactMethod fun recognize(uri:String,p:Promise){if(!uri.startsWith("content://")&&!uri.startsWith("file://")){p.reject("URI","Arquivo inválido.");return};read(Uri.parse(uri),p,null)}
 private fun read(uri:Uri,p:Promise,temporary:File?){
  if(!busy.compareAndSet(false,true)){p.reject("BUSY","Já há uma leitura em andamento.");return}
  worker.execute{
   val file=File(context.cacheDir,"receipt-input-${System.nanoTime()}")
   val reader=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
   try{
    context.contentResolver.openInputStream(uri)?.use{input->file.outputStream().use{out->val b=ByteArray(65536);var size=0;while(true){val n=input.read(b);if(n<0)break;size+=n;if(size>20*1024*1024)throw Exception("Limite de 20 MB por comprovante.");out.write(b,0,n)}}}?:throw Exception("Não foi possível abrir o arquivo.")
    val header=file.inputStream().use{val b=ByteArray(5);it.read(b);String(b)}
    val text=StringBuilder()
    if(header=="%PDF-"){
     ParcelFileDescriptor.open(file,ParcelFileDescriptor.MODE_READ_ONLY).use{descriptor->PdfRenderer(descriptor).use{pdf->
      if(pdf.pageCount>15)throw Exception("Selecione um PDF com até 15 páginas.")
      for(i in 0 until pdf.pageCount){pdf.openPage(i).use{page->val scale=2000.0/maxOf(page.width,page.height);val bitmap=Bitmap.createBitmap(maxOf(1,(page.width*scale).toInt()),maxOf(1,(page.height*scale).toInt()),Bitmap.Config.ARGB_8888);try{bitmap.eraseColor(android.graphics.Color.WHITE);page.render(bitmap,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);text.append(Tasks.await(reader.process(InputImage.fromBitmap(bitmap,0)),60,TimeUnit.SECONDS).text).append("\n\n")}finally{bitmap.recycle()}}}
     }}
    }else{
     val options=BitmapFactory.Options().apply{inJustDecodeBounds=true};BitmapFactory.decodeFile(file.absolutePath,options)
     if(options.outWidth<=0)throw Exception("Imagem não reconhecida.");var sample=1;while(options.outWidth.toLong()*options.outHeight/(sample*sample)>4000000)sample*=2
     val original=BitmapFactory.decodeFile(file.absolutePath,BitmapFactory.Options().apply{inSampleSize=sample})?:throw Exception("Imagem inválida.")
     try{val orientation=try{ExifInterface(file.absolutePath).getAttributeInt(ExifInterface.TAG_ORIENTATION,1)}catch(_:Exception){1};val rotation=when(orientation){6->90;3->180;8->270;else->0};text.append(Tasks.await(reader.process(InputImage.fromBitmap(original,rotation)),60,TimeUnit.SECONDS).text)}finally{original.recycle()}
    }
    if(text.isBlank())throw Exception("Nenhum texto legível. Tente uma imagem mais nítida.");if(text.length>500000)throw Exception("Documento muito extenso.");p.resolve(text.toString())
   }catch(e:Exception){p.reject("OCR",e.message?:"Não foi possível ler o comprovante.")}finally{reader.close();file.delete();temporary?.delete();busy.set(false)}
  }
 }
}
