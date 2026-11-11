import test from "node:test";
import assert from "node:assert/strict";
import { pushUndo, undo, redo, describeUndo } from "../src/shoppingUndo.mjs";
import { makeState } from "./helpers/shoppingFixtures.mjs";

const empty = makeState();
const start = () => pushUndo(undefined, empty);
const change = (state, name) => ({ ...state, shoppingItems: [{ name }] });

test("Desfazer e refazer preservam o estado e descrevem a ação", () => {
  const next = change(empty, "Leite");
  const history = pushUndo(start(), next, "remover Leite");
  assert.equal(describeUndo(history), "Desfazer: remover Leite");
  assert.equal(undo(history).present, empty);
  assert.equal(redo(undo(history)).present, next);
  assert.equal(describeUndo(undo(history)), "");
});
test("Nova ação invalida o caminho de refazer", () => {
  const h = undo(pushUndo(start(), change(empty, "Leite"), "editar"));
  const updated = pushUndo(h, change(empty, "Arroz"), "editar");
  assert.equal(redo(updated), updated);
});
test("Compacta o mesmo tipo antes de dois segundos, com fronteira e relógio explícitos", () => {
  const a = pushUndo(start(), change(empty, "Arroz"), "editar arroz", { now: 100 });
  const b = pushUndo(a, change(empty, "Leite"), "editar leite", { now: 2099 });
  assert.equal(b.past.length, 1);
  assert.equal(undo(b).present, empty);
  assert.equal(pushUndo(b, change(empty, "Sal"), "editar sal", { now: 4099 }).past.length, 2);
  assert.equal(pushUndo(b, change(empty, "Sal"), "editar sal", { now: 5 }).past.length, 2);
});
test("Trinta passos e compartilhamento estrutural de estado grande", () => {
  const initial = makeState({ items: Array.from({ length: 2000 }, (_, i) => ({ id: String(i) })) });
  let history = pushUndo(null, initial);
  for (let i = 1; i <= 32; i++) {
    const rows = [...history.present.shoppingItems];
    rows[0] = { id: String(i) };
    history = pushUndo(history, { ...initial, shoppingItems: rows }, "editar");
  }
  assert.equal(history.past.length, 30);
  assert.equal(history.present.shoppingItems[1], initial.shoppingItems[1]);
  for (let i = 0; i < 30; i++) history = undo(history);
  assert.equal(history.present.shoppingItems[0].id, "2");
  assert.equal(undo(history), history);
});
