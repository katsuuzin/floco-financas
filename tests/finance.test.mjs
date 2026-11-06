import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  addTransaction,
  balance,
  parseMoney,
  invoiceMonth,
  invoice,
  payInvoice,
  deleteTransaction,
  totals,
  contribute,
  reserved,
  validateBackup,
  demoState,
  isDate,
  addMonths,
} from "../src/finance.mjs";
const base = () => ({
  ...emptyState(),
  accounts: [
    { id: "a", name: "A", initial: 100000 },
    { id: "b", name: "B", initial: 0 },
  ],
  cards: [
    { id: "c", name: "Cartão", limit: 500000, closingDay: 3, dueDay: 10 },
  ],
});
const tx = {
  description: "Teste",
  amount: 10000,
  date: "2026-11-06",
  type: "expense",
  accountId: "a",
  confirmed: true,
  category: "Mercado",
};
test("exclusão preserva fatura paga e desfaz parcelamento completo", () => {
  let s = addTransaction(base(), {
    ...tx,
    cardId: "c",
    installments: 3,
    date: "2026-11-01",
  });
  const purchase = s.transactions[0].id;
  s = payInvoice(s, "c", "2026-11", "a", "2026-11-10");
  assert.throws(() => deleteTransaction(s, purchase));
  s = deleteTransaction(s, s.transactions.find((t) => t.invoicePayment).id);
  assert.equal(balance(s, "a"), 100000);
  s = deleteTransaction(s, purchase);
  assert.equal(s.transactions.length, 0);
});
test("valores brasileiros são centavos exatos e rejeitam formatos ambíguos", () => {
  assert.equal(parseMoney("1.234,56"), 123456);
  assert.equal(parseMoney("0,01"), 1);
  for (const x of ["0", "-20", "1.23", "1,234", "abc", "NaN"])
    assert.throws(() => parseMoney(x));
});
test("transferência move saldo sem virar despesa ou receita", () => {
  const s = addTransaction(base(), {
    ...tx,
    type: "transfer",
    destinationId: "b",
  });
  assert.equal(balance(s, "a"), 90000);
  assert.equal(balance(s, "b"), 10000);
  assert.deepEqual(totals(s, "2026-11"), {
    income: 0,
    expense: 0,
    pay: 0,
    receive: 0,
  });
  assert.throws(() =>
    addTransaction(s, { ...tx, type: "transfer", destinationId: "a" }),
  );
});
test("pendência só altera saldo quando confirmada", () => {
  let s = addTransaction(base(), { ...tx, confirmed: false });
  assert.equal(balance(s, "a"), 100000);
  assert.equal(totals(s, "2026-11").pay, 10000);
  s.transactions[0].confirmed = true;
  assert.equal(balance(s, "a"), 90000);
});
test("fechamento e virada do ano direcionam o vencimento", () => {
  const c = base().cards[0];
  assert.equal(invoiceMonth("2026-11-03", c), "2026-11");
  assert.equal(invoiceMonth("2026-11-04", c), "2026-12");
  assert.equal(invoiceMonth("2026-12-31", c), "2027-01");
  assert.equal(
    invoiceMonth("2026-11-21", { closingDay: 20, dueDay: 5 }),
    "2027-01",
  );
});
test("parcelas preservam todos os centavos e vencem em meses consecutivos", () => {
  const s = addTransaction(base(), {
    ...tx,
    amount: 10000,
    cardId: "c",
    installments: 3,
  });
  assert.equal(
    s.transactions.reduce((n, t) => n + t.amount, 0),
    10000,
  );
  assert.deepEqual(
    s.transactions.map((t) => t.amount),
    [3334, 3333, 3333],
  );
  assert.deepEqual(
    s.transactions.map((t) => t.invoiceMonth),
    ["2026-12", "2027-01", "2027-02"],
  );
  assert.equal(balance(s, "a"), 100000);
});
test("pagamento baixa a fatura uma vez e não duplica a despesa", () => {
  let s = addTransaction(base(), { ...tx, cardId: "c", date: "2026-11-01" });
  assert.equal(invoice(s, "c", "2026-11").due, 10000);
  s = payInvoice(s, "c", "2026-11", "a", "2026-11-10");
  assert.equal(balance(s, "a"), 90000);
  assert.equal(invoice(s, "c", "2026-11").due, 0);
  assert.equal(totals(s, "2026-11").expense, 10000);
  assert.throws(() => payInvoice(s, "c", "2026-11", "a"));
});
test("metas reservam apenas o dinheiro disponível", () => {
  let s = base();
  s.goals = [
    { id: "g", name: "Reserva", target: 100000, saved: 0, deposits: [] },
  ];
  s = contribute(s, "g", 80000, "a");
  assert.equal(balance(s, "a"), 100000);
  assert.equal(reserved(s, "a"), 80000);
  assert.throws(() => contribute(s, "g", 30000, "a"));
  assert.equal(validateBackup(s).goals[0].saved, 80000);
});
test("backup rejeita referências quebradas, valores inválidos e IDs duplicados", () => {
  assert.equal(validateBackup(demoState()).version, 1);
  const s = base();
  s.accounts.push(s.accounts[0]);
  assert.throws(() => validateBackup(s));
  const t = addTransaction(base(), tx);
  t.transactions[0].accountId = "missing";
  assert.throws(() => validateBackup(t));
  assert.throws(() => validateBackup({ version: 2 }));
});
test("datas inválidas e fim do mês não transbordam", () => {
  assert.equal(isDate("2026-02-30"), false);
  assert.equal(isDate("2026-99-99"), false);
  assert.equal(isDate("2028-02-29"), true);
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.throws(() => addTransaction(base(), { ...tx, date: "2026-02-30" }));
});
