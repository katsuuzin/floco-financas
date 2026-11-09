# Verifica e prepara o ambiente do Floco Finanças. Uso: .\scripts\ambiente.ps1
$ErrorActionPreference='Continue'
$tools='C:\Users\Kat\Documents\ChatGPT\Minha agenda\kontto-work\tools'
$checks=@{
  'Node'        = (Test-Path "$env:ProgramFiles\nodejs\node.exe")
  'JDK 21'      = (Test-Path "$tools\java\jdk-21.0.13+9\bin\java.exe")
  'JDK 17'      = (Test-Path "$tools\java17\jdk-17.0.21+9\bin\java.exe")
  'Android SDK' = (Test-Path "$tools\android-sdk\platform-tools\adb.exe")
  'Gradle cache'= (Test-Path "$tools\gradle-cache")
  'AVD'         = (Test-Path "$tools\avd\KonttoPlayStore.ini")
  'node_modules'= (Test-Path 'node_modules\expo')
}
$checks.GetEnumerator() | Sort-Object Name | ForEach-Object { $estado = 'FALTA'; if ($_.Value) { $estado = 'ok' }; '{0,-14} {1}' -f $_.Name, $estado }
$adb="$tools\android-sdk\platform-tools\adb.exe"
if (Test-Path $adb) { & $adb devices }