# Retomada: Floco Finanças (para abrir um chat novo)

Pasta: `C:\Users\Kat\Desktop\Projetos de IA\01 - Floco finanças` (Git, branch `main`). Leia antes: `CLAUDE.md`, `INVENTARIO-FUNCIONAL.md` (parágrafos "Lista no funcionamento do Lemonlist", passos 0 a 13), `PLANO-FINALIZACAO.md` e `DESIGN.md`. Este arquivo vale mais que as listas antigas do `CLAUDE.md`.

## Primeira mensagem sugerida

> Leia RETOMADA-CHAT-NOVO.md e siga a partir da seção "O que fazer agora". Responda em português, curto.

Modelo recomendado: Claude Opus 5.5, esforço alto (mexe em muitas telas e precisa de teste no emulador).

## Estado agora (12/11/2026)

- Nada foi commitado nem lançado. Tudo está no diretório de trabalho. **Sem commit, push ou release até o dono pedir.**
- Testes: `npm test -- --test-concurrency=1` (1120 passam), `node --test tests/security/*.test.mjs` (119 passam), `npx tsc --noEmit` limpo.
- **Lista de compras no estilo Lemonlist:** Fase 4 completa no código (passos 0 a 13). O que falta é teste no celular real (voz, câmera, gestos, TalkBack, "remover animações"). Detalhes e a divisão testado/não testado estão no `INVENTARIO-FUNCIONAL.md`.
- Dependências novas desta etapa: `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `expo-blur`, `expo-speech-recognition`. `RECORD_AUDIO` deixou de ser removido no `AndroidManifest.xml` (à mão; **nunca** rodar `expo prebuild`).

## Feito nesta sessão e AINDA SEM TESTE NO EMULADOR

O APK x86_64 com isto já está instalado no emulador, mas **eu não abri essas telas**:

1. **Datas em formato brasileiro (DD/MM/AAAA) em todo o app.**
   - `src/dates.mjs` (`brDate`, `maskBrDate`, `parseBrDate`) e o componente `DateField` em `src/ui/kit.tsx`: mostra DD/MM/AAAA, põe as barras ao digitar, guarda `AAAA-MM-DD` por dentro.
   - Trocados todos os campos "(AAAA-MM-DD)" (FormScreen, PlanningPanel, NotificationsPanel, ReceiptPanel, ReportScreens) e as datas cruas exibidas. CSVs (lançamentos, histórico de compras, relatório) saem em DD/MM/AAAA; a importação aceita os dois formatos.
   - **Testar:** lançar uma despesa (campo Data), recorrência, contrato, relatório com período. Conferir a digitação com máscara e datas inválidas (31/02/2026).
2. **Quem eu devo** (Mais > Acompanhar): `src/screens/PayablesScreen.tsx`, rota `payables`, lógica em `src/planning.mjs` (`addPayable`, `payDebt`, `undoPayablePayment`, `payableBalance`), validação em `validateBackup` (`src/finance.mjs`).
   - Pagar cria uma **despesa confirmada** na conta (campo `payableId`); ela não pode ser editada nem excluída pelo extrato (só "Desfazer pagamento" na dívida). Conta como despesa normal nos relatórios; perguntar ao dono se prefere deixá-la fora dos relatórios de gasto.
3. **Anexar imagem ou documento** em Quem eu devo e Quem me deve: `src/ui/Attachments.tsx`, `src/attachments.mjs`. Seletor de arquivos, até 10 anexos e 15 MB cada, miniatura, abrir pelo compartilhar do Android, remover. Os arquivos ficam em `documentDirectory/attachments` e **não entram no backup** (só o registro).
   - **Testar:** criar dívida, registrar pagamento parcial, desfazer, anexar um print (empurre um arquivo com `adb push` para `/sdcard/Download` antes), abrir, remover, excluir a dívida.

## Crítica Impeccable do app (feita, só análise)

Resultado resumido (a análise completa estava no chat; refazer com `/impeccable critique` se precisar): telas com 8 a 16 controles visíveis; Mais com 22 entradas; atalhos duplicados.

**Decisões do dono:**
- Começar por **duplicados + Início**; o resto, "ajuste conforme achar melhor para o usuário".
- **Reunir Quem me deve e Quem eu devo** numa tela com duas abas ("Me devem" / "Eu devo"), item único "Entre pessoas" em Mais.
- **Acrescentar um contador de toques local** (só no aparelho, sem rede, fora do backup), com uma tela "Uso dos botões" em Configurações e botão de zerar/desligar. O dono usa por um tempo e **devolve o resultado**; só depois decidir o que esconder em Lista e Análise.

**Plano proposto (ajustar com bom senso):**

| Tela | Mudança |
|---|---|
| Todas | ⚙ só no cabeçalho; sai a entrada "Configurações" duplicada em Mais |
| Início | tirar os 4 atalhos (Orçamento, Metas, Relatórios, Recorrências) ou virar 1 linha "Planejar"; Leitura automática com 1 botão ("Abrir informações do app" vira link no passo 2) |
| Transações | Filtros + Ver calendário num só botão |
| Análise | Cor/Gasto/Recebido/Saldo vão para ⋮ do calendário |
| Lista | compartilhar, editar e ⋮ num só ⋮; Colar lista sai da vista; Falar e Escanear ficam |
| Mais (22 → ~14) | Parcelamentos + Financiamentos + Empréstimos = "Dívidas e contratos"; Quem me deve + Quem eu devo = "Entre pessoas"; Relatório personalizado + Relatórios avançados = "Relatórios"; Importar comprovante + Importar e exportar = "Importar e exportar"; Categorias + Tags = "Categorias e tags" |

Suposições de frequência (sem dado): lançar é o mais usado; Falar e Escanear > Colar lista; os 4 atalhos do Início quase não são tocados; contratos são raros; Cor/Gasto/Recebido/Saldo pouco trocados. O contador existe justamente para trocar isso por dado.

Duplicados a resolver: ⚙ (4 abas + Mais); atalhos do Início ↔ Mais; Recorrências (atalho + bloco); Relatórios (Início, Mais ×2, Análise); Lista de compras (bloco do Início + Mais); Ler nota fiscal (Lista > Escanear, Modo compra, Mais > Importar comprovante); calendário (Transações e Análise); olho do Início ↔ Configurações.

## O que fazer agora (ordem)

1. **Testar no emulador** os itens 1 a 3 da seção "Feito e sem teste" (datas, Quem eu devo, anexos), nos temas claro e escuro. Corrigir o que aparecer. Atualizar o `INVENTARIO-FUNCIONAL.md` com testado / não testado.
2. **Reduzir botões** conforme a tabela acima, começando por duplicados + Início. Um passo por vez, `tsc` e testes verdes, emulador, antes e depois.
3. **Contador de toques local:** um helper único (por exemplo `src/usage.mjs`) chamado nos botões de navegação; contagem guardada à parte (não no backup nem no banco financeiro), tela "Uso dos botões" em Configurações, botão de zerar e interruptor para desligar. Nenhum envio para fora. Avisar o dono de que o histórico de toques é um dado novo, guardado só no aparelho.
4. **Reunir "Entre pessoas"** (duas abas) e as demais fusões de Mais.
5. Só depois do retorno do contador: decidir o que esconder em Lista e Análise.
6. Pendências antigas do `PLANO-FINALIZACAO.md` (lixeira, lote de despesas, XML da nota, filtros do extrato, notificações duplicadas, restaurar backup danificado) continuam sem teste na tela; o roteiro está em `ROTEIRO-TESTE-CELULAR-3.md`.

## Regras fixas e truques (aprendidos)

- Respostas curtas, em português. Commit/push/release só quando o dono pedir. Mensagem de commit termina com `Co-Authored-By: Claude <modelo> <noreply@anthropic.com>`.
- Ambiente, Node e build: seção "Ambiente" do `CLAUDE.md`. Build: `.\build-android.ps1 -Architecture x86_64` (3 a 5 min, em segundo plano). Saída em `entrega\`.
- Emulador `emulator-5554` (AVD `FlocoToolsAudit`); se estiver desligado, ligar em segundo plano com `ANDROID_AVD_HOME=".../kontto-work/tools/avd" ANDROID_SDK_ROOT=".../kontto-work/tools/android-sdk" emulator -avd FlocoToolsAudit -port 5554 -no-boot-anim -no-snapshot-save`.
- Atalhos de teste: `analysis/adbf.sh` (`source` no Git Bash) define `tap x y`, `swp x1 y1 x2 y2 ms`, `shot nome` (PNG em `analysis/`). Use `MSYS_NO_PATHCONV=1`. Para achar um botão: `uiautomator dump` e `grep content-desc`. Pasta `analysis/` é ignorada pelo Git.
- Tocar sem olhar a tela já derrubou dados de teste (toques caíram em "No carrinho"/"Faltou", ou ligaram "ocultar valores"). **Sempre confira a tela antes do próximo toque.**
- Para escrever scripts Python longos com aspas, grave um arquivo (ferramenta Write) e rode `python arquivo.py`; heredocs com apóstrofos quebram no Git Bash.
- Fim de linha misto (CRLF/LF) em vários arquivos: detectar `\r\n`, normalizar para editar e reescrever igual.
- Teste a 200% de fonte: `adb shell settings put system font_scale 2.0` (e voltar a `1.0`). A Início e a barra de baixo já quebram a 200% ("R$ 499,7 / 9", "Transações"); está fora da lista de compras e ainda não foi corrigido.
- O emulador ficou no **tema claro** com os dados de teste (listas "Minha lista" e "Feira", item "Limões" como Faltou, Biscoito e Detergente no carrinho).
- Cores fixas em telas novas precisam de exceção justificada em `tests/security/theme-static.test.mjs`; textos do conteúdo não podem ter `numberOfLines` em telas protegidas (`tests/security/a11y-static.test.mjs`).
