import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { findMatchingTransactions, suggestLink, wouldDuplicate } from "../src/shoppingReconcile.mjs";
import { makeState, makePurchase } from "./helpers/shoppingFixtures.mjs";

const purchase = makePurchase({ totalCents: 100, date: "2026-01-10", marketName: "Mercado Alfa LTDA" });
const tx = (id, fields = {}) => ({ id, type: "expense", amount: 100, date: purchase.date, category: "Mercado", description: "Pix Mercado Alfa", ...fields });
const state = (...transactions) => ({ ...makeState(), transactions });

test("Sem candidatos retorna vazio e não duplica", () => {
  assert.deepEqual(findMatchingTransactions(state(), purchase), []);
  assert.equal(suggestLink(state(), purchase), null);
  assert.equal(wouldDuplicate(state(), purchase), false);
});
test("Valor, data e loja dão confiança alta e evitam despesa em dobro", () => {
  const data = state(tx("a"));
  const result = suggestLink(data, purchase);
  assert.equal(result.transactionId, "a");
  assert.equal(result.confidence, "alta");
  assert.equal(wouldDuplicate(data, { date: purchase.date, amount: "1,00", description: "Compra - Mercado Alfa" }), true);
});
test("Empate devolve candidatas para confirmação", () => {
  assert.deepEqual(suggestLink(state(tx("b"), tx("a")), purchase).map(({ transactionId }) => transactionId), ["a", "b"]);
});
test("Um centavo de diferença entra, receitas, transferências e vínculos existentes saem", () => {
  const data = { ...state(tx("a", { amount: 101, date: "2026-01-12" }), tx("b", { type: "income" }),
    tx("c", { type: "transfer" }), tx("d"), tx("e", { amount: 102 })),
    shoppingPurchases: [makePurchase({ id: "outra", transactionId: "d" })] };
  assert.deepEqual(findMatchingTransactions(data, purchase).map((row) => row.transactionId), ["a"]);
  assert.deepEqual(findMatchingTransactions(data, purchase, { daysTolerance: 1 }), []);
});
test("Filtra vinte mil transações em até duzentos milissegundos", () => {
  const data = state(...Array.from({ length: 20000 }, (_, i) => tx(String(i), { amount: 100 + i })));
  const start = performance.now();
  assert.equal(findMatchingTransactions(data, purchase).length, 2);
  assert.ok(performance.now() - start < 200);
});
