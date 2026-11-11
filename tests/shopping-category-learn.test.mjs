import test from "node:test";
import assert from "node:assert/strict";
import { learnCategory, categorizeLearned, forgetCategory } from "../src/shoppingCategoryLearn.mjs";
import { makeState } from "./helpers/shoppingFixtures.mjs";

test("Correção exata ignora acento e caixa, e a última vence", () => {
  const initial = makeState();
  const first = learnCategory(initial, "Café", "Bebidas");
  assert.equal(categorizeLearned(first, "CAFE"), "Bebidas");
  assert.equal(learnCategory(first, "cafe", "Bebidas"), first);
  const next = learnCategory(first, "café", "Padaria");
  assert.equal(categorizeLearned(next, "Café"), "Padaria");
  assert.equal(categorizeLearned(first, "Café"), "Bebidas");
});
test("Prefixo só aprende com três nomes distintos e recua diante de conflito", () => {
  let state = makeState();
  for (const name of ["Bebida A", "Bebida B"]) state = learnCategory(state, name, "Bebidas");
  assert.equal(categorizeLearned(state, "Bebida C"), "Outros");
  state = learnCategory(state, "Bebida D", "Bebidas");
  assert.equal(categorizeLearned(state, "Bebida C"), "Bebidas");
  state = learnCategory(state, "Bebida E", "Mercearia");
  assert.equal(categorizeLearned(state, "Bebida C"), "Outros");
  assert.equal(categorizeLearned(state, "Bebida E"), "Mercearia");
  assert.equal(categorizeLearned(forgetCategory(state, "Bebida E"), "Bebida C"), "Bebidas");
});
test("Limita 500 regras e descarta a mais antiga", () => {
  let state = makeState();
  for (let i = 0; i < 501; i++) state = learnCategory(state, "Produto " + i, i === 0 ? "Pet" : "Bebidas");
  assert.equal(state.shoppingCategoryRules.length, 500);
  assert.equal(state.shoppingCategoryRules[0].key, "produto 1");
  assert.equal(forgetCategory(state, "desconhecido"), state);
});
test("Nome vazio e categoria inválida não criam regra", () => {
  const state = makeState();
  assert.throws(() => learnCategory(state, "  ", "Bebidas"), /nome/);
  assert.throws(() => learnCategory(state, "Leite", "Inválida"), /Categoria/);
  assert.equal(categorizeLearned(state, ""), "Outros");
});
