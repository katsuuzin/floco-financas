package br.com.kat.flocofinancas.updates

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import br.com.kat.flocofinancas.R
import com.facebook.react.bridge.*
import org.json.JSONObject

// Widgets da tela inicial (W1). O app grava um resumo já formatado (respeitando
// "ocultar valores" e o bloqueio) e os widgets só exibem esse texto.
object FlocoWidgetData {
  private const val PREFS = "floco.widgets"
  fun read(c: Context): JSONObject = try { JSONObject(c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("data", "{}") ?: "{}") } catch (_: Exception) { JSONObject() }
  fun write(c: Context, json: String) { JSONObject(json); c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("data", json).apply() }
  fun open(c: Context, uri: String, code: Int): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(c.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return PendingIntent.getActivity(c, code, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
  fun refreshAll(c: Context) {
    val m = AppWidgetManager.getInstance(c)
    for (cls in listOf(FlocoSummaryWidget::class.java, FlocoBillsWidget::class.java)) {
      val ids = m.getAppWidgetIds(ComponentName(c, cls))
      if (ids.isNotEmpty()) c.sendBroadcast(Intent(c, cls).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE).putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids))
    }
  }
}

class FlocoSummaryWidget : AppWidgetProvider() {
  override fun onUpdate(c: Context, m: AppWidgetManager, ids: IntArray) {
    val d = FlocoWidgetData.read(c)
    for (id in ids) {
      val v = RemoteViews(c.packageName, R.layout.floco_widget_summary)
      v.setTextViewText(R.id.w_month, d.optString("month", "Floco Finanças"))
      v.setTextViewText(R.id.w_balance, d.optString("balance", "Abra o app"))
      v.setTextViewText(R.id.w_flow, d.optString("flow", ""))
      v.setTextViewText(R.id.w_invoice, d.optString("invoice", ""))
      v.setOnClickPendingIntent(R.id.w_root, FlocoWidgetData.open(c, "floco://home", 10))
      v.setOnClickPendingIntent(R.id.w_add_expense, FlocoWidgetData.open(c, "floco://add/expense", 11))
      v.setOnClickPendingIntent(R.id.w_add_income, FlocoWidgetData.open(c, "floco://add/income", 12))
      m.updateAppWidget(id, v)
    }
  }
}

class FlocoBillsWidget : AppWidgetProvider() {
  override fun onUpdate(c: Context, m: AppWidgetManager, ids: IntArray) {
    val d = FlocoWidgetData.read(c)
    for (id in ids) {
      val v = RemoteViews(c.packageName, R.layout.floco_widget_bills)
      v.setTextViewText(R.id.w_bills_title, d.optString("billsTitle", "Próximas contas"))
      v.setTextViewText(R.id.w_bills, d.optString("bills", "Nada vence nos próximos dias."))
      v.setTextViewText(R.id.w_budgets, d.optString("budgets", ""))
      v.setOnClickPendingIntent(R.id.w_bills_root, FlocoWidgetData.open(c, "floco://bills", 20))
      v.setOnClickPendingIntent(R.id.w_bills_add, FlocoWidgetData.open(c, "floco://add/expense", 21))
      m.updateAppWidget(id, v)
    }
  }
}

class FlocoWidgetsModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "FlocoWidgets"
  @ReactMethod fun update(json: String, p: Promise) {
    try { FlocoWidgetData.write(context, json); FlocoWidgetData.refreshAll(context); p.resolve(null) } catch (e: Exception) { p.reject("WIDGET", e) }
  }
}
