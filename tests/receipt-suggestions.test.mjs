import test from "node:test";
import assert from "node:assert/strict";
import { receiptAmounts, receiptDates } from "../src/receipt-suggestions.mjs";
test("OCR não corta o primeiro dígito de valores sem separador de milhar", () => {
  assert.deepEqual(receiptAmounts("Valor R$ 1234,56"), ["1234,56"]);
  assert.deepEqual(receiptAmounts("Total 1.234,56 e taxa 12,34"), [
    "1.234,56",
    "12,34",
  ]);
  assert.deepEqual(receiptAmounts("Valor 0,00"), []);
  assert.deepEqual(receiptDates("32/11/2026 06/11/2026"), ["2026-11-06"]);
});
