import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { mergeShoppingLists, diffLists } from "../src/shoppingMerge.mjs";
import { makeState, seededRandom } from "./helpers/shoppingFixtures.mjs";

const row = (id, updatedAt, fields = {}) => ({ id, updatedAt, name: "Arroz", qty: 1, ...fields });
test("Última edição vence sem somar quantidade nem conservar campos da versão antiga", () => {
  const a = makeState({ items: [row("x", 10, { inCart: true, qty: 2 })] });
  const b = makeState({ items: [row("x", 20, { name: "Leite", inCart: false })] });
  assert.deepEqual(mergeShoppingLists(a, b, { now: 20 }), b.shoppingItems);
  assert.deepEqual(mergeShoppingLists(b, a, { now: 20 }), b.shoppingItems);
});
test("Exclusão vence empate e edição antiga, edição posterior volta a aparecer", () => {
  const dead = row("x", 3, { deletedAt: 20 });
  assert.deepEqual(mergeShoppingLists([row("x", 20)], [dead]), [dead]);
  assert.deepEqual(mergeShoppingLists([row("x", 19)], [dead]), [dead]);
  assert.deepEqual(mergeShoppingLists([row("x", 21)], [dead]), [row("x", 21)]);
});
test("Relógio adiantado é limitado a now na resolução", () => {
  const dead = row("x", 20, { deletedAt: 100 });
  const future = row("x", 100_000);
  assert.deepEqual(mergeShoppingLists([future], [dead], { now: 100 }), [dead]);
});
test("Diferenças descrevem adição, remoção e mudança sem mutar as listas", () => {
  const a = [row("a", 1), row("b", 1)];
  const b = [row("a", 2, { qty: 2 }), row("c", 2)];
  assert.deepEqual(diffLists(a, b), { added: [b[1]], removed: [a[1]], changed: [{ before: a[0], after: b[0] }] });
  assert.deepEqual(diffLists(a, a), { added: [], removed: [], changed: [] });
});
test("Cem pares sintéticos são comutativos e idempotentes", () => {
  const random = seededRandom(51);
  const generate = () => Array.from({ length: 15 }, () => row(String(Math.floor(random() * 20)),
    Math.floor(random() * 4), random() > 0.8 ? { deletedAt: 5 } : { qty: Math.floor(random() * 10) + 1 }));
  for (let i = 0; i < 100; i++) {
    const a = generate();
    const b = generate();
    const options = { now: 4 };
    const merged = mergeShoppingLists(a, b, options);
    assert.deepEqual(merged, mergeShoppingLists(b, a, options));
    assert.deepEqual(merged, mergeShoppingLists(merged, merged, options));
  }
});
test("Duas listas de dois mil itens são mescladas abaixo de 200 ms", () => {
  const a = Array.from({ length: 2000 }, (_, i) => row(String(i), 10));
  const b = Array.from({ length: 2000 }, (_, i) => row(String(i + 1000), 10));
  const start = performance.now();
  assert.equal(mergeShoppingLists(a, b).length, 3000);
  assert.ok(performance.now() - start < 200);
});
