# Tarefas do Codex, pacote 10 (10 tarefas: lista de tarefas do projeto, só lógica)

O pacote 9 (`TAREFAS-CODEX-9.md`) continua **não executado**; faça-o antes, se puder. Este pacote cobre a seção F do `PLANO-RETOMADA-2.md` (extrato, contas, caixinhas, categorias, notificações) mais uma tarefa de mensagens do backup. O Claude liga cada módulo às telas depois. Ordem de valor: 1 a 10.

Estado: v1.10.0, 991 testes na suíte principal e 72 de segurança, `tsc` limpo, 0 falhas.

## Regras (as mesmas dos pacotes anteriores)

- Nunca `expo prebuild`. **Sem commit, push ou release**. Dados inventados; nenhuma chave de API, CNPJ ou chave de nota reais. Sem dependência nova.
- Funções puras em `src/*.mjs`, textos em português do Brasil, valores em centavos (inteiros seguros), sem rede, arquivo ou relógio dentro das funções (receba `now`). Nada de `eval`/`Function`.
- **Não edite** arquivos existentes. Só crie os listados. Leia os módulos existentes citados para **reutilizar** (importar) em vez de copiar.
- Cada tarefa traz: arquivo novo em `src/`, teste novo em `tests/`, e casos de borda (entrada vazia, `undefined`, objetos sem campos, `__proto__`, datas inválidas, 5 000 registros em menos de 100 ms, estado antigo sem o campo novo).
- Ao final rode `npm test`, `npx tsc --noEmit` e `node --test tests/security/*.test.mjs`. Teste novo que expõe defeito real pode falhar: prefixo "Achado:" e relate com exemplo mínimo.
- Entrega: um parágrafo curto, quantos testes passam, quais falham, e uma linha por módulo dizendo **onde o Claude deve ligar** (tela e campo novo, se houver).

---

## 1. Mensagens do backup em português claro

Arquivos: `src/shoppingBackupMessages.mjs`, `tests/shopping-backup-messages.test.mjs`.

Hoje `checkShoppingBackup` (`src/shoppingBackupCheck.mjs`) devolve erros como "Campo inválido: name." com `path` técnico (`shoppingItems[3].qty`). Crie `describeBackupIssue(error)` → texto como "Item 4 da lista: a quantidade é inválida." e `summarizeBackupIssues(errors, { max = 3 })` → `{ lines, more, text }` com agrupamento (ex.: "12 itens sem nome"). Cubra todos os `code` que o verificador emite (leia o arquivo e liste-os no teste), caminhos desconhecidos (mensagem genérica, nunca lance erro), e 200 erros. Mesma saída para a mesma entrada.

## 2. Filtros do extrato: conta, tag e faixa de valor

Arquivos: `src/statementFilter.mjs`, `tests/statement-filter.test.mjs`. Leia `src/tx-filters.mjs` e use-o por baixo; não duplique.

`applyStatementFilter(transactions, filter)` com `filter = { accountIds, tagIds, minCents, maxCents, types, text }` (todos opcionais, vazio = sem filtro), E entre campos e OU dentro de cada lista. `describeFilter(filter, { accounts, tags })` → texto curto para a faixa de "filtros ativos" e `activeFilterCount(filter)`. `sanitizeFilter(raw)` para ler do armazenamento (descarta lixo, `min > max` vira troca ou erro claro). Transferências contam para conta de origem **e** destino. Valor compara em módulo.

## 3. Calculadora no campo de valor

Arquivos: `src/amountExpression.mjs`, `tests/amount-expression.test.mjs`. Leia `src/calc.mjs`.

`evaluateAmount(text)` → `{ ok, cents, display }` ou `{ ok: false, message }`. Aceita `12,50+3,2*2`, `(10+5)/3`, `R$ 1.250,50`, `10%` de nada (erro claro), vírgula e ponto decimais do Brasil. Parser próprio (descida recursiva), sem `eval`. Limites: 100 caracteres, profundidade 20, resultado ≤ 99 999 999 999 centavos, divisão por zero, resultado negativo ("use o tipo de lançamento"), arredondamento meio para cima em centavos. `isExpression(text)` diz se a tela deve mostrar o botão "=".

## 4. Lixeira com purga

Arquivos: `src/trashPurge.mjs`, `tests/trash-purge.test.mjs`. Leia `src/trash.mjs`.

`planPurge(trash, { now, keepDays = 30, maxItems = 500 })` → `{ keep, purge, reasons }` (vence por idade; se passar de `maxItems`, os mais antigos saem primeiro). `restoreFromTrash(state, id)` devolve o novo estado ou `{ error }` em português (conta apagada, id repetido, categoria inexistente cai em "Outros"). `emptyTrashPlan(trash)` com contagem para a confirmação. Datas inválidas nunca purgam sozinhas (vão para `keep` com aviso).

## 5. Reordenar e arquivar contas

Arquivos: `src/accountOrder.mjs`, `tests/account-order.test.mjs`.

`moveAccount(accounts, id, toIndex)`, `archiveAccount(state, id)` e `unarchiveAccount`. Conta arquivada: some de seletores e do saldo total, **mantém** histórico e transações; não arquiva se o saldo ≠ 0 sem `force`, nem se há cartão ou transação futura ligada (devolva `{ error, blockers }` em português). `visibleAccounts(state, { includeArchived })`. Estado antigo sem `order`/`archived` deve funcionar (ordem = posição atual). Ordem estável e sem buracos; `normalizeOrder` repara duplicatas.

## 6. Caixinha separada de meta, e arquivar caixinha

Arquivos: `src/goalPots.mjs`, `tests/goal-pots.test.mjs`. Leia `src/goals.mjs`.

Hoje meta e caixinha andam juntas. Modele `pots` (caixinha: guarda dinheiro, sem prazo) separadas de `goals` (meta: alvo + prazo, pode apontar para uma caixinha). Funções: `migratePotsFromGoals(state)` (idempotente, sem perder centavos), `linkGoalToPot`, `depositToPot`/`withdrawFromPot` (nunca negativo), `archivePot(state, id)` (saldo precisa ir para outra caixinha ou conta: `{ error }` se ficar solto), `potSummary(state, now)`. Prova de soma: total antes = total depois em toda migração.

## 7. Ícone e cor em categorias e tags

Arquivos: `src/categoryStyle.mjs`, `tests/category-style.test.mjs`. Leia `src/categories.mjs`.

`ALLOWED_ICONS` (lista fechada, nomes de ícones que já existem em `src/ui/kit.tsx`; leia-o, **não** edite), `ALLOWED_COLORS` (paleta de 12 cores, incluindo `#FBB202`/`#FFCB45`/`#311E0D` da identidade). `sanitizeStyle(raw)` → `{ icon, color }` válidos ou o padrão; `readableOn(color)` devolve "#311E0D" ou "#FFFFFF" garantindo contraste WCAG AA (calcule a razão e teste todas as cores); `withStyle(category, style)`; `defaultStyleFor(name)` por palavra-chave ("mercado", "transporte"…). Backup antigo sem estilo recebe padrão sem mudar o resto. Rejeite cor fora da paleta e ícone fora da lista (nada de nomes arbitrários vindos do backup).

## 8. Duplicatas de notificação

Arquivos: `src/notificationDedupe.mjs`, `tests/notification-dedupe.test.mjs`. Leia `src/notification-import.mjs`.

O mesmo aviso do banco chega duas vezes (push + SMS, ou a notificação é atualizada). `notificationFingerprint(n)` (banco normalizado, valor, estabelecimento sem ruído, minuto arredondado) e `isDuplicateNotification(seen, n, { windowMs = 120000 })`, `rememberNotification(seen, n, now)` (puro: devolve novo `seen`, poda por idade e por tamanho máximo 500). Casos: mesmo valor em lojas diferentes **não** é duplicata; mesmo valor e loja com 3 min de diferença em compras reais (café) **não** deve sumir quando a janela passa; texto com emoji e acento; `seen` malformado.

## 9. Calendário do extrato

Arquivos: `src/statementCalendar.mjs`, `tests/statement-calendar.test.mjs`.

`monthGrid(transactions, { year, month, weekStart = 0 })` → semanas de 7 células `{ date, inMonth, incomeCents, expenseCents, count, level }` (`level` 0–4 para intensidade de gasto, por quantis do mês). `dayDetail(transactions, date)` e `monthTotals`. Mês de fevereiro e ano bissexto, mês começando no domingo e na segunda, transação com data inválida ignorada com contagem em `skipped`, fuso: use só a data ISO (`YYYY-MM-DD`), nunca `Date` local. Transferências não entram em receita nem despesa.

## 10. Várias despesas de uma compra (dividir por categoria)

Arquivos: `src/multiExpenseDraft.mjs`, `tests/multi-expense-draft.test.mjs`. Leia `src/shoppingSplit.mjs` e `src/shoppingReconcile.mjs`.

O formulário de despesa só aceita uma. Crie o rascunho em lote: `buildExpenseBatch(state, { date, accountId, split })` → lista de despesas `{ amountCents, category, description, date, accountId }` cuja soma é **exatamente** o total do carrinho (resto de centavos vai para a maior fatia, determinístico), `validateBatch(batch)` com mensagens em português, `batchDuplicates(state, batch)` usando `wouldDuplicate`, e `batchSummaryText(batch)` ("3 despesas: Mercado R$ 80,00 · Limpeza R$ 12,49 · …"). Itens sem preço ficam de fora e são listados em `skipped`. Máximo de 20 despesas por lote; carrinho vazio → `{ ok: false }`.

---

## Prompt de uma linha para o Codex

> Leia `TAREFAS-CODEX-10.md` na pasta do projeto e execute as 10 tarefas na ordem, respeitando as regras do arquivo.
