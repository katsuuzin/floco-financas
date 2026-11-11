# Tarefas do Codex, pacote 8

O pacote 7 foi recebido (884 testes, 64 de segurança, obrigado). Pendência do pacote 7: a **tarefa 11 (texto falado)** não saiu; ela volta aqui, mais curta (tarefa 1). Este pacote é o maior até agora. Ordem de valor: 1 a 16. Faça na ordem; entregue o que terminar.

## Regras (as mesmas)

- Nunca `expo prebuild`. **Sem commit, push ou release**. Dados inventados; nenhuma chave de API, CNPJ ou chave de nota reais. Sem dependência nova.
- Funções puras em `src/*.mjs`, textos em português do Brasil, valores em centavos, sem rede, arquivo ou relógio dentro das funções (receba `now`).
- **Não edite** arquivos existentes (nem os módulos dos pacotes 5, 6 e 7; `src/hardened.mjs` fica como está, o Claude já corrigiu os originais). Só crie os listados. Use `tests/helpers/shoppingFixtures.mjs` nos testes novos.
- Ao final rode `npm test`, `npx tsc --noEmit` e `node --test tests/security/*.test.mjs`. Hoje: 884 e 64 passando, 0 falhas. Teste novo que **expõe um defeito real do código existente** pode falhar: não conserte o teste; relate com exemplo mínimo e marque o `test` com o prefixo "Achado:".
- Entrega: um parágrafo curto com o que foi feito, o que ficou de fora, quantos testes passam e **quais casos falham**.

---

## 1. Texto falado para leitor de tela (retomada, versão curta)

Arquivo novo: `src/shoppingSpeech.mjs`, testes em `tests/shopping-speech.test.mjs`.

- Só quatro funções: `describeItem(item)`, `describeSummary(state)`, `describeProgress(sum)`, `describeMoney(cents)`.
- Valores **com dígitos**, não por extenso: `describeMoney(250)` → "2 reais e 50 centavos"; `describeMoney(100)` → "1 real"; `describeMoney(5)` → "5 centavos"; `describeMoney(0)` → "0 reais".
- Singular e plural corretos ("1 item", "2 itens"), sem símbolos soltos, emoji omitido, até 120 caracteres.
- Casos: 0, 1 e 2 itens; quantidade fracionada; item sem preço ("sem preço"); valor acima de R$ 1 milhão; nome vazio.

## 2. Testes de fronteira das linhas "P" da matriz de risco

Arquivo novo: `tests/shopping-gaps-3.test.mjs`.

Leia `MATRIZ-DE-RISCO-LISTA-DE-COMPRAS.md`. Para **cada linha com esforço "P"** que ainda não tem teste direto (ex.: C49 a C58: `formatElapsed`, `nextToGet`, `pendingByCategory`, `serialize`, `serializeSession`, `startSession`, `parseSession` no limite de `8.64e15`), escreva um teste. Nomes começando por "Matriz Cnn:".

## 3. Os dois defeitos conhecidos como testes que falham de propósito

Arquivo novo: `tests/shopping-known-defects.test.mjs`.

- **E01**: `parseShared("Lista 🛒\n- leite")` não deve devolver "Lista 🛒" como item (título de lista). Cubra também "Compras da semana", "LISTA DE COMPRAS:", "Mercado - 10/11".
- **E02**: `splitDraft(..., { mode: "category" })` deve gerar descrições diferentes por categoria ("Compra de mercado · Limpeza").
- Mais 5 defeitos que **você** achar lendo `src/shoppingImportShared.mjs`, `src/shoppingExport.mjs`, `src/shoppingSplit.mjs`, `src/shoppingDeals.mjs` e `src/shoppingBackupRepair.mjs`. Todos com prefixo "Achado:". Estes testes podem falhar; é o objetivo.

## 4. Migração das chaves de produto

Arquivo novo: `src/shoppingKeyMigration.mjs`, testes em `tests/shopping-key-migration.test.mjs`.

O Claude trocou `normalizeName`/`productKey` (decimal "1,5" vira "1.5"; letras de qualquer alfabeto ficam). Catálogos antigos têm chaves no formato velho.

- `migrateProductKeys(state)` recalcula a chave de cada produto com o `productKey` atual; se duas entradas passam a ter a mesma chave, **funde** (soma `buys`, une `prices` por `purchaseId` sem duplicar, limita a 24 por data, recalcula `lastBoughtAt`/`lastPriceCents`) e reaponta `productId` nos itens de `shoppingPurchases`.
- Idempotente, imutável, sem perder compra; devolve também `{ merged, rekeyed }` com contagens.
- Casos: catálogo vazio; chave já certa (nada muda); dois produtos que colidem; produto sem pontos; 5 000 produtos em menos de 300 ms; nomes em japonês.

## 5. Unidades e preço por kg ou litro

Arquivo novo: `src/shoppingUnits.mjs`, testes em `tests/shopping-units.test.mjs`.

- `parsePackSize("Arroz 5kg")`, "Leite 1L", "Suco 200 ml", "Detergente 500ml", "Ovos 12 un", "Papel higiênico 12x30m" → `{ amount, unit: "g"|"ml"|"un"|"m", text }` ou `null`.
- `pricePerBase(priceCents, size)` → centavos por kg, por litro ou por unidade, arredondando sem erro de centavo.
- `comparePacks(a, b)` diz qual sai mais barato por kg/litro e quanto (%), recusando unidades incompatíveis com mensagem em português.
- Casos: "1,5 L", "1.5L", "meio quilo" (não reconhecer), "2 x 500 g", tamanho 0, nome enorme, múltiplos tamanhos no nome (usar o último com unidade).

## 6. Categorias com aprendizado

Arquivo novo: `src/shoppingCategoryLearn.mjs`, testes em `tests/shopping-category-learn.test.mjs`.

- `learnCategory(state, name, category)` guarda a correção do usuário (por nome normalizado, máximo 500 regras); `categorizeLearned(state, name)` usa a regra aprendida antes do `categorize` padrão de `shopping.mjs`.
- Regras por prefixo ("Leite *" → Frios e laticínios) só quando a pessoa corrigir 3 nomes diferentes com o mesmo prefixo e categoria.
- `forgetCategory(state, name)`. Categoria inválida é recusada com mensagem.
- Casos: conflito (duas correções diferentes para o mesmo nome: vale a última); nome vazio; limite de regras (descarta a mais antiga); idempotência.

## 7. Receita para lista

Arquivo novo: `src/shoppingRecipe.mjs`, testes em `tests/shopping-recipe.test.mjs`.

- `parseRecipe(text, { servings, targetServings })` lê ingredientes ("2 xícaras de farinha", "300 g de queijo", "1/2 colher de sal", "3 ovos", "½ kg de carne", "sal a gosto") e devolve itens escalados para o número de porções.
- `recipeToItems(recipe, state)` converte para itens da lista, somando com os que já existem (mesmo nome e unidade), ignorando "a gosto" (aviso em `notes`) e itens que a pessoa já tem marcados como "tenho em casa" (`pantry: true`, se existir o campo).
- Frações "1/2", "½", "1 1/2"; unidades de cozinha (xícara, colher, pitada) viram texto no nome, sem converter para kg.
- Casos: texto vazio; 500 linhas; porções 0 ou negativas; escala 0,5 de "1 ovo"; linhas com bullets.

## 8. Código de compartilhamento da lista (sem servidor)

Arquivo novo: `src/shoppingShareCode.mjs`, testes em `tests/shopping-share-code.test.mjs`.

- `encodeShareCode(state, { now })` gera um texto compacto e seguro para URL (base64url) com versão, itens (nome, qtd, unidade, categoria, marcado) e **checksum**; limite de 4 000 caracteres (se passar, devolve `{ ok: false, reason }` em português).
- `decodeShareCode(text)` valida tudo (versão, checksum, tipos, limites de tamanho e de itens); **nunca lança**; recusa lixo, truncado, versão futura e `__proto__`.
- Ida e volta preserva a lista. Preços **não** vão no código (privacidade): teste que garante isso.
- Casos: 200 itens; emoji; nome de 120 caracteres; código com um caractere trocado (checksum recusa); 100 códigos aleatórios sem lançar erro.

## 9. Conciliar a compra com despesas que já existem

Arquivo novo: `src/shoppingReconcile.mjs`, testes em `tests/shopping-reconcile.test.mjs`.

- `findMatchingTransactions(state, purchase, { daysTolerance = 2 })` procura despesas já lançadas (por notificação, Pix ou extrato) com valor igual (ou até 1% de diferença) e data próxima, categoria de mercado ou descrição parecida com a loja.
- `suggestLink(state, purchase)` → `{ transactionId, confidence: "alta"|"média"|"baixa", reason }`, sem escolher quando houver duas candidatas empatadas (devolve a lista).
- Para evitar **despesa em dobro** ao "Finalizar e registrar despesa": `wouldDuplicate(state, draft)`.
- Casos: sem transações; duas iguais no mesmo dia; valor 1 centavo diferente; transação de receita (ignorar); transferências (ignorar); 20 000 transações em menos de 200 ms. Leia `src/finance.mjs` para o formato de `transactions`.

## 10. Leitor de XML da NFC-e (arquivo, sem rede)

Arquivo novo: `src/nfceXml.mjs`, testes em `tests/nfce-xml.test.mjs`.

- `parseNfceXml(text)` lê o XML do documento (`nfeProc`/`NFe`/`infNFe`: `ide`, `emit`, `det/prod`, `total/ICMSTot`, `pag`, `Id` com a chave) **sem DOMParser e sem dependências**, com um tokenizador linear simples; devolve o mesmo formato de `parseNfceHtml`.
- **Segurança**: recusar `<!DOCTYPE`, `<!ENTITY`, instruções de processamento fora do cabeçalho `<?xml`, CDATA gigante, profundidade acima de 40, mais de 500 itens, texto acima de 1,5 milhão de caracteres, valores negativos, quantidade acima de 99 999, chave com DV inválido (use `isChave`). Tempo máximo 500 ms em entradas hostis (bilhão de risadas, atributos gigantes, `<` sem fechar).
- Casos: XML sintético válido (gere no teste, com chave de DV válido); item sem `vProd`; `vDesc`; acentos e `&amp;`; BOM; `\r\n`.

## 11. Fuzz com semente fixa dos analisadores

Arquivo novo: `tests/fuzz-shopping.test.mjs`.

Gerador determinístico (`seededRandom` dos fixtures). Para cada analisador, 500 entradas aleatórias (texto, bytes, JSON quebrado, strings gigantes, Unicode estranho, `__proto__`): `parseShared`, `parsePastedList`, `parseItemText` (dentro de try), `parseNfceHtml` (dentro de try; só pode lançar `Error` com mensagem em português), `parsePurchasesJson`, `checkShoppingBackup`, `decodeShareCode` (depois da tarefa 8), `parseNfceXml` (depois da tarefa 10), `parseNfceInput`. Regras: nunca trava (200 ms por entrada), nunca devolve `undefined` onde o contrato promete objeto, nunca polui `Object.prototype`.

## 12. Revisão de segurança dos importadores (sem editar código) + testes hostis

Arquivos novos: `REVISAO-SEGURANCA-IMPORTADORES.md` e `tests/security/importers-hostile.test.mjs`.

Revise `shoppingImportShared`, `shoppingExport` (`parsePurchasesJson`), `shoppingBackupCheck`/`Repair`, `shoppingShareCode`, `nfceXml`, `pasteListAi`. Procure: prototype pollution, ReDoS, estouro de memória, injeção de fórmula na importação, nomes com caracteres de controle ou bidi (RLO), texto que vire instrução para a IA (prompt injection em lista colada), limites ausentes. Cada achado com arquivo, linha, exemplo mínimo e correção sugerida. Os testes hostis **podem falhar**; relate.

## 13. Textos de interface: consistência e tom

Arquivo novo: `tests/ui-copy-shopping.test.mjs` + `REVISAO-TEXTOS-LISTA-DE-COMPRAS.md`.

Varra as strings visíveis de `src/screens/ShoppingScreen.tsx`, `ShoppingTripScreen.tsx`, `PurchasesScreens.tsx`, `ScanNotaScreen.tsx`, `NfceConsultaScreen.tsx`, `ShoppingPastePanel.tsx` e das mensagens de erro dos módulos `src/shopping*.mjs`/`nfce*.mjs`. Teste: sem inglês, sem "..." (usar "…"), sem ponto final em botões, sem "Erro:" seco, sem exclamação em erro, maiúscula inicial, e termos fixos (sempre "carrinho", "lista de compras", "nota fiscal"; nunca "cesta", "NF" sozinho). O relatório lista cada inconsistência com arquivo e linha e a frase sugerida. Tom: curto, sem culpa, sem jargão.

## 14. Desempenho: orçamento de tempo dos módulos novos

Arquivo novo: `tests/shopping-perf.test.mjs`.

Estado sintético grande (2 000 itens, 600 produtos, 5 000 compras com 8 itens cada). Orçamentos com `performance.now()` e folga para máquina lenta (rode 3 vezes e use a mediana): `shoppingSummary`, `tripSummary`, `pendingByCategory`, `suggestPrices`, `searchItems`, `searchPurchases`, `suggestNames`, `monthlyReport`, `findDuplicatePurchases`, `mergeShoppingLists`, `checkShoppingBackup`, `repairShoppingBackup`, `migrateToLists`, `basketCompare`, `basketInflation`, `runningLow`. Falhe com mensagem que diga a função e o tempo medido. Liste no relatório da entrega os 5 mais lentos.

## 15. Roteiro de teste no celular real (atualização)

Arquivo novo: `ROTEIRO-TESTE-CELULAR-2.md`.

Complementa `ROTEIRO-TESTE-CELULAR.md` e `ROTEIRO-TESTE-EMULADOR-LISTA.md` só com o que **o emulador não faz**: QR ao vivo com iluminação ruim e nota amassada, câmera recusada e reconcedida, TalkBack (gestos por tela e por módulo), fonte 200% e exibição grande, modo avião no meio da consulta, voltar do Android em cada tela, rotação, economia de bateria, notificação real, app em segundo plano com o Modo compra aberto por 30 minutos. Passo numerado com **ação**, **esperado** e **registrar**; no fim, uma tabela em branco para o dono preencher (passo, passou/falhou, observação).

## 16. Rascunho de documentação dos pacotes 5 a 8

Arquivo novo: `RASCUNHO-DOCS-PACOTES-5-A-8.md`.

Rascunho (para o Claude revisar e integrar) das entradas de `INVENTARIO-FUNCIONAL.md` (uma linha de status por módulo: "lógica pronta, sem tela"), do `DESIGN.md` (padrões novos da lista: Modo compra, chips de preço sugerido, avisos de orçamento, com cores do tema), e de `CLAUDE.md` (somente fatos úteis ao Claude: nomes dos módulos, helpers de teste, regras de migração de chaves). Sem dado pessoal, sem promessas de funções não ligadas às telas.

---

Prompt de uma linha: **"Leia o TAREFAS-CODEX-8.md na pasta do projeto e execute as tarefas 1 a 16 na ordem."** Força: alta para 3, 4, 8, 10 e 12; média para o resto.
