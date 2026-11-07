import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCSV, parseOFX, importRows } from "../src/imports.mjs";
import { emptyState, balance, validateBackup } from "../src/finance.mjs";
test("CSV lê aspas, quebra de linha e centavos sem executar fórmulas", () => {
  const rows = parseCSV(
    'Data;Descrição;Valor (R$);Tipo\r\n06/11/2026;"Compra; com\nnota";42,90;Despesa\r\n2026-11-06;=SUM(A1);100,00;Receita',
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].amount, 4290);
  assert.equal(rows[0].description, "Compra; com\nnota");
  assert.equal(rows[1].description, "=SUM(A1)");
  assert.equal(rows[1].type, "income");
  assert.ok(parseCSV("Data;Descrição;Valor\n99/99/2026;x;1,00")[0].error);
});
test("OFX preserva sinal e FITID para evitar reimportação na mesma conta", () => {
  const rows = parseOFX(
    "<OFX><STMTTRN><TRNAMT>-42.90<DTPOSTED>20261106120000[-3:BRT]<MEMO>Mercado &amp; Cia<FITID>123</STMTTRN></OFX>",
  );
  assert.equal(rows[0].amount, 4290);
  assert.equal(rows[0].description, "Mercado & Cia");
  let s = {
    ...emptyState(),
    accounts: [{ id: "a", name: "Conta", initial: 10000 }],
  };
  s = importRows(s, rows, "a");
  s = validateBackup(JSON.parse(JSON.stringify(s)));
  s = importRows(s, rows, "a");
  assert.equal(s.transactions.length, 1);
  assert.equal(balance(s, "a"), 5710);
  assert.throws(() => importRows(s, rows, "missing"));
});
