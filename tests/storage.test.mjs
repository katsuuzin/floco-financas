import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  SCHEMA,
  HAS_STORED_DATA,
  diffState,
  applyDiff,
  assembleState,
  LOAD_ROWS,
  LOAD_META,
  sameData,
  isEmptyDiff,
} from "../src/storage.mjs";
import {
  emptyState,
  demoState,
  addTransaction,
  deleteTransaction,
  totalBalance,
  balance,
} from "../src/finance.mjs";

// Adaptador mínimo para que node:sqlite tenha a mesma API usada com expo-sqlite.
function memoryDb() {
  const db = new DatabaseSync(":memory:");
  for (const sql of SCHEMA) db.exec(sql);
  return {
    runSync: (sql, params = []) => db.prepare(sql).run(...params),
    getAllSync: (sql) => db.prepare(sql).all(),
    tx(fn) {
      db.exec("BEGIN");
      try {
        fn();
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
const save = (db, prev, next) =>
  db.tx(() => applyDiff(db, diffState(prev, next)));
const load = (db) =>
  assembleState(
    db.getAllSync(LOAD_ROWS),
    db.getAllSync(LOAD_META),
    emptyState(),
  );

test("migração completa preserva todos os dados e saldos", () => {
  const db = memoryDb();
  const s = demoState();
  save(db, null, s);
  const back = load(db);
  assert.ok(sameData(back, s));
  assert.equal(totalBalance(back), totalBalance(s));
  for (const a of s.accounts)
    assert.equal(balance(back, a.id), balance(s, a.id));
});

test("coleções opcionais novas sobrevivem vazias, preenchidas e removidas no SQLite", () => {
  const db = memoryDb();
  const empty = { ...emptyState(), pots: [], shoppingStaples: [], shoppingListTemplates: [] };
  save(db, null, empty);
  assert.ok(sameData(load(db), empty));
  const populated = { ...empty, shoppingListTemplates: [{ id: "modelo", name: "Feira", items: [] }] };
  save(db, empty, populated);
  assert.ok(sameData(load(db), populated));
  const { shoppingListTemplates, ...without } = empty;
  save(db, populated, empty);
  save(db, empty, without);
  assert.ok(sameData(load(db), without));
});

test("só os registros alterados são regravados", () => {
  const s = demoState();
  const account = s.accounts[0].id;
  const next = addTransaction(s, {
    type: "expense",
    amount: 1234,
    date: "2026-11-05",
    description: "Café",
    category: "Alimentação",
    accountId: account,
    confirmed: true,
  });
  const d = diffState(s, next);
  const added = next.transactions.filter((t) => !s.transactions.includes(t));
  assert.equal(d.deletes.length, 0);
  assert.ok(d.upserts.every((u) => u.collection === "transactions"));
  assert.ok(added.every((t) => d.upserts.some((u) => u.id === t.id)));
  assert.ok(d.upserts.length <= next.transactions.length);
  assert.ok(isEmptyDiff(diffState(next, next)));
});

test("exclusão remove a linha e a ordem é mantida", () => {
  const db = memoryDb();
  const s = demoState();
  save(db, null, s);
  const victim = s.transactions[1].id;
  const next = deleteTransaction(s, victim);
  save(db, s, next);
  const back = load(db);
  assert.ok(!back.transactions.some((t) => t.id === victim));
  assert.deepEqual(
    back.transactions.map((t) => t.id),
    next.transactions.map((t) => t.id),
  );
});

test("falha no meio da gravação não deixa estado parcial", () => {
  const db = memoryDb();
  const s = demoState();
  save(db, null, s);
  const broken = {
    ...s,
    transactions: [...s.transactions, { id: s.transactions[0].id }],
  };
  assert.throws(() => save(db, s, broken), /repetido/);
  assert.ok(sameData(load(db), s));
});

test("configurações e coleções novas sobrevivem sem migração de esquema", () => {
  const db = memoryDb();
  const s = {
    ...emptyState(),
    settings: { dark: true, biometric: false, hide: true },
    rules: [{ id: "r1", pattern: "UBER*" }],
  };
  save(db, null, s);
  const back = load(db);
  assert.equal(back.settings.dark, true);
  assert.deepEqual(back.rules, [{ id: "r1", pattern: "UBER*" }]);
});

test("instalação sem marcador reconhece registros já gravados", () => {
  const db = memoryDb();
  const initial = emptyState();
  const next = {
    ...initial,
    accounts: [{ id: "a1", name: "Conta local", initial: 10000 }],
  };
  save(db, initial, next);
  assert.equal(
    db.getAllSync("SELECT 1 FROM meta WHERE key = 'version'").length,
    0,
  );
  assert.equal(db.getAllSync(HAS_STORED_DATA).length, 1);
  assert.equal(load(db).accounts.length, 1);
});
