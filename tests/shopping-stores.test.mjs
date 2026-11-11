import test from "node:test";
import assert from "node:assert/strict";
import { basketCompare, cheapestStore, normalizeStoreName, pricesByStore } from "../src/shoppingStores.mjs";
const line = (name, price, unit = "") => ({ name, unit, qty: 1, unitPriceCents: price });
const purchase = (marketName, date, ...items) => ({ marketName, date, items });
const state = (...shoppingPurchases) => ({ shoppingPurchases });
test("Normaliza razão social, acentos e filial sintética", () => {
  assert.equal(normalizeStoreName("  SUPERMERCÁDO X LTDA Filial 002 CNPJ 00.000.000/0000-00"), "supermercado x");
  assert.equal(normalizeStoreName("Supermercado X S/A"), "supermercado x");
});
test("Loja única estima preço por quantidade, inclusive por kg", () => {
  const data = state(purchase("Mercado X", "2026-01-01", line("Arroz", 100), line("Banana", 400, "kg")));
  const result = cheapestStore(data, [{ name: "Arroz", qty: 2 }, { name: "Banana", unit: "kg", qty: 1.5 }]);
  assert.equal(result.totalCents, 800);
  assert.equal(result.coverage, 1);
});
test("Preço antigo tem peso menor e zero é ignorado", () => {
  const data = state(purchase("Loja X", "2025-01-01", line("Arroz", 400)),
    purchase("Loja X", "2026-01-01", line("Arroz", 100), line("Arroz", 0)));
  assert.deepEqual(pricesByStore(data, "arroz|"), [{ store: "loja x", priceCents: 160, basedOn: 2 }]);
});
test("Lojas empatadas seguem nome e unidades diferentes não são comparadas", () => {
  const data = state(purchase("Z", "2026-01-01", line("Arroz", 100)),
    purchase("A", "2026-01-01", line("Arroz", 100), line("Arroz", 1, "kg")));
  assert.equal(cheapestStore(data, [{ name: "Arroz" }]).store, "a");
  assert.deepEqual(pricesByStore(data, "arroz|kg"), [{ store: "a", priceCents: 1, basedOn: 1 }]);
});
test("Exige pelo menos 60% de cobertura e informa itens ausentes", () => {
  const items = ["A", "B", "C", "D", "E"].map((name) => ({ name }));
  const data = state(purchase("X", "2026-01-01", line("A", 1), line("B", 1)),
    purchase("Y", "2026-01-01", line("A", 100), line("B", 100), line("C", 100)));
  const result = cheapestStore(data, items);
  assert.equal(result.store, "y");
  assert.equal(result.coverage, 0.6);
  assert.deepEqual(result.missing.map(({ name }) => name), ["D", "E"]);
  assert.equal(basketCompare(data, items).length, 2);
});
