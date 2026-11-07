import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction, balance, totals } from "../src/finance.mjs";
import { saveRecurrence, receivableBalance, report } from "../src/planning.mjs";
import { recurrenceTotals, recurrenceCalendar, installmentPlan, installmentPurchases, expenseOwed, nextOccurrence } from "../src/commitments.mjs";

const base = () => ({
  ...emptyState(),
  accounts: [{ id: "a", name: "Conta", initial: 1_000_000 }],
  cards: [{ id: "c", name: "Cartão", limit: 1_000_000, closingDay: 5, dueDay: 15, accountId: "a" }],
});

test("A1 totais mensal e anual somam equivalentes por frequência", () => {
  let s = saveRecurrence(base(), { description: "Streaming", amount: 3990, date: "2026-11-10", frequency: "monthly", accountId: "a", type: "expense" });
  s = saveRecurrence(s, { description: "Seguro", amount: 120000, date: "2026-03-01", frequency: "yearly", accountId: "a", type: "expense" });
  s = saveRecurrence(s, { description: "Salário", amount: 500000, date: "2026-11-05", frequency: "monthly", accountId: "a", type: "income" });
  const t = recurrenceTotals(s);
  assert.equal(t.expense.month, 3990 + 10000);
  assert.equal(t.expense.year, 3990 * 12 + 120000);
  assert.equal(t.income.month, 500000);
});

test("A1 calendário lista ocorrências previstas do mês e próxima data", () => {
  const s = saveRecurrence(base(), { description: "Academia", amount: 9900, date: "2026-11-03", frequency: "weekly", accountId: "a", type: "expense" });
  const cal = recurrenceCalendar(s, "2026-12");
  assert.equal(cal.length, 5);
  assert.equal(cal[0][0], "2026-12-01");
  assert.equal(nextOccurrence(s.recurrences[0], "2026-11-04"), "2026-11-10");
});

test("A2 parcelas do cartão aparecem por fatura e indicam quando aliviam", () => {
  const s = addTransaction(base(), { type: "expense", amount: 30000, date: "2026-11-10", category: "Lazer", cardId: "c", installments: 3, description: "TV" });
  const plan = installmentPlan(s, "2026-11", 6);
  assert.deepEqual(plan.rows.map((r) => r.total), [0, 10000, 10000, 10000, 0, 0]);
  assert.equal(plan.freeFromCards, "2027-03");
  const p = installmentPurchases(s, "2026-12");
  assert.equal(p.length, 1);
  assert.equal(p[0].left, 3);
});

test("L7 despesa de alguém: sai do saldo, fica fora dos gastos e vira recebível", () => {
  const s = expenseOwed(base(), { type: "expense", amount: 5000, date: "2026-11-07", accountId: "a", category: "Outros", person: "Ana", confirmed: true });
  assert.equal(balance(s, "a"), 1_000_000 - 5000);
  assert.equal(totals(s, "2026-11").expense, 0);
  assert.equal(report(s, { start: "2026-11-01", end: "2026-11-30" }).expense, 0);
  assert.equal(s.receivables.length, 1);
  assert.equal(receivableBalance(s.receivables[0]), 5000);
  assert.equal(s.transactions[0].receivableId, s.receivables[0].id);
});
