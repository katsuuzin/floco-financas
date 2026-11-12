# Plano de correções para o Codex — Floco Finanças

Origem: `AUDITORIA-IMPECCABLE.md` (12/11/2026, versão 1.12.0). Este arquivo é a **lista de trabalho**: cada tarefa tem arquivos, passos e critério de aceite. Leia a auditoria só se precisar da evidência (os IDs `S1`, `H1`, `T1`… apontam para lá).

## 0. Regras do projeto (obrigatórias)

Leia antes: `CLAUDE.md`, `DESIGN.md`, `INVENTARIO-FUNCIONAL.md` (tabela e parágrafos recentes).

- App Android React Native/Expo, pt-BR, respostas e textos de interface **em português**. Nada de inglês na tela.
- **Nunca rode `expo prebuild`** (apaga widgets, manifest e ícones feitos à mão em `android/`).
- **Não faça commit, push nem release** sem o dono pedir. Se pedir commit, termine a mensagem com `Co-Authored-By:` do modelo usado.
- Ambiente, Node e build: seção "Ambiente" do `CLAUDE.md` (PATH do PowerShell, `.\scripts\ambiente.ps1`). Build para o emulador: `.\build-android.ps1 -Architecture x86_64` (3 a 5 min, rodar em segundo plano). Emulador `emulator-5554`.
- **Antes de dizer que terminou, em cada tarefa:** `npx tsc --noEmit` limpo, `npm test -- --test-concurrency=1` verde (hoje 1125 testes), `node --test tests/security/` verde (hoje 119), e conferir no emulador nos temas **claro e escuro**. Informe o que **não** foi testado (celular real, TalkBack).
- Ao concluir uma função, **atualize `INVENTARIO-FUNCIONAL.md`** (o que mudou, testado, não testado).
- Testes de segurança que costumam barrar: `tests/security/theme-static.test.mjs` (cor fixa em tela nova exige exceção justificada) e `tests/security/a11y-static.test.mjs` (texto de conteúdo não pode ter `numberOfLines` em telas protegidas). `tests/security/screens-contract.test.mjs` lista as rotas: se mudar rotas, ajuste.
- Arquivos com **fim de linha misto (CRLF/LF)**: detecte `\r\n`, normalize para editar e grave igual ao original. Não reescreva arquivos inteiros à toa.
- **Toque no emulador só depois de conferir a tela.** Use `analysis/adbf.sh` (`tap`, `swp`, `shot`) e, melhor, `analysis/s.sh` (`tapt "texto"` acha o botão pelo texto, `ensure` garante que o Floco está na frente). Depois de `back` pode ter saído do app.
- Padrões que **já existem e devem ser reaproveitados**: `SheetModal` e `ConfirmSheet` (`src/ui/Sheet.tsx`), `perform(change, mensagem, { undoable: true })` (`src/app/store.tsx`, mostra "Desfazer"), `Toggle`, `Segmented`, `ListItem`, `Group`/`Row`, `Button`, `Field`, `AmountField`, `Choice`, `DateField` (`src/ui/kit.tsx`).
- Uma tarefa por vez. Commits só se pedido; mesmo assim, não misture tarefas num mesmo commit.

## 1. Decisões já assumidas (o dono ainda não respondeu; use estas e registre no inventário)

1. **Análise** (visual Calen) **não** muda de linguagem agora. Só corrigir cortes, nomes e controles (A1, A2, A3, A5, A7, A8).
2. **Vencido** = data **anterior a hoje** (sem tolerância). Vencimento hoje = "vence hoje".
3. **Backup, Importar e Exportar** ficam **só em Mais › Importar e exportar**; Configurações perde as cópias (deixar um link).
4. APK **arm64** como arquivo extra: fora deste plano.

---

## ONDA 1 — risco e confiança (fazer primeiro)

### T01 · Textos velhos depois das fusões de Mais (S10) — esforço P
- `src/screens/ToolScreens.tsx:167`: trocar "use “Importar comprovante”" por "use Mais › Importar e exportar › Foto ou comprovante".
- `src/screens/analysis/LegacyBlocks.tsx:242` e `src/usage.mjs:20`: "Relatórios avançados" → **"Relatórios"**.
- `src/finance.mjs:256`: "em Quem eu devo" → "em Entre pessoas › Eu devo".
- `src/app/forms.ts:243`: "AAAA-MM-DD" → "DD/MM/AAAA".
- Procurar com `grep -rn "Importar comprovante\|Relatórios avançados\|AAAA-MM-DD\|Quem eu devo" src App.tsx` e conferir cada ocorrência de texto visível.
- **Aceite:** nenhuma tela cita entrada de menu que não existe; testes ajustados se citarem o texto antigo.

### T02 · Estado "vencido" em todo o app (S4, CC1) — esforço M
**Problema:** fatura do cartão e pendências com data passada aparecem sem aviso; Lembretes diz "Nada vence nos próximos 7 dias".
- Criar helper puro `overdueItems(state, today)` em `src/reminders.mjs` (ou `finance.mjs`), com teste em `tests/`. Considerar:
  - lançamentos `!confirmed`, sem `cardId`, `type` despesa/receita, `date < today`;
  - faturas: para cada cartão não arquivado, `invoiceDueDate(card, mês)` `< today` e `invoice(...).due > 0` (varrer do mês mais antigo com lançamento até o atual, não só `-1..2` como em `dueItems`);
  - `payables` e `receivables` com `dueDate < today` e saldo `> 0`.
  - Retorno: `{ kind: "pagar"|"receber", label, amount, date, days }` ordenado do mais atrasado.
- **Início** (`src/screens/HomeScreen.tsx`): bloco "Atrasadas" no topo (acima de "Pendências do mês") só quando houver, com ícone + texto "Vencida há N dias" + valor, cada linha abre a tela certa. Cor vermelha **e** texto (nunca só cor). Registrar o bloco em `src/layout.mjs` (`HOME_BLOCKS`) respeitando a ordem e o "Personalizar".
- **Cartões** (`OrganizeScreens.tsx`, cartão e "Fatura do mês"): se a fatura em aberto venceu, mostrar selo "Vencida há N dias" ao lado de "Vence dd/mm/aaaa".
- **Transações** (`TransactionRow.tsx`): selo "Atrasado" junto de "Pendente" quando `date < today` e `!confirmed`.
- **Lembretes** (`src/screens/RemindersScreen.tsx`): seção "Atrasadas" antes de "Próximos 7 dias"; o texto "Nada vence…" só se não houver atrasadas também. `planReminders` (`reminders.mjs`) pode incluir uma notificação "N contas atrasadas" (manter `limit`).
- **Aceite:** com os dados de teste (fatura Cartão Itaú vence 10/11, aluguel pendente 10/11, hoje 12/11) aparecem em Início, Cartões, Transações e Lembretes; testes unitários do helper (hoje, ontem, parcial pago, cartão, payables).

### T03 · Ações da transação sem `Alert` do sistema (S3, T1) — esforço M
**Arquivo:** `src/screens/TransactionRow.tsx` (função `options`, ~linha 59–112, usa `Alert.alert`).
- Trocar por um `SheetModal` "Ações do lançamento" com: cabeçalho (descrição, valor · data · categoria), **Editar** (principal), **Marcar como pendente/Confirmar**, **Ver dívida…** quando aplicável, e **Excluir** separado no fim, em vermelho.
- **Excluir direto** com `perform(..., "Lançamento movido para a lixeira", { undoable: true })` e **sem** a segunda confirmação (a Lixeira já protege 30 dias). Manter confirmação só para parcelas ("todas as parcelas") e para `financingId`.
- Manter as mesmas regras de quando cada ação aparece (financiamento, ajuste, rendimento, pagamento de fatura, `loanSettlement`, `payableId`).
- **Aceite:** tocar na linha abre a folha com cantos e tema do app (claro e escuro), Editar em destaque; excluir mostra "Desfazer" por ~10 s e o desfazer restaura; rótulos falados presentes.

### T04 · Fonte grande (200%) sem quebrar a interface (S2) — esforço M
Testar com `adb shell settings put system font_scale 2.0` (e **voltar a `1.0` no fim**). Corrigir:
- **Barra inferior** (`App.tsx`, `TABS` ~290 e `TabButton`): `maxFontSizeMultiplier={1.2}` no rótulo, `numberOfLines={1}`; "Transações" nunca parte no meio.
- **Valores** (`HomeScreen.tsx` cartões Receitas/Despesas, saldo, e `kit.tsx` onde houver valor grande): `numberOfLines={1}` + `adjustsFontSizeToFit` com `minimumFontScale` ~0.7; nunca quebrar dígitos.
- **Linhas de transação** (`TransactionRow.tsx`): com `fontScale > 1.3`, descrição até 2 linhas e a meta (categoria · conta) numa segunda linha; total do dia (`TransactionsScreen.tsx`) não pode sair da tela.
- **Análise** (`ui/calen.tsx`, `screens/analysis/*`): abas "Resumo/Categorias/Tipos/Fluxo/Mais" e segmentados "Tudo/Conta/Cartão", "Cor/Gasto/Recebido/Saldo": `maxFontSizeMultiplier` ≤ 1.3 ou virar coluna/rolagem horizontal quando `fontScale >= 1.5` (o `Segmented` do `kit.tsx` já vira coluna; replicar a regra no segmentado do Calen).
- Placeholder da busca ("Buscar por descrição ou valor") sem cortar: texto menor ou `numberOfLines` só no placeholder.
- Respeitar `tests/security/a11y-static.test.mjs` (sem `numberOfLines` em texto de conteúdo de telas protegidas); se precisar, restrinja a rótulos de controle e justifique no teste.
- **Aceite:** a 100%, 150% e 200% nenhum valor monetário quebra dígitos e nenhum rótulo da barra parte; capturas antes/depois no inventário.

### T05 · "Leitura automática" compacta na Início (H1) — esforço P
**Arquivo:** `src/screens/HomeScreen.tsx` (~256–272).
- Sem permissão: cartão curto com título, 1 linha de explicação e **um botão** "Ligar leitura das notificações" (abre `inbox.native.openSettings`). As instruções 1 e 2 e o link "Abrir informações do app" vão para uma `SheetModal` "Como ligar".
- Botão "Agora não" que oculta o cartão por 7 dias (guardar em `settings`, validar em `validateBackup` se entrar no backup).
- **Aceite:** o cartão ocupa no máximo ~1/4 da tela; Pendências e Contas aparecem na primeira tela.

### T06 · Notificações bancárias vira tela normal (S1 início, N1, N2) — esforço M
**Arquivos:** `src/NotificationsPanel.tsx` (painel legado), `App.tsx` (lista de painéis "headless" ~407–436).
- Reescrever como rota normal (`src/screens/NotificationsScreen.tsx`) usando `Group/Row`, `Toggle`, `Button`, `Chips`; remover `SafeAreaView`, botão "Voltar" próprio e `Switch` cru (linhas 234, 281, 288).
- **Bancos monitorados:** mostrar só os selecionados + "Principais" (Nubank, Inter, Itaú, Bradesco, Santander, Caixa, BB, C6, Mercado Pago, PicPay) e um botão "Ver todos (34)" que abre uma folha com busca.
- **N2:** enquanto o acesso do Android não estiver permitido, o interruptor "Ler notificações dos bancos" fica **desabilitado** com a frase "Permita o acesso primeiro".
- Rota `notifications` passa a ser renderizada por `renderRoute` (tirar de `headless`); título no `TITLES` do `App.tsx`; manter os pontos de entrada (Mais, Configurações, Início).
- **Aceite:** mesma aparência de cabeçalho e botões das outras rotas; funcionalidades e textos preservados; testes de contrato de telas atualizados.

---

## ONDA 2 — consistência

### T07 · Migrar os demais painéis legados (S1, I3, I4, SG1) — esforço G
Mesma receita da T06, um painel por vez, nesta ordem: `UpdatesPanel.tsx`, `SecurityPanel.tsx`, `ImportsPanel.tsx`, `ReceiptPanel.tsx`, `PlanningPanel.tsx` (só o que ainda for usado: **Categorias e tags** e **Relatório personalizado**; o resto do `PlanningPanel` é código morto — remover as páginas `receivables`, `financings`, `installments`, `recurrences`, `projections` se nada mais usar, conferindo com `grep`).
- `ImportsPanel`: selecionar a **primeira conta por padrão** e usar `Choice` do kit (hoje "✓" em texto e nenhuma conta marcada, linhas 257–267); trocar o `Switch` (linha 301) por `Toggle`.
- `SecurityPanel`: "Salvar PIN" como botão principal (não tonal).
- Depois de cada migração, tirar a rota da lista "headless" do `App.tsx` e rodar a bateria de testes.
- **Aceite:** o `App.tsx` não tem mais painéis com cabeçalho próprio; um único estilo de cabeçalho.

### T08 · Cores do sistema que vazam e `Switch` cru (S6) — esforço P
- `kit.tsx` (`Field`, `AmountField`, ~263 e ~608): `selectionColor` e `cursorColor` com a cor de destaque do tema.
- Nenhum `<Switch` fora do `Toggle` do `kit.tsx` (`grep -rn "<Switch" src App.tsx`).
- **Aceite:** cursor, alças de seleção e interruptores usam amarelo/marrom do app em ambos os temas.

### T09 · Alvos de 48 dp e fontes de 12 (S7) — esforço M
- Criar constantes em `src/ui/kit.tsx` (ex.: `touch = { min: 48 }`, `type.caption = 12`).
- Trocar `minHeight: 44/40/46` por 48 (ou manter visual menor com `hitSlop` até 48): `FormScreen.tsx:249,265`, `InboxSheet.tsx` (102,137,140,157), `NotificationsPanel.tsx:266` (some na T06), `ui/calen.tsx:39`, `kit.tsx:826,835,928`, `pickers.tsx:181,281`.
- Trocar `fontSize` 9–11 por **12** (mínimo): `HomeScreen.tsx:96,106,171`, `TransactionRow.tsx:168`, `OrganizeScreens.tsx:156,157,278,319`, `AssistantScreen.tsx:158,199,253`, `SettingsScreen.tsx:127,158`, `ReportScreens.tsx:185,545`, `PersonalizeScreens.tsx:179`, `ui/calen.tsx:68,124`.
- **Aceite:** `grep -rn "fontSize: \(9\|10\|11\)\b" src` sem resultados em UI; nada quebra a 100% e 200% (conferir T04).

### T10 · Voltar do Android não perde o que foi digitado (S5, F7) — esforço P
- Em `FormScreen.tsx` (e no formulário de dívida/valor a receber, `InboxSheet.tsx`): detectar formulário "sujo" (qualquer campo diferente do estado inicial) e, no `BackHandler`/botão voltar/X, abrir `ConfirmSheet` "Descartar este lançamento?" com **Continuar editando** (principal) e **Descartar**.
- Formulário vazio fecha direto.
- **Aceite:** digitar valor + descrição e tocar voltar abre a confirmação; nada é perdido; teste de comportamento no emulador.

### T11 · Validação perto do campo e "Mais detalhes" (F1, F2) — esforço P
- `FormScreen.tsx`: ao falhar a validação, **rolar até o campo com problema**, borda vermelha, foco e mensagem logo abaixo dele (hoje a mensagem fica junto do botão "Salvar" e o campo Valor está fora da tela).
- "Mais detalhes" (`FormScreen.tsx:348`): chevron que gira, estado `aria-expanded`, mesma altura e estilo de um cabeçalho de seção tocável.
- **Aceite:** "Salvar" com valor zero leva ao campo Valor com a mensagem; "Mais detalhes" parece abrir/fechar.

### T12 · Valor digitado com prévia (E1) — esforço P
- `AmountField` (`kit.tsx:608`): mostrar abaixo/ao lado "= R$ 1.234,00" enquanto digita (digitar `1234` vale R$ 1.234,00); formatar milhar ao sair do campo. Pré-preenchimentos como "50000,00" em `PayablesScreen`/`ReceivablesScreen` (`decimal`) devem sair com milhar ("50.000,00") se o parser aceitar; **teste unitário** do parser com `1.234,56`, `1234`, `12,3`, `0,5`.
- **Aceite:** nenhuma entrada antes aceita passa a falhar; testes de `parseMoney` verdes.

### T13 · Padrão de criar/editar/apagar (S8, C1, O2, G1, LX1) — esforço M
- Componente `CreateAction` (botão cheio no topo da tela) usado em Contas, Orçamento, Metas, Recorrências, Entre pessoas, Dívidas, Listas. Remover os links "Adicionar"/"Criar".
- Ação por linha: toque abre detalhe; ações secundárias num `⋮` (menu em `SheetModal` com texto): Contas (olho/arquivar), Orçamento (editar/apagar), Metas (Arquivar/Excluir; escolha da caixinha numa folha), Lixeira (restaurar/apagar de vez).
- **Lixeira:** "✕" vira ícone de lixeira com `ConfirmSheet` "Apagar de vez"; separado do restaurar; texto "Apaga em N dias" em vez de "30 dias" (`TrashScreen.tsx`).
- **Aceite:** nenhum ícone destrutivo ao lado de ícone de edição; todas as ações com texto no menu; Desfazer onde reversível.

### T14 · Duplicidades e densidade (S11, S12, I1, I2, CO1) — esforço M
- **Configurações** perde "Seus dados" (Importar extrato, Salvar/Restaurar backup, Exportar CSV); em troca uma linha "Importar, exportar e backup" que abre **Mais › Importar e exportar**. Manter "Notificações bancárias" e "Categorização automática" só em um lugar (Mais), com link em Configurações > Notificações.
- **Importar e exportar:** reduzir "Extrato OFX / Extrato em PDF / Planilha CSV" para uma linha **"Importar extrato"** (subtítulo "OFX, PDF, CSV ou Excel"); oito botões tonais viram `ListItem` agrupados (Importar · Backup · Exportar) com espaçamento.
- **Transações:** remover "Tipos de lançamento" de dentro de Filtros (já existem os chips Todas/Receitas/Despesas/Transferências); transformar o painel inline de filtros em `SheetModal` com contador de filtros ativos e "Limpar".
- **Análise › Categorias:** agrupar os controles (ordem/visão num menu `⋮`), manter só o essencial visível.
- Antes de esconder algo por uso, **pedir ao dono o resultado de "Uso dos botões"** (Configurações › Ajuda). Sem esse dado, fazer só as duplicidades óbvias acima.
- **Aceite:** cada função tem um único caminho principal; testes de contrato de telas ajustados.

### T15 · Erros do formulário de orçamento e estados do item (O3, L1, N2) — esforço P
- `FormScreen.tsx:566–568`: no orçamento, listar **só categorias do tipo escolhido** (despesa ou receita) e agrupar em "Principais" + "Mais".
- Placeholder "0,00" em "Valor (R$)"; "Onde (vazio = todas…)" vira chip "Todas as contas" já selecionado.
- Folha do item da lista (`ShoppingScreen.tsx`): botões **No carrinho / Faltou / Depois** — o estado atual sempre **preenchido**, os outros contornados.
- **Aceite:** orçamento de despesa não mostra Salário/Freelance/Investimentos/Renda Extra/Aluguéis; o estado do item é óbvio.

---

## ONDA 3 — acabamento

### T16 · Cortes e nomes da Análise e Transações (A1, A2, A3, A5, A7, A8, T2, T4, T5) — esforço M
- Faixa Resultado/Entrada/Saída/Saldo previsto da Análise (`CalendarCard.tsx`/`SummaryTab.tsx`): grade 2×2 em vez de rolagem cortada.
- Dois segmentados da Análise Resumo: um só + menu; botão "⤡" ganha rótulo/tooltip.
- Aba **"Mais" da Análise** → **"Resumo do mês"**; remover o que repete a aba Categorias (`LegacyBlocks.tsx`).
- Aba **Tipos** com um só tipo: esconder a barra 100% laranja.
- Um `MonthNav` para todas as abas (`MonthNav.tsx`); Fluxo: botão "+" com texto "Adicionar receita".
- **Transações:** resumo "N lançamentos · R$ …" em linha própria, com "resultado" no texto; calendário com **legenda** e **hoje** marcado.

### T17 · Início e Contas (H2, H3, H4, H5, H6, C2) — esforço P
- Contas: rotular "Saldo" e "Previsto" nos próprios valores (ou mostrar só um).
- Ações das seções padronizadas em **"Ver tudo"**; "Vamos começar" recolhe itens concluídos.
- Aviso ao ocultar valores: "Valores ocultos"/"Valores visíveis".
- "Já deve estar acabando": botão com texto "Adicionar à lista" e "há N dias sem comprar".

### T18 · Orçamento, Metas e telas menores (O1, G2, P1, P2, R1, CZ1, F3–F6, M1, M2, CO2–CO4, AS1, AS2, PE1) — esforço M
- Orçamento: subtítulo em 2 linhas fixas; "N de N ciclos fecharam dentro do teto" só no detalhe ou quando houver estouro.
- Metas: tirar o rótulo "Planejamento" redundante.
- Projeções: chip "E se…" → "Cenário"; remover "Menor folga" quando for igual ao saldo final.
- Recorrências: esconder os dois cartões "R$ 0,00/mês" quando vazio.
- Categorização automática: exemplos tocáveis e texto "regras com prioridade maior vencem".
- Nova conta: cores com **amostra** (bolinhas) como em Configurações; Transferir: texto de ajuda sem falar de categoria; "Tipo de gasto" → "Pode cortar" no lugar de "Cortável"; folha "Adicionar" (+) usar o `SheetModal`.
- Mais: remover o cartão "Sempre livre"; renomear a tela "Listas" para "Listas de compras".
- Configurações: "Uso dos botões" sai de "Ajuda" para "Avançado"; zona de perigo separada para "Apagar todos os dados"; cor "Turquesa" sem sobrar sozinha.
- Assistente: sem nota "Boa 68/100" quando faltar histórico (mostrar "Dados insuficientes"); "pendência(s)" → plural correto (`insights.mjs:270`); espaço entre texto e botão ("Registrar nota…", "Gerar resumo local").
- Personalizar: nome do bloco "Pendentes das notificações" = "Leitura automática".

### T19 · Erros engolidos e Desfazer (S9, S13) — esforço P
- Helper `softFail("mensagem")` que mostra o aviso padrão; usar nos `.catch(() => {})` com efeito para o usuário (abrir configurações, anexos `ui/Attachments.tsx`, foto `ui/ItemPhoto.tsx`, lista `ShoppingScreen.tsx`/`ShoppingTripScreen.tsx`, `HomeScreen.tsx`, `SettingsScreen.tsx`). Manter silêncio só em tarefas de fundo (`usageTracker.ts`, `usePublicUpdates.ts`).
- Padronizar `{ undoable: true }` nas ações reversíveis (excluir lançamento já na T03).

### T20 · Desempenho com volume (S15) — esforço M (investigar antes)
- Gerar um backup fictício com ~2.000 lançamentos (usar `entrega/backup-ficticio-ritmo.json` como base) e medir: abrir Transações, rolar, filtrar, Histórico de compras, Lixeira, prévia de importação.
- Só se houver engasgo (>100 ms por interação ou queda de quadros), migrar a lista que engasgar para `FlatList`/`SectionList`. Registrar números no inventário.

### T21 · Tela grande e orientação (S14) — esforço P, opcional
- Só se o dono pedir. Hoje: `android:screenOrientation="portrait"` no `AndroidManifest.xml` (editar à mão, sem prebuild) e `app.json`.

---

## 2. Ordem sugerida e dependências

1. **T01** (5 min) → **T02** → **T03** → **T04** → **T05** → **T06** (Onda 1).
2. **T08, T09, T10, T11, T12** (rápidas e independentes) → **T07** (depende da T06 como modelo) → **T13, T14, T15**.
3. **T16–T20** por último. **T14** só depois de o dono mandar o "Uso dos botões".

## 3. Como entregar cada tarefa

Para cada tarefa, responda curto (português) com: o que mudou, arquivos, testes novos, resultado de `tsc`/`npm test`/`node --test tests/security/`, o que foi conferido no emulador (claro/escuro, 100%/200%) e **o que não foi testado**. Atualize `INVENTARIO-FUNCIONAL.md`. Não faça commit sem pedido.

## 4. Fora do escopo

- Mudar a identidade visual (mascote, amarelo, marrom, Sora) ou o visual Calen da Análise (decisão do dono).
- Sincronização/Google Drive, widgets novos, qualquer envio de dados para fora do aparelho.
- Itens que dependem de aparelho real: TalkBack, biometria, câmera/OCR, voz, notificações reais — listar como "não testado".
