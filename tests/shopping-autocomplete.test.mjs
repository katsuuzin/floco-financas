import { assertFast } from "./helpers/timing.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { suggestNames, completeQuantity } from "../src/shoppingAutocomplete.mjs";
import { makeState, makePurchase } from "./helpers/shoppingFixtures.mjs";

test("Quantidade é separada do prefixo e entradas inválidas permanecem texto", () => {
  assert.deepEqual(completeQuantity("2 le"), { qty: 2, prefix: "le" });
  assert.deepEqual(completeQuantity("2xle"), { qty: 2, prefix: "le" });
  assert.deepEqual(completeQuantity("1,5 x Far"), { qty: 1.5, prefix: "Far" });
  assert.deepEqual(completeQuantity("0 le"), { qty: 1, prefix: "0 le" });
  assert.deepEqual(completeQuantity("le"), { qty: 1, prefix: "le" });
});
test("Recência pesa mais e grafias com unidades distintas geram uma sugestão", () => {
  const state = makeState({ products: [
    { name: "Café", unit: "", lastBoughtAt: "2026-01-10", buys: 1 },
    { name: "Café", unit: "kg", lastBoughtAt: "2026-01-09", buys: 2 },
    { name: "Café antigo", lastBoughtAt: "2025-02-01", buys: 100 },
  ] });
  assert.deepEqual(suggestNames(state, "C", { now: "2026-01-11" }), ["Café", "Café antigo"]);
  assert.deepEqual(suggestNames(state, "CAFE", { limit: 1, now: "2026-01-11" }), ["Café"]);
});
test("Exclui nomes da lista e três remoções seguidas até um novo uso", () => {
  const state = makeState({ items: [{ name: "Lentilha" }], products: [{ name: "Leite", buys: 8 }, { name: "Lentilha", buys: 2 }] });
  const events = [1, 2, 3].map((at) => ({ at, type: "remove", name: "LEITE" }));
  assert.deepEqual(suggestNames({ ...state, shoppingNameEvents: events }, "le", { now: 5 }), []);
  assert.deepEqual(suggestNames({ ...state, shoppingNameEvents: [...events, { at: 4, type: "add", name: "Leite" }] }, "le", { now: 5 }), ["Leite"]);
});
test("Usa compras e entradas recentes quando o catálogo está vazio", () => {
  assert.deepEqual(suggestNames(makeState(), "a"), []);
  const state = makeState({ purchases: [makePurchase()] });
  assert.deepEqual(suggestNames({ ...state, shoppingRecentItems: [{ name: "Atum", createdAt: 1 }] }, "a"), ["Arroz fictício", "Atum"]);
});
test("Cinco mil produtos abaixo de 50 ms", () => {
  const state = makeState({ products: Array.from({ length: 5000 }, (_, i) => ({ name: "Produto " + i, buys: i })) });
  assertFast(() => {
    assert.equal(suggestNames(state, "p", { now: 0 }).length, 6);
  }, 50, "shopping-autocomplete");
});
