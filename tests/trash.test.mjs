import { test } from "node:test";
import assert from "node:assert/strict";
import { addTransaction, balance, emptyState, validateBackup } from "../src/finance.mjs";
import { trashTransaction, restoreTrash, purgeTrash, emptyTrash, purgeExpired, daysLeft } from "../src/trash.mjs";

const DAY = 86400000;
const base = () => {
  let s = { ...emptyState(), accounts: [{ id: "nu", name: "Nubank", initial: 10000 }], cards: [{ id: "c1", name: "Nu", limit: 100000, closingDay: 1, dueDay: 8 }] };
  s = addTransaction(s, { description: "Mercado", amount: 2500, type: "expense", date: "2026-11-02", accountId: "nu", confirmed: true });
  s = addTransaction(s, { description: "TV", amount: 30000, type: "expense", date: "2026-11-03", cardId: "c1", installments: 3, confirmed: true });
  return s;
};

test("S11 excluir manda para a lixeira e restaurar devolve o saldo", () => {
  let s = base();
  const id = s.transactions.find((t) => t.description === "Mercado").id;
  s = trashTransaction(s, id, 1000);
  assert.equal(balance(s, "nu"), 10000);
  assert.equal(s.trash.length, 1);
  s = restoreTrash(s, s.trash[0].id);
  assert.equal(balance(s, "nu"), 7500);
  assert.equal(s.trash.length, 0);
});

test("S11 parcelas vão juntas e voltam juntas", () => {
  let s = base();
  const tv = s.transactions.find((t) => t.description.startsWith("TV"));
  s = trashTransaction(s, tv.id, 1000);
  assert.equal(s.trash[0].count, 3);
  assert.equal(s.transactions.length, 1);
  s = restoreTrash(s, s.trash[0].id);
  assert.equal(s.transactions.length, 4);
});

test("S11 purga manual, esvaziar e expiração em 30 dias", () => {
  let s = base();
  s = trashTransaction(s, s.transactions[0].id, 0);
  assert.equal(daysLeft(s.trash[0], 29 * DAY), 1);
  assert.equal(purgeExpired(s, 29 * DAY).trash.length, 1);
  assert.equal(purgeExpired(s, 30 * DAY).trash.length, 0);
  assert.equal(purgeTrash(s, s.trash[0].id).trash.length, 0);
  assert.equal(emptyTrash(s).trash.length, 0);
});

test("S11 não restaura sem a conta e o backup aceita a lixeira", () => {
  let s = base();
  s = trashTransaction(s, s.transactions[0].id, 0);
  const semConta = { ...s, accounts: [] };
  assert.throws(() => restoreTrash(semConta, s.trash[0].id), /não existe mais/);
  const back = validateBackup(JSON.parse(JSON.stringify(s)));
  assert.equal(back.trash.length, 1);
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify({ ...emptyState() }))).trash, []);
});

test("O1 reordenar contas pula as arquivadas e para nas pontas", async () => {
  const { moveItem } = await import("../src/finance.mjs");
  const list = [{ id: "a" }, { id: "x", archived: true }, { id: "b" }, { id: "c" }];
  assert.deepEqual(moveItem(list, "b", -1).map((x) => x.id), ["b", "x", "a", "c"]);
  assert.deepEqual(moveItem(list, "c", 1), list);
  assert.deepEqual(moveItem(list, "a", -1), list);
  assert.equal(moveItem(list, "a", 1)[1], list[1]);
});
