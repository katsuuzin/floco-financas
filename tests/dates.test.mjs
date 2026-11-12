import test from "node:test";
import assert from "node:assert/strict";
import { brDate, brDateShort, maskBrDate, parseBrDate } from "../src/dates.mjs";

test("brDate mostra DD/MM/AAAA e não quebra com entrada estranha", () => {
  assert.equal(brDate("2026-11-12"), "12/11/2026");
  assert.equal(brDate(""), "");
  assert.equal(brDate(undefined), "");
  assert.equal(brDate("12/11/2026"), "12/11/2026");
});
test("brDateShort tira o ano só quando é o ano de referência", () => {
  assert.equal(brDateShort("2026-11-12", "2026-01-01"), "12/11");
  assert.equal(brDateShort("2025-11-12", "2026-01-01"), "12/11/2025");
});
test("maskBrDate coloca as barras ao digitar", () => {
  assert.equal(maskBrDate("1"), "1");
  assert.equal(maskBrDate("121"), "12/1");
  assert.equal(maskBrDate("12112026"), "12/11/2026");
  assert.equal(maskBrDate("12/11/2026999"), "12/11/2026");
  assert.equal(maskBrDate("ab12"), "12");
});
test("parseBrDate devolve ISO só para datas que existem", () => {
  assert.equal(parseBrDate("12/11/2026"), "2026-11-12");
  assert.equal(parseBrDate("1/2/26"), "2026-02-01");
  assert.equal(parseBrDate("2026-11-12"), "2026-11-12");
  assert.equal(parseBrDate("31/02/2026"), "");
  assert.equal(parseBrDate("12/13/2026"), "");
  assert.equal(parseBrDate(""), "");
});
