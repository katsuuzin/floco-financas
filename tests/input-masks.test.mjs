import test from "node:test";
import assert from "node:assert/strict";
import { maskMoney, normalizeMoneyText, backspaceMoney, centsFromDigits, MAX_CENTS } from "../src/moneyInput.mjs";
import { maskTime, parseTime, monthWeeks, shiftMonth } from "../src/timeInput.mjs";
import { parseMoney } from "../src/finance.mjs";

test("Dinheiro entra da direita para a esquerda", () => {
  assert.equal(maskMoney("1").text, "0,01");
  assert.equal(maskMoney("15").text, "0,15");
  assert.equal(maskMoney("1500").text, "15,00");
  assert.equal(maskMoney("150000").text, "1.500,00");
  assert.equal(maskMoney("123456789").text, "1.234.567,89");
});

test("Dinheiro ignora letras e símbolos, e zero vira vazio", () => {
  assert.equal(maskMoney("R$ 1a5,0-0").text, "15,00");
  assert.equal(maskMoney("abc").text, "");
  assert.equal(maskMoney("000").text, "");
  assert.equal(maskMoney("").text, "");
});

test("Dinheiro acima do teto mantém o valor anterior e avisa", () => {
  const ok = maskMoney("99999999999");
  assert.equal(ok.text, "999.999.999,99");
  assert.equal(ok.tooBig, false);
  const big = maskMoney("999999999999", ok.text);
  assert.equal(big.tooBig, true);
  assert.equal(big.text, ok.text);
  assert.equal(centsFromDigits("9999999999999"), Infinity);
  assert.equal(MAX_CENTS, 99_999_999_999);
});

test("Texto da máscara é aceito por parseMoney sem mudar o valor", () => {
  for (const [digits, cents] of [["1", 1], ["1500", 1500], ["150000", 150000], ["99999999999", MAX_CENTS]]) {
    assert.equal(parseMoney(maskMoney(digits).text), cents);
  }
});

test("Apagar tira o último dígito, não a vírgula", () => {
  assert.equal(backspaceMoney("15,00"), "1,50");
  assert.equal(backspaceMoney("1,50"), "0,15");
  assert.equal(backspaceMoney("0,01"), "");
  assert.equal(backspaceMoney(""), "");
  assert.equal(backspaceMoney("1.234,56"), "123,45");
});

test("Valores de fora são normalizados; contas ficam como estão", () => {
  assert.equal(normalizeMoneyText("1500,00"), "1.500,00");
  assert.equal(normalizeMoneyText("150"), "150,00");
  assert.equal(normalizeMoneyText("12,5"), "12,50");
  assert.equal(normalizeMoneyText("R$ 10,00"), "10,00");
  assert.equal(normalizeMoneyText("0,00"), "");
  assert.equal(normalizeMoneyText("10+5"), "10+5");
  assert.equal(normalizeMoneyText(""), "");
});

test("Hora: máscara e leitura", () => {
  assert.equal(maskTime("0"), "0");
  assert.equal(maskTime("093"), "09:3");
  assert.equal(maskTime("0930"), "09:30");
  assert.equal(maskTime("09:30:55"), "09:30");
  assert.equal(parseTime("09:30"), "09:30");
  assert.equal(parseTime("9:30"), "09:30");
  assert.equal(parseTime("0930"), "09:30");
  assert.equal(parseTime("24:00"), "");
  assert.equal(parseTime("12:60"), "");
  assert.equal(parseTime("12:"), "");
  assert.equal(parseTime(""), "");
});

test("Calendário: semanas de novembro de 2026 e fevereiro bissexto", () => {
  const nov = monthWeeks(2026, 11);
  assert.equal(nov[0][0], "2026-11-01"); // domingo
  assert.equal(nov.flat().filter(Boolean).length, 30);
  assert.ok(nov.every((week) => week.length === 7));
  const feb = monthWeeks(2028, 2);
  assert.equal(feb.flat().filter(Boolean).length, 29);
  assert.equal(feb[0][2], "2028-02-01"); // terça
});

test("Calendário: navegar entre meses e anos", () => {
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
  assert.deepEqual(shiftMonth(2026, 11, 12), { year: 2027, month: 11 });
  assert.deepEqual(shiftMonth(2026, 3, -15), { year: 2024, month: 12 });
});
