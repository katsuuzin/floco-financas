import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  balance,
  totals,
  addTransaction,
  validateBackup,
  payInvoice,
  invoice,
  deleteTransaction,
} from "../src/finance.mjs";
import {
  saveLabel,
  removeLabel,
  saveRecurrence,
  generateRecurrences,
  installmentSimulation,
  saveFinancing,
  addReceivable,
  receiveDebt,
  undoDebtPayment,
  receivableBalance,
  projection,
  report,
} from "../src/planning.mjs";
const base = () => ({
  ...emptyState(),
  accounts: [
    { id: "a", name: "Nubank PF", initial: 100000 },
    { id: "b", name: "Inter PJ", initial: 0 },
  ],
  cards: [
    { id: "c", name: "Crédito", limit: 100000, closingDay: 3, dueDay: 10 },
  ],
});
test("recorrências preservam o dia 31, geram pendentes e não duplicam após reabrir", () => {
  let s = saveRecurrence(base(), {
    description: "Aluguel",
    amount: 10000,
    date: "2027-01-31",
    frequency: "monthly",
    type: "expense",
    accountId: "a",
  });
  s = generateRecurrences(s, "2027-03-31");
  assert.deepEqual(
    s.transactions.map((t) => t.date),
    ["2027-01-31", "2027-02-28", "2027-03-31"],
  );
  assert.equal(balance(s, "a"), 100000);
  s = generateRecurrences(
    validateBackup(JSON.parse(JSON.stringify(s))),
    "2027-03-31",
  );
  assert.equal(s.transactions.length, 3);
  assert.throws(() =>
    saveRecurrence(s, { ...s.recurrences[0], date: "2027-01-30" }),
  );
  s.recurrences[0].active = false;
  assert.equal(generateRecurrences(s, "2028-01-01").transactions.length, 3);
});
test("término limita a geração e cadastros rejeitam contas e datas inválidas", () => {
  let s = saveRecurrence(base(), {
    description: "Teste",
    amount: 100,
    date: "2027-01-01",
    endDate: "2027-01-02",
    frequency: "daily",
    type: "income",
    accountId: "a",
  });
  assert.equal(generateRecurrences(s, "2027-02-01").transactions.length, 2);
  assert.throws(() =>
    saveRecurrence(s, { ...s.recurrences[0], date: "2027-02-30" }),
  );
  assert.throws(() =>
    saveRecurrence(s, { ...s.recurrences[0], accountId: "missing" }),
  );
});
test("simulação sem juros conserva centavos e Price amortiza o saldo todo", () => {
  const zero = installmentSimulation({
    amount: 10001,
    count: 3,
    date: "2027-01-31",
  });
  assert.equal(zero.total, 10001);
  assert.equal(zero.interest, 0);
  assert.deepEqual(
    zero.rows.map((r) => r.date),
    ["2027-01-31", "2027-02-28", "2027-03-31"],
  );
  const price = installmentSimulation({
    amount: 120000,
    entry: 20000,
    count: 12,
    rate: 2,
    date: "2027-01-01",
  });
  assert.equal(price.rows.at(-1).balance, 0);
  assert.equal(
    price.total,
    20000 + price.rows.reduce((n, r) => n + r.amount, 0),
  );
  assert.ok(price.interest > 0);
  assert.throws(() => installmentSimulation({ amount: 1, count: 2 }));
});
test("Quem me deve: parcial aumenta saldo sem inflar receitas, estorno reconcilia dívida", () => {
  let s = addReceivable(base(), {
    person: "Ana",
    description: "Divisão da viagem",
    amount: 10000,
    date: "2026-11-01",
    dueDate: "2026-11-30",
  });
  const id = s.receivables[0].id;
  assert.equal(balance(s, "a"), 100000);
  s = receiveDebt(s, id, 4000, "a", "2026-11-06");
  assert.equal(balance(s, "a"), 104000);
  assert.equal(totals(s, "2026-11").income, 0);
  assert.equal(receivableBalance(s.receivables[0]), 6000);
  assert.throws(() => receiveDebt(s, id, 6001, "a", "2026-11-06"));
  assert.throws(() => deleteTransaction(s, s.transactions[0].id));
  s = validateBackup(JSON.parse(JSON.stringify(s)));
  const invalid = structuredClone(s);
  invalid.receivables[0].payments[0].amount = 5000;
  assert.throws(() => validateBackup(invalid));
  s = undoDebtPayment(s, id, s.receivables[0].payments[0].id);
  assert.equal(balance(s, "a"), 100000);
  assert.equal(receivableBalance(s.receivables[0]), 10000);
});
test("contratos não lançam de novo parcelas já pagas e não criam receita de principal", () => {
  const s = saveFinancing(base(), {
    name: "Moto",
    amount: 10000,
    count: 12,
    paid: 10,
    date: "2026-11-30",
    accountId: "a",
    type: "financing",
  });
  assert.equal(s.transactions.length, 2);
  assert.deepEqual(
    s.transactions.map((t) => t.installment),
    [11, 12],
  );
  assert.deepEqual(
    s.transactions.map((t) => t.date),
    ["2026-11-30", "2026-12-30"],
  );
  assert.equal(balance(s, "a"), 100000);
  assert.equal(totals(s, "2026-11").income, 0);
  assert.doesNotThrow(() => validateBackup(s));
});
test("projeção não duplica recorrências geradas nem a parte da fatura já paga", () => {
  let s = saveRecurrence(base(), {
    description: "Salário",
    amount: 20000,
    date: "2026-11-06",
    endDate: "2026-11-06",
    frequency: "monthly",
    type: "income",
    accountId: "a",
  });
  s = generateRecurrences(s, "2026-11-06");
  s = addTransaction(s, {
    description: "Compra",
    type: "expense",
    amount: 9000,
    date: "2026-11-01",
    cardId: "c",
    confirmed: true,
  });
  s = payInvoice(s, "c", "2026-11", "a", "2026-11-06", 3000);
  const result = projection(s, "2026-12-06", { from: "2026-11-06" });
  assert.equal(result.initial, 97000);
  assert.equal(result.final, 111000);
  assert.equal(result.rows.length, 2);
  assert.equal(invoice(s, "c", "2026-11").due, 6000);
  assert.throws(() => payInvoice(s, "c", "2026-11", "a", "2026-11-06", 6001));
});
test("categorias e tags mantêm vínculos ao renomear e no backup antigo", () => {
  let s = saveLabel(base(), "customCategories", { name: "Empresa" });
  s = saveLabel(s, "customCategories", { name: "Software", parent: "Empresa" });
  s = saveLabel(s, "tags", { name: "PJ" });
  const tag = s.tags[0].id;
  s = addTransaction(s, {
    description: "Servidor",
    amount: 1000,
    date: "2026-11-06",
    type: "expense",
    accountId: "b",
    category: "Empresa",
    tags: [tag],
    confirmed: true,
  });
  s.budgets = [{ id: "budget", category: "Empresa", amount: 10000 }];
  s = saveLabel(s, "customCategories", {
    ...s.customCategories[0],
    name: "Negócio",
  });
  assert.equal(s.transactions[0].category, "Negócio");
  assert.equal(s.budgets[0].category, "Negócio");
  assert.equal(s.customCategories[0].parent, "Negócio");
  assert.throws(() =>
    removeLabel(
      s,
      "customCategories",
      s.customCategories.find((c) => c.name === "Negócio").id,
    ),
  );
  assert.doesNotThrow(() => validateBackup(s));
  s = removeLabel(s, "tags", tag);
  assert.deepEqual(s.transactions[0].tags, []);
  const old = base();
  for (const k of [
    "tags",
    "customCategories",
    "recurrences",
    "receivables",
    "financings",
  ])
    delete old[k];
  assert.deepEqual(validateBackup(old).receivables, []);
});
test("relatório aplica filtros e exclui transferências, faturas pagas e principal devolvido", () => {
  let s = base();
  s = addTransaction(s, {
    description: "Compra",
    type: "expense",
    amount: 9000,
    date: "2026-11-01",
    cardId: "c",
    category: "Mercado",
    confirmed: true,
  });
  s = payInvoice(s, "c", "2026-11", "a", "2026-11-06", 3000);
  s = addTransaction(s, {
    description: "Transferência",
    type: "transfer",
    amount: 1000,
    date: "2026-11-02",
    accountId: "a",
    destinationId: "b",
    confirmed: true,
  });
  s = addReceivable(s, {
    person: "Ana",
    description: "Principal",
    amount: 1000,
    date: "2026-11-01",
  });
  s = receiveDebt(s, s.receivables[0].id, 1000, "a", "2026-11-06");
  const r = report(s, {
    start: "2026-11-01",
    end: "2026-11-30",
    group: "category",
  });
  assert.equal(r.rows.length, 1);
  assert.equal(r.income, 0);
  assert.equal(r.expense, 9000);
  assert.equal(
    report(s, { start: "2026-11-01", end: "2026-11-30", accountId: "a" }).rows
      .length,
    0,
  );
});
