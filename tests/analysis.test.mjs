import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction } from "../src/finance.mjs";
import { saveRecurrence } from "../src/planning.mjs";
import {
  budgetCycle, budgetUsage, budgetHistory, saveBudget, normalizeBudget, cashFlow, categoryNet,
  comparePeriods, previousPeriod, invoiceReport, budgetVsActual, mediumTerm, variableRhythm, monthlyByAccount,
} from "../src/analysis.mjs";

const base = () => ({
  ...emptyState(),
  accounts: [{ id: "a", name: "Conta", initial: 1_000_000 }],
  cards: [{ id: "c", name: "Cartão", limit: 1_000_000, closingDay: 5, dueDay: 15, accountId: "a" }],
  tags: [{ id: "t1", name: "viagem" }],
});
const exp = (s, date, amount, category = "Mercado", extra = {}) =>
  addTransaction(s, { type: "expense", amount, date, category, accountId: "a", confirmed: true, ...extra });

test("P1 ciclos mensal com dia de início, quinzenal e semanal", () => {
  assert.deepEqual(budgetCycle({ cycle: "monthly", startDay: 1 }, "2026-11-07"), { start: "2026-11-01", end: "2026-11-30" });
  assert.deepEqual(budgetCycle({ cycle: "monthly", startDay: 10 }, "2026-11-07"), { start: "2026-10-10", end: "2026-11-09" });
  const w = budgetCycle({ cycle: "weekly", startDay: 1 }, "2026-11-07");
  assert.equal(new Date(w.start + "T12:00:00").getDay(), 1);
  assert.ok(w.start <= "2026-11-07" && w.end >= "2026-11-07");
  const f = budgetCycle({ cycle: "fortnightly", startDay: 1 }, "2026-11-07");
  assert.equal((new Date(f.end + "T12:00:00") - new Date(f.start + "T12:00:00")) / 86400000, 13);
});

test("P1 orçamento com várias categorias e filtro de conta", () => {
  let s = exp(base(), "2026-11-03", 10000, "Mercado");
  s = exp(s, "2026-11-04", 5000, "Alimentação");
  s = exp(s, "2026-11-05", 7000, "Lazer");
  s = saveBudget(s, { amount: 20000, categories: ["Mercado", "Alimentação"], cycle: "monthly", startDay: 1 });
  const u = budgetUsage(s, s.budgets[0], "2026-11-10");
  assert.equal(u.used, 15000);
  assert.equal(u.left, 5000);
  const onlyCard = { ...s.budgets[0], where: ["c"] };
  assert.equal(budgetUsage(s, onlyCard, "2026-11-10").used, 0);
});

test("P1 orçamentos antigos (uma categoria) continuam funcionando", () => {
  const b = normalizeBudget({ id: "b", category: "Mercado", amount: 1000 });
  assert.deepEqual(b.categories, ["Mercado"]);
  assert.equal(b.cycle, "monthly");
});

test("P1 histórico conta ciclos dentro do teto", () => {
  let s = exp(base(), "2026-09-10", 30000);
  s = exp(s, "2026-10-10", 5000);
  s = saveBudget(s, { amount: 10000, categories: ["Mercado"], cycle: "monthly", startDay: 1 });
  const h = budgetHistory(s, s.budgets[0], 3, "2026-11-07");
  assert.equal(h.cycles.length, 3);
  assert.equal(h.within, 2);
});

test("R4 fluxo de caixa usa o mês da fatura para o cartão e soma recorrências previstas", () => {
  let s = addTransaction(base(), { type: "expense", amount: 9000, date: "2026-11-20", category: "Lazer", cardId: "c" });
  s = saveRecurrence(s, { description: "Salário", amount: 500000, date: "2026-12-05", frequency: "monthly", accountId: "a", type: "income" });
  const f = cashFlow(s, 2026, { forecast: true });
  const dec = f.rows.find((r) => r.month === "2026-12");
  assert.equal(dec.totalExpense, 9000);
  assert.equal(dec.totalIncome, 500000);
  const noForecast = cashFlow(s, 2026, { forecast: false });
  assert.equal(noForecast.rows.find((r) => r.month === "2026-12").totalIncome, 0);
});

test("R5 e R6 resultado por categoria e comparação de períodos", () => {
  let s = exp(base(), "2026-10-05", 10000);
  s = exp(s, "2026-11-05", 25000);
  s = addTransaction(s, { type: "income", amount: 300000, date: "2026-11-01", category: "Salário", accountId: "a", confirmed: true });
  const net = categoryNet(s, "2026-11-01", "2026-11-30");
  assert.equal(net.find((r) => r.category === "Mercado").net, -25000);
  const prev = previousPeriod("2026-11-01", "2026-11-30");
  assert.deepEqual(prev, { start: "2026-10-02", end: "2026-10-31" });
  const cmp = comparePeriods(s, { start: "2026-11-01", end: "2026-11-30" }, { start: "2026-10-01", end: "2026-10-31" });
  assert.equal(cmp.current.expense, 25000);
  assert.equal(cmp.previous.expense, 10000);
  assert.equal(cmp.categories[0].diff, 15000);
});

test("R3 relatório de faturas por cartão, categoria e tag", () => {
  let s = addTransaction(base(), { type: "expense", amount: 4000, date: "2026-11-01", category: "Lazer", cardId: "c", tags: ["t1"] });
  s = addTransaction(s, { type: "expense", amount: 6000, date: "2026-11-02", category: "Mercado", cardId: "c" });
  const r = invoiceReport(s, "2026-11", { group: "tag" });
  assert.equal(r.total, 10000);
  assert.deepEqual(r.groups.map((g) => g.name).sort(), ["#viagem", "Sem tag"]);
  assert.equal(invoiceReport(s, "2026-11", { group: "category" }).groups[0].name, "Mercado");
});

test("R9 previsto × realizado mês a mês", () => {
  let s = exp(base(), "2026-11-05", 12000);
  s = saveBudget(s, { amount: 10000, categories: ["Mercado"], cycle: "monthly", startDay: 1 });
  const rows = budgetVsActual(s, "2026-11", 2);
  assert.equal(rows[1].planned, 10000);
  assert.equal(rows[1].actual, 12000);
  assert.equal(rows[1].diff, -2000);
});

test("P5 ritmo avulso ignora recorrências e parcelas; médio prazo separa contratado e estimado", () => {
  let s = base();
  for (const m of ["08", "09", "10"]) s = exp(s, `2026-${m}-10`, 30000);
  s = exp(s, "2026-10-11", 99999, "Moradia", { recurrenceId: "r" });
  const r = variableRhythm(s, "2026-11");
  assert.equal(r.expense, 30000);
  const mt = mediumTerm(s, 3, "2026-11-07");
  assert.equal(mt.rows.length, 3);
  assert.equal(mt.rows[0].contracted, mt.initial);
  assert.equal(mt.rows[2].estimated, mt.initial - 3 * 30000);
});

test("R10 planilha mensal por conta", () => {
  let s = exp(base(), "2026-11-05", 1000);
  s = addTransaction(s, { type: "expense", amount: 2000, date: "2026-11-06", category: "Lazer", cardId: "c" });
  const rows = monthlyByAccount(s, "2026-11-01", "2026-11-30");
  assert.equal(rows.length, 2);
});
