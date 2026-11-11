import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAmount, isExpression } from "../src/amountExpression.mjs";

test("Respeita parênteses e precedência e aceita formatos monetários brasileiros", () => {
  for (const [text, cents, display] of [["12,50+3,2*2",1890,"18,90"],["(10+5)/3",500,"5,00"],
    ["R$ 1.250,50",125050,"1250,50"],["1.5 × 2",300,"3,00"],[".5 + ,5",100,"1,00"],["1.250",125000,"1250,00"]])
    assert.deepEqual(evaluateAmount(text), { ok: true, cents, display });
});
test("Usa fração exata e arredonda meio para cima", () => {
  assert.equal(evaluateAmount("1,005").cents, 101);
  assert.equal(evaluateAmount("0,01/2").cents, 1);
  assert.equal(evaluateAmount("0,1+0,2").cents, 30);
  assert.equal(evaluateAmount("999.999.999,99").cents, 99_999_999_999);
});
test("Mensagens cobrem vazio, injeção, negativo, zero, percentual e limites", () => {
  for (const text of [undefined, {}, "1e3", "1,234.56", "__proto__", "1 2", "("]) assert.equal(evaluateAmount(text).ok, false);
  assert.match(evaluateAmount("1/0").message, /zero/);
  assert.match(evaluateAmount("1-2").message, /tipo de lançamento/);
  assert.match(evaluateAmount("10%").message, /Porcentagem/);
  assert.match(evaluateAmount("9".repeat(101)).message, /100/);
  assert.match(evaluateAmount("(".repeat(21) + "1" + ")".repeat(21)).message, /20/);
  assert.equal(evaluateAmount("(".repeat(20) + "1" + ")".repeat(20)).cents, 100);
  assert.equal(evaluateAmount("1000000000").ok, false);
});
test("Indicador de expressão distingue valor avulso de conta", () => {
  for (const value of ["12,50", "R$ 1.250,50", undefined, ""]) assert.equal(isExpression(value), false);
  for (const value of ["12+3", "(12)", "10%", "5÷2"]) assert.equal(isExpression(value), true);
});
