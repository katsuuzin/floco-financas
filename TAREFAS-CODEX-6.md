# Tarefas do Codex, pacote 6

O pacote 5 foi recebido (obrigado: 634 testes). Neste pacote o Claude já corrigiu as falhas do pacote 4 (`hrefMatchesKey` em `src/nfceParse.mjs`, `accessibilityLiveRegion`). Este pacote é grande de propósito. Ordem de valor: 1 a 12. Faça na ordem; entregue o que terminar.

## Regras (as mesmas)

- Nunca `expo prebuild`. **Sem commit, push ou release**. Dados inventados; nenhuma chave de API, CNPJ ou chave de nota reais. Sem dependência nova.
- Funções puras em `src/*.mjs`, textos em português do Brasil, valores em centavos, sem rede, arquivo ou relógio dentro das funções (receba `now`).
- **Não edite** arquivos existentes. Só crie os listados. Importe dos existentes lendo o que exportam.
- Ao final rode `npm test`, `npx tsc --noEmit` e `node --test tests/security/*.test.mjs`. Hoje: 634 e 64 passando.
- Entrega: um parágrafo curto com o que foi feito, o que ficou de fora, quantos testes passam e **quais casos falham** (com exemplo mínimo que reproduza). Falha de teste novo contra código existente é achado real: **não "conserte" o teste**, relate.

---

## 1. Lacunas 3 a 10 do seu relatório, como testes reais

Arquivo novo: `tests/shopping-gaps.test.mjs` (um `test` por lacuna, nome começando por "Lacuna N:"). Cubra as lacunas **3, 4, 5, 6, 7, 8, 9 e 10** de `COBERTURA-LISTA-DE-COMPRAS.md` contra o código atual (`shoppingPurchases.mjs`, `shopping.mjs`, `nfceParse.mjs`, `shoppingMatch.mjs`, `pasteListAi.mjs`). As lacunas 1 e 2 dependem do Android e ficam de fora. Diga quais falham.

## 2. Mais lacunas da tabela de risco Alta/Média

Arquivo novo: `tests/shopping-gaps-2.test.mjs`. Para **cada linha de risco Alta e Média** da tabela do relatório que a tarefa 1 não cobriu (por exemplo `parseNfceInput` com `p` repetido, `centsFromBr` negativo, `allowedHosts("toString")`, `sanitizeShoppingItems` com ids duplicados, `keepShoppingOnRestore` sem catálogo, `lineTotal` acima do inteiro seguro, `shoppingSummary` com total gigante, `restoreItem` com ID duplicado, `addShoppingItem` no limite de 2 000, `parsePastedList` com "½"), escreva um teste. Relate as falhas.

## 3. Itens recorrentes ("sempre comprar")

Arquivo novo: `src/shoppingStaples.mjs`, testes em `tests/shopping-staples.test.mjs`.

- Itens marcados como básicos (`staple: true`) voltam sozinhos para a lista ao fim da compra. `staplesToRestock(state, now)` devolve os que devem voltar com base na frequência real do histórico (`shoppingRhythm.mjs`) e em um intervalo mínimo informado pela pessoa (`everyDays`).
- `markStaple(state, id, everyDays|null)` imutável; validação de `everyDays` (1 a 365, inteiro).
- Casos: item sem histórico (usa só `everyDays`); item já na lista não duplica; compras fora de ordem; fuso/dia virando; 2 000 itens em menos de 100 ms.

## 4. Preço por loja e comparação

Arquivo novo: `src/shoppingStores.mjs`, testes em `tests/shopping-stores.test.mjs`.

- `normalizeStoreName(raw)` ("SUPERMERCADO X LTDA", acentos, filial/CNPJ fictício) → nome curto estável.
- `pricesByStore(state, productKey)` e `cheapestStore(state, items)` para dizer em qual loja a lista inteira costuma sair mais barata, só com lojas que tenham preço para pelo menos 60% dos itens.
- `basketCompare(state, items)` devolve total estimado por loja e itens sem preço.
- Casos: loja única; preços antigos (mais de 180 dias pesam menos); preço 0; empate; unidade diferente (kg vs un) não comparar.

## 5. Inflação pessoal da cesta

Arquivo novo: `src/shoppingInflation.mjs`, testes em `tests/shopping-inflation.test.mjs`.

- `priceChange(state, productKey, { months })` → variação percentual e direção, mediana para evitar pico.
- `basketInflation(state, { months, now })` pondera pelo gasto do produto; devolve também os 5 produtos que mais subiram e os 5 que mais baixaram.
- Mensagens em português neutras ("Leite subiu 8% em 3 meses"). Sem dado suficiente (menos de 3 compras) retorna `null`.
- Casos: um produto só; mudança de embalagem (unidade diferente) ignorada; preço 0; datas iguais; inflação negativa; 5 000 compras em menos de 200 ms.

## 6. Alertas de "acabando"

Arquivo novo: `src/shoppingRunOut.mjs`, testes em `tests/shopping-run-out.test.mjs`.

- Com base em `shoppingRhythm.mjs`, `runningLow(state, now)` lista produtos que provavelmente acabam nos próximos N dias, com `confidence` (baixa/média/alta) e motivo em português. Nunca sugerir produto comprado há menos de 20% do intervalo típico, nem de quem só comprou uma vez.
- `quietHours` e limite de 3 alertas por dia (função `pickAlerts(list, { max, alreadySentToday })`).
- Casos: intervalo irregular; compra muito recente; produto descontinuado (sem compra há mais de 5 ciclos) some; relógio no passado.

## 7. Dividir a compra por categoria em despesas

Arquivo novo: `src/shoppingSplit.mjs`, testes em `tests/shopping-split.test.mjs`.

- `splitDraft(state, { mode })` converte o carrinho em 1 despesa (hoje) ou em N despesas por categoria de gasto (Mercado, Limpeza, Higiene...), mapeando categorias da lista para categorias do app (`src/categories.mjs`), soma exata em centavos.
- Sobra de arredondamento vai para o maior grupo; itens sem preço ficam fora e são listados em `unpriced`.
- Casos: carrinho vazio; todos sem preço; um centavo de diferença em 1 000 itens; categoria desconhecida cai em "Mercado"; soma dos grupos sempre igual ao total.

## 8. Desconto, cupom e "leve 3 pague 2"

Arquivo novo: `src/shoppingDeals.mjs`, testes em `tests/shopping-deals.test.mjs`.

- `applyDeal(item, deal)` com `deal` em `{ type: "percent", value }`, `{ type: "amountOff", cents }`, `{ type: "buyXPayY", x, y }`, `{ type: "unitPrice", cents }`. Devolve `{ totalCents, savedCents }`.
- `validateDeal(deal)` com mensagens em português; nunca total negativo; desconto maior que o preço vira zero com aviso.
- Casos: quantidade menor que X; fração de kg; percentual 0, 100 e 101; arredondamento (sempre para o centavo mais próximo, metade para cima); valores enormes.

## 9. Importar lista compartilhada (texto do WhatsApp e outros apps)

Arquivo novo: `src/shoppingImportShared.mjs`, testes em `tests/shopping-import-shared.test.mjs`.

- Reconhecer o texto gerado por `shareText` do próprio app (ida e volta sem perda) e formatos comuns: marcadores "-", "•", "☐", "[ ]", "[x]", numeração "1)", linhas de título, datas, emojis, "2x leite", "leite 2un", "arroz 5kg".
- `parseShared(text)` → `{ items, ignoredLines, warnings }`; nunca lançar erro; limite de 2 000 linhas e 20 000 caracteres.
- Casos: texto com `\r\n`; zero-width; emojis ZWJ; linha só com símbolos; item marcado como feito vira `inCart: true`; nomes duplicados somam quantidade.

## 10. Exportar lista e histórico

Arquivo novo: `src/shoppingExport.mjs`, testes em `tests/shopping-export.test.mjs`.

- `listToCsv(state)` e `purchasesToCsv(state)` seguros contra **injeção de fórmula** (células que começam com `=`, `+`, `-`, `@`, tab ou CR recebem `'` na frente), aspas dobradas, separador `;` e BOM UTF-8, valores em reais com vírgula.
- `purchasesToJson(state)` versionado (`schema: 1`) e `parsePurchasesJson(text)` com validação estrita (recusa campos de tipo errado, datas impossíveis, lojas gigantes) e limite de tamanho.
- Casos: nomes com vírgula, aspas, quebra de linha, `=HYPERLINK(...)`; idas e voltas JSON; 5 000 compras.

## 11. Fixtures e gerador de dados sintéticos

Arquivo novo: `tests/helpers/shoppingFixtures.mjs` (utilitário de teste, sem `test()` dentro) + `tests/shopping-fixtures.test.mjs`.

- `makeState({ items, purchases, products })`, `makePurchase({...})`, `makeNota({ items, chave })` com chave de 44 dígitos **fictícia e com DV válido** calculado por `chaveDv`, e `seededRandom(seed)` determinístico.
- Documente em comentário de cabeçalho como usar. Os pacotes seguintes passam a usar esses helpers.

## 12. Relatório de integração (sem editar código)

Arquivo novo: `INTEGRACAO-PACOTE-5-E-6.md`.

- Para cada módulo novo dos pacotes 5 e 6, descreva: onde na interface ele se encaixa (tela e componente existentes, com caminho do arquivo), qual **estado novo** precisa ser salvo e como migrar backups antigos sem perder dados, quais **permissões Android** ou bibliotecas pedem (ex.: câmera para `barcode.mjs`), e riscos de privacidade (o que sai do aparelho).
- Termine com uma ordem de integração sugerida (do mais barato ao mais caro) e uma estimativa em horas por item. O Claude usa isso para decidir o que ligar primeiro.

---

Prompt de uma linha: **"Leia o TAREFAS-CODEX-6.md na pasta do projeto e execute as tarefas 1 a 12 na ordem."** Força: alta para 1, 2, 3, 7 e 10; média para o resto.
