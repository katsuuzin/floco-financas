import { assertFast } from "./helpers/timing.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { emptyState, totalBalance, validateBackup } from "../src/finance.mjs";
import { normalizeOrder, moveAccount, archiveAccount, unarchiveAccount, visibleAccounts, visibleTotalBalance } from "../src/accountOrder.mjs";

test("Backup antigo conserva contas e propriedades novas inválidas são descartadas", () => {
  const a = { id: "a", name: "Conta fictícia", initial: 100 };
  assert.deepEqual(validateBackup({ ...emptyState(), accounts: [a] }).accounts, [a]);
  assert.deepEqual(validateBackup({ ...emptyState(), accounts: [{ ...a, order: "lixo", archived: {} }] }).accounts, [a]);
  assert.equal(totalBalance({ ...emptyState(), accounts: [{ ...a, archived: true }] }), 0);
});
test("Estado antigo e ordens repetidas normalizam sem buracos e com estabilidade", () => {
  const accounts = [{ id:"a" }, { id:"b", order:0 }, { id:"c", order:20 }];
  const normalized = normalizeOrder(accounts);
  assert.deepEqual(normalized.map((row) => [row.id,row.order]), [["a",0],["b",1],["c",2]]);
  assert.equal(normalizeOrder(normalized), normalized);
  assert.deepEqual(moveAccount(normalized, "a", 8).map((row) => [row.id,row.order]), [["b",0],["c",1],["a",2]]);
  assert.deepEqual(visibleAccounts(), []);
});
test("Arquivar com saldo pede confirmação e não perde transações", () => {
  const state = { accounts: [{ id:"a", initial:100 }, { id:"b", initial:0 }],
    transactions: [{ id:"t", accountId:"b", type:"income", amount:50, confirmed:true }] };
  assert.equal(archiveAccount(state, "a").blockers[0].code, "saldo");
  const next = archiveAccount(state, "a", { force:true });
  assert.equal(next.transactions, state.transactions);
  assert.deepEqual(visibleAccounts(next).map(({ id }) => id), ["b"]);
  assert.equal(visibleAccounts(next, { includeArchived:true }).length, 2);
  assert.equal(visibleTotalBalance(next), 50);
  assert.equal(unarchiveAccount(next, "a").accounts[0].archived, false);
});
test("Cartão e transferência futura bloqueiam inclusive com confirmação de saldo", () => {
  const state = { accounts:[{ id:"a", initial:0 }], cards:[{ id:"c", accountId:"a" }],
    transactions:[{ date:"2026-01-02", type:"transfer", destinationId:"a", amount:100, confirmed:false }] };
  assert.deepEqual(archiveAccount(state, "a", { force:true, now:"2026-01-01" }).blockers.map(({ code }) => code), ["cartao","futuro"]);
  assert.match(unarchiveAccount({}, "__proto__").error, /não encontrada/);
});
test("Ordena cinco mil contas em menos de 100 ms", () => {
  const accounts = Array.from({ length: 5000 }, (_, i) => ({ id:String(i), order:5000 - i }));
  assertFast(() => {
    assert.equal(visibleAccounts({ accounts })[0].id, "4999");
  }, 100, "account-order");
});
