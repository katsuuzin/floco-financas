# Tarefas do Codex, pacote 7

O pacote 6 foi recebido e revisado (ver `REVISAO-PACOTE-6.md`; leia antes). As 30 falhas de `tests/shopping-gaps*.test.mjs` **ficam como estão**: o Claude corrige o código existente depois. Este pacote é o maior até agora. Ordem de valor: 1 a 14. Faça na ordem; entregue o que terminar.

## Regras (as mesmas)

- Nunca `expo prebuild`. **Sem commit, push ou release**. Dados inventados; nenhuma chave de API, CNPJ ou chave de nota reais. Sem dependência nova.
- Funções puras em `src/*.mjs`, textos em português do Brasil, valores em centavos, sem rede, arquivo ou relógio dentro das funções (receba `now`).
- **Não edite** arquivos existentes (inclusive os módulos dos pacotes 5 e 6). Só crie os listados. Use `tests/helpers/shoppingFixtures.mjs` nos testes novos.
- Ao final rode `npm test`, `npx tsc --noEmit` e `node --test tests/security/*.test.mjs`. Hoje: 712 passam e 30 falham (as das lacunas); não pode aparecer falha nova além delas.
- Entrega: um parágrafo curto com o que foi feito, o que ficou de fora, quantos testes passam e **quais casos falham** com exemplo mínimo. Falha de teste novo contra código existente é achado: relate, não "conserte" o teste.

---

## 1. Versões "endurecidas" dos pontos frágeis (para o Claude trocar depois)

Arquivo novo: `src/hardened.mjs`, testes em `tests/hardened.test.mjs`.

Implemente, **sem tocar nos originais**, a versão correta de cada função fraca achada na revisão, com o mesmo nome precedido de `safe` (o Claude só troca o `import`):
`safeIsIsoDate` (calendário real, ano bissexto, 29/02), `safeCentsFromBr` (recusa negativo, aceita "1.234,56" e "1234,56", recusa "1,234.56" e notação científica), `safeHasUf(map, uf)` com `Object.hasOwn`, `safeIsChave` (só string, sem espaços, 44 dígitos, DV válido via `chaveDv`), `safeParseNfceInput` (recusa `p` repetido), `safeLineTotal` e `safeSum` (retornam `null` fora do inteiro seguro), `safeProductKey` (distingue "1,5" de "1 5"), `safePriceTrend` (nunca infinito).
Cada uma com pelo menos 10 casos, incluindo os exemplos mínimos de `INTEGRACAO-PACOTE-5-E-6.md`. Os testes novos **devem passar**.

## 2. Validador de backup da lista de compras

Arquivo novo: `src/shoppingBackupCheck.mjs`, testes em `tests/shopping-backup-check.test.mjs`.

- `checkShoppingBackup(data)` não altera nada: devolve `{ ok, errors: [{ path, code, message }], warnings }` para `shoppingItems`, `shoppingProducts`, `shoppingPurchases`: datas impossíveis, ids duplicados, referências órfãs (produto ausente, ponto sem compra), preço negativo, chave fiscal com DV inválido, tamanho de texto, limites de quantidade (2 000 itens, 24 pontos por produto), tipos errados.
- Mensagens em português para exibir ao usuário. Limite de 2 MB de JSON.
- Casos: backup antigo sem campos (válido), backup vazio, backup com 5 000 compras (menos de 300 ms), campos `__proto__` e `constructor`, arrays gigantes, ciclos impossíveis em JSON.

## 3. Reparo guiado do backup

Arquivo novo: `src/shoppingBackupRepair.mjs`, testes em `tests/shopping-backup-repair.test.mjs`.

- `repairShoppingBackup(data)` devolve `{ data, actions: [{ code, path, description }] }` com correções seguras (remover duplicata mantendo o mais recente, zerar preço negativo, descartar ponto órfão, cortar texto). **Nunca perde compra válida.** Idempotente: reparar de novo não muda nada.
- Propriedade-chave: depois de reparar, `checkShoppingBackup(...).ok === true`.
- Casos: dados já limpos (sem ações), tudo corrompido ao mesmo tempo, aleatório com semente fixa (200 estados sintéticos corrompidos de forma diferente, todos terminam válidos).

## 4. Sincronização/mesclagem de duas listas

Arquivo novo: `src/shoppingMerge.mjs`, testes em `tests/shopping-merge.test.mjs`.

- Para o futuro compartilhamento entre dois celulares: `mergeShoppingLists(a, b, { now })` mescla itens por `id`, resolve conflitos por `updatedAt` (último ganha), remoções com marca (`deletedAt`) vencem edição mais antiga, soma nada por engano. Determinístico e **comutativo**: `merge(a,b)` igual a `merge(b,a)`.
- `diffLists(a, b)` → `{ added, removed, changed }` para mostrar "o que mudou" antes de aceitar.
- Casos: ids iguais com nomes diferentes; relógio de um lado adiantado; item marcado em um lado e editado no outro; 2 000 itens de cada lado em menos de 200 ms; propriedades de comutatividade e idempotência com 100 pares aleatórios (semente fixa).

## 5. Desfazer e refazer da lista

Arquivo novo: `src/shoppingUndo.mjs`, testes em `tests/shopping-undo.test.mjs`.

- Pilha de estados com `pushUndo(history, state, label)`, `undo`, `redo`, limite de 30 passos, e `describeUndo(history)` ("Desfazer: remover Leite"). Compactar passos repetidos do mesmo tipo em menos de 2 s (receba `now`).
- Casos: refazer some depois de uma ação nova; pilha cheia; estados grandes não são copiados profundamente (use compartilhamento estrutural; teste que o objeto não mudado mantém a mesma referência).

## 6. Busca e filtros da lista e do histórico

Arquivo novo: `src/shoppingSearch.mjs`, testes em `tests/shopping-search.test.mjs`.

- `searchItems(state, query, { category, inCart, priced })` e `searchPurchases(state, query, { store, from, to, minCents, maxCents })`, ignorando acento/caixa, tolerando um erro de digitação (distância de edição 1 em palavras de 5+ letras), ordenando por relevância e depois por data.
- Casos: consulta vazia (tudo), só espaços, consulta enorme, 5 000 compras em menos de 100 ms, acentos combinados (NFD), emojis, `from` depois de `to`.

## 7. Autocompletar ao digitar

Arquivo novo: `src/shoppingAutocomplete.mjs`, testes em `tests/shopping-autocomplete.test.mjs`.

- `suggestNames(state, prefix, { limit = 6, now })` usando histórico, itens recentes e frequência (recência pesa mais que frequência), sem repetir o que já está na lista e sem sugerir o que a pessoa removeu 3 vezes seguidas.
- `completeQuantity(text)` entende "2 le" → sugere quantidade 2 com prefixo "le".
- Casos: prefixo de 1 letra, acentos, nomes iguais com unidades diferentes, histórico vazio, 5 000 produtos em menos de 50 ms.

## 8. Listas múltiplas e modelos

Arquivo novo: `src/shoppingLists.mjs`, testes em `tests/shopping-lists.test.mjs`.

- Modelo de dados e funções puras para várias listas (Mercado, Feira, Farmácia): `createList`, `renameList`, `archiveList`, `moveItem(state, itemId, toListId)`, `saveAsTemplate(state, listId)` e `fromTemplate(template, now)`.
- `migrateToLists(state)`: converte o estado atual (uma lista só) para o novo formato sem perder item, preço, carrinho, histórico; reversível (`flattenLists`) para backups antigos. Idempotente.
- Casos: lista com 2 000 itens; nome duplicado; arquivar a última lista (proibido, mensagem em português); migrar duas vezes; ida e volta idêntica.

## 9. Relatório mensal da lista de compras

Arquivo novo: `src/shoppingReport.mjs`, testes em `tests/shopping-report.test.mjs`.

- `monthlyReport(state, { month, now })` → total gasto, número de idas, ticket médio, dia da semana mais frequente, categoria que mais pesou, comparação com o mês anterior (percentual e frase em português neutra), economia por promoções (`shoppingDeals`), itens sem preço.
- Frases sem culpa ("Você gastou 12% menos que em outubro").
- Casos: mês sem compras; primeiro mês (sem anterior); virada de ano; compras em datas limite (primeiro e último segundo do mês, sem depender do fuso); valores gigantes saneados.

## 10. Detecção de nota fiscal repetida e de compra duplicada

Arquivo novo: `src/shoppingDuplicates.mjs`, testes em `tests/shopping-duplicates.test.mjs`.

- `findDuplicatePurchases(state)` por chave fiscal igual **ou** (mesma loja, mesmo total, mesma data e itens muito parecidos); `mergeDuplicates(state, group)` mantendo a compra mais completa.
- Casos: mesma nota lida duas vezes (QR e manual); duas compras reais iguais no mesmo dia (não são duplicata se as horas forem diferentes e as chaves também); 5 000 compras em menos de 300 ms; chaves ausentes.

## 11. Texto de acessibilidade falado para a lista e o Modo compra

Arquivo novo: `src/shoppingSpeech.mjs`, testes em `tests/shopping-speech.test.mjs`.

- Funções puras que montam o texto que o leitor de tela fala: `describeItem(item)`, `describeSummary(state)`, `describeProgress(sum)`, `describeDeal(result)`, números por extenso quando útil ("dois reais e cinquenta centavos"), sem símbolos soltos, singular/plural corretos, sem passar de 120 caracteres.
- Casos: 0, 1, 2 itens; centavos zerados; valores acima de R$ 1 milhão; nomes com emoji (omitir); quantidade fracionada.

## 12. Revisão de acessibilidade estática das telas (sem editar código)

Arquivo novo: `REVISAO-ACESSIBILIDADE-TELAS-NOVAS.md`.

Leia `ShoppingTripScreen.tsx`, `PurchasesScreens.tsx`, `ScanNotaScreen.tsx`, `NfceConsultaScreen.tsx`, `ShoppingPastePanel.tsx`, `ShoppingScreen.tsx`. Liste: alvos de toque abaixo de 44 dp, contraste (calcule com as cores de `src/ui/theme`, claro e escuro, incluindo o amarelo #FBB202 sobre branco), ordem de foco, rótulos ausentes, textos que quebram com fonte 200%, estados de carregamento sem anúncio. Para cada achado: arquivo e linha, gravidade, correção sugerida em uma frase.

## 13. Roteiro de teste no emulador, passo a passo

Arquivo novo: `ROTEIRO-TESTE-EMULADOR-LISTA.md`.

Roteiro numerado, cada passo com **ação**, **resultado esperado** e **o que observar** para: lista, Modo compra (com e sem preço, tema claro e escuro, fonte grande), leitor de nota (colar chave, prévia, conferência), histórico, ritmo, colar lista, backup e restauração. Marque quais passos o emulador não consegue (câmera ao vivo, TalkBack real).

## 14. Matriz de risco consolidada

Arquivo novo: `MATRIZ-DE-RISCO-LISTA-DE-COMPRAS.md`.

Uma tabela única juntando: as 30 falhas, os 2 defeitos extras de `REVISAO-PACOTE-6.md`, os pontos de `REVISAO-SEGURANCA-WEBVIEW-2.md` e `COBERTURA-LISTA-DE-COMPRAS.md`. Colunas: id, descrição, arquivo, impacto no usuário, probabilidade, esforço de correção (P/M/G), dependência (ex.: "precisa de migração de backup"), e ordem de correção sugerida. Termine com os 10 primeiros itens para um único lote de correção.

---

Prompt de uma linha: **"Leia o TAREFAS-CODEX-7.md na pasta do projeto e execute as tarefas 1 a 14 na ordem."** Força: alta para 1, 2, 3, 4 e 8; média para o resto.
