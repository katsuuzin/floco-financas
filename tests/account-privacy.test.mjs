import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  balance,
  totalBalance,
  accountBalanceHidden,
  validateBackup,
  addTransaction,
} from "../src/finance.mjs";
import { projection, saveRecurrence } from "../src/planning.mjs";
const base = () => ({
  ...emptyState(),
  accounts: [
    { id: "pf", name: "Nubank PF", initial: 100000 },
    {
      id: "pj",
      name: "Nubank PJ",
      initial: 200000,
      hideBalance: true,
      includeInTotal: false,
    },
  ],
});
test("ocultação por conta é independente e o botão global nunca revela uma conta oculta", () => {
  const s = base();
  assert.equal(accountBalanceHidden(s, "pf"), false);
  assert.equal(accountBalanceHidden(s, "pj"), true);
  s.settings.hide = true;
  assert.equal(accountBalanceHidden(s, "pf"), true);
  assert.equal(accountBalanceHidden(s, "pj"), true);
  s.settings.hide = false;
  assert.equal(accountBalanceHidden(s, "pj"), true);
  assert.equal(balance(s, "pj"), 200000);
  assert.equal(totalBalance(s), 100000);
});
test("backup preserva as escolhas, migra contas antigas e rejeita preferências inválidas", () => {
  const s = validateBackup(JSON.parse(JSON.stringify(base())));
  assert.equal(s.accounts[1].includeInTotal, false);
  assert.equal(s.accounts[1].hideBalance, true);
  assert.equal(totalBalance(s), 100000);
  delete s.accounts[1].includeInTotal;
  delete s.accounts[1].hideBalance;
  assert.equal(totalBalance(validateBackup(s)), 300000);
  assert.equal(accountBalanceHidden(s, "pj"), false);
  assert.throws(() =>
    validateBackup({
      ...s,
      accounts: [{ ...s.accounts[0], hideBalance: "false" }],
    }),
  );
});
test("projeção ignora pendências, faturas e recorrências da conta excluída", () => {
  let s = base();
  s.cards = [
    {
      id: "c",
      name: "PJ crédito",
      accountId: "pj",
      limit: 100000,
      closingDay: 3,
      dueDay: 10,
    },
  ];
  s = addTransaction(s, {
    description: "PJ pendente",
    amount: 50000,
    type: "income",
    accountId: "pj",
    date: "2026-11-10",
    confirmed: false,
  });
  s = addTransaction(s, {
    description: "Compra PJ",
    amount: 20000,
    type: "expense",
    cardId: "c",
    date: "2026-11-01",
    confirmed: true,
  });
  s = saveRecurrence(s, {
    description: "PJ recorrente",
    amount: 30000,
    date: "2026-11-06",
    frequency: "monthly",
    type: "income",
    accountId: "pj",
  });
  const r = projection(s, "2026-12-01", { from: "2026-11-06" });
  assert.equal(r.initial, 100000);
  assert.equal(r.final, 100000);
  assert.equal(r.rows.length, 0);
});
test("projeção considera transferências que atravessam contas incluídas e excluídas", () => {
  let s = addTransaction(base(), {
    description: "Saída para PJ",
    amount: 10000,
    type: "transfer",
    accountId: "pf",
    destinationId: "pj",
    date: "2026-11-10",
    confirmed: false,
  });
  s = addTransaction(s, {
    description: "Entrada da PJ",
    amount: 4000,
    type: "transfer",
    accountId: "pj",
    destinationId: "pf",
    date: "2026-11-11",
    confirmed: false,
  });
  assert.equal(
    projection(s, "2026-12-01", { from: "2026-11-06" }).final,
    94000,
  );
  s.accounts[1].includeInTotal = true;
  const all = projection(s, "2026-12-01", { from: "2026-11-06" });
  assert.equal(all.final, 300000);
  assert.equal(all.rows.length, 0);
});
