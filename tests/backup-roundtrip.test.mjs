import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { emptyState, migratePotState, totalBalance, validateBackup } from "../src/finance.mjs";
import { keepShoppingOnRestore, migrateShoppingLists } from "../src/shopping.mjs";
import { migrateProductKeys } from "../src/shoppingKeyMigration.mjs";
import { seedRules, upgradeBuiltInRules } from "../src/rules.mjs";
import { checkShoppingBackup } from "../src/shoppingBackupCheck.mjs";
import { applyDiff, assembleState, diffState, LOAD_META, LOAD_ROWS, SCHEMA } from "../src/storage.mjs";
import { assertFast } from "./helpers/timing.mjs";

const readBackup = () => JSON.parse(readFileSync(new URL("./fixtures/backup-1.10.0.json", import.meta.url), "utf8"));
const exported = (state) => JSON.stringify(state);
const restore = (json, current = emptyState()) => {
  const raw = JSON.parse(json);
  assert.deepEqual(checkShoppingBackup(raw).errors, []);
  return migrateShoppingLists(migratePotState(keepShoppingOnRestore(validateBackup(raw), current)));
};

function reopen(state) {
  const db = new DatabaseSync(":memory:");
  try {
    for (const sql of SCHEMA) db.exec(sql);
    applyDiff({ runSync: (sql, params) => db.prepare(sql).run(...params) }, diffState(null, state));
    const raw = assembleState(db.prepare(LOAD_ROWS).all(), db.prepare(LOAD_META).all(), emptyState());
    const checked = validateBackup(raw);
    const rules = upgradeBuiltInRules(checked.rules === undefined ? seedRules(checked) : checked);
    return migrateShoppingLists(migratePotState(migrateProductKeys(rules).state));
  } finally {
    db.close();
  }
}

test("Backup 1.10.0 conserva cada registro e reabre igual na segunda restauração", () => {
  const legacy = readBackup();
  const first = reopen(restore(exported(legacy)));
  const second = reopen(restore(exported(first)));
  assert.deepEqual(second, first);
  assert.deepEqual(first.accounts, legacy.accounts);
  assert.deepEqual(first.transactions.map(({ id, amount, accountId, tags }) => ({ id, amount, accountId, tags })),
    legacy.transactions.map(({ id, amount, accountId, tags }) => ({ id, amount, accountId, tags })));
  assert.deepEqual(first.tags, legacy.tags);
  assert.deepEqual(first.goals.find(({ id }) => id === "meta"), legacy.goals[0]);
  assert.equal(first.goals.find(({ id }) => id === "reserva").potId, "reserva");
  assert.deepEqual(first.pots[0].deposits, legacy.goals[1].deposits);
  assert.deepEqual(first.pots[0].history, legacy.goals[1].history);
  assert.deepEqual(first.shoppingItems.map(({ id, qty, priceCents }) => ({ id, qty, priceCents })),
    legacy.shoppingItems.map(({ id, qty, priceCents }) => ({ id, qty, priceCents })));
  assert.equal(totalBalance(first), totalBalance(legacy));
  assert.equal(first.pots.reduce((sum, pot) => sum + pot.saved, 0), legacy.goals[1].saved);
});

test("Campos opcionais corrompidos são descartados e os registros válidos permanecem", () => {
  const legacy = readBackup();
  const expected = restore(exported(legacy));
  legacy.pots = "x";
  legacy.accounts[0].order = -1;
  legacy.tags[0].icon = {};
  legacy.shoppingLists = null;
  assert.deepEqual(restore(exported(legacy)), expected);
});

test("Campo de uma edição mais nova com o mesmo formato sobrevive ao SQLite e à exportação", () => {
  const future = readBackup();
  future.resumoFuturo = { modo: "trimestral", dias: [15, 30] };
  const result = JSON.parse(exported(reopen(restore(exported(future)))));
  assert.deepEqual(result.resumoFuturo, future.resumoFuturo);
});

test("Restaura cinco mil transações e dois mil itens no orçamento de tempo", () => {
  const sample = readBackup();
  sample.transactions = Array.from({ length: 5000 }, (_, i) => ({ ...sample.transactions[0], id: "t" + i, groupId: "t" + i }));
  sample.shoppingItems = Array.from({ length: 2000 }, (_, i) => ({ ...sample.shoppingItems[0], id: "i" + i }));
  const json = exported(sample);
  let restored;
  assertFast(() => { restored = reopen(restore(json)); }, 500, "Restauração e reabertura do backup grande");
  assert.equal(restored.transactions.length, 5000);
  assert.equal(restored.shoppingItems.length, 2000);
  assert.equal(totalBalance(restored), totalBalance(sample));
});
