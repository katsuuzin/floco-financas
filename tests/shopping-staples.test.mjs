import { assertFast } from "./helpers/timing.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { markStaple, staplesToRestock } from "../src/shoppingStaples.mjs";

const item = { id: "a", name: "Arroz", unit: "", inCart: true, createdAt: Date.UTC(2026, 0, 1) };
const active = markStaple({ shoppingItems: [item] }, "a", 7);
const state = { ...active, shoppingItems: [] };
test("Marca e desmarca sem alterar a lista original", () => {
  assert.equal(item.staple, undefined);
  assert.equal(active.shoppingItems[0].staple, true);
  assert.equal(markStaple(active, "a", null).shoppingStaples.length, 0);
});
test("Intervalo valida os limites e rejeita valores fracionados", () => {
  for (const value of [0, 366, 1.1, "7"]) assert.throws(() => markStaple(active, "a", value), /1 a 365/);
  assert.equal(markStaple(active, "a", 365).shoppingStaples[0].everyDays, 365);
});
test("Sem histórico, usa o intervalo da pessoa a partir do registro", () => {
  assert.deepEqual(staplesToRestock(state, "2026-01-07"), []);
  assert.equal(staplesToRestock(state, "2026-01-08")[0].inCart, false);
});
test("Item já na lista não duplica, mesmo com caixa diferente", () => {
  assert.deepEqual(staplesToRestock({ ...state, shoppingItems: [{ ...item, name: "ARROZ" }] }, "2026-02-01"), []);
});
test("Histórico fora de ordem aumenta o intervalo mínimo", () => {
  const history = { ...state, shoppingProducts: [{ name: "Arroz", prices: [{ date: "2026-01-11" }, { date: "2026-01-01" }] }] };
  assert.deepEqual(staplesToRestock(history, "2026-01-20"), []);
  assert.equal(staplesToRestock(history, "2026-01-21").length, 1);
});
test("Virada UTC e dia civil explícito preservam o limite de dias", () => {
  assert.deepEqual(staplesToRestock(state, Date.UTC(2026, 0, 7, 23, 59)), []);
  assert.equal(staplesToRestock(state, Date.UTC(2026, 0, 8)).length, 1);
  assert.deepEqual(staplesToRestock(state, "2026-02-30"), []);
});
test("Dois mil básicos são avaliados em menos de 100 ms", () => {
  const shoppingStaples = Array.from({ length: 2000 }, (_, n) => ({ ...item, name: "Arroz " + n, staple: true, everyDays: 1 }));
  assertFast(() => {
    assert.equal(staplesToRestock({ shoppingStaples }, "2026-01-08").length, 2000);
  }, 100, "shopping-staples");
});
