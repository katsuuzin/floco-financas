import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction } from "../src/finance.mjs";
import { merchantTotals } from "../src/spending.mjs";

const base = () => ({ ...emptyState(), accounts: [{ id: "a1", name: "Conta", initial: 500000, includeInTotal: true }] });
const tx = (s, extra) => addTransaction(s, { description: "x", amount: 1000, date: "2026-11-05", type: "expense", accountId: "a1", confirmed: true, category: "Outros", ...extra });

test("comerciantes: agrupa sem acento, conta compras e ordena por valor", () => {
  let s = base();
  s = tx(s, { description: "Padaria Sol", amount: 1500 });
  s = tx(s, { description: "PADARIA SOL", amount: 500, date: "2026-11-06" });
  s = tx(s, { description: "Uber", amount: 4200 });
  s = tx(s, { description: "Antiga", amount: 9000, date: "2026-10-01" });
  s = tx(s, { description: "Pendente", amount: 9000, confirmed: false });
  const m = merchantTotals(s, "2026-11");
  assert.equal(m.total, 6200);
  assert.deepEqual(m.rows.map((r) => [r.name, r.cents, r.count]), [["Uber", 4200, 1], ["Padaria Sol", 2000, 2]]);
  assert.ok(Math.abs(m.rows[0].fraction - 4200 / 6200) < 1e-9);
});

test("itens de nota fiscal contam como uma compra no nome do mercado", () => {
  let s = base();
  for (const [d, v] of [["Leite", 525], ["Ovos", 1949], ["Pão", 700]]) s = tx(s, { description: d, amount: v, });
  s = { ...s, transactions: s.transactions.map((t) => ({ ...t, purchaseId: "p1", purchaseTitle: "Mercado Amorim" })) }; // como a divisão da nota grava
  s = tx(s, { description: "Mercado Amorim", amount: 3000, date: "2026-11-10" });
  const m = merchantTotals(s, "2026-11");
  assert.equal(m.rows.length, 1);
  assert.equal(m.rows[0].name, "Mercado Amorim");
  assert.equal(m.rows[0].cents, 525 + 1949 + 700 + 3000);
  assert.equal(m.rows[0].count, 2, "uma nota e uma compra avulsa");
});

test("receitas ficam separadas das despesas", () => {
  let s = base();
  s = tx(s, { description: "Salário", amount: 500000, type: "income", category: "Salário" });
  s = tx(s, { description: "Padaria", amount: 1000 });
  assert.deepEqual(merchantTotals(s, "2026-11", "income").rows.map((r) => r.name), ["Salário"]);
  assert.deepEqual(merchantTotals(s, "2026-11").rows.map((r) => r.name), ["Padaria"]);
});
