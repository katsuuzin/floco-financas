# Tarefas do Codex, pacote 5

O pacote 4 foi recebido (obrigado). As 5 falhas que ele achou o Claude corrige no código do app (ponte da WebView e `accessibilityLiveRegion`); **não mexa nelas**. Este pacote é grande de propósito: lógica pura nova e testes para as próximas funções. Ordem de valor: 1 a 8. Faça na ordem; se o tempo acabar, entregue o que terminou.

## Regras (as mesmas dos pacotes anteriores)

- Nunca `expo prebuild`. **Sem commit, push ou release**. Dados inventados; nenhuma chave de API, CNPJ ou chave de nota reais. Sem dependência nova.
- Funções puras em `src/*.mjs`, textos em português do Brasil, valores em centavos, sem acesso a rede, arquivo ou relógio dentro das funções (receba `now` por parâmetro).
- **Não edite** arquivos existentes. Só crie os arquivos listados. Importe dos existentes (`src/shopping.mjs`, `src/shoppingPurchases.mjs`, `src/shoppingTrip.mjs`, `src/shoppingHistory.mjs`, `src/shoppingRhythm.mjs`, `src/openFoodFacts.mjs`) lendo o que cada um exporta.
- Ao final rode `npm test`, `npx tsc --noEmit` e `node --test tests/security/*.test.mjs`. Hoje: 540 passando na principal.
- Entrega: um parágrafo curto com o que foi feito, o que ficou de fora, quantos testes passam e **quais casos falham** (com exemplo mínimo).

---

## 1. Preço sugerido do histórico

Arquivo novo: `src/shoppingSuggestPrice.mjs`, testes em `tests/shopping-suggest-price.test.mjs`.

- `suggestPrices(state)` devolve uma lista `{ id, name, priceCents, source: "last" | "median", basedOn }` para os itens da lista **sem** `priceCents`, usando `lastKnownPrice` de `shoppingPurchases.mjs` (e a mediana das últimas 3 compras quando houver 3 ou mais e o último preço fugir mais de 40% da mediana).
- Nunca sugerir para item que já tem preço digitado. Item com `unit` (peso/volume) usa o preço por unidade do histórico, não o total.
- `applySuggestedPrices(state, ids?)` devolve o novo estado (imutável) preenchendo só os itens pedidos (ou todos), sem tocar nos que já têm preço.
- Casos: histórico vazio; nome com acento/caixa diferente (usar o mesmo casamento de `shoppingMatch.mjs`); preço 0 ou negativo no histórico é ignorado; empate de datas; 500 itens e 5 000 compras em menos de 200 ms.

## 2. Código de barras (EAN/UPC)

Arquivo novo: `src/barcode.mjs`, testes em `tests/barcode.test.mjs`.

- `normalizeBarcode(raw)` aceita string com espaços, hifens ou zeros à esquerda; devolve `{ ok, code, format }` com `format` em `"EAN-13" | "EAN-8" | "UPC-A"` (UPC-A vira EAN-13 com zero à esquerda) ou `{ ok: false, reason }` em português.
- `isValidChecksum(code)` com o dígito verificador correto para EAN-8 e EAN-13.
- Recusar: vazio, letras, tamanho diferente de 8/12/13, dígito verificador errado, entrada que não é string, texto com 10 000 caracteres.
- Incluir 10 códigos reais **públicos de exemplo** de documentação (ou gerados pelo próprio teste com dígito calculado) e 10 inválidos.

## 3. Escanear produto: fluxo e falhas de rede

Arquivo novo: `src/scanProduct.mjs`, testes em `tests/scan-product.test.mjs`.

- `resolveScan({ raw, lookup })` onde `lookup` é uma função assíncrona injetada (nos testes, simulada) que consulta o Open Food Facts via `openFoodFacts.mjs`. Devolve `{ status: "found", name, brand, quantityText, code }`, `{ status: "not_found", code }`, `{ status: "invalid", reason }` ou `{ status: "offline", code }`.
- Timeout de 8 s (receba `timeoutMs`), uma repetição só em erro de rede, nunca repetir em "não encontrado". Resposta com nome vazio, nome gigante (>200) ou com HTML vira `not_found`/nome limpo.
- `suggestItemName(product)` monta o nome da lista ("Leite integral Marca 1 L"), sem duplicar marca e sem passar de 60 caracteres.
- `duplicateOf(state, code, name)` avisa se o item já está na lista (pelo nome normalizado).
- Casos: lookup que lança, que demora, que devolve lixo, que devolve JSON com campos faltando.

## 4. Mais testes do Modo compra

Arquivo novo: `tests/shopping-trip-extra.test.mjs`.

Além dos 25 casos de `tests/shopping-trip.test.mjs` (leia-o para não repetir): itens com `unit` e preço; quantidade fracionada (0,350 kg); quantidade enorme; preço 0; nomes vazios; categorias desconhecidas; 5 000 itens em menos de 100 ms; progresso com 0 itens; tempo negativo ou `startedAt` no futuro; `formatElapsed` em 59 s, 60 s, 61 min, 25 h; total do carrinho igual à soma de `lineTotal`; arredondamento sem erro de centavo em 1 000 itens de R$ 0,33.

## 5. Lógica do horário de início persistente do Modo compra

Arquivo novo: `src/shoppingTripSession.mjs`, testes em `tests/shopping-trip-session.test.mjs`.

- Hoje o tempo zera ao sair da tela. Escreva funções puras: `startSession(now)` → `{ startedAt, lastSeenAt }`; `resumeSession(saved, now, { maxIdleMinutes = 180 })` que retoma a sessão se a última vez foi há menos de `maxIdleMinutes`, senão começa outra; `endSession()`; `serialize/parse` com validação (recusa JSON corrompido, datas no futuro, tipos errados).
- Casos: relógio voltando, sessão de ontem, JSON com campos extras, número como string.

## 6. Reordenar e agrupar a lista no mercado (corredores)

Arquivo novo: `src/shoppingAisles.mjs`, testes em `tests/shopping-aisles.test.mjs`.

- `aisleOrder` padrão (Hortifruti, Padaria, Açougue, Laticínios, Mercearia, Bebidas, Limpeza, Higiene, Outros) e `sortByAisles(groups, customOrder?)` que ordena os grupos de `pendingByCategory` na ordem do caminho no mercado.
- `learnAisleOrder(sessions)` aprende a ordem real em que a pessoa marcou os itens (lista de marcações com horário) e devolve a ordem de categorias, com mínimo de 3 compras para sobrepor o padrão.
- Casos: categorias novas, ordem personalizada parcial, empates, marcações fora de ordem, dados vazios.

## 7. Orçamento da compra

Arquivo novo: `src/shoppingBudget.mjs`, testes em `tests/shopping-budget.test.mjs`.

- `budgetStatus({ limitCents, cartCents, pendingEstimateCents })` → `{ level: "ok" | "near" | "over", remainingCents, projectedCents, message }` (`near` a partir de 85% do limite projetado). Mensagem em português, curta, sem tom de bronca.
- `suggestCuts(state, limitCents)` sugere até 5 itens pendentes para adiar (mais caros e menos frequentes no histórico), sem cortar item marcado como essencial se existir esse campo.
- Casos: limite 0 ou ausente (sem orçamento), pendentes sem preço, limite menor que o carrinho, valores enormes, centavos fracionados.

## 8. Relatório de cobertura e lacunas (sem editar código)

Arquivo novo: `COBERTURA-LISTA-DE-COMPRAS.md`.

- Tabela das funções exportadas de `src/shopping*.mjs`, `src/nfce*.mjs`, `src/pasteList*.mjs`, `src/openFoodFacts.mjs` com: quantos testes a citam, o que **não** é testado (ramos de erro, limites), e risco (alto/médio/baixo).
- Liste as 10 lacunas de maior risco com um exemplo de entrada que o teste atual não cobre. O Claude usa isso para decidir o pacote 6.

---

Prompt de uma linha: **"Leia o TAREFAS-CODEX-5.md na pasta do projeto e execute as tarefas 1 a 8 na ordem."** Força: alta para 1, 3 e 7; média para o resto.
