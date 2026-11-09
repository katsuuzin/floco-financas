import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePDFStatement } from "../src/statement-pdf.mjs";

const inter = [
  "Banco Inter - Extrato de 01/11/2026 a 30/11/2026",
  "Saldo anterior R$ 1.000,00",
  "02/11/2026 Pix enviado: Padaria -R$ 25,50",
  "03/11/2026 Pix recebido: Ana R$ 200,00",
  "05/11/2026 Compra no débito Mercado -R$ 74,50",
  "Saldo final R$ 1.100,00",
].join("\n");

const itau = [
  "Itaú extrato conta corrente 11/2026",
  "data lançamento valor saldo",
  "01/11 SALDO ANTERIOR 500,00",
  "02/11 PIX TRANSF JOAO 100,00 D 400,00",
  "04/11 TED RECEBIDA 50,00 C 450,00",
].join("\n");

test("F1 PDF genérico confere saldo anterior + movimentos = saldo final", () => {
  const r = parsePDFStatement(inter);
  assert.equal(r.rows.length, 3);
  assert.deepEqual(r.rows.map((x) => [x.date, x.type, x.amount]), [
    ["2026-11-02", "expense", 2550],
    ["2026-11-03", "income", 20000],
    ["2026-11-05", "expense", 7450],
  ]);
  assert.equal(r.summary.closingBalance, 110000);
  assert.throws(() => parsePDFStatement(inter.replace("Saldo final R$ 1.100,00", "Saldo final R$ 1.000,00")), /conferir/);
  assert.throws(() => parsePDFStatement(inter.replace("03/11/2026 Pix recebido: Ana R$ 200,00\n", "")), /conferir/);
});

test("F1 PDF genérico com D/C e coluna de saldo confere linha a linha", () => {
  const r = parsePDFStatement(itau);
  assert.deepEqual(r.rows.map((x) => [x.date, x.type, x.amount]), [
    ["2026-11-02", "expense", 10000],
    ["2026-11-04", "income", 5000],
  ]);
  assert.throws(() => parsePDFStatement(itau.replace("450,00", "460,00")), /saldo/i);
});

test("F1 PDF sem movimentos reconhecíveis continua pedindo CSV/OFX", () => {
  assert.throws(() => parsePDFStatement("Banco X\nqualquer coisa"), /não reconhecido/);
});
