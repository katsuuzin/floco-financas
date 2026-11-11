import { assertFast } from "./helpers/timing.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { planPurge, restoreFromTrash, emptyTrashPlan } from "../src/trashPurge.mjs";

const day = 86400000;
const now = 40 * day;
const entry = (id, deletedAt) => ({ id, deletedAt });
test("Idade na fronteira e capacidade priorizam os mais antigos, mantendo data inválida", () => {
  const list = [entry("nova", now), entry("vencida", 10 * day), entry("inválida", "2026-02-30"), entry("antiga", 20 * day)];
  const result = planPurge(list, { now, maxItems: 2 });
  assert.deepEqual(result.keep.map((row) => row.id), ["nova", "inválida"]);
  assert.deepEqual(result.purge.map((row) => row.id), ["vencida", "antiga"]);
  assert.deepEqual(result.reasons.map((row) => row.code), ["data_invalida", "prazo", "limite"]);
  assert.equal(list.length, 4);
});
test("Data inválida não é purgada sozinha e vazio tem contagem zero", () => {
  const bad = entry("bad", "__proto__");
  assert.deepEqual(planPurge([bad], { now, maxItems: 0 }).keep, [bad]);
  assert.deepEqual(planPurge().purge, []);
  assert.equal(emptyTrashPlan().count, 0);
});
test("Restaura grupo com categoria inexistente e conserva o original", () => {
  const row = { id: "t", accountId: "a", category: "Removida", subcategory: "Antiga", type: "expense" };
  const state = { accounts: [{ id: "a" }], trash: [{ id: "x", transactions: [row] }], transactions: [] };
  const result = restoreFromTrash(state, "x");
  assert.equal(result.transactions[0].category, "Outros");
  assert.deepEqual(result.trash, []);
  assert.equal(state.trash[0].transactions[0].category, "Removida");
  assert.equal(emptyTrashPlan(state.trash).transactions, 1);
});
test("Conta removida, ID repetido, estado antigo e destino ausente geram mensagem", () => {
  const tx = { id: "t", type: "transfer", accountId: "a", destinationId: "b" };
  const state = { accounts: [{ id: "a" }], trash: [{ id: "x", transactions: [tx] }] };
  assert.match(restoreFromTrash(state, "x").error, /destino/);
  assert.match(restoreFromTrash({ ...state, accounts: [] }, "x").error, /conta/);
  assert.match(restoreFromTrash({ ...state, transactions: [tx] }, "x").error, /identificador/);
  assert.match(restoreFromTrash({}, "x").error, /lixeira/);
});
test("Cinco mil registros em menos de 100 ms", () => {
  const rows = Array.from({ length: 5000 }, (_, i) => entry(String(i), now - i));
  assertFast(() => {
    assert.equal(planPurge(rows, { now }).keep.length, 500);
  }, 100, "trash-purge");
});
