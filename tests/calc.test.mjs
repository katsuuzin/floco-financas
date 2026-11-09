import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, hasOperator, toAmountText } from "../src/calc.mjs";
import { parseMoney } from "../src/finance.mjs";

test("L1 calculadora respeita precedência e vírgula decimal", () => {
  assert.equal(evaluate("10,50+3×2"), 1650);
  assert.equal(evaluate("100÷3"), 3333);
  assert.equal(evaluate("1.200,00−200"), 100000);
  assert.equal(evaluate("42,9"), 4290);
  assert.equal(evaluate("2×3+4×5"), 2600);
});

test("L1 conta incompleta ou divisão por zero não vira valor", () => {
  assert.equal(evaluate("10+"), null);
  assert.equal(evaluate("×2"), null);
  assert.equal(evaluate("5÷0"), null);
  assert.equal(evaluate("abc"), null);
  assert.equal(evaluate(""), null);
});

test("L1 resultado volta no formato aceito pelo formulário", () => {
  assert.equal(toAmountText(evaluate("19,90×3")), "59,70");
  assert.equal(parseMoney(toAmountText(123456)), 123456);
  assert.equal(hasOperator("10+2"), true);
  assert.equal(hasOperator("10,00"), false);
});
