import test from "node:test";
import assert from "node:assert/strict";
import { chaveDv, isChave } from "../src/nfce.mjs";
import { nfceToPurchase } from "../src/nfceParse.mjs";
import { makeState, makePurchase, makeNota, seededRandom } from "./helpers/shoppingFixtures.mjs";

test("O estado usa o formato do app sem compartilhar referências da fixture", () => {
  const items = [{ name: "Arroz fictício" }];
  const purchases = [makePurchase()];
  const products = [{ id: "p-ficticio" }];
  const state = makeState({ items, purchases, products });
  assert.deepEqual(state.shoppingPurchases, purchases);
  assert.deepEqual(state.shoppingProducts, products);
  state.shoppingItems[0].name = "Outro nome";
  state.shoppingPurchases[0].items[0].name = "Outro item";
  assert.equal(items[0].name, "Arroz fictício");
  assert.equal(purchases[0].items[0].name, "Arroz fictício");
});
test("Compras são determinísticas e aceitam sobrescrita de campos", () => {
  assert.deepEqual(makePurchase(), makePurchase());
  const purchase = makePurchase({ id: "outra-compra", items: [{ totalCents: 50 }, { totalCents: 40 }] });
  assert.equal(purchase.id, "outra-compra");
  assert.equal(purchase.totalCents, 90);
});
test("Nota fictícia tem DV calculado e é compatível com a conversão do app", () => {
  const nota = makeNota();
  assert.equal(nota.chave.length, 44);
  assert.equal(nota.cnpj, "0".repeat(14));
  assert.equal(isChave(nota.chave), true);
  assert.equal(Number(nota.chave[43]), chaveDv(nota.chave.slice(0, 43)));
  assert.equal(nfceToPurchase(nota).totalCents, nota.totalCents);
  const prefix = nota.chave.slice(0, 42) + "9";
  assert.equal(makeNota({ chave: prefix + chaveDv(prefix) }).chave.startsWith(prefix), true);
  assert.throws(() => makeNota({ chave: "123" }), /fictícia/);
});
test("Sementes iguais repetem a sequência e zero também é uma semente válida", () => {
  const series = (seed) => {
    const next = seededRandom(seed);
    return Array.from({ length: 10 }, () => next());
  };
  assert.deepEqual(series(0), series(0));
  assert.notDeepEqual(series(0), series(1));
  assert.ok(series(0).every((value) => value >= 0 && value < 1));
});
