import { assertFast } from "./helpers/timing.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { findDuplicatePurchases, mergeDuplicates } from "../src/shoppingDuplicates.mjs";
import { chaveDv } from "../src/nfce.mjs";
import { makeState, makePurchase, makeNota } from "./helpers/shoppingFixtures.mjs";

const key = makeNota().chave;
const other = key.slice(0, 42) + "9";
const otherKey = other + chaveDv(other);
const purchase = (id, fields) => makePurchase({ id, ...fields });

test("Mesma NFC-e registrada por dois fluxos agrupa pela chave", () => {
  const a = purchase("a", { chave: key, source: "nfce", marketName: "" });
  const b = purchase("b", { chave: key, transactionId: "tx", source: "manual" });
  const state = makeState({ purchases: [a, b] });
  const [group] = findDuplicatePurchases(state);
  assert.deepEqual(group, { ids: ["a", "b"], reason: "chave" });
  assert.deepEqual(mergeDuplicates(state, group).shoppingPurchases, [b]);
});
test("Compras iguais com chaves e horários diferentes permanecem separadas", () => {
  const a = purchase("a", { chave: key, issuedTime: "10:00:00" });
  const b = purchase("b", { chave: otherKey, issuedTime: "11:00:00" });
  const c = purchase("c", { chave: "", issuedTime: "12:00:00" });
  const d = purchase("d", { chave: "" });
  assert.deepEqual(findDuplicatePurchases(makeState({ purchases: [a, b, c, d] })), []);
});
test("Sem chave, aproxima pela loja normalizada e pelo menos 80% das linhas", () => {
  const lines = Array.from({ length: 5 }, (_, i) => ({ name: "Item " + i, qty: 1, totalCents: 100 }));
  const a = purchase("a", { marketName: "Mercado Á LTDA", items: lines });
  const b = purchase("b", { marketName: "Mercado A filial 2", items: [...lines.slice(0, 4), { ...lines[4], name: "Outro" }] });
  const c = purchase("c", { marketName: "Outro mercado", items: lines });
  assert.deepEqual(findDuplicatePurchases(makeState({ purchases: [a, b, c] })), [{ ids: ["a", "b"], reason: "semelhanca" }]);
});
test("Mesclar atualiza pontos e conserva compras e lançamentos fora do grupo", () => {
  const a = purchase("a", { chave: key, transactionId: "tx" });
  const b = purchase("b", { chave: key });
  a.items[0].productId = "p";
  b.items[0].productId = "p";
  const other = purchase("c", { date: "2026-01-02" });
  const state = makeState({ purchases: [a, b, other], products: [{ id: "p", buys: 2,
    prices: [{ purchaseId: "b", date: "2026-01-01", priceCents: 500 }] }] });
  const result = mergeDuplicates(state, { ids: ["a", "b"] });
  assert.deepEqual(result.shoppingPurchases, [a, other]);
  assert.equal(result.shoppingProducts[0].prices[0].purchaseId, "a");
  assert.equal(result.shoppingProducts[0].buys, 1);
  assert.equal(result.transactions, state.transactions);
});
test("Cinco mil compras são verificadas abaixo de 300 ms", () => {
  const purchases = Array.from({ length: 5000 }, (_, i) => purchase(String(i), {
    issuedTime: new Date(i * 1000).toISOString().slice(11, 19),
  }));
  const state = makeState({ purchases });
  assertFast(() => {
    assert.equal(findDuplicatePurchases(state).length, 0);
  }, 300, "shopping-duplicates");
});
