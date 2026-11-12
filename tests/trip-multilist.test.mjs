import test from "node:test";
import assert from "node:assert/strict";
import { tripScopeState } from "../src/shopping.mjs";
import { tripViewModel } from "../src/shoppingTripView.mjs";

const state = {
  shoppingLists: [{ id: "a", name: "A", archived: false }, { id: "b", name: "B", archived: false }, { id: "c", name: "C", archived: false }],
  shoppingListId: "a",
  shoppingItems: [
    { id: "1", name: "Leite", qty: 1, category: "Laticínios", inCart: false, listId: "a" },
    { id: "2", name: "Arroz", qty: 1, category: "Mercearia", inCart: false, listId: "b", status: "missing" },
    { id: "3", name: "Sabão", qty: 1, category: "Limpeza", inCart: false, listId: "c" },
    { id: "4", name: "Pão", qty: 1, category: "Padaria", inCart: false, listId: "b", status: "later" },
  ],
};

test("tripScopeState junta só as listas escolhidas e sem escolha usa a ativa", () => {
  assert.deepEqual(tripScopeState(state, ["a", "b"]).shoppingItems.map((i) => i.id), ["1", "2", "4"]);
  assert.deepEqual(tripScopeState(state, []).shoppingItems.map((i) => i.id), ["1"]);
  assert.deepEqual(tripScopeState(state, undefined).shoppingItems.map((i) => i.id), ["1"]);
});

test("Modo compra: Faltou vai para Em falta e Depois fica fora", () => {
  const view = tripViewModel(tripScopeState(state, ["a", "b"]), { now: 0, limitCents: 0 });
  assert.deepEqual(view.missing.map((i) => i.id), ["2"]);
  assert.deepEqual(view.groups.flatMap((g) => g.items.map((i) => i.id)), ["1"]);
  assert.ok(view.groups.every((g) => g.count === g.items.length));
});

import { setItemPhoto } from "../src/shopping.mjs";
test("setItemPhoto guarda só nome de arquivo válido e null tira a foto", () => {
  const withPhoto = setItemPhoto(state, "1", "abc-1x.jpg");
  assert.equal(withPhoto.shoppingItems.find((i) => i.id === "1").photo, "abc-1x.jpg");
  assert.equal("photo" in setItemPhoto(withPhoto, "1", null).shoppingItems.find((i) => i.id === "1"), false);
  assert.throws(() => setItemPhoto(state, "1", "../x.jpg"));
  assert.throws(() => setItemPhoto(state, "zzz", "a.jpg"));
});
