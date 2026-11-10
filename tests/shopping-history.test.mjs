import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState } from "../src/finance.mjs";
import { recordPurchase, productsOf } from "../src/shoppingPurchases.mjs";
import { displayName, purchasesByDate, monthSummary, searchProducts, priceTrend, pricePoints, expenseDraftFromPurchase } from "../src/shoppingHistory.mjs";

const seq = () => {
  let n = 0;
  return () => `p${++n}`;
};
const compra = (s, id, date, market, items, now = 1) => recordPurchase(s, { date, marketName: market, items }, { id, now, newId: seq() + "" === "" ? undefined : ((k) => () => `${id}-${++k}`)(0) });
// monta um estado fictício com três compras
const base = () => {
  let s = emptyState();
  s = compra(s, "c1", "2026-10-05", "Mercado A", [{ name: "LEITE INTEGRAL MARCA 1L", qty: 2, unitPriceCents: 500 }, { name: "ARROZ TIPO 1 5KG", qty: 1, unitPriceCents: 2500 }], 1);
  s = compra(s, "c2", "2026-11-02", "Mercado B", [{ name: "LEITE INTEGRAL MARCA 1L", qty: 1, unitPriceCents: 550 }], 2);
  s = compra(s, "c3", "2026-11-02", "Mercado A", [{ name: "Café torrado 500g", qty: 1, unitPriceCents: 1800 }], 3);
  return s;
};

test("displayName: caixa alta vira frase; texto que já tem minúsculas não muda", () => {
  assert.equal(displayName("FARIN TRIGO RENATA 1kg"), "Farin trigo renata 1kg");
  assert.equal(displayName("Café torrado 500g"), "Café torrado 500g");
  assert.equal(displayName("  PAO FRANCES "), "Pao frances");
  assert.equal(displayName(""), "");
});

test("compras da mais recente para a mais antiga; empate de data pela registrada por último", () => {
  const ids = purchasesByDate(base()).map((p) => p.id);
  assert.deepEqual(ids, ["c3", "c2", "c1"]);
});

test("resumo do mês soma só as compras daquele mês", () => {
  const s = base();
  assert.deepEqual(monthSummary(s, "2026-11"), { ym: "2026-11", count: 2, totalCents: 550 + 1800 });
  assert.deepEqual(monthSummary(s, "2026-10"), { ym: "2026-10", count: 1, totalCents: 2 * 500 + 2500 });
  assert.deepEqual(monthSummary(s, "2026-09"), { ym: "2026-09", count: 0, totalCents: 0 });
});

test("busca de produtos ignora acento e caixa e exige todas as palavras", () => {
  const s = base();
  assert.equal(searchProducts(s, "").length, 3);
  assert.deepEqual(searchProducts(s, "CAFE").map((p) => p.name), ["Café torrado 500g"]);
  assert.deepEqual(searchProducts(s, "leite integral").length, 1);
  assert.equal(searchProducts(s, "leite arroz").length, 0);
  assert.equal(searchProducts(s, "xyz").length, 0);
});

test("produtos: comprado por último primeiro, depois pelo nome", () => {
  const nomes = searchProducts(base(), "").map((p) => p.name);
  assert.equal(nomes[0] === "Café torrado 500g" || nomes[0] === "LEITE INTEGRAL MARCA 1L", true); // ambos em 2026-11-02
  assert.equal(nomes[2], "ARROZ TIPO 1 5KG");
});

test("variação de preço: subiu, desceu, igual ou sem histórico", () => {
  const leite = productsOf(base()).find((p) => p.name.startsWith("LEITE"));
  assert.deepEqual(priceTrend(leite), { dir: "up", pct: 10, from: 500, to: 550 });
  assert.equal(priceTrend({ prices: [{ date: "2026-01-01", priceCents: 200 }, { date: "2026-02-01", priceCents: 150 }] }).dir, "down");
  assert.equal(priceTrend({ prices: [{ date: "2026-01-01", priceCents: 200 }, { date: "2026-02-01", priceCents: 200 }] }).dir, "same");
  assert.equal(priceTrend({ prices: [{ date: "2026-01-01", priceCents: 200 }] }).dir, "none");
  assert.equal(priceTrend({ prices: [] }).dir, "none");
});

test("pontos de preço trazem o mercado de cada compra, do mais recente ao mais antigo", () => {
  const s = base();
  const leite = productsOf(s).find((p) => p.name.startsWith("LEITE"));
  assert.deepEqual(pricePoints(s, leite).map((x) => [x.date, x.priceCents, x.market]), [
    ["2026-11-02", 550, "Mercado B"],
    ["2026-10-05", 500, "Mercado A"],
  ]);
});

test("rascunho da despesa usa total, mercado e data da compra", () => {
  const [c1] = purchasesByDate(base()).filter((p) => p.id === "c1");
  assert.deepEqual(expenseDraftFromPurchase(c1), { type: "expense", amount: "35,00", description: "Compra - Mercado A", date: "2026-10-05" });
  assert.equal(expenseDraftFromPurchase({ ...c1, marketName: "" }).description, "Compra - mercado");
});
