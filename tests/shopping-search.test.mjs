import { assertFast } from "./helpers/timing.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { searchItems, searchPurchases } from "../src/shoppingSearch.mjs";
import { makeState, makePurchase } from "./helpers/shoppingFixtures.mjs";

test("Itens priorizam exato, prefixo e erro de uma edição, depois data", () => {
  const data = makeState({ items: [
    { name: "Farinha fina", createdAt: 5 }, { name: "Farinhas", createdAt: 8 },
    { name: "Farinha", createdAt: 1 }, { name: "Farinba", createdAt: 9 },
  ] });
  assert.deepEqual(searchItems(data, "farinha").map((i) => i.name), ["Farinha", "Farinhas", "Farinha fina", "Farinba"]);
  assert.deepEqual(searchItems(data, "farinba").map((i) => i.name), ["Farinba", "Farinha fina", "Farinha"]);
  assert.equal(searchItems(data, "pso").length, 0);
});
test("Filtros, consulta em branco, acento decomposto e emoji", () => {
  const data = makeState({ items: [
    { name: "Café ☕".normalize("NFD"), category: "Mercearia", priceCents: 0, inCart: true, qty: 1 },
    { name: "Pão", category: "Padaria", inCart: false, qty: 1 },
  ] });
  assert.equal(searchItems(data, "cafe ☕", { category: "MERCEARIA", inCart: true, priced: true }).length, 1);
  assert.equal(searchItems(data, "☕").length, 1);
  assert.equal(searchItems(data, "   ").length, 2);
  assert.equal(searchItems(data, "", { priced: false })[0].name, "Pão");
  assert.deepEqual(searchItems(data, "a".repeat(10000)), []);
});
test("Histórico filtra loja, data e preço com fronteiras inclusivas", () => {
  const data = makeState({ purchases: [
    makePurchase({ id: "1", marketName: "Loja Á", date: "2026-01-01", totalCents: 100 }),
    makePurchase({ id: "2", marketName: "Loja A", date: "2026-01-02", totalCents: 200 }),
  ] });
  assert.deepEqual(searchPurchases(data, "arroz", { store: "loja a", from: "2026-01-02", to: "2026-01-02",
    minCents: 200, maxCents: 200 }).map((p) => p.id), ["2"]);
  assert.deepEqual(searchPurchases(data, " ", { from: "2026-02-01", to: "2026-01-01" }), []);
  assert.deepEqual(searchPurchases(data, "").map((p) => p.id), ["2", "1"]);
});
test("Pesquisa em cinco mil compras termina abaixo de 100 ms", () => {
  const data = makeState({ purchases: Array.from({ length: 5000 }, (_, i) => makePurchase({ id: String(i) })) });
  assertFast(() => {
    assert.equal(searchPurchases(data, "ficticio").length, 5000);
  }, 100, "shopping-search");
});
