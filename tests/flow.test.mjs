import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction, totalBalance } from "../src/finance.mjs";
import { saveRecurrence, generateRecurrences } from "../src/planning.mjs";
import { flowHeader, flowLists, flowCash, recurrenceSuggestions } from "../src/flow.mjs";

const REF = "2026-11-09";
const base = () => ({
  ...emptyState(),
  accounts: [
    { id: "a1", name: "Conta", initial: 100000, includeInTotal: true },
    { id: "a2", name: "Reserva", initial: 0, includeInTotal: true },
  ],
});
const tx = (s, extra) => addTransaction(s, { description: "x", amount: 1000, date: "2026-11-05", type: "expense", accountId: "a1", confirmed: true, category: "Outros", ...extra });

test("cabeçalho do fluxo: total do mês, anterior e variação", () => {
  let s = tx(base(), { type: "income", amount: 10000, date: "2026-10-05" });
  s = tx(s, { type: "income", amount: 400, date: "2026-11-05" });
  const h = flowHeader(s, "2026-11", "income");
  assert.deepEqual([h.total, h.prev, h.pct], [400, 10000, -96]);
  assert.equal(flowHeader(s, "2026-10", "income").pct, null);
  assert.equal(flowHeader(s, "2026-11", "expense").total, 0);
});

test("recorrentes e avulsas: status, totais e separação", () => {
  let s = base();
  s = saveRecurrence(s, { description: "Salário", amount: 300000, date: "2026-11-05", frequency: "monthly", accountId: "a1", category: "Salário", type: "income" });
  s = saveRecurrence(s, { description: "Bônus futuro", amount: 50000, date: "2026-11-25", frequency: "monthly", accountId: "a1", category: "Salário", type: "income" });
  s = generateRecurrences(s, REF); // 05/11 vira pendente
  s = tx(s, { type: "income", amount: 700, date: "2026-11-02", description: "Venda avulsa" });
  const l = flowLists(s, "2026-11", "income", REF);
  assert.deepEqual(l.recurring.map((r) => [r.name, r.status]), [["Salário", "pending"], ["Bônus futuro", "planned"]]);
  assert.equal(l.recurringLeft, 350000);
  assert.equal(l.recurringDone, 0);
  assert.deepEqual(l.sporadic.map((r) => r.description), ["Venda avulsa"]);
  assert.equal(l.sporadicDone, 700);
  // confirmando a ocorrência gerada ela passa a "done"
  const confirmed = { ...s, transactions: s.transactions.map((t) => (t.recurrenceId ? { ...t, confirmed: true } : t)) };
  const l2 = flowLists(confirmed, "2026-11", "income", REF);
  assert.equal(l2.recurring[0].status, "done");
  assert.equal(l2.recurringDone, 300000);
  assert.equal(flowLists(base(), "2026-11", "expense", REF).recurring.length, 0);
});

test("caixa do mês: saldo inicial, entradas, saídas e saldo atual", () => {
  let s = tx(base(), { type: "income", amount: 20000, date: "2026-11-03" });
  s = tx(s, { amount: 5000, date: "2026-11-04" });
  s = tx(s, { amount: 9000, date: "2026-10-20" });
  const c = flowCash(s, "2026-11", REF);
  assert.equal(c.opening, 100000 - 9000);
  assert.deepEqual([c.income, c.expense], [20000, 5000]);
  assert.equal(c.current, totalBalance(s));
  assert.equal(c.opening + c.income - c.expense, c.current);
  const past = flowCash(s, "2026-10", REF);
  assert.equal(past.isPast, true);
  assert.equal(past.current, 91000);
  assert.equal(flowCash(s, "2027-02", REF).isFuture, true);
});

test("sugestões de recorrência: 3 meses seguidos com valor parecido e fora da lista", () => {
  let s = base();
  for (const m of ["2026-09", "2026-10", "2026-11"]) s = tx(s, { type: "income", description: "Aluguel recebido", amount: 120000, date: `${m}-10` });
  s = tx(s, { type: "income", description: "Bico", amount: 5000, date: "2026-11-10" });
  const list = recurrenceSuggestions(s, "income", REF);
  assert.deepEqual(list.map((x) => [x.name, x.amount, x.day]), [["Aluguel recebido", 120000, 10]]);
  const known = saveRecurrence(s, { description: "Aluguel recebido", amount: 120000, date: "2026-12-10", frequency: "monthly", accountId: "a1", category: "Aluguéis", type: "income" });
  assert.equal(recurrenceSuggestions(known, "income", REF).length, 0);
  assert.equal(recurrenceSuggestions(s, "expense", REF).length, 0);
});
