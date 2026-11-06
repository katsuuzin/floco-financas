param(
  [Parameter(Mandatory=$true)][string]$JavaHome,
  [Parameter(Mandatory=$true)][string]$Java17Home,
  [Parameter(Mandatory=$true)][string]$AndroidSdk,
  [ValidateSet('arm64-v8a','x86_64')][string]$Architecture='arm64-v8a'
)
$ErrorActionPreference='Stop'
$previousLocation=Get-Location
Set-Location -LiteralPath $PSScriptRoot
$env:JAVA_HOME=(Resolve-Path -LiteralPath $JavaHome).Path
$taskJava17=(Resolve-Path -LiteralPath $Java17Home).Path
$env:ANDROID_HOME=(Resolve-Path -LiteralPath $AndroidSdk).Path
$env:CI='1'
$env:FLOCO_CODEGEN_DIR=Join-Path $PSScriptRoot 'node_modules\@react-native\codegen'
if(-not $env:FLOCO_KEYSTORE_PASSWORD){
  $credentialsPath=Join-Path $PSScriptRoot '.signing\local-signing.json'
  if(-not(Test-Path -LiteralPath $credentialsPath)){throw 'Configure FLOCO_KEYSTORE_PASSWORD e FLOCO_KEYSTORE_FILE para assinar a mesma identidade do aplicativo.'}
  $env:FLOCO_KEYSTORE_PASSWORD=(Get-Content -LiteralPath $credentialsPath -Raw | ConvertFrom-Json).password
}
if(-not $env:FLOCO_KEYSTORE_FILE){$env:FLOCO_KEYSTORE_FILE=Join-Path $PSScriptRoot '.signing\floco-release.keystore'}
if (-not (Test-Path -LiteralPath '.\node_modules\expo')) { throw 'Instale as dependências com npm ci primeiro.' }
$taskDrive = @('Z','Y','X','W','V','U','T') | Where-Object { -not (Test-Path "${_}:\") } | Select-Object -First 1
if (-not $taskDrive) { throw 'Nenhuma letra de unidade livre para o caminho temporário de compilação.' }
& subst "${taskDrive}:" $PSScriptRoot
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível criar o caminho curto com subst.' }
try {
  Set-Location "${taskDrive}:\"
  & '.\android\gradlew.bat' -p android assembleRelease "-PreactNativeArchitectures=$Architecture" '-Pandroid.compileSdkVersion=37' '-Pandroid.buildToolsVersion=37.0.0' "-Porg.gradle.java.installations.paths=$taskJava17" '-Porg.gradle.java.installations.auto-download=false' '-Pkotlin.incremental=false' '-Pkotlin.compiler.execution.strategy=in-process' --max-workers=4 --console=plain
  if ($LASTEXITCODE -ne 0) { throw 'A compilação falhou. Leia a mensagem do Gradle acima.' }
  New-Item -ItemType Directory -Force -Path '.\entrega' | Out-Null
  Copy-Item -LiteralPath '.\android\app\build\outputs\apk\release\app-release.apk' -Destination ".\entrega\Floco-Financas-$Architecture.apk" -Force
  Write-Host "APK gerado em entrega\Floco-Financas-$Architecture.apk"
} finally {
  Set-Location -LiteralPath $previousLocation.Path
  & subst "${taskDrive}:" /D
}
