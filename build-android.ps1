param(
  [string]$JavaHome='C:\Users\Kat\Documents\ChatGPT\Minha agenda\kontto-work\tools\java\jdk-21.0.13+9',
  [string]$Java17Home='C:\Users\Kat\Documents\ChatGPT\Minha agenda\kontto-work\tools\java17\jdk-17.0.21+9',
  [string]$AndroidSdk='C:\Users\Kat\Documents\ChatGPT\Minha agenda\kontto-work\tools\android-sdk',
  [ValidateSet('arm64-v8a','x86_64','universal')][string]$Architecture='arm64-v8a',
  # O Android Gradle Plugin recusa caminhos com acentos ("Finanças") e o CMake do NDK falha
  # através de junções. Por isso o build roda numa cópia espelhada em um caminho ASCII.
  # A cópia é descartável: edite sempre o repositório, nunca esta pasta.
  [string]$BuildDir=(Join-Path $env:USERPROFILE 'AndroidBuild\floco-work')
)
$ErrorActionPreference='Stop'
# Gradle usa o cache das ferramentas por padrão (não depende de variável de ambiente).
if (-not $env:GRADLE_USER_HOME) { $env:GRADLE_USER_HOME='C:\Users\Kat\Documents\ChatGPT\Minha agenda\kontto-work\tools\gradle-cache' }
$previousLocation=Get-Location
if ($BuildDir -match '[^\x20-\x7E]') { throw "BuildDir precisa ter apenas caracteres ASCII: $BuildDir" }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\expo'))) { throw 'Instale as dependências com npm ci primeiro.' }

$env:JAVA_HOME=(Resolve-Path -LiteralPath $JavaHome).Path
$taskJava17=(Resolve-Path -LiteralPath $Java17Home).Path
$env:ANDROID_HOME=(Resolve-Path -LiteralPath $AndroidSdk).Path
$env:CI='1'
if(-not $env:FLOCO_KEYSTORE_PASSWORD){
  $credentialsPath=Join-Path $PSScriptRoot '.signing\local-signing.json'
  if(-not(Test-Path -LiteralPath $credentialsPath)){throw 'Configure FLOCO_KEYSTORE_PASSWORD e FLOCO_KEYSTORE_FILE para assinar a mesma identidade do aplicativo.'}
  $env:FLOCO_KEYSTORE_PASSWORD=(Get-Content -LiteralPath $credentialsPath -Raw | ConvertFrom-Json).password
}
if(-not $env:FLOCO_KEYSTORE_FILE){$env:FLOCO_KEYSTORE_FILE=Join-Path $PSScriptRoot '.signing\floco-release.keystore'}

# Espelha o projeto. Mantém os caches de build da cópia entre execuções.
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
# Exclusões por caminho completo: um nome solto como "build" também removeria pastas de node_modules.
$exclude = @('.git','entrega','analysis','rea','.expo','.signing') | ForEach-Object { Join-Path $PSScriptRoot $_ }
$exclude += @('android\build','android\app\build','android\app\.cxx','android\.gradle') | ForEach-Object { Join-Path $PSScriptRoot $_ }
& robocopy $PSScriptRoot $BuildDir /MIR /NFL /NDL /NJH /NJS /NP /R:1 /W:1 /XD $exclude | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy falhou com código $LASTEXITCODE." }
$env:FLOCO_CODEGEN_DIR=Join-Path $BuildDir 'node_modules\@react-native\codegen'
# O Gradle não vê mudanças em .mjs e reaproveitava o pacote JS antigo. Força gerar de novo.
foreach ($stale in 'android\app\build\generated\assets\react','android\app\build\intermediates\assets','android\app\build\intermediates\compressed_assets','android\app\build\intermediates\sourcemaps\react') {
  $p=Join-Path $BuildDir $stale; if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Recurse -Force }
}

try {
  Set-Location -LiteralPath $BuildDir
  # Windows PowerShell 5.1 converte o stderr do Gradle em erro; o resultado é conferido por $LASTEXITCODE.
  $ErrorActionPreference='Continue'
  & '.\android\gradlew.bat' -p android assembleRelease "-PreactNativeArchitectures=$(if ($Architecture -eq 'universal') { 'arm64-v8a,x86_64' } else { $Architecture })" '-Pandroid.compileSdkVersion=37' '-Pandroid.buildToolsVersion=37.0.0' "-Porg.gradle.java.installations.paths=$taskJava17" '-Porg.gradle.java.installations.auto-download=false' '-Pkotlin.incremental=false' '-Pkotlin.compiler.execution.strategy=in-process' --max-workers=4 --console=plain
  if ($LASTEXITCODE -ne 0) { throw 'A compilação falhou. Leia a mensagem do Gradle acima.' }
  $ErrorActionPreference='Stop'
# Gradle usa o cache das ferramentas por padrão (não depende de variável de ambiente).
if (-not $env:GRADLE_USER_HOME) { $env:GRADLE_USER_HOME='C:\Users\Kat\Documents\ChatGPT\Minha agenda\kontto-work\tools\gradle-cache' }
  $out = Join-Path $PSScriptRoot 'entrega'
  New-Item -ItemType Directory -Force -Path $out | Out-Null
  Copy-Item -LiteralPath (Join-Path $BuildDir 'android\app\build\outputs\apk\release\app-release.apk') -Destination (Join-Path $out "Floco-Financas-$Architecture.apk") -Force
  Write-Host "APK gerado em entrega\Floco-Financas-$Architecture.apk"
} finally {
  Set-Location -LiteralPath $previousLocation.Path
}
