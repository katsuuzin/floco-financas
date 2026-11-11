# Tarefa do Codex: ritmo de compra ("já deve estar acabando")

Metade da funcionalidade. A outra metade (as telas) o Claude faz ao mesmo tempo, em arquivos diferentes. **Não há conflito se você só mexer nos dois arquivos abaixo.**

## Arquivos que você pode editar (só estes)

- `src/shoppingRhythm.mjs` (já existe como **casca**: troque o corpo das funções, **sem mudar nomes, argumentos nem o formato do retorno**)
- `tests/shopping-rhythm.test.mjs` (novo)

**Não edite** nenhum outro arquivo (telas, `nav.tsx`, `layout.mjs`, `shopping*.mjs`, `HomeScreen.tsx` etc.).

## Regras do projeto

- Nunca rodar `expo prebuild`. Sem commit, push ou release. Sem dado pessoal (testes com dados inventados). Sem dependência nova.
- Função pura, sem React, sem rede, sem ler data do sistema (a data de hoje entra por parâmetro).
- Valores em centavos; datas em texto `AAAA-MM-DD`.
- Rodar `npm test` e `npx tsc --noEmit` ao final.

## Dados de entrada

`state.shoppingProducts` é uma lista de produtos:

```js
{ id, key, name, ean, unit, category, lastPriceCents, buys, lastBoughtAt,
  prices: [{ date: "2026-10-05", priceCents: 500, purchaseId: "c1" }, ...] }
```

- `prices` tem **um ponto por compra** (no máximo 24, os mais recentes): use as **datas distintas** de `prices` como as datas de compra do produto.
- `state.shoppingItems` é a lista de compras atual: `{ id, name, qty, unit, inCart, ... }`. Itens com `inCart: false` estão **pendentes** (já na lista).
- Para comparar nomes, já existe `normalizeName` e `productKey` em `src/shoppingPurchases.mjs` e `tokens`/`tokenMatch` em `src/shoppingMatch.mjs` (pode importar; não edite).

## O que implementar

### `purchaseRhythm(product)`

1. Pegue as datas distintas de `product.prices`, em ordem crescente.
2. `purchases` = quantidade de datas distintas.
3. Se `purchases < MIN_PURCHASES` (2): `avgDays = null`, `nextExpectedAt = null`, `confidence = "none"`.
4. Senão: intervalos em dias entre datas consecutivas (ignore intervalos de 0 dia e use só os positivos); `avgDays` = **mediana** dos intervalos, arredondada para inteiro, mínimo 1.
5. `nextExpectedAt` = última data + `avgDays`.
6. `confidence`: `"low"` com 2 compras (1 intervalo), `"medium"` com 3 a 4 compras, `"high"` com 5 ou mais **e** intervalos regulares (maior intervalo no máximo 2× o menor); se 5+ compras mas irregulares, `"medium"`.
7. `lastBoughtAt` = última data (ou `product.lastBoughtAt`, se vazio).

### `restockCandidates(state, today, { limit = 10 } = {})`

Para cada produto com `avgDays` definido:

- `daysSinceLast` = dias entre `lastBoughtAt` e `today` (data inválida ou futura: ignore o produto).
- `daysLate = daysSinceLast - avgDays`.
- **Entra na lista** se `daysSinceLast >= 0.9 × avgDays` (**"due"**) ou se faltam até 3 dias para isso (**"soon"**).
- **Fica de fora** se:
  - já está pendente na lista de compras (algum item de `shoppingItems` com `inCart === false` cujo nome casa com o produto: use `tokens`/`tokenMatch`, 60% das palavras, como em `scorePair`; ou nome normalizado igual);
  - passou muito do ritmo: `daysSinceLast > 6 × avgDays` (provavelmente parou de comprar) ou `> 365` dias;
  - `confidence === "low"` **e** `avgDays < 5` (ritmo curto demais para confiar com 2 compras).
- Ordem: `daysLate` do maior para o menor; empate pelo nome (`localeCompare("pt-BR")`).
- Corte em `limit`.
- Formato de cada item: `{ productId, name, unit, avgDays, daysSinceLast, daysLate, nextExpectedAt, lastPriceCents, status }` (exatamente estes campos).

## Testes esperados (`tests/shopping-rhythm.test.mjs`, 20+ casos)

- ritmo com 0, 1, 2, 3, 5 compras; intervalos irregulares; datas repetidas no mesmo dia; datas fora de ordem;
- mediana com número par e ímpar de intervalos; `avgDays` nunca menor que 1;
- `nextExpectedAt` correto, inclusive virando mês e ano;
- `due` e `soon` nas bordas (89%, 90%, e 3 dias antes);
- exclusões: já na lista (nome idêntico e abreviado), já no carrinho (**não** exclui), parou de comprar, ritmo curto com pouca confiança;
- ordenação, empate por nome, `limit`;
- `state` sem `shoppingProducts` ou sem `shoppingItems` não pode quebrar;
- data de hoje inválida, anterior à última compra, ou formato errado.

Para montar estados nos testes, use `emptyState()` de `src/finance.mjs` e monte `shoppingProducts` à mão (ou com `recordPurchase` de `src/shoppingPurchases.mjs`, com datas inventadas).

## Entrega

Um parágrafo curto: o que foi feito, o que ficou de fora e quantos testes passam. **Avise o dono quando terminar**, porque o Claude precisa dessa parte pronta para testar a tela no emulador.
