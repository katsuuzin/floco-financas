import test from "node:test";
import assert from "node:assert/strict";
import { parseCSV, parseOFX, importRows } from "../src/imports.mjs";
import { parsePDFStatement } from "../src/statement-pdf.mjs";
import { emptyState, validateBackup, balance } from "../src/finance.mjs";
const pdf = `Nu Pagamentos\nSaldo inicial 100,00\nSaldo final do período 90,00\n01 NOV 2026 Total de saídas -50,00\nCompra no débito LOJA A 20,00\nCompra no débito LOJA B 30,00\nTotal de entradas +40,00\nTransferência Recebida EXEMPLO 40,00`;
const csv =
  "Data,Valor,Identificador,Descrição\n01/11/2026,-20.00,a,Compra A\n01/11/2026,-30.00,b,Compra B\n01/11/2026,40.00,c,Entrada";
const ofx =
  "<OFX>" +
  [
    ["a", "-20.00"],
    ["b", "-30.00"],
    ["c", "40.00"],
  ]
    .map(
      ([id, value]) =>
        `<STMTTRN><DTPOSTED>20261101<TRNAMT>${value}<FITID>${id}<MEMO>Exemplo</STMTTRN>`,
    )
    .join("") +
  "</OFX>";
const base = () => ({
  ...emptyState(),
  accounts: [{ id: "a", name: "Teste", initial: 10000 }],
});
test("CSV Nubank reconhece separador, ponto decimal, identificador e entradas positivas", () => {
  const r = parseCSV(csv);
  assert.equal(r.length, 3);
  assert.deepEqual(
    r.map((r) => [r.amount, r.type]),
    [
      [2000, "expense"],
      [3000, "expense"],
      [4000, "income"],
    ],
  );
});
test("PDF concilia totais e rejeita linha ausente ou saldo divergente", () => {
  const r = parsePDFStatement(pdf);
  assert.equal(r.rows.length, 3);
  assert.equal(r.summary.verified, true);
  assert.throws(
    () => parsePDFStatement(pdf.replace("Saldo inicial 100,00", "")),
    /conferir os saldos/,
  );
  assert.throws(
    () => parsePDFStatement(pdf.replace("Compra no débito LOJA B 30,00", "")),
    /total diário/,
  );
  assert.throws(
    () => parsePDFStatement(pdf.replace("90,00", "80,00")),
    /saldo final/,
  );
});
test("três formatos não duplicam registros em nenhuma das seis ordens", () => {
  const formats = [parseCSV(csv), parseOFX(ofx), parsePDFStatement(pdf).rows];
  for (const order of [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ]) {
    let s = base();
    for (const n of order) s = importRows(s, formats[n], "a");
    assert.equal(s.transactions.length, 3);
    assert.equal(balance(s, "a"), 9000);
    assert.doesNotThrow(() => validateBackup(s));
  }
});
test("compras legítimas de mesmo dia e valor são preservadas por multiplicidade", () => {
  const rows = [
    {
      date: "2026-11-01",
      amount: 1000,
      type: "expense",
      description: "Loja A",
    },
    {
      date: "2026-11-01",
      amount: 1000,
      type: "expense",
      description: "Loja B",
    },
  ];
  let s = importRows(base(), rows, "a");
  assert.equal(s.transactions.length, 2);
  s = importRows(s, rows, "a");
  assert.equal(s.transactions.length, 2);
  s = importRows(
    s,
    [
      { ...rows[0], externalId: "new-id-1" },
      { ...rows[1], externalId: "new-id-2" },
    ],
    "a",
  );
  assert.equal(s.transactions.length, 2);
  s = importRows(s, [{ ...rows[0], externalId: "new-id-3" }], "a");
  assert.equal(s.transactions.length, 3);
});
