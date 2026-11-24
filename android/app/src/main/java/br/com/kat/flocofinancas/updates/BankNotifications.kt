package br.com.kat.flocofinancas.updates

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import br.com.kat.flocofinancas.R
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
  @Volatile var connected=false
  // Pacotes monitorados vêm do app (catálogo + escolhas do usuário). Padrão: Nubank e Inter.
  private val defaults = mapOf("com.nu.production" to "Nubank", "br.com.intermedium" to "Inter")
  private val smsApps = setOf("com.google.android.apps.messaging","com.samsung.android.messaging","com.android.mms","com.android.messaging","com.motorola.messaging","com.oneplus.mms","com.miui.mms")
  fun banks(c:Context):Map<String,String>{val raw=prefs(c).getString("packages",null)?:return defaults;return try{val o=JSONObject(raw);o.keys().asSequence().associateWith{o.getString(it)}}catch(_:Exception){defaults}}
  private fun ignored(c:Context):List<String> = try{val a=JSONArray(prefs(c).getString("ignored","[]"));(0 until a.length()).map{a.getString(it).lowercase()}.filter{it.isNotBlank()}}catch(_:Exception){emptyList()}
  private fun smsBanks(c:Context):List<String> = try{val a=JSONArray(prefs(c).getString("smsSenders","[]"));(0 until a.length()).map{a.getString(it).lowercase()}}catch(_:Exception){emptyList()}
  fun prefs(c:Context)=c.getSharedPreferences("floco.bank-inbox",Context.MODE_PRIVATE)
  @Synchronized fun pending(c:Context)=JSONArray(prefs(c).getString("pending","[]"))
  @Synchronized fun acknowledge(c:Context,id:String){try{NotificationManagerCompat.from(c).cancel(id.hashCode())}catch(_:Exception){};val rows=pending(c);val next=JSONArray();for(i in 0 until rows.length()){val row=rows.getJSONObject(i);if(row.getString("id")!=id)next.put(row)};check(prefs(c).edit().putString("pending",next.toString()).commit())}
  // Junta o texto de todos os formatos de notificação: simples, texto longo,
  // caixa de entrada (várias linhas, comum quando o banco agrupa) e conversa (app de SMS).
  // Remetente: título, título da conversa ou remetente da última mensagem (estilo conversa).
  fun senderOf(n:Notification):String{
    val e=n.extras;val parts=ArrayList<String>()
    e.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.let{parts.add(it)}
    e.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString()?.let{parts.add(it)}
    try{e.getParcelableArray(Notification.EXTRA_MESSAGES)?.lastOrNull()?.let{m->val b=m as? android.os.Bundle;b?.getCharSequence("sender")?.toString()?.let{parts.add(it)};(b?.get("sender_person") as? android.app.Person)?.name?.toString()?.let{parts.add(it)}}}catch(_:Exception){}
    return parts.filter{it.isNotBlank()}.joinToString(" ")
  }
  fun notificationText(n:Notification):String{
    val e=n.extras;val parts=LinkedHashSet<String>()
    e.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.let{parts.add(it)}
    e.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.let{parts.add(it)}
    e.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.forEach{parts.add(it.toString())}
    try{val msgs=e.getParcelableArray(Notification.EXTRA_MESSAGES);msgs?.forEach{m->(m as? android.os.Bundle)?.getCharSequence("text")?.toString()?.let{parts.add(it)}}}catch(_:Exception){}
    e.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString()?.let{parts.add(it)}
    n.tickerText?.toString()?.let{parts.add(it)}
    // Android 15+ troca conteúdo considerado sensível por um aviso; descartamos o aviso e usamos o resto.
    return parts.flatMap{it.lines()}.filter{it.isNotBlank()&&!Regex("(?i)conte[uú]do.*(sens[ií]vel|oculto)|sensitive notification content").containsMatchIn(it)}.distinct().joinToString("\n").take(1750)
  }
  // ---- Aviso do Floco: quando o banco avisa uma compra/Pix, o Floco mostra o próprio aviso.
  // Tocar abre a folha "Revisar pendência" (floco://pendencia/<id>) para confirmar a entrada ou saída.
  private const val ALERT_CHANNEL="floco-movimentos"
  private val DENIED_RE=Regex("(?i)negad|recusad|reprovad|declinad|n[aã]o\\s+(?:foi\\s+)?(?:aprovad|autorizad|conclu[ií]d|efetivad)|n[aã]o\\s+p[oô]de\\s+ser\\s+(?:conclu|realiz|process)")
  private val MONEY_RE=Regex("R\\$\\s*(\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+(?:,\\d{2})?)")
  private fun hasAny(c:String,re:String)=Regex(re).containsMatchIn(c)
  // Mesma ideia da classificação do app (notification-import.mjs), só o rótulo do aviso.
  fun kindLabel(content:String):String{
    val c=content.lowercase()
    return when{
      hasAny(c,"pix")&&hasAny(c,"recebid|recebeu|te enviou|chegou")->"Pix recebido"
      hasAny(c,"pix")&&hasAny(c,"enviad|enviou|realizad|feito|pago|pagou|transfer")->"Pix enviado"
      hasAny(c,"transfer[eê]ncia")&&hasAny(c,"recebid|recebeu")->"Transferência recebida"
      hasAny(c,"transfer[eê]ncia")->"Transferência enviada"
      hasAny(c,"boleto|conta paga|pagamento de conta")->"Pagamento de conta"
      hasAny(c,"d[eé]bito")&&hasAny(c,"compra")->"Compra no débito"
      hasAny(c,"compra|cart[aã]o|cr[eé]dito|aprovad")->"Compra no cartão"
      hasAny(c,"recebid|recebeu|dep[oó]sito|entrou|cr[eé]ditad")->"Entrada"
      else->"Saída"
    }
  }
  // Nome de quem enviou/recebeu ou do estabelecimento, quando o texto deixa claro. Vazio se não souber.
  fun counterpart(content:String):String{
    val flat=content.replace(Regex("\\s+")," ").trim()
    val patterns=listOf(
      "^(?:Pix recebido\\s*[-:]?\\s*)?([A-ZÀ-Ú][\\p{L}'. ]{2,60}?)\\s+(?i:te\\s+)?(?i:enviou)\\b",
      "\\b(?i:recebeu|recebido)\\b[^.]*?\\b(?i:de)\\s+([A-ZÀ-Ú][\\p{L}'. ]{2,60}?)(?:\\s+R\\$|[.,]|\\s+(?i:no valor)|$)",
      "\\b(?i:para|pra)\\b\\s+([A-ZÀ-Ú0-9][\\p{L}0-9'.&* -]{2,60}?)(?:\\s+R\\$|[.,]|\\s+(?i:no valor|às|as)\\b|$)",
      "\\b(?i:em|no|na)\\b\\s+([A-ZÀ-Ú0-9][\\p{L}0-9'.&* -]{1,60}?)\\s+(?i:por|no valor|de)\\s+R\\$"
    )
    for(p in patterns){val m=Regex(p).find(flat)?.groupValues?.getOrNull(1)?.trim()?.trimEnd('.',',');if(!m.isNullOrBlank()&&!m.contains("R$")&&m.lowercase()!="você"&&m.lowercase()!="voce")return m.take(60)}
    return ""
  }
  private fun ensureChannel(c:Context){
    if(Build.VERSION.SDK_INT<26)return
    val nm=c.getSystemService(NotificationManager::class.java)?:return
    if(nm.getNotificationChannel(ALERT_CHANNEL)==null){
      val ch=NotificationChannel(ALERT_CHANNEL,"Gastos e entradas detectados",NotificationManager.IMPORTANCE_HIGH)
      ch.description="Avisa quando o banco notifica uma compra, Pix ou transferência, para você confirmar no Floco."
      nm.createNotificationChannel(ch)
    }
  }
  private fun alert(c:Context,id:String,bank:String,source:String,title:String,text:String,postTime:Long){
    val p=prefs(c)
    if(!p.getBoolean("alert",true))return
    if(Build.VERSION.SDK_INT>=33&&c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return
    val content=(title+" "+text).replace(Regex("\\s+")," ").trim()
    if(DENIED_RE.containsMatchIn(content))return
    val amount=MONEY_RE.find(content)?.groupValues?.get(1)?.let{"R\$ "+it}?:return
    // Banco que avisa por app e por SMS ao mesmo tempo: mostra só um aviso (mesmo valor em até 5 min, canais diferentes).
    val recent=try{JSONArray(p.getString("recentAlerts","[]"))}catch(_:Exception){JSONArray()}
    val keep=JSONArray();var dup=false
    for(i in 0 until recent.length()){val r=recent.getJSONObject(i);if(postTime-r.getLong("t")<300000&&postTime>=r.getLong("t")){keep.put(r);if(r.getString("a")==amount&&r.getString("s")!=source)dup=true}}
    if(dup)return
    keep.put(JSONObject().put("a",amount).put("s",source).put("t",postTime))
    p.edit().putString("recentAlerts",keep.toString()).apply()
    ensureChannel(c)
    val label=kindLabel(content)
    val who=counterpart(text).ifBlank{label}
    val intent=Intent(Intent.ACTION_VIEW,Uri.parse("floco://pendencia/"+Uri.encode(id))).setPackage(c.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    val pi=PendingIntent.getActivity(c,id.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val body="$amount - $who"
    val n=NotificationCompat.Builder(c,ALERT_CHANNEL)
      .setSmallIcon(R.drawable.ic_stat_floco).setColor(0xFFFBB202.toInt())
      .setContentTitle("$label - $bank").setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText("$body\nToque para confirmar no Floco."))
      .setContentIntent(pi).setAutoCancel(true).setWhen(postTime).setShowWhen(true)
      .setCategory(NotificationCompat.CATEGORY_STATUS).setPriority(NotificationCompat.PRIORITY_HIGH).build()
    try{NotificationManagerCompat.from(c).notify(id.hashCode(),n)}catch(_:SecurityException){}
  }
  @Synchronized fun capture(c:Context,s:StatusBarNotification){
    val p=prefs(c)
    if(!p.getBoolean("enabled",true))return
    val bankMap=banks(c)
    val isSms=smsApps.contains(s.packageName)
    if(isSms&&!p.getBoolean("sms",false))return
    val seen0={reason:String->p.edit().putString("lastSeen",JSONObject().put("package",s.packageName).put("bank",bankMap[s.packageName]?:s.packageName).put("time",s.postTime).put("reason",reason).toString()).apply()}
    if(!isSms&&!bankMap.containsKey(s.packageName))return
    val n=s.notification
    if((n.flags and Notification.FLAG_GROUP_SUMMARY)!=0||(n.flags and Notification.FLAG_ONGOING_EVENT)!=0)return
    val title=n.extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val text=notificationText(n)
    val hidden=Regex("(?i)conte[uú]do.*(sens[ií]vel|oculto)|sensitive notification content").containsMatchIn(n.extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty())
    val content=(title+" "+text).take(2000)
    if(!content.contains("R$",true)){seen0(if(hidden) "o Android ocultou o conteúdo (Android 15+)" else "sem valor em R$");return}
    if(Regex("(?i)c[oó]digo|senha|token|verifica[çc][aã]o|autentica[çc][aã]o").containsMatchIn(content)){seen0("código de acesso descartado");return}
    if(!Regex("(?i)compra|pagamento|pix|transfer[eê]ncia|receb|enviad|d[eé]bito|cr[eé]dit|saque|boleto|aprovad|rendimento|rendeu|dividendo|provento|jcp|negad|recusad").containsMatchIn(content)){seen0("sem palavra de movimentação");return}
    val lower=content.lowercase()
    if(ignored(c).any{lower.contains(it)}){seen0("palavra ignorada");return}
    // SMS: só de remetentes bancários conhecidos (título da notificação = remetente).
    val smsBank=if(isSms)smsBanks(c).firstOrNull{b->val who=senderOf(n).lowercase();who.contains(b)||text.lines().any{l->l.lowercase().trimStart().startsWith(b)}} else null
    if(isSms&&smsBank==null){seen0("SMS de remetente não reconhecido");return}
    val id=MessageDigest.getInstance("SHA-256").digest((s.key+":"+s.postTime).toByteArray()).joinToString(""){"%02x".format(it)}
    seen0("capturada")
    val seen=JSONArray(p.getString("seen","[]"));for(i in 0 until seen.length())if(seen.getString(i)==id)return
    val rows=pending(c)
    if(rows.length()>=500){p.edit().putInt("overflow",p.getInt("overflow",0)+1).commit();return}
    rows.put(JSONObject().put("id",id).put("packageName",s.packageName).put("bank",if(isSms)"SMS · "+smsBank!!.uppercase() else bankMap[s.packageName]).put("source",if(isSms)"sms" else "app").put("title",title.take(250)).put("text",text.take(1750)).put("postedAt",s.postTime))
    val nextSeen=JSONArray();for(i in maxOf(0,seen.length()-1998) until seen.length())nextSeen.put(seen.getString(i));nextSeen.put(id)
    check(p.edit().putString("pending",rows.toString()).putString("seen",nextSeen.toString()).putLong("lastCapture",System.currentTimeMillis()).commit())
    try{alert(c,id,(if(isSms)"SMS · "+smsBank!!.uppercase() else bankMap[s.packageName]).orEmpty(),if(isSms)"sms" else "app",title,text,s.postTime)}catch(e:Exception){android.util.Log.e("FlocoBank","aviso falhou",e)}
  }
}
class BankNotificationListener:NotificationListenerService(){
  override fun onListenerConnected(){BankInbox.connected=true}
  override fun onListenerDisconnected(){BankInbox.connected=false;try{requestRebind(android.content.ComponentName(this,BankNotificationListener::class.java))}catch(_:Exception){}}
  override fun onNotificationPosted(sbn:StatusBarNotification){try{BankInbox.capture(this,sbn)}catch(e:Exception){android.util.Log.e("FlocoBank","falha",e);BankInbox.prefs(this).edit().putBoolean("storageError",true).apply()}}
}
class BankNotificationsModule(private val context:ReactApplicationContext):ReactContextBaseJavaModule(context){
  override fun getName()="FlocoBankNotifications"
  @ReactMethod fun status(p:Promise){try{val prefs=BankInbox.prefs(context);val result=Arguments.createMap();result.putBoolean("permission",NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName));result.putBoolean("enabled",prefs.getBoolean("enabled",true));result.putBoolean("alert",prefs.getBoolean("alert",true));result.putBoolean("connected",BankInbox.connected);result.putString("lastSeen",prefs.getString("lastSeen","")?:"");result.putDouble("lastCapture",prefs.getLong("lastCapture",0).toDouble());result.putInt("overflow",prefs.getInt("overflow",0));result.putBoolean("storageError",prefs.getBoolean("storageError",false));result.putString("pending",BankInbox.pending(context).toString());p.resolve(result)}catch(e:Exception){p.reject("INBOX",e)}}
  @ReactMethod fun configure(packages:String,ignored:String,sms:Boolean,smsSenders:String,p:Promise){try{JSONObject(packages);JSONArray(ignored);JSONArray(smsSenders);if(BankInbox.prefs(context).edit().putString("packages",packages).putString("ignored",ignored).putBoolean("sms",sms).putString("smsSenders",smsSenders).commit())p.resolve(null)else p.reject("STORAGE","Não foi possível salvar.")}catch(e:Exception){p.reject("CONFIG",e)}}
  @ReactMethod fun setAlert(on:Boolean,p:Promise){if(BankInbox.prefs(context).edit().putBoolean("alert",on).commit())p.resolve(null)else p.reject("STORAGE","Não foi possível salvar a preferência.")}
  @ReactMethod fun setEnabled(enabled:Boolean,p:Promise){if(BankInbox.prefs(context).edit().putBoolean("enabled",enabled).commit())p.resolve(null)else p.reject("STORAGE","Não foi possível salvar a preferência.")}
  @ReactMethod fun openSettings(p:Promise){try{context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));p.resolve(null)}catch(e:Exception){p.reject("SETTINGS",e)}}
  @ReactMethod fun openAppInfo(p:Promise){try{context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,android.net.Uri.parse("package:"+context.packageName)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));p.resolve(null)}catch(e:Exception){p.reject("SETTINGS",e)}}
  @ReactMethod fun rebind(p:Promise){try{NotificationListenerService.requestRebind(android.content.ComponentName(context,BankNotificationListener::class.java));p.resolve(null)}catch(e:Exception){p.reject("REBIND",e)}}
  @ReactMethod fun acknowledge(id:String,p:Promise){try{BankInbox.acknowledge(context,id);p.resolve(null)}catch(e:Exception){p.reject("STORAGE",e)}}
}
