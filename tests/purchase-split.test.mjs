import test from "node:test";
import assert from "node:assert/strict";
import { emptyState } from "../src/finance.mjs";
import { importNotificationAsItems, guessItemCategory, collapsePurchases, parseItem } from "../src/purchaseSplit.mjs";
import { DEFAULT_RULES } from "../src/rules.mjs";

const base = () => {
  return { ...emptyState(), accounts: [{ id: "a1", name: "Nubank PF", initial: 0 }] };
};
const row = { id: "n1" };
const input = { type: "expense", amount: "125,00", date: "2026-11-13", time: "13:01", description: "POSTO MONTANA", accountId: "a1", cardId: "", category: "Transporte", subcategory: "Combustível", tags: [], notes: "" };
const items = [
  parseItem({ name: "Gasolina", qty: 1, unit: "50,00" }),
  parseItem({ name: "Óleo 15w40 Ipiranga", qty: 2, unit: "37,50" }),
];

test("palavra do produto vence a marca da regra", () => {
  const s = base();
  s.rules = DEFAULT_RULES.map(([pattern, category, subcategory], i) => ({ id: "r" + i, pattern, category, subcategory, type: "expense", priority: 10 }));
  assert.equal(guessItemCategory(s, "gasolina").subcategory, "Combustível");
  const oil = guessItemCategory(s, "óleo 15w40 ipiranga");
  assert.deepEqual([oil.category, oil.subcategory], ["Transporte", "Manutenção"]);
  assert.equal(guessItemCategory(s, "coisa estranha", { category: "Lazer", subcategory: "" }).category, "Lazer");
});

test("divide a compra em itens sem mudar o total", () => {
  const s = base();
  const next = importNotificationAsItems(s, row, input, items.map((it) => ({ ...it, ...(it.name === "Gasolina" ? { category: "Transporte", subcategory: "Combustível" } : { category: "Transporte", subcategory: "Manutenção" }) })));
  assert.equal(next.transactions.length, 2);
  assert.equal(next.transactions.reduce((n, t) => n + t.amount, 0), 12500);
  assert.ok(next.transactions.every((t) => t.purchaseId && t.notificationId === "n1" && t.purchaseTotal === 12500));
  assert.equal(next.transactions[1].description, "Óleo 15w40 Ipiranga (2×)");
  assert.equal(importNotificationAsItems(next, row, input, items), next, "não registra duas vezes");
  const rows = collapsePurchases(next.transactions);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount, 12500);
  assert.equal(rows[0].items.length, 2);
});

test("recusa quando os itens não fecham o total", () => {
  assert.throws(() => importNotificationAsItems(base(), row, { ...input, amount: "130,00" }, items), /somam R\$ 125,00/);
  assert.throws(() => parseItem({ name: "", qty: 1, unit: "1,00" }), /nome/);
  assert.throws(() => parseItem({ name: "x", qty: 0, unit: "1,00" }), /quantidade/);
});
