import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { migrateProductKeys } from "../src/shoppingKeyMigration.mjs";
import { productKey } from "../src/shoppingPurchases.mjs";
import { makeState, makePurchase } from "./helpers/shoppingFixtures.mjs";

const product = (fields = {}) => ({ id: "a", key: "arroz|", name: "Arroz", unit: "", buys: 1, prices: [], ...fields });
const point = (d, purchaseId = "c" + d) => ({ date: "2026-01-" + String(d).padStart(2, "0"), priceCents: 100 + d, purchaseId });
test("Estado vazio e chaves atualizadas mantêm a mesma referência", () => {
  for (const state of [{}, makeState({ products: [product()] })]) {
    const result = migrateProductKeys(state);
    assert.equal(result.state, state);
    assert.deepEqual([result.merged, result.rekeyed], [0, 0]);
  }
});
test("Migra decimal e escrita japonesa mesmo sem pontos", () => {
  const state = makeState({ products: [product({ name: "Suco 1,5", key: "suco 1 5|" }),
    product({ id: "b", name: "抹茶", key: "|" })] });
  const result = migrateProductKeys(state);
  assert.deepEqual(result.state.shoppingProducts.map(({ key }) => key), ["suco 1.5|", "抹茶|"]);
  assert.deepEqual([result.merged, result.rekeyed], [0, 2]);
  assert.equal(state.shoppingProducts[1].key, "|");
});
test("Funde colisão, usa os 24 pontos mais recentes e reaponta itens", () => {
  const a = product({ name: "Suco 1,5", key: "suco 1 5|", buys: 15, prices: Array.from({ length: 15 }, (_, i) => point(i + 1)) });
  const b = product({ id: "b", name: "Suco 1.5", key: "suco 1.5|", buys: 15, prices: Array.from({ length: 15 }, (_, i) => point(i + 15)) });
  const purchase = makePurchase();
  purchase.items[0].productId = "b";
  const state = makeState({ products: [a,b], purchases: [purchase] });
  const result = migrateProductKeys(state);
  const [merged] = result.state.shoppingProducts;
  assert.equal(result.merged, 1);
  assert.equal(result.rekeyed, 1);
  assert.equal(merged.buys, 30);
  assert.equal(merged.prices.length, 24);
  assert.equal(new Set(merged.prices.map((p) => p.purchaseId)).size, 24);
  assert.equal(merged.prices[0].date, "2026-01-06");
  assert.deepEqual([merged.lastBoughtAt, merged.lastPriceCents], ["2026-01-29",129]);
  assert.equal(result.state.shoppingPurchases[0].items[0].productId, "a");
  assert.equal(state.shoppingPurchases[0].items[0].productId, "b");
  assert.equal(migrateProductKeys(result.state).state, result.state);
});
test("Cinco mil produtos são migrados em até 300 ms", () => {
  const products = Array.from({ length: 5000 }, (_, i) => product({ id: String(i), name: "Produto " + i, key: "antiga" }));
  const state = makeState({ products });
  const start = performance.now();
  const result = migrateProductKeys(state);
  assert.ok(performance.now() - start < 300);
  assert.equal(result.rekeyed, 5000);
  assert.equal(result.state.shoppingProducts[4999].key, productKey(products[4999].name));
});
