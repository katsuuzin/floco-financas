import test from "node:test";
import assert from "node:assert/strict";
import { archiveAccount } from "../src/accountOrder.mjs";
import { archivePot, potSummary } from "../src/goalPots.mjs";
import { emptyState, validateBackup } from "../src/finance.mjs";
import { createShoppingList } from "../src/shopping.mjs";

const date = "2026-11-10";
const account = { id: "a", name: "Conta de teste", initial: 200 };
const reserve = { id: "reserva", accountId: "a", amount: 100, date };
const pot = { id: "p", name: "Reserva de teste", saved: 100, deposits: [reserve] };

test("Achado C1: lançamento pendente vencido impede o arquivamento", () => {
  const pending = { id: "t", accountId: "a", date: "2026-11-09", type: "expense", amount: 100, confirmed: false };
  const next = archiveAccount({ accounts: [account], transactions: [pending] }, "a", { now: date, force: true });
  assert.ok(next.blockers?.some(({ code }) => code === "futuro"));
});

test("Achado C2: reserva ativa em caixinha impede o arquivamento da conta", () => {
  const state = { accounts: [account], pots: [pot] };
  const next = archiveAccount(state, "a", { now: date, force: true });
  assert.ok(next.error || !next.accounts[0].archived);
});

test("Achado C3: meta perde o vínculo ao arquivar a caixinha para uma conta", () => {
  const state = { accounts: [account], pots: [pot], goals: [{ id: "g", kind: "goal", target: 500, saved: 0, potId: "p" }] };
  const next = archivePot(state, "p", { toAccountId: "a", date });
  assert.equal(potSummary(next, date).goals[0].potId, null);
});

test("A criação normal recusa a lista 101 antes de alterar os itens", () => {
  const shoppingLists = Array.from({ length: 100 }, (_, i) => ({
    id: "lista-" + i, name: "Lista " + i, archived: false,
  }));
  const state = { ...emptyState(), shoppingLists };
  assert.throws(() => createShoppingList(state, "Lista extra"), /limite/);
  assert.equal(validateBackup(state).shoppingLists.length, 100);
});

test("Achado C4: buscas de contas para as reservas não crescem ao quadrado", () => {
  const count = (size) => {
    let reads = 0;
    const accounts = Array.from({ length: size }, (_, i) => ({ ...account, id: String(i) }));
    accounts.map = function (fn) {
      const mapped = Array.prototype.map.call(this, fn);
      mapped.some = function (predicate) {
        return Array.prototype.some.call(this, (...args) => {
          reads++;
          return predicate(...args);
        });
      };
      return mapped;
    };
    const pots = Array.from({ length: size }, (_, i) => ({
      ...pot, id: String(i), deposits: [{ ...reserve, accountId: String(size - 1) }],
    }));
    assert.equal(validateBackup({ ...emptyState(), accounts, pots }).pots.length, size);
    return reads;
  };
  const half = count(100);
  const full = count(200);
  assert.ok(full <= half * 3, `${half} → ${full} leituras de identificador`);
});
