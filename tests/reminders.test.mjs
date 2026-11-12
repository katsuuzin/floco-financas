import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction, payInvoice } from "../src/finance.mjs";
import { addPayable, addReceivable, payDebt, receiveDebt, saveRecurrence } from "../src/planning.mjs";
import { dueItems, overdueItems, planReminders } from "../src/reminders.mjs";

const base = () => ({
  ...emptyState(),
  accounts: [{ id: "a", name: "Conta", initial: 0 }],
  cards: [{ id: "c", name: "Roxo", limit: 100000, closingDay: 1, dueDay: 15 }],
});

test("S7 vencimentos juntam pendências, faturas e recorrências", () => {
  let s = addTransaction(base(), { type: "expense", amount: 1000, date: "2026-11-10", description: "Luz", accountId: "a", confirmed: false });
  s = addTransaction(s, { type: "expense", amount: 2000, date: "2026-11-01", description: "Livro", cardId: "c" });
  s = saveRecurrence(s, { description: "Academia", amount: 9900, date: "2026-11-20", frequency: "monthly", accountId: "a", type: "expense" });
  const items = dueItems(s, "2026-11-07", "2026-11-30");
  assert.deepEqual(items.map((i) => i.label), ["Luz", "Fatura Roxo", "Academia"]);
});

test("atrasos usam a data civil, descontam pagamentos e incluem faturas antigas", () => {
  const today = "2026-11-12";
  let s = addTransaction(base(), { type: "expense", amount: 2000, date: "2026-11-11", description: "Aluguel", accountId: "a", confirmed: false });
  s = addTransaction(s, { type: "income", amount: 1000, date: today, description: "Salário", accountId: "a", confirmed: false });
  s = addTransaction(s, { type: "expense", amount: 5000, date: "2026-07-01", description: "Livro", cardId: "c" });
  s = payInvoice(s, "c", "2026-07", "a", "2026-07-15", 2000);
  s = addPayable(s, { person: "Ana", description: "Almoço", amount: 1400, date: "2026-11-08", dueDate: "2026-11-10" });
  s = payDebt(s, s.payables[0].id, 1000, "a", "2026-11-11");
  s = addReceivable(s, { person: "Bruno", description: "Ingresso", amount: 900, date: "2026-11-08", dueDate: "2026-11-10" });
  s = receiveDebt(s, s.receivables[0].id, 900, "a", "2026-11-11");
  assert.deepEqual(overdueItems(s, today).map(({ label, kind, amount, days }) => ({ label, kind, amount, days })), [
    { label: "Fatura Roxo", kind: "pagar", amount: 3000, days: 120 },
    { label: "Ana", kind: "pagar", amount: 400, days: 2 },
    { label: "Aluguel", kind: "pagar", amount: 2000, days: 1 },
  ]);
  assert.equal(overdueItems({ ...s, cards: [{ ...s.cards[0], archived: true }] }, today).length, 2);
});

test("S7 desligado não agenda nada; ligado agenda manhã e noite e respeita antecedência", () => {
  let s = addTransaction(base(), { type: "expense", amount: 1000, date: "2026-11-10", description: "Luz", accountId: "a", confirmed: false });
  assert.equal(planReminders(s, new Date("2026-11-07T09:00:00")).length, 0);
  s = { ...s, settings: { ...s.settings, reminders: { enabled: true, morning: "08:00", evening: "20:00", comeback: 0, backup: false, daysAhead: 1 } } };
  const plan = planReminders(s, new Date("2026-11-07T09:00:00"));
  assert.equal(plan.length, 2);
  assert.equal(plan[0].fire.getDate(), 9);
  assert.match(plan[0].body, /Luz/);
});

test("S7 retorno e backup são agendados", () => {
  const s = { ...base(), settings: { ...base().settings, reminders: { enabled: true, comeback: 7, backup: true } } };
  const ids = planReminders(s, new Date("2026-11-07T09:00:00")).map((p) => p.id);
  assert.ok(ids.includes("comeback"));
  assert.ok(ids.includes("backup"));
});
