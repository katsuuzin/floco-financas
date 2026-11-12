# Retomada: Lista de Compras do Floco no funcionamento do Lemonlist (Fases 2 a 4)

Arquivo para abrir um chat novo, do zero. Leia este arquivo inteiro antes de qualquer outra coisa.

## Modelo recomendado

- **Claude Opus 5.5 com esforço alto ("high")** para as Fases 2, 3 e 4. O trabalho mistura leitura de código grande (ShoppingScreen tem cerca de 550 linhas), decisões de interação e acessibilidade, gestos nativos no Android e teste no emulador com toques por coordenada, que erram com facilidade. Um modelo menor tende a pular a verificação na tela.
- Se quiser economizar, dá para fazer **só a Fase 2** (tabela de comparação) com **Sonnet 5.5, esforço médio**, e voltar ao Opus 5.5 alto na Fase 3 (especificação e decisões) e na Fase 4 (implementação).
- Não precisa de esforço máximo: os passos são pequenos e verificáveis.

## Primeira mensagem sugerida para o chat novo

> Leia RETOMADA-LISTA-LEMONLIST.md e siga a partir da Fase 2. Responda em português, curto.

## O pedido original do dono (resumo fiel)

**Objetivo:** a aba "Listas" do Lemonlist (`br.com.lemonlist.app`) é a referência de **funcionamento** do módulo Lista de Compras do Floco. O Floco deve ter a mesma disposição dos botões, a mesma ordem dos elementos e as mesmas interações, inclusive **as animações de interação, recriadas no Floco**. Tudo com a **identidade visual do Floco**: amarelo #FBB202/#FFCB45, marrom #311E0D, fonte Sora, tema claro e escuro, tokens de `useTheme()`. Do visual do Lemonlist, só pode entrar o estilo dos **ícones dos itens** (ícone da categoria num círculo colorido).

**Limites que não se negociam:**
- Observar só o que aparece na tela.
- **Não** extrair, copiar nem reaproveitar arquivos do app (imagens, ícones, fontes, animações, sons, textos literais). **Não** descompilar o APK.
- **Não** usar a conta do Lemonlist; só ver o que já está na tela.
- Capturas ficam só em `analysis/`, que o Git ignora. Nada do Lemonlist vai para o repositório nem para a release.
- Animações: **medir** (duração, escala, deslocamento, curva) e **recriar com código próprio**.
- Textos: anotar para o dono **reescrever com as palavras dele**.

**Fases** (parar ao fim de cada uma, mostrar o resultado e só avançar quando o dono disser):
1. **Auditoria.** ✅ Feita: `AUDITORIA-LEMONLIST-LISTAS.md`.
2. **Comparação.** Tabela "Lemonlist faz / Floco faz hoje / diferença / esforço", lendo o código atual da lista de compras do Floco.
3. **Especificação.** Para cada diferença, descrever a versão Floco:
   - layout com os tokens e componentes do kit;
   - gestos;
   - textos em português do Brasil;
   - acessibilidade: alvo mínimo 48 dp, rótulos, anúncios, fonte 200%, respeitar "remover animações".

   Listar as dependências nativas novas que deslizar e arrastar possam exigir (gesture handler, reanimated) e **perguntar antes de instalar**. Atualizar `PLANO-FINALIZACAO.md`.
4. **Implementação** em passos pequenos, um por vez:
   - `npx tsc --noEmit` e `npm test` verdes a cada passo;
   - teste no emulador nos temas claro e escuro;
   - capturas do Floco antes e depois;
   - atualizar `INVENTARIO-FUNCIONAL.md` com a divisão testado / não testado;
   - dados antigos nunca quebram: campo novo opcional, backup antigo restaura, migração idempotente.

**Pedidos finais:**
- Interação ambígua: gravar em quadros (10 por segundo) em vez de adivinhar.
- Decisão de design, dependência ou perda de função atual do Floco: **perguntar**, não decidir sozinho.
- **Sem commit, push nem release** até o dono pedir.

## O que ler (nesta ordem)

1. `CLAUDE.md` (regras fixas: nunca `expo prebuild`; ambiente; build).
2. `AUDITORIA-LEMONLIST-LISTAS.md`: o resultado da Fase 1. É a base das Fases 2 e 3.
3. `PLANO-FINALIZACAO.md` e `DESIGN.md`. No DESIGN, o parágrafo "Lista de compras" diz hoje **"Sem gesto de deslizar: toda ação tem botão"**. Essa decisão antiga muda com este trabalho: perguntar ao dono e manter botões como alternativa acessível.
4. `INVENTARIO-FUNCIONAL.md`, só os parágrafos E1 (lista de compras).
5. Código do Floco:
   - `src/screens/ShoppingScreen.tsx`: tela da lista, `ShoppingAddBar`, `EditPanel`.
   - `src/screens/ShoppingTripScreen.tsx`: Modo compra.
   - `src/screens/RestockList.tsx`: "Está acabando".
   - `src/ui/kit.tsx`: componentes e `space`/`radius`.
   - `src/ui/theme.tsx`: tokens.
   - `src/ui/ShoppingIcons.tsx`: ícones de categoria (Lucide).
   - `src/ui/motion.tsx` e `src/motion.mjs`: movimento próprio que já existe.
   - `src/shopping.mjs` e `src/shoppingLists.mjs`: dados e listas múltiplas.

## Já se sabe para a Fase 2 (pistas, conferir no código)

| Lemonlist | Floco hoje (leitura rápida, conferir) |
|---|---|
| Visão geral com um **cartão por lista**, reordenável por arraste, com divisores | um seletor "Minha lista ▾" abre a folha "Gerenciar listas" com botões; sem visão em cartões, sem reordenar, sem grupos |
| Barra de adicionar **no alto**, com categoria adivinhada ao vivo e escolha manual | barra **fixa na base** (`ShoppingAddBar`), sem botão de categoria, com autocompletar em chips |
| Falar / Colar lista / Escanear logo abaixo da barra | Colar lista no fim da tela; "Escanear produto" e "Ler nota fiscal" como botões grandes; sem Falar (a E1 deixou voz fora do escopo) |
| Linha em pílula: círculo, nome, chip "2×", preço; deslizar direita = marcar, esquerda = editar/excluir | linha com caixa de 48 dp, nome, quantidade · preço e lixeira; sem deslizar (decisão antiga do DESIGN.md) |
| Estados **Não tinha** e **Depois**, com seções próprias; bloco "Acabou de entrar" | só pendente / no carrinho |
| Folha do item: unidade ou peso, preço, quantidade −/+, foto, detalhes, 3 botões de estado, categoria, Tirar / Concluir | folha "Editar item": nome com quantidade num campo só, preço, categoria, recorrente, promoção |
| "Tirar da lista" com confirmação "O que muda / O que fica" | "Remover itens do carrinho" com confirmação simples |
| Excluir item com Desfazer (cerca de 9 a 10 s) | Desfazer existe (store `undoLabel`, 7 s segundo o DESIGN) e há também Desfazer/Refazer no topo |
| Cabeçalho com "Começar compra", compartilhar (link ou texto) e editar | botões em coluna no fim: Modo compra, Exportar CSV, Compartilhar, Código etc. |
| Movimento: voo para o carrinho, folha com desfoque, cascata ao voltar, arraste com sombra | só o "afundar" dos botões (`src/ui/motion.tsx`) |

**Coisas do Floco que não existem no Lemonlist e não podem sumir sem o dono decidir:** registrar a compra como despesa (uma ou por categoria), preços do histórico, exportar CSV, código de compartilhamento, recorrentes e promoções, "Está acabando", Desfazer/Refazer, modelos de lista, recuperar lista excluída, busca na lista e o bloco da Início.

**Fora do escopo** (função de serviço ou conta, não de tela): convidar pessoas, dividir gastos, personagens (mascotes), estimativa de preço por IA ou por região.

## Decisões que o dono precisa tomar (perguntar na Fase 3)

1. **Dependências nativas** para deslizar e arrastar: `react-native-gesture-handler` e `react-native-reanimated`. **Conferido em 11/11/2026: nenhuma das duas está no `package.json`.** Alternativa sem dependência nova: `PanResponder` + `Animated` do próprio React Native (mais trabalho, mas já está no app). Se exigirem mudança no `android/`, lembrar que **nunca** se roda prebuild: a mudança seria à mão.
2. Trocar a decisão "sem deslizar" do DESIGN.md (com botões mantidos para acessibilidade).
3. Barra de adicionar no alto ou na base. O Lemonlist usa no alto; o Floco escolheu a base pelo alcance do polegar (crítica Impeccable).
4. Visão em cartões das listas e divisores, ou manter o seletor.
5. Ícones: usar Lucide (licença aberta, já usada no Floco) no estilo círculo colorido por categoria, desenhado com os tokens do Floco. **Não** copiar arquivos do Lemonlist.
6. Textos: o dono reescreve os da seção 6 da auditoria.

## Ambiente e truques aprendidos (para não perder tempo)

- **Dois emuladores:**
  - `emulator-5554` = AVD **FlocoToolsAudit** (Floco, pacote `br.com.kat.flocofinancas`).
  - `emulator-5556` = AVD **KonttoPlayStore** (Lemonlist, Play Store).
  - Ligar o 5556:
    ```
    ANDROID_AVD_HOME=".../kontto-work/tools/avd" ANDROID_SDK_ROOT=".../kontto-work/tools/android-sdk" emulator -avd KonttoPlayStore -port 5556 -no-boot-anim -no-snapshot-save
    ```
    Rode em segundo plano. O `.ini` já foi corrigido do drive R: (cópia em `.bak`).
- **adb:** `C:\Users\Kat\Documents\ChatGPT\Minha agenda\kontto-work\tools\android-sdk\platform-tools\adb.exe`. No Git Bash, use `MSYS_NO_PATHCONV=1`, ou o `/sdcard/...` vira caminho do Windows. No `adb pull`, passe o destino com `cygpath -w`.
- **Funções prontas:** `analysis/lemonlist/s.sh` (`source` no Git Bash). Contém:
  - `shot nome`: PNG + XML da hierarquia;
  - `nodes nome`: lista de controles com limites, sem acento;
  - `rec nome segundos "comando" [fps]`: grava a tela e gera quadros;
  - `sheet nome primeiro n`: folha de quadros.

  Está apontado para o 5556; troque o serial para usar no Floco.
- **REA:** `REA_ADB_PATH` foi gravada como variável de usuário. Ela só vale **depois de reiniciar o app do Claude**. Se as ferramentas `mcp__rea__*adb*` ainda disserem "adb não encontrado", rode `node C:\Users\Kat\.rea\node_modules\rea-agents\scripts\rea.mjs doctor`. As ferramentas `observe_native_ui` e `trace_native_ui_action` são para apps de Mac e não servem no Android.
- O Lemonlist roda numa **aba do Chrome** (aplicativo web). A hierarquia pode atrasar depois de folhas e animações; espere 1 a 1,5 s antes do `uiautomator dump`.
- **Armadilhas que já aconteceram:**
  - O "voltar" com o teclado aberto fechou uma folha, e o toque seguinte caiu em outro lugar. Sempre confira a tela antes do próximo toque.
  - "Não tinha" e "Depois" fecham a folha na hora.
  - O aviso de Desfazer some em cerca de 9 a 10 s.
  - `adb input text` não digita acento e o teclado do emulador autocorrige ("leite" virou "elite").
- **Floco:** build `.\build-android.ps1 -Architecture x86_64` (3 a 5 min, em segundo plano). Testes: `npm test` (use `--test-concurrency=1` se houver build rodando) e `npx tsc --noEmit`.

## Estado dos arquivos

- Novos, sem commit: `AUDITORIA-LEMONLIST-LISTAS.md`, `RETOMADA-LISTA-LEMONLIST.md` e `PLANO-FINALIZACAO.md` (já estava sem commit antes desta sessão).
- Nenhum código do Floco foi alterado na Fase 1.
- No Lemonlist do emulador, o item "Pão de queijo" ficou como **"Pao de queijo"** (sem til) depois de um teste. O dono corrige.
