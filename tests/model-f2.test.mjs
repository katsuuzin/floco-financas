import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyState, addTransaction, balance, totals, spent, invoiceMonth, invoiceDueDate, validateBackup,
} from "../src/finance.mjs";
import { report, projection } from "../src/planning.mjs";

const base = () => ({
  ...emptyState(),
  accounts: [{ id: "a", name: "Conta", initial: 100000 }],
  cards: [{ id: "c", name: "Cartão", limit: 500000, closingDay: 10, dueDay: 20, accountId: "a" }],
});
const tx = (s, extra) =>
  addTransaction(s, { type: "expense", amount: 1000, date: "2026-11-05", category: "Mercado", accountId: "a", confirmed: true, ...extra });

test("L5 estorno devolve dinheiro e abate o gasto da categoria", () => {
  let s = tx(base(), { amount: 5000 });
  s = tx(s, { amount: 2000, refund: true });
  assert.equal(balance(s, "a"), 100000 - 5000 + 2000);
  assert.equal(spent(s, "Mercado", "2026-11"), 3000);
  assert.equal(totals(s, "2026-11").expense, 3000);
  const r = report(s, { start: "2026-11-01", end: "2026-11-30" });
  assert.equal(r.expense, 3000);
});

test("L9 ignorar fica no saldo e fora da análise", () => {
  const s = tx(base(), { amount: 4000, ignored: true });
  assert.equal(balance(s, "a"), 96000);
  assert.equal(totals(s, "2026-11").expense, 0);
  assert.equal(spent(s, "Mercado", "2026-11"), 0);
  assert.equal(report(s, { start: "2026-11-01", end: "2026-11-30" }).rows.length, 0);
});

test("L1 descrição opcional usa a categoria; horário é validado", () => {
  const s = tx(base(), { description: "", time: "08:30" });
  assert.equal(s.transactions[0].description, "Mercado");
  assert.equal(s.transactions[0].time, "08:30");
  assert.throws(() => tx(base(), { time: "25:00" }), /horário/);
  assert.throws(() => addTransaction(base(), { type: "income", amount: 10, date: "2026-11-01", accountId: "a", refund: true }), /estorno/);
});

test("O2 compra no dia do fechamento: ciclo atual por padrão, próxima fatura com a opção", () => {
  const card = { closingDay: 10, dueDay: 20 };
  assert.equal(invoiceMonth("2026-11-10", card), "2026-11");
  assert.equal(invoiceMonth("2026-11-10", { ...card, closingDayNext: true }), "2026-12");
  assert.equal(invoiceMonth("2026-11-11", card), "2026-12");
});

test("O2 fechamento no dia 31 vale como último dia em meses curtos", () => {
  const card = { closingDay: 31, dueDay: 10 };
  assert.equal(invoiceMonth("2026-02-28", card), "2026-03");
  assert.equal(invoiceMonth("2026-03-01", card), "2026-04");
});

test("O2 vencimento em dia útil pula o fim de semana", () => {
  // 20/12/2026 é domingo
  assert.equal(invoiceDueDate({ dueDay: 20 }, "2026-12"), "2026-12-20");
  assert.equal(invoiceDueDate({ dueDay: 20, businessDayDue: true }, "2026-12"), "2026-12-21");
  assert.equal(invoiceDueDate({ dueDay: 31 }, "2026-02"), "2026-02-28");
});

test("backup aceita cartões com dias 29 a 31", () => {
  const s = { ...base(), cards: [{ id: "c", name: "X", limit: 100, closingDay: 31, dueDay: 30 }] };
  assert.doesNotThrow(() => validateBackup(s));
});

test("projeção trata estorno pendente como entrada", () => {
  const s = tx(base(), { amount: 3000, refund: true, confirmed: false, date: "2026-11-20" });
  const p = projection(s, "2026-11-30", { from: "2026-11-06" });
  assert.equal(p.final, 100000 + 3000);
});
