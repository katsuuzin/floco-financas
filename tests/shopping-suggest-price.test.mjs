import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { applySuggestedPrices, suggestPrices } from "../src/shoppingSuggestPrice.mjs";

const item = (id, name, fields = {}) => ({ id, name, priceCents: null, unit: "", ...fields });
const product = (name, lastPriceCents, prices = [], unit = "") => ({ name, unit, lastPriceCents, prices });
const point = (date, priceCents, purchaseId) => ({ date, priceCents, purchaseId });
const state = (shoppingItems, shoppingProducts = [], shoppingPurchases = []) => ({ shoppingItems, shoppingProducts, shoppingPurchases });

test("Histórico vazio não gera sugestões", () => assert.deepEqual(suggestPrices(state([item("1", "Café")])), []));
test("Encontra nome com acentos e caixa diferentes", () => {
  assert.deepEqual(suggestPrices(state([item("1", "CAFÉ MOÍDO")], [product("cafe moido", 900)])),
    [{ id: "1", name: "CAFÉ MOÍDO", priceCents: 900, source: "last", basedOn: 1 }]);
});
test("Usa o casamento de nomes de nota sem confundir leite e creme de leite", () => {
  const data = state([item("1", "Farinha de trigo"), item("2", "Leite")],
    [product("FARIN TRIGO", 400), product("CR LEITE", 300)]);
  assert.deepEqual(suggestPrices(data).map(({ id }) => id), ["1"]);
});
test("Preço digitado, inclusive zero, não é substituído", () => {
  const data = state([item("1", "Café", { priceCents: 0 }), item("2", "Café", { priceCents: 500 })], [product("Café", 900)]);
  assert.equal(applySuggestedPrices(data), data);
});
test("Usa preço por unidade do histórico sem multiplicar pela quantidade", () => {
  const data = state([item("1", "Banana", { qty: 2.5, unit: "kg" }), item("2", "Banana")],
    [product("Banana", 400, [], "kg")]);
  assert.deepEqual(suggestPrices(data).map(({ id, priceCents }) => [id, priceCents]), [["1", 400]]);
});
test("Ignora pontos inválidos e pode recuperar o último ponto válido", () => {
  const data = state([item("1", "Café"), item("2", "Sal")], [
    product("Café", 0, [point("2026-01-03", -9), point("2026-01-01", 300)]), product("Sal", -1),
  ]);
  assert.deepEqual(suggestPrices(data).map(({ id, priceCents }) => [id, priceCents]), [["1", 300]]);
});
test("Desempata pela última compra registrada e só usa as três mais recentes", () => {
  const data = state([item("1", "Café")], [product("Café", 240, [
    point("2026-01-03", 80, "a"), point("2026-01-02", 100, "b"),
    point("2026-01-03", 100, "c"), point("2026-01-03", 240, "d"),
  ])]);
  assert.deepEqual(suggestPrices(data)[0], { id: "1", name: "Café", priceCents: 100, source: "median", basedOn: 3 });
});
test("40% exatos mantêm o último valor", () => {
  const data = state([item("1", "Café")], [product("Café", 140, [
    point("2026-01-01", 99), point("2026-01-02", 100), point("2026-01-03", 140),
  ])]);
  assert.equal(suggestPrices(data)[0].priceCents, 140);
});
test("Linhas repetidas da mesma compra não viram três observações", () => {
  const data = state([item("1", "Café")], [product("Café", 300, [
    point("2026-01-01", 100, "a"), point("2026-01-01", 100, "a"), point("2026-01-03", 300, "b"),
  ])]);
  assert.equal(suggestPrices(data)[0].source, "last");
});
test("Aplica só os IDs escolhidos e preserva os itens e o estado de entrada", () => {
  const data = state([item("a", "Café"), item("b", "Café")], [product("Café", 300)]);
  const after = applySuggestedPrices(data, ["b"]);
  assert.equal(after.shoppingItems[0], data.shoppingItems[0]);
  assert.equal(after.shoppingItems[1].priceCents, 300);
  assert.equal(data.shoppingItems[1].priceCents, null);
  assert.equal(applySuggestedPrices(data).shoppingItems[0].priceCents, 300);
});
test("500 itens e 5 mil compras em menos de 200 ms", () => {
  const catalog = Array.from({ length: 5000 }, (_, i) => product("Produto " + i, 500 + i, [point("2026-01-01", 500 + i, String(i))]));
  const data = state(catalog.slice(-500).map(({ name }, i) => item(String(i), name)), catalog,
    catalog.map(({ name }, i) => ({ id: String(i), items: [{ name }] })));
  const start = performance.now();
  assert.equal(suggestPrices(data).length, 500);
  assert.ok(performance.now() - start < 200);
});
