# Floco Finanças — instruções para o Claude

App Android de finanças pessoais (React Native/Expo). Sem assinatura, sem limites comerciais. Identidade: mascote cachorro de óculos, amarelo #FBB202/#FFCB45, marrom #311E0D, fonte Sora. Tema escuro: preto/cinza com amarelo nos destaques.

## Antes de mexer
Leia REVISAO-E-PLANO.md, INVENTARIO-FUNCIONAL.md (tabela de status) e DESIGN.md.

## Ambiente (sempre)
- Node: $env:PATH="C:\Program Files\nodejs;C:\WINDOWS\system32;C:\WINDOWS;C:\WINDOWS\System32\Wbem;C:\WINDOWS\System32\WindowsPowerShell\v1.0\;C:\WINDOWS\System32\OpenSSH\;C:\Program Files\NVIDIA Corporation\NVIDIA App\NvDLISR;C:\Program Files (x86)\NVIDIA Corporation\PhysX\Common;C:\Program Files\dotnet\;C:\Program Files\SoundSwitch;C:\Program Files\Cloudflare\Cloudflare WARP\;C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI\;C:\Program Files\nodejs\;C:\Users\Kat\.cargo\bin;C:\Users\Kat\AppData\Local\Programs\Python\Python312\Scripts\;C:\Users\Kat\AppData\Local\Programs\Python\Python312\;C:\Users\Kat\AppData\Local\Programs\Python\Launcher\;C:\Users\Kat\AppData\Local\Microsoft\WindowsApps;C:\Users\Kat\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin;C:\Users\Kat\AppData\Local\Programs\Ollama;C:\Users\Kat\AppData\Roaming\npm;C:\Users\Kat\AppData\Local\Programs\Python\Python312;C:\Program Files\nodejs;C:\Program Files\GitHub CLI"
- Ferramentas (JDK, SDK, Gradle, AVD) ficam em C:\Users\Kat\Documents\ChatGPT\Minha agenda\kontto-work\tools. Não depende mais do drive R:. O script de build já aponta para esses caminhos.
- Verificar tudo: .\scripts\ambiente.ps1
- Emulador: emulator-5554. ADB em ...\kontto-work\tools\android-sdk\platform-tools\adb.exe.

## Comandos
- Testes: 
pm test e 
px tsc --noEmit
- APK para celular (universal): .\build-android.ps1 -Architecture universal
- APK para emulador: .\build-android.ps1 -Architecture x86_64
- Saída: entrega\. Nunca rode expo prebuild: apagaria widgets, manifest e ícones feitos em ndroid/.

## Regras de trabalho
- Commit e push só quando o usuário pedir. Mensagem termina com Co-Authored-By: Claude <modelo> <noreply@anthropic.com>.
- Release só com pedido explícito: incrementar versão e ersionCode em pp.json, package.json e ndroid/app/build.gradle; gerar APK universal; entrega\Floco-Financas.apk + .sha256; gh release create vX.Y.Z.
- Ao concluir uma função, atualizar INVENTARIO-FUNCIONAL.md.
- Testar no emulador antes de dizer que está pronto. Informar o que não foi testado (celular real, TalkBack, notificação real).
- Respostas curtas, em português. Economizar tokens: resumir saídas de comando, não ler arquivos inteiros.

## Estado atual
Pasta do projeto: C:\Users\Kat\Desktop\Projetos de IA\01 - Floco finanças (repositório Git, branch main).
Publicado: 1.3.6. Já concluído nos commits recentes: widgets (W1), extrato PDF (F1), cores de destaque e ícones alternativos. Para o que falta, consulte TAREFAS.md e INVENTARIO-FUNCIONAL.md.


## Lista de tarefas (em ordem)
1. Terminar duplicatas de notificação e publicar 1.3.4
2. Filtros do extrato (conta, tag, faixa de valor)
3. Lixeira com purga e reordenar/arquivar contas
4. Calculadora no valor e calendário no extrato
5. Caixinha separada de meta e arquivar caixinha
6. Ícone e cor em categorias e tags
7. Widgets restantes (4 de 6)
8. Extrato bancário em PDF
9. Ícones alternativos e cores de destaque
10. Google Drive e sincronização (só com configuração OAuth fornecida pelo usuário)