import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction } from "../src/finance.mjs";
import { saveRecurrence } from "../src/planning.mjs";
import { dueItems, planReminders } from "../src/reminders.mjs";

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
