# Verificação do trabalho do Codex (para um chat zerado)

Objetivo: conferir, **sem confiar no relatório do Codex**, se o que ele fez a partir de `PLANO-CORRECOES-CODEX.md` está correto, completo e sem regressão. Quem verifica é o Claude, em um chat novo, só com este arquivo e o repositório.

## 0. Primeira mensagem para o chat novo

> Leia VERIFICACAO-POS-CODEX.md e siga. Responda em português, curto. Não corrija nada: só verifique e grave o relatório em RELATORIO-VERIFICACAO.md.

Modelo recomendado: Claude Opus 5.5, esforço alto (precisa de emulador e de leitura de código).

## 1. Contexto mínimo

- **App:** Floco Finanças, finanças pessoais Android (React Native/Expo), pt-BR, offline, sem login. Mascote cachorro de óculos, amarelo #FBB202/#FFCB45, marrom #311E0D, fonte Sora, tema escuro preto/cinza com amarelo.
- **Base:** release **v1.12.0**, commit `c3ff626` na `main` (versionCode 22). **Tudo o que aparece em `git status` depois disso é trabalho do Codex, não commitado.**
- **O que o Codex recebeu:** `PLANO-CORRECOES-CODEX.md` (tarefas T01 a T21 em 3 ondas), nascido de `AUDITORIA-IMPECCABLE.md` (crítica e auditoria de 12/11/2026). Leia os dois antes de verificar.
- **Sinais de que ele já mexeu:** `src/NotificationsPanel.tsx` foi **apagado**; `MoreScreen.tsx` perdeu o cartão "Sempre livre"; `usage.mjs` e `tests/usage.test.mjs` mudaram rótulos; ~50 arquivos modificados (`git diff --stat`).
- **Regra de ouro (do `PLANO-FINALIZACAO.md`):** o Codex **não tem emulador**; "validada" no relatório dele costuma significar só "os testes de código passaram". Nada vale como feito até **ver na tela**.

## 2. Regras do projeto que valem na verificação

- Leia `CLAUDE.md` (ambiente e comandos), `DESIGN.md`, `INVENTARIO-FUNCIONAL.md`.
- **Nunca** `expo prebuild`. **Não** faça commit, push nem release. **Não** corrija código nesta etapa (se achar um erro pequeno, registre; o dono decide).
- Ambiente: PATH do PowerShell na seção "Ambiente" do `CLAUDE.md`; `.\scripts\ambiente.ps1` confere tudo. Build de teste: `.\build-android.ps1 -Architecture x86_64` (3 a 5 min, em segundo plano). Emulador `emulator-5554`, pacote `br.com.kat.flocofinancas`.
- **Emulador sem tocar às cegas:** a barra de abas some nas subtelas e o voltar pode sair do app. Use `analysis/s.sh` (local, ignorado pelo Git): `source analysis/s.sh` → `ensure` (garante o Floco na frente), `tapt "texto"` (toca pelo texto), `sf "texto"` (rola até achar e toca), `s nome` (print reduzido em `analysis/au/nome.jpg`), `back`, `swp x1 y1 x2 y2 ms`. Use `MSYS_NO_PATHCONV=1` no Git Bash. Se `analysis/s.sh` não existir, use `analysis/adbf.sh` (`tap`, `swp`, `shot`) e `uiautomator dump` para achar coordenadas. **Confira a tela antes de cada toque.**
- Os dados de teste do emulador: saldo total R$ 38.368,61; contas Corrente e Nubank; Cartão Itaú com fatura R$ 312,40 que venceu em 10/11; Aluguel pendente de 10/11 (R$ 1.800); listas "Minha lista" e "Feira". **Se criar dado de teste, apague e esvazie a Lixeira no fim**, e deixe tema claro, fonte `1.0` e valores visíveis.
- Fonte grande: `adb shell settings put system font_scale 2.0` e **volte a `1.0`**.

## 3. Passo a passo da verificação

### Passo 1 — Inventário do que mudou (sem tela)
1. `git status --short`, `git diff --stat`, `git diff --ignore-space-at-eol --stat` (compara sem ruído de CRLF/LF). Se uma linha só muda no segundo comando e não no primeiro, houve **normalização de fim de linha**: anote (não é erro, mas confirme que não há arquivo reescrito inteiro sem motivo).
2. Liste os arquivos novos (`??`), apagados (`D`) e renomeados.
3. Procure um relatório do Codex (`RELATORIO-CODEX-*.md`, ou texto novo em `INVENTARIO-FUNCIONAL.md`). Leia o que ele afirma. Esse texto é a **lista de alegações** a checar.
4. Para cada tarefa T01–T21 do plano, marque: *tocada* (há mudança nos arquivos previstos), *não tocada*, *parcial*.

### Passo 2 — Portões automáticos (os três têm de passar)
```bash
npx tsc --noEmit
npm test -- --test-concurrency=1
node --test tests/security/
```
- Referência anterior: 1125 testes + 119 de segurança, `tsc` limpo. **Aumentar é esperado** (testes novos); **diminuir é suspeito** (teste apagado ou pulado). Compare os números e procure `.skip`/`only` novos: `git diff | grep -n "\.skip\|\.only\|todo"`.
- Se algum teste foi alterado para passar (`git diff tests/`), leia a alteração: troca de expectativa legítima (rótulo mudou) ou enfraquecimento (assert removido)?
- Testes de segurança que costumam reclamar: `theme-static` (cor fixa sem exceção), `a11y-static` (`numberOfLines` em tela protegida), `screens-contract` (lista de rotas). Se o Codex **adicionou exceções** a esses testes, liste cada uma e diga se a justificativa se sustenta.

### Passo 3 — Verificação de código, tarefa por tarefa
Para cada tarefa, rode a busca indicada e leia o trecho. Marque **Feito / Parcial / Não feito / Regrediu** com a evidência (arquivo:linha).

| Tarefa | O que deve ser verdade | Como checar |
|---|---|---|
| **T01** textos velhos | Nenhuma tela cita "Importar comprovante", "Relatórios avançados", "AAAA-MM-DD" ou "em Quem eu devo" como destino | `grep -rn "Importar comprovante\|Relatórios avançados\|AAAA-MM-DD\|em Quem eu devo" src App.tsx` (só comentários ou o nome interno de formato `AAAA-MM-DD` no `DateField` podem sobrar) |
| **T02** vencido | Helper `overdueItems` (ou nome equivalente) com **teste unitário**; usado em Início, Cartões, Transações e Lembretes; regra `data < hoje`; cobre lançamento pendente sem cartão, fatura em aberto vencida, `payables` e `receivables` com `dueDate` | `grep -rn "overdue" src tests`; ler o helper: varre meses antigos (não só `-1..2`)? ignora pago/parcial corretamente? |
| **T03** ações da transação | `TransactionRow.tsx` sem `Alert.alert`; usa `SheetModal`; Excluir direto com `undoable: true`; sem segunda confirmação (exceto parcelas e `financingId`) | `grep -n "Alert" src/screens/TransactionRow.tsx` deve ser vazio; ler as regras de quando cada ação aparece (iguais às antigas?) |
| **T04** fonte grande | `maxFontSizeMultiplier`/`adjustsFontSizeToFit` na barra e nos valores; `TransactionRow` com 2 linhas em fonte grande; segmentado da Análise sem quebrar letra | `grep -rn "maxFontSizeMultiplier\|adjustsFontSizeToFit" src App.tsx` |
| **T05** Leitura automática | Cartão curto com 1 botão; instruções numa `SheetModal`; "Agora não" por 7 dias | ler `HomeScreen.tsx` (bloco inbox/leitura); se criou campo novo em `settings`, ver se `validateBackup` aceita backup **antigo sem o campo** |
| **T06** Notificações | `src/NotificationsPanel.tsx` apagado; existe tela em `src/screens/` (ex.: `NotificationsScreen.tsx`); rota `notifications` fora da lista "headless" do `App.tsx`; sem `<Switch` cru; interruptor desabilitado sem permissão; bancos "Principais" + "Ver todos" | `ls src/NotificationsPanel.tsx` (não deve existir); `grep -rn "NotificationsPanel" src App.tsx tests` (zero restos); `grep -n "headless\|\"notifications\"" App.tsx` |
| **T07** demais painéis | `UpdatesPanel`, `SecurityPanel`, `ImportsPanel`, `ReceiptPanel` e o que restar do `PlanningPanel` viraram rotas normais; `PlanningPanel` sem páginas mortas (`receivables`, `financings`, `installments`, `recurrences`, `projections`); conta de destino da importação com padrão | `grep -n "\"tool\"\|\"imports\"\|\"receipt\"\|\"security\"\|\"updates\"" App.tsx`; `grep -c "page ===" src/PlanningPanel.tsx`; ler `ImportsPanel` (conta padrão) |
| **T08** cores do sistema | `selectionColor`/`cursorColor` no `Field`/`AmountField`; nenhum `<Switch` fora do `Toggle` | `grep -rn "<Switch" src App.tsx` (só `kit.tsx`); `grep -n "selectionColor\|cursorColor" src/ui/kit.tsx` |
| **T09** alvos e fontes | Sem `fontSize` 9–11 em UI; `minHeight` < 48 só com `hitSlop`; constantes `touch`/`type` no kit | `grep -rn "fontSize: \(9\|10\|11\)\b" src`; `grep -rn "minHeight: \(3\|4[0-7]\)\b" src` |
| **T10** voltar com confirmação | `BackHandler`/X em formulário sujo abre `ConfirmSheet`; formulário vazio fecha direto | ler `FormScreen.tsx`, `InboxSheet.tsx`, formulários de dívida/valor a receber |
| **T11** validação e "Mais detalhes" | Erro leva ao campo (rolagem + foco + borda vermelha); "Mais detalhes" com chevron | ler `FormScreen.tsx` |
| **T12** valor com prévia | `AmountField` mostra "= R$ …"; `parseMoney` com **testes** para `1.234,56`, `1234`, `12,3`, `0,5` | `grep -rn "parseMoney" tests` |
| **T13** criar/editar/apagar | `CreateAction` único; `⋮` por linha; Lixeira com ícone de lixeira + `ConfirmSheet` e "Apaga em N dias" | `grep -rn "CreateAction" src`; ler `TrashScreen.tsx` |
| **T14** duplicidades | Configurações sem "Seus dados" (só um link); "Importar extrato" é uma linha; filtros de Transações em folha e sem "Tipos de lançamento" duplicado | ler `SettingsScreen.tsx`, `DataToolsScreen.tsx`, `TransactionsScreen.tsx` |
| **T15** orçamento e item | Orçamento lista só categorias do tipo; estado do item (No carrinho/Faltou/Depois) preenchido quando selecionado | ler `FormScreen.tsx` (~566) e `ShoppingScreen.tsx` (folha do item) |
| **T16–T18** acabamento | Faixa da Análise em 2×2; aba "Mais" da Análise renomeada; `MonthNav` único; Início/Contas rotulados; Assistente sem "pendência(s)"; "Sempre livre" removido | ler os arquivos citados no plano |
| **T19** erros engolidos | Helper `softFail`; `.catch(() => {})` restantes só em tarefa de fundo | `grep -rn "catch(() => {})" src App.tsx` (lista restante e julgue cada uma) |
| **T20** desempenho | Há **números medidos** com ~2.000 lançamentos; só migrou para `FlatList` se houve engasgo | ler o relato no `INVENTARIO-FUNCIONAL.md` |
| **T21** orientação | Normalmente **não tocada** (opcional) | `grep -n "screenOrientation" android/app/src/main/AndroidManifest.xml` |

Verificações **transversais** de código (valem para tudo):
- **Compatibilidade de dados:** se o Codex criou campo novo em `settings` ou no estado, `validateBackup` (`src/finance.mjs`), `keepShoppingOnRestore` (`src/shopping.mjs`) e `src/storage.mjs` aceitam backup **antigo sem o campo**; existe teste.
- **Rotas:** toda rota nova está em `nav.tsx` (tipo `Route`), `App.tsx` (`TITLES` e `renderRoute`), `usage.mjs` (rótulo) e `tests/security/screens-contract.test.mjs`. Nenhuma rota órfã ou sem título.
- **Restos de código morto:** `grep -rn "NotificationsPanel\|PlanningPanel" src App.tsx` — referências a arquivo apagado quebrariam o build.
- **Nada em inglês na tela:** `grep -rn "\"\(Loading\|Cancel\|Save\|Delete\|Error\|OK\)\"" src App.tsx`.
- **Sem segredo/chave/dado pessoal** em arquivo novo (`git diff | grep -in "api_key\|apikey\|secret\|token\|senha\|@gmail"`).
- **Fim de linha:** arquivos CRLF não viraram LF por inteiro sem necessidade (compare os dois `diff --stat`).
- **Não regredir o que a 1.12.0 entregou:** Entre pessoas (2 abas) e Dívidas e contratos (3 abas) em `renderRoute`; contador "Uso dos botões" (`usage.mjs`, `usageTracker.ts`, `UsageScreen.tsx`); datas DD/MM/AAAA (`dates.mjs`, `DateField`); Lixeira; lista de compras.

### Passo 4 — Build e emulador
1. Rode o build x86_64, instale (`adb install -r entrega/Floco-Financas-x86_64.apk`) e abra. **Confirme que o APK é novo** (data/hora e tamanho diferentes do anterior) e que `adb logcat` não mostra erro de JS na abertura.
2. Para cada item abaixo, **abra a tela e veja**. Faça nos temas **claro e escuro**.

| # | Verificação na tela | Passa quando |
|---|---|---|
| E1 | Início | "Leitura automática" cartão curto; Pendências e Contas aparecem na 1ª tela; bloco **Atrasadas** com a fatura do Itaú e o Aluguel ("Vencida há 2 dias" ou equivalente, texto + ícone) |
| E2 | Cartões | selo de vencida ao lado de "Vence 10/11/2026" |
| E3 | Transações | linha do Aluguel com "Pendente" e "Atrasado"; resumo não corta; filtros em folha; **tocar numa transação abre folha do app (não o diálogo do sistema)**; Editar em destaque; Excluir mostra "Desfazer" e restaura; sem confirmação dupla |
| E4 | Lembretes | seção "Atrasadas" com os dois itens; já não diz só "Nada vence…" |
| E5 | Mais | 16 itens (ou menos), sem "Sempre livre"; "Notificações bancárias" abre **tela com cabeçalho igual às outras** (seta + título) |
| E6 | Notificações bancárias | sem botão "Voltar" largo; interruptor desabilitado sem permissão; bancos principais + "Ver todos" |
| E7 | Importar e exportar → Extrato; Foto/comprovante; Segurança; Atualizações; Categorias e tags; Relatório personalizado | todos com o mesmo cabeçalho e botões do kit; conta de destino da importação já marcada |
| E8 | Qualquer formulário | digitar algo e apertar **voltar do Android** → pergunta "Descartar?"; formulário vazio fecha direto |
| E9 | Nova despesa, valor 0 → Salvar | rola até o campo Valor, borda vermelha, mensagem junto ao campo |
| E10 | Campo de valor | digitar `1234` mostra "= R$ 1.234,00" |
| E11 | Cursor/seleção e interruptores | amarelo/marrom (sem teal) |
| E12 | **Fonte 200%** (Início, Transações, Análise, Mais, barra inferior) | "Transações" não parte; valores monetários não quebram dígitos; abas da Análise legíveis; linha de transação com 2 linhas |
| E13 | Novo orçamento | "Teto de despesa" **sem** Salário/Freelance/Investimentos/Renda Extra/Aluguéis |
| E14 | Folha do item (lista de compras) | estado atual sempre preenchido |
| E15 | Lixeira | ícone de lixeira (não ✕) para apagar de vez, com confirmação; texto "Apaga em N dias" |
| E16 | Contas, Orçamento, Metas | sem ícones destrutivos ao lado dos de edição; criar/editar no padrão novo |
| E17 | Configurações / Importar e exportar | backup/importar só em Mais; Configurações com link; sem duplicidade |
| E18 | Análise | faixa Resultado/Entrada/Saída/Saldo sem corte; aba "Mais" renomeada |
| E19 | Ocultar valores | continua mascarando Início, Contas, Transações, Análise **e os novos blocos de "Atrasadas"** |
| E20 | Fluxos que já funcionavam | criar despesa → saldo muda; excluir → Lixeira → restaurar; Entre pessoas: criar valor a receber, receber, desfazer, excluir; Dívidas e contratos: 3 abas; Uso dos botões conta e zera |

3. **Regressão rápida (smoke):** abrir **todas** as telas de Mais e Configurações uma vez cada, no claro e no escuro, sem tela branca, sem texto cortado novo e sem erro no logcat (`adb logcat -d | grep -i "ReactNative\|FATAL\|Error"`).
4. Restaure o estado do emulador (tema claro, fonte 1.0, valores visíveis, dados de teste originais, Lixeira vazia).

### Passo 5 — Revisão de qualidade (olho de design)
Para as telas que o Codex **reescreveu** (Notificações e os painéis migrados): compare com a auditoria (`S1`, `N1`, `N2`). Confira consistência com o kit (`Group/Row`, `Toggle`, `Button`), contraste nos dois temas, alvos de 48 dp, rótulos falados (`accessibilityLabel`/`accessibilityRole`) e ausência de cor fixa sem exceção justificada.

## 4. Armadilhas conhecidas
- Relatório do Codex dizendo "validada" sem emulador: ignore, verifique.
- `Alert.alert` ainda aparece em ~16 arquivos: **só `TransactionRow` é exigido** na T03; os outros são trabalho futuro. Não reprove por isso, mas liste o que sobrou.
- Testes de tempo falham em paralelo se houver build/emulador ocupando a máquina: use `--test-concurrency=1`.
- Dados de teste do emulador têm fatura e aluguel **propositalmente** vencidos; se a data do emulador mudou, os "dias de atraso" mudam.
- Fim de linha misto (CRLF/LF) gera ruído em `git diff`; use `--ignore-space-at-eol`.
- Não promover item a "testado" no `INVENTARIO-FUNCIONAL.md` sem ver na tela.

## 5. Saída esperada: `RELATORIO-VERIFICACAO.md`

Grave na raiz, em português, com:

1. **Resumo** (3 linhas): o Codex terminou? Pode ir para release? Há regressão?
2. **Portões:** `tsc`, `npm test`, segurança — números antes e depois.
3. **Tabela por tarefa (T01–T21):** `Feito` / `Parcial` / `Não feito` / `Regrediu` + evidência (arquivo:linha ou captura) + observação.
4. **Checagem na tela (E1–E20):** Passou / Falhou / Não testado, claro e escuro.
5. **Problemas encontrados**, por gravidade (P0 bloqueante, P1 grave, P2 médio, P3 menor), cada um com onde, como reproduzir e sugestão de correção.
6. **Regressões** contra a 1.12.0.
7. **O que não foi possível testar** (celular real, TalkBack etc.).
8. **Veredito:** `Aprovado`, `Aprovado com ressalvas` ou `Reprovado`, e a lista mínima do que falta para aprovar.

Termine com uma recomendação curta: o que o Codex deve refazer, o que o dono precisa testar no celular e se vale gerar a próxima release.

## 6. Critério de "pronto para release"
- `tsc` limpo, testes e testes de segurança verdes, sem `skip` novo.
- Nenhum P0 ou P1 aberto; P2 documentados.
- Tudo do passo 4 visto na tela nos dois temas e a 200% de fonte.
- `INVENTARIO-FUNCIONAL.md` atualizado com **testado / não testado** reais.
- Só então o dono decide commit, versão e release (ver `PENDENCIAS-PARA-FINALIZAR.md`, seção "Release").
