import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { shoppingSummary } from "../src/shopping.mjs";
import { tripSummary, pendingByCategory } from "../src/shoppingTrip.mjs";
import { suggestPrices } from "../src/shoppingSuggestPrice.mjs";
import { searchItems, searchPurchases } from "../src/shoppingSearch.mjs";
import { suggestNames } from "../src/shoppingAutocomplete.mjs";
import { monthlyReport } from "../src/shoppingReport.mjs";
import { findDuplicatePurchases } from "../src/shoppingDuplicates.mjs";
import { mergeShoppingLists } from "../src/shoppingMerge.mjs";
import { checkShoppingBackup } from "../src/shoppingBackupCheck.mjs";
import { repairShoppingBackup } from "../src/shoppingBackupRepair.mjs";
import { migrateToLists } from "../src/shoppingLists.mjs";
import { basketCompare } from "../src/shoppingStores.mjs";
import { basketInflation } from "../src/shoppingInflation.mjs";
import { runningLow } from "../src/shoppingRunOut.mjs";
import { productKey } from "../src/shoppingPurchases.mjs";
import { makePurchase, makeState } from "./helpers/shoppingFixtures.mjs";

const day = 86400000;
const origin = Date.UTC(2025, 0, 1);
const now = "2025-12-31";
const date = (index) => new Date(origin + index * day).toISOString().slice(0, 10);
const products = Array.from({ length: 600 }, (_, i) => {
  const name = "Produto " + i;
  return { id: "p" + i, key: productKey(name), name, unit: "", buys: 5,
    lastBoughtAt: date(350), lastPriceCents: 100 + i, prices: [329, 336, 343, 350].map((d) => ({
      date: date(d), priceCents: 100 + i, purchaseId: "compra-" + d,
    })) };
});
const items = Array.from({ length: 2000 }, (_, i) => {
  const p = products[i % products.length];
  return { id: "i" + i, name: p.name, qty: 1 + i % 3, category: "Mercearia", unit: "",
    priceCents: i % 3 ? p.lastPriceCents : null, inCart: i % 5 === 0, updatedAt: i };
});
const purchases = Array.from({ length: 5000 }, (_, i) => makePurchase({
  id: "compra-" + i, date: date(i % 360), marketName: "Mercado " + (i % 10),
  items: Array.from({ length: 8 }, (_, line) => {
    const p = products[(i * 7 + line * 11) % products.length];
    const price = p.lastPriceCents + i % 4;
    return { name: p.name, qty: 1, unit: "", unitPriceCents: price, totalCents: price, productId: p.id };
  }),
}));
const state = makeState({ items, purchases, products });
const other = items.map((item, i) => i % 2 === 0 ? { ...item, inCart: !item.inCart, updatedAt: i + 1 } :
  { ...item, id: "outra-" + item.id });
const compact = { shoppingItems: state.shoppingItems, shoppingProducts: state.shoppingProducts,
  shoppingPurchases: state.shoppingPurchases.slice(0, 500) };

const cases = [
  ["shoppingSummary", 100, () => shoppingSummary(state)],
  ["tripSummary", 100, () => tripSummary(state, { now: origin, startedAt: origin - day })],
  ["pendingByCategory", 150, () => pendingByCategory(state)],
  ["suggestPrices", 350, () => suggestPrices(state)],
  ["searchItems", 150, () => searchItems(state, "prodto")],
  ["searchPurchases", 400, () => searchPurchases(state, "produto 111")],
  ["suggestNames", 300, () => suggestNames(state, "pro", { now })],
  ["monthlyReport", 350, () => monthlyReport(state, { month: "2025-12", now })],
  ["findDuplicatePurchases", 600, () => findDuplicatePurchases(state)],
  ["mergeShoppingLists", 180, () => mergeShoppingLists(state, other, { now: 2500 })],
  ["checkShoppingBackup", 400, () => checkShoppingBackup(state)],
  ["repairShoppingBackup", 850, () => repairShoppingBackup(state)],
  ["migrateToLists", 100, () => migrateToLists(state)],
  ["basketCompare", 500, () => basketCompare(state, state.shoppingItems.slice(0, 100))],
  ["basketInflation", 500, () => basketInflation(state, { now, months: 12 })],
  ["runningLow", 250, () => runningLow(state, now)],
];

test("Massa de desempenho tem 2.000 itens, 600 produtos e 40.000 linhas de compra", () => {
  assert.deepEqual([items.length, products.length, purchases.length, purchases.reduce((sum, p) => sum + p.items.length, 0)],
    [2000, 600, 5000, 40000]);
  assert.equal(checkShoppingBackup(compact).ok, true);
  assert.ok(checkShoppingBackup(state).errors.some((error) => error.code === "tamanho"));
});

for (const [name, budget, run] of cases) {
  test("Orçamento de desempenho de " + name, (t) => {
    const timings = [];
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      const result = run();
      timings.push(performance.now() - start);
      assert.notEqual(result, undefined);
    }
    const median = timings.sort((a, b) => a - b)[1];
    t.diagnostic("PERF " + name + " " + median.toFixed(2) + " ms");
    assert.ok(median < budget, name + " levou " + median.toFixed(2) + " ms (limite " + budget + " ms).");
  });
}
