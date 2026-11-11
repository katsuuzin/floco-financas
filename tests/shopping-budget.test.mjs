import test from "node:test";
import assert from "node:assert/strict";
import { budgetStatus, suggestCuts } from "../src/shoppingBudget.mjs";

const item = (id, priceCents, fields = {}) => ({ id, name: id, priceCents, qty: 1, unit: "", inCart: false, ...fields });
const data = (shoppingItems, shoppingProducts = []) => ({ shoppingItems, shoppingProducts });

for (const limitCents of [0, undefined, -1, NaN]) {
  test(`Sem orçamento válido: ${limitCents}`, () => {
    assert.deepEqual(budgetStatus({ limitCents, cartCents: 200, pendingEstimateCents: 400 }), {
      level: "ok", remainingCents: null, projectedCents: 600, message: "Sem orçamento definido.",
    });
    assert.deepEqual(suggestCuts(data([item("Sal", 100)]), limitCents), []);
  });
}
for (const [amount, level] of [[849, "ok"], [850, "near"], [1000, "near"], [1001, "over"]]) {
  test(`Limite de mil centavos classifica projeção de ${amount}`, () => {
    const result = budgetStatus({ limitCents: 1000, cartCents: 500, pendingEstimateCents: amount - 500 });
    assert.equal(result.level, level);
    assert.equal(result.remainingCents, 1000 - amount);
    assert.equal(result.projectedCents, amount);
  });
}
test("Centavos fracionados são arredondados e negativos são tratados como zero", () => {
  const result = budgetStatus({ limitCents: 100.49, cartCents: 84.5, pendingEstimateCents: -9.6 });
  assert.equal(result.level, "near");
  assert.equal(result.projectedCents, 85);
  assert.equal(result.remainingCents, 15);
});
test("Valores enormes mantêm a classificação mesmo com projeção limitada ao inteiro seguro", () => {
  const max = Number.MAX_SAFE_INTEGER;
  const result = budgetStatus({ limitCents: max, cartCents: max, pendingEstimateCents: max });
  assert.equal(result.level, "over");
  assert.equal(result.projectedCents, max);
  assert.equal(result.remainingCents, -max);
});
test("Dispensa cortes quando está dentro do orçamento ou não há preços pendentes", () => {
  assert.deepEqual(suggestCuts(data([item("Sal", 500)]), 500), []);
  assert.deepEqual(suggestCuts(data([item("Sal", null), item("Pão", 600, { inCart: true })]), 500), []);
});
test("Usa o total de linha e poupa carrinho e essenciais", () => {
  const shoppingItems = [
    item("Carrinho", 600, { inCart: true }), item("Essencial", 900, { essential: true }),
    item("Essencial alternativo", 800, { isEssential: true }), item("Fruta", 500, { qty: 3, unit: "kg" }),
    item("Biscoito", 300, { qty: 2 }),
  ];
  assert.deepEqual(suggestCuts(data(shoppingItems), 2800), [
    { id: "Biscoito", name: "Biscoito", savingsCents: 600, buys: 0 },
  ]);
});
test("Empate de custo prioriza item menos frequente no histórico", () => {
  const shoppingItems = [item("Café", 200), item("Sal", 200)];
  const shoppingProducts = [{ name: "CAFE", unit: "", buys: 5 }, { name: "Sal", unit: "", buys: 2 }];
  assert.deepEqual(suggestCuts(data(shoppingItems, shoppingProducts), 300).map(({ id }) => id), ["Sal"]);
});
test("Mesmo com carrinho acima do limite, sugere no máximo cinco pendências", () => {
  const items = [item("Carrinho", 900, { inCart: true }), ...Array.from({ length: 8 }, (_, i) => item(String(i), 100 + i))];
  assert.equal(suggestCuts(data(items), 500).length, 5);
  assert.equal(items.length, 9);
});
