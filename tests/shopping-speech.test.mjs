import test from "node:test";
import assert from "node:assert/strict";
import { describeItem, describeSummary, describeProgress, describeMoney } from "../src/shoppingSpeech.mjs";
import { makeState } from "./helpers/shoppingFixtures.mjs";

test("Dinheiro mantém dígitos e flexiona real e centavo", () => {
  for (const [cents, words] of [[0,"0 reais"],[100,"1 real"],[101,"1 real e 1 centavo"],[250,"2 reais e 50 centavos"],
    [5,"5 centavos"],[100000001,"1000000 reais e 1 centavo"],[null,"sem preço"]])
    assert.equal(describeMoney(cents), words);
});
test("Item fala quantidade fracionada, preço da porção e estado", () => {
  assert.equal(describeItem({ name: "Farinha 🛒", qty: 0.5, unit: "kg", priceCents: 250, inCart: true }),
    "Farinha, 0,5 quilos, no carrinho, 2 reais e 50 centavos");
  assert.equal(describeItem({ name: "🥚", qty: 1 }), "Item sem nome, 1 unidade, pendente, sem preço");
  assert.ok(describeItem({ name: "Café ".repeat(100), qty: 2 }).length <= 120);
});
test("Resumo e progresso flexionam zero, um e dois itens", () => {
  for (let total = 0; total <= 2; total++) {
    const items = Array.from({ length: total }, () => ({ name: "Arroz", qty: 1, priceCents: null }));
    const ending = total === 1 ? "item" : "itens";
    assert.ok(describeSummary(makeState({ items })).startsWith(total + " " + ending));
    assert.ok(describeProgress({ total, inCartCount: total }).startsWith(total + " de " + total + " " + ending));
  }
});
