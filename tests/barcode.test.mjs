import test from "node:test";
import assert from "node:assert/strict";
import { isValidChecksum, normalizeBarcode } from "../src/barcode.mjs";

const appendCheck = (body) => {
  const sum = [...body].reverse().reduce((n, digit, i) => n + Number(digit) * (i % 2 ? 1 : 3), 0);
  return body + String((10 - sum % 10) % 10);
};
for (const body of ["0000001", "1234567", "7654321", "9638507", "01234567890", "99999999999",
  "03600029145", "400638133393", "012345678901", "987654321098"]) {
  const input = appendCheck(body);
  test(`Aceita código sintético de ${input.length} dígitos com verificador correto: ${input}`, () => {
    const format = input.length === 12 ? "UPC-A" : input.length === 8 ? "EAN-8" : "EAN-13";
    const code = format === "UPC-A" ? "0" + input : input;
    assert.deepEqual(normalizeBarcode(input), { ok: true, code, format });
    assert.equal(isValidChecksum(code), true);
  });
  test(`Recusa verificador errado para ${input}`, () => {
    const wrong = input.slice(0, -1) + String((Number(input.at(-1)) + 1) % 10);
    assert.match(normalizeBarcode(wrong).reason, /verificador/);
  });
}

test("Remove espaços e hífens, mantendo os zeros", () => {
  assert.deepEqual(normalizeBarcode(" 0360-0029 1452 "), { ok: true, code: "0036000291452", format: "UPC-A" });
});
for (const [input, reason] of [
  ["", /Informe/], [" -- ", /Informe/], ["1234567x", /números/], ["123456789", /8, 12 ou 13/],
  ["10012345000017", /8, 12 ou 13/], [96385074, /texto/], [null, /texto/], ["0".repeat(10_000), /longo/],
]) {
  test(`Entrada inválida: ${String(input).slice(0, 12)}`, () => {
    assert.equal(normalizeBarcode(input).ok, false);
    assert.match(normalizeBarcode(input).reason, reason);
  });
}
test("Validador de checksum só recebe EAN sem separadores", () => {
  for (const input of ["036000291452", "9638-5074", "96385074\n", 96385074]) {
    assert.equal(isValidChecksum(input), false);
  }
});
