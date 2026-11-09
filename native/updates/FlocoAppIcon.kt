package br.com.kat.flocofinancas.updates

import android.content.ComponentName
import android.content.pm.PackageManager
import com.facebook.react.bridge.*

// S10: ícones alternativos. Cada opção é um activity-alias no manifesto; só um fica ativo.
class FlocoAppIconModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val icons = listOf("Solar", "Grafite", "Creme", "Ceu")
  override fun getName() = "FlocoAppIcon"

  private fun alias(name: String) = ComponentName(context.packageName, "br.com.kat.flocofinancas.Icon$name")

  @ReactMethod fun current(p: Promise) {
    try {
      val pm = context.packageManager
      val on = icons.firstOrNull { n ->
        val state = pm.getComponentEnabledSetting(alias(n))
        state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED || (n == "Solar" && state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT)
      } ?: "Solar"
      p.resolve(on)
    } catch (e: Exception) { p.reject("ICON", e) }
  }

  @ReactMethod fun set(name: String, p: Promise) {
    try {
      if (name !in icons) throw IllegalArgumentException("Ícone desconhecido.")
      val pm = context.packageManager
      // Ativa o novo antes de desativar os outros, para nunca ficar sem ícone.
      pm.setComponentEnabledSetting(alias(name), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
      for (n in icons) if (n != name)
        pm.setComponentEnabledSetting(alias(n), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
      p.resolve(name)
    } catch (e: Exception) { p.reject("ICON", e) }
  }
}
