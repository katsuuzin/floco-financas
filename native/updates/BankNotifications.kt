package br.com.kat.flocofinancas.updates

import android.app.Notification
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.*
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest

object BankInbox {
  val banks = mapOf("com.nu.production" to "Nubank", "br.com.intermedium" to "Inter")
  fun prefs(c:Context)=c.getSharedPreferences("floco.bank-inbox",Context.MODE_PRIVATE)
  @Synchronized fun pending(c:Context)=JSONArray(prefs(c).getString("pending","[]"))
  @Synchronized fun acknowledge(c:Context,id:String){val rows=pending(c);val next=JSONArray();for(i in 0 until rows.length()){val row=rows.getJSONObject(i);if(row.getString("id")!=id)next.put(row)};check(prefs(c).edit().putString("pending",next.toString()).commit())}
  @Synchronized fun capture(c:Context,s:StatusBarNotification){
    val p=prefs(c)
    if(!p.getBoolean("enabled",false)||!banks.containsKey(s.packageName))return
    val n=s.notification
    if((n.flags and Notification.FLAG_GROUP_SUMMARY)!=0||(n.flags and Notification.FLAG_ONGOING_EVENT)!=0)return
    val title=n.extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val text=(n.extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?:n.extras.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()
    val content=(title+" "+text).take(2000)
    if(!content.contains("R$",true)||Regex("(?i)c[oó]digo|senha|token|verifica[çc][aã]o|autentica[çc][aã]o").containsMatchIn(content))return
    if(!Regex("(?i)compra|pagamento|pix|transfer[eê]ncia|recebid|enviad|d[eé]bito").containsMatchIn(content))return
    val id=MessageDigest.getInstance("SHA-256").digest((s.key+":"+s.postTime).toByteArray()).joinToString(""){"%02x".format(it)}
    val seen=JSONArray(p.getString("seen","[]"));for(i in 0 until seen.length())if(seen.getString(i)==id)return
    val rows=pending(c)
    if(rows.length()>=500){p.edit().putInt("overflow",p.getInt("overflow",0)+1).commit();return}
    rows.put(JSONObject().put("id",id).put("packageName",s.packageName).put("bank",banks[s.packageName]).put("title",title.take(250)).put("text",text.take(1750)).put("postedAt",s.postTime))
    val nextSeen=JSONArray();for(i in maxOf(0,seen.length()-1998) until seen.length())nextSeen.put(seen.getString(i));nextSeen.put(id)
    check(p.edit().putString("pending",rows.toString()).putString("seen",nextSeen.toString()).putLong("lastCapture",System.currentTimeMillis()).commit())
  }
}
class BankNotificationListener:NotificationListenerService(){
  override fun onNotificationPosted(sbn:StatusBarNotification){try{BankInbox.capture(this,sbn)}catch(_:Exception){BankInbox.prefs(this).edit().putBoolean("storageError",true).apply()}}
}
class BankNotificationsModule(private val context:ReactApplicationContext):ReactContextBaseJavaModule(context){
  override fun getName()="FlocoBankNotifications"
  @ReactMethod fun status(p:Promise){try{val prefs=BankInbox.prefs(context);val result=Arguments.createMap();result.putBoolean("permission",NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName));result.putBoolean("enabled",prefs.getBoolean("enabled",false));result.putDouble("lastCapture",prefs.getLong("lastCapture",0).toDouble());result.putInt("overflow",prefs.getInt("overflow",0));result.putBoolean("storageError",prefs.getBoolean("storageError",false));result.putString("pending",BankInbox.pending(context).toString());p.resolve(result)}catch(e:Exception){p.reject("INBOX",e)}}
  @ReactMethod fun setEnabled(enabled:Boolean,p:Promise){if(BankInbox.prefs(context).edit().putBoolean("enabled",enabled).commit())p.resolve(null)else p.reject("STORAGE","Não foi possível salvar a preferência.")}
  @ReactMethod fun openSettings(p:Promise){try{context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));p.resolve(null)}catch(e:Exception){p.reject("SETTINGS",e)}}
  @ReactMethod fun acknowledge(id:String,p:Promise){try{BankInbox.acknowledge(context,id);p.resolve(null)}catch(e:Exception){p.reject("STORAGE",e)}}
}
