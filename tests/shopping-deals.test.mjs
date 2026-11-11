import test from "node:test";
import assert from "node:assert/strict";
import { applyDeal, validateDeal } from "../src/shoppingDeals.mjs";

const item = (priceCents, qty = 1, unit = "") => ({ priceCents, qty, unit });
test("Percentuais de zero a cem e inválido", () => {
  for (const [value, totalCents] of [[0, 101], [100, 0], [101, 101]]) {
    assert.deepEqual(applyDeal(item(101), { type: "percent", value }), { totalCents, savedCents: 101 - totalCents });
  }
  assert.match(validateDeal({ type: "percent", value: 101 }).reason, /0 a 100/);
});
test("Desconto maior que o preço zera o total e emite aviso", () => {
  const deal = { type: "amountOff", cents: 250 };
  assert.deepEqual(applyDeal(item(100, 2), deal), { totalCents: 0, savedCents: 200 });
  assert.match(validateDeal(deal, item(100, 2)).warning, /será zero/);
});
test("Leve três pague dois vale para grupos completos", () => {
  const deal = { type: "buyXPayY", x: 3, y: 2 };
  assert.deepEqual(applyDeal(item(100, 2), deal), { totalCents: 200, savedCents: 0 });
  assert.deepEqual(applyDeal(item(100, 7), deal), { totalCents: 500, savedCents: 200 });
  assert.equal(validateDeal({ ...deal, y: 4 }).ok, false);
});
test("Preço por kg multiplica a fração e arredonda metade para cima", () => {
  assert.deepEqual(applyDeal(item(200, 0.5, "kg"), { type: "unitPrice", cents: 101 }), { totalCents: 51, savedCents: 149 });
  assert.deepEqual(applyDeal(item(3), { type: "percent", value: 50 }), { totalCents: 2, savedCents: 1 });
});
test("Valores grandes arredondam sem perder centavos e transbordamento é explícito", () => {
  const huge = Number.MAX_SAFE_INTEGER;
  assert.deepEqual(applyDeal(item(huge), { type: "percent", value: 50 }), { totalCents: 4503599627370496, savedCents: 4503599627370495 });
  assert.throws(() => applyDeal(item(huge, 2), { type: "percent", value: 0 }), /grande demais/);
});
test("Item sem preço e promoção com valor fracionário inválido", () => {
  assert.deepEqual(applyDeal(item(null), { type: "amountOff", cents: 0 }), { totalCents: null, savedCents: 0 });
  assert.equal(validateDeal({ type: "unitPrice", cents: 1.5 }).ok, false);
});
