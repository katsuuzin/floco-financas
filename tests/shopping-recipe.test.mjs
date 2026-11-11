import test from "node:test";
import assert from "node:assert/strict";
import { parseRecipe, recipeToItems } from "../src/shoppingRecipe.mjs";
import { makeState } from "./helpers/shoppingFixtures.mjs";

test("Escala porções e interpreta frações, bullets e medidas culinárias", () => {
  const recipe = parseRecipe("Ingredientes:\n• 2 xícaras de farinha\n- 300 g de queijo\n1/2 colher de sal\n3 ovos\n½ kg de carne\n1 1/2 colher de sopa de açúcar\nsal a gosto",
    { servings: 2, targetServings: 4 });
  assert.deepEqual(recipe.items.map(({ name, qty, unit }) => [name, qty, unit]),
    [["farinha (xícara)",4,""],["queijo",600,"g"],["sal (colher)",1,""],["ovos",6,""],["carne",1,"kg"],
      ["açúcar (colher de sopa)",3,""],["sal",null,""]]);
});
test("Meio ovo é preservado e porções inválidas retornam aviso", () => {
  assert.equal(parseRecipe("1 ovo", { servings: 2, targetServings: 1 }).items[0].qty, 0.5);
  assert.equal(parseRecipe("1 ovo", { servings: 0 }).items.length, 0);
  assert.match(parseRecipe("1 ovo", { targetServings: -1 }).notes[0], /porções/);
  assert.deepEqual(parseRecipe(""), { items: [], notes: [] });
});
test("Somar não altera o estado anterior, respeita unidade, despensa e a gosto", () => {
  const state = makeState({ items: [
    { id: "a", name: "Queijo", qty: 200, unit: "g", priceCents: 500 },
    { id: "b", name: "Alho", qty: 1, unit: "", pantry: true },
  ] });
  const result = recipeToItems(parseRecipe("300 g de queijo\n1 alho\n1 queijo\nsal a gosto"), state);
  assert.deepEqual(result.items.map(({ qty, unit }) => [qty, unit]), [[500,"g"],[1,""],[1,""]]);
  assert.equal(result.items[0].priceCents, null);
  assert.equal(state.shoppingItems[0].qty, 200);
  assert.match(result.notes[0], /a gosto/);
});
test("Limita a leitura às primeiras quinhentas linhas", () => {
  const result = parseRecipe("1 ovo\n".repeat(500) + "1 leite");
  assert.equal(result.items.length, 500);
  assert.match(result.notes[0], /500/);
});
