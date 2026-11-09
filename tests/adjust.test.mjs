import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction, balance, totals, totalBalance } from "../src/finance.mjs";
import { report } from "../src/planning.mjs";
import { adjustBalance, adjustmentDifference, parseSignedMoney } from "../src/adjust.mjs";

const base = () => {
  let s = {
    ...emptyState(),
    accounts: [
      { id: "a", name: "A", initial: 0 },
      { id: "b", name: "B", initial: 50000 },
    ],
  };
  // Conta A fica em −R$ 88,00, como na ficha O6.
  return addTransaction(s, { type: "expense", amount: 8800, date: "2026-11-06", description: "Mercado", category: "Mercado", accountId: "a", confirmed: true });
};
const D = "2026-11-09";

test("O6 parseSignedMoney aceita zero e negativo, e recusa lixo", () => {
  assert.equal(parseSignedMoney("1.500,00"), 150000);
  assert.equal(parseSignedMoney("-88,50"), -8850);
  assert.equal(parseSignedMoney("0"), 0);
  assert.equal(parseSignedMoney("0,00"), 0);
  assert.equal(parseSignedMoney("R$ 10"), 1000);
  assert.throws(() => parseSignedMoney("abc"));
  assert.throws(() => parseSignedMoney(""));
});

test("O6 receita: saldo vai ao valor real e a diferença entra nos relatórios", () => {
  const s0 = base();
  assert.equal(adjustmentDifference(s0, "a", 150000), 158800);
  const s = adjustBalance(s0, { accountId: "a", newBalance: 150000, mode: "income", category: "Salário", date: D });
  assert.equal(balance(s, "a"), 150000);
  const t = s.transactions.at(-1);
  assert.equal(t.type, "income");
  assert.equal(t.amount, 158800);
  assert.equal(t.adjustment, true);
  assert.equal(totals(s, "2026-11").income, 158800);
  assert.equal(report(s, { start: "2026-11-01", end: "2026-11-30" }).income, 158800);
});

test("O6 o relatório só vê o ajuste de receita, nunca o 'só ajustar' nem a transferência", () => {
  const range = { start: "2026-11-01", end: "2026-11-30" };
  const s0 = base();
  const only = adjustBalance(s0, { accountId: "a", newBalance: 150000, mode: "only", date: D });
  assert.equal(report(only, range).income, 0);
  assert.equal(report(only, range).expense, 8800);
  const moved = adjustBalance(s0, { accountId: "a", newBalance: 10000, mode: "transfer", sourceId: "b", date: D });
  assert.equal(report(moved, range).income, 0);
  assert.equal(report(moved, range).expense, 8800);
});

test("O6 só ajustar: corrige o saldo e fica fora de receitas e despesas", () => {
  const s0 = base();
  const s = adjustBalance(s0, { accountId: "a", newBalance: 150000, mode: "only", date: D });
  assert.equal(balance(s, "a"), 150000);
  assert.equal(totalBalance(s), 150000 + 50000);
  assert.equal(totals(s, "2026-11").income, 0);
  assert.equal(totals(s, "2026-11").expense, 8800);
  assert.equal(s.transactions.at(-1).ignored, true);
  assert.equal(s.transactions.at(-1).adjustment, true);
});

test("O6 saldo real menor vira despesa (ou só ajuste) e aceita saldo negativo e zero", () => {
  const s0 = base();
  const down = adjustBalance(s0, { accountId: "b", newBalance: 30000, mode: "income", date: D });
  assert.equal(balance(down, "b"), 30000);
  assert.equal(down.transactions.at(-1).type, "expense");
  assert.equal(totals(down, "2026-11").expense, 8800 + 20000);
  const only = adjustBalance(s0, { accountId: "b", newBalance: 0, mode: "only", date: D });
  assert.equal(balance(only, "b"), 0);
  assert.equal(totals(only, "2026-11").expense, 8800);
  const red = adjustBalance(s0, { accountId: "b", newBalance: -2500, mode: "only", date: D });
  assert.equal(balance(red, "b"), -2500);
});

test("O6 transferência: o dinheiro veio de outra conta e os totais do mês não mudam", () => {
  const s0 = base();
  const s = adjustBalance(s0, { accountId: "a", newBalance: 10000, mode: "transfer", sourceId: "b", date: D });
  assert.equal(balance(s, "a"), 10000);
  assert.equal(balance(s, "b"), 50000 - 18800);
  assert.equal(totalBalance(s), totalBalance(s0));
  assert.deepEqual(totals(s, "2026-11"), totals(s0, "2026-11"));
  const t = s.transactions.at(-1);
  assert.equal(t.type, "transfer");
  assert.equal(t.accountId, "b");
  assert.equal(t.destinationId, "a");
  // Saldo menor: o dinheiro foi para a outra conta.
  const out = adjustBalance(s0, { accountId: "b", newBalance: 20000, mode: "transfer", sourceId: "a", date: D });
  assert.equal(balance(out, "b"), 20000);
  assert.equal(balance(out, "a"), -8800 + 30000);
  assert.equal(out.transactions.at(-1).accountId, "b");
  assert.equal(out.transactions.at(-1).destinationId, "a");
});

test("O6 recusa ajuste sem diferença, dados inválidos e transferência para a mesma conta", () => {
  const s0 = base();
  assert.throws(() => adjustBalance(s0, { accountId: "a", newBalance: -8800, mode: "only", date: D }), /já é esse/);
  assert.throws(() => adjustBalance(s0, { accountId: "x", newBalance: 1, mode: "only", date: D }), /conta/);
  assert.throws(() => adjustBalance(s0, { accountId: "a", newBalance: 1.5, mode: "only", date: D }), /saldo real/);
  assert.throws(() => adjustBalance(s0, { accountId: "a", newBalance: 100, mode: "xx", date: D }), /diferença representa/);
  assert.throws(() => adjustBalance(s0, { accountId: "a", newBalance: 100, mode: "only", date: "2026-13-40" }), /data/);
  assert.throws(() => adjustBalance(s0, { accountId: "a", newBalance: 100, mode: "transfer", sourceId: "a", date: D }), /outra conta/);
  assert.throws(() => adjustBalance(s0, { accountId: "a", newBalance: 100, mode: "transfer", date: D }), /outra conta/);
  // Nada foi gravado nas tentativas que falharam.
  assert.equal(s0.transactions.length, 1);
});

test("O6 transação pendente não entra no saldo atual usado na diferença", () => {
  let s = base();
  s = addTransaction(s, { type: "expense", amount: 5000, date: D, description: "Conta de luz", category: "Moradia", accountId: "a", confirmed: false });
  assert.equal(adjustmentDifference(s, "a", 0), 8800);
});
