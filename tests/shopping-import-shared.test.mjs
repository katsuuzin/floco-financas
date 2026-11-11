import test from "node:test";
import assert from "node:assert/strict";
import { shareText } from "../src/shopping.mjs";
import { parseShared } from "../src/shoppingImportShared.mjs";

test("A lista do Floco preserva nome, unidade, quantidade e categoria", () => {
  const shoppingItems = [
    { name: "7 Up", qty: 1, unit: "", category: "Bebidas", inCart: false, priceCents: 100 },
    { name: "sabão", qty: 2, unit: "", category: "Limpeza", inCart: false },
    { name: "Arroz integral", qty: 0.5, unit: "kg", category: "Mercearia", inCart: false },
  ];
  const expected = shoppingItems.map(({ priceCents, ...item }) => item).sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(parseShared(shareText({ shoppingItems })).items.sort((a, b) => a.name.localeCompare(b.name)), expected);
});
test("WhatsApp, marcadores, caixas marcadas e quantidades no fim", () => {
  const result = parseShared("🛒 Lista de compras\r\n10/11/2026\r\n• 2x leite\r\n1) Leite 2un\r\n[ ] arroz 5kg\r\n- [x] pão\r\n☐ pão\r\n☑ Café");
  assert.deepEqual(result.items.map((i) => [i.name, i.qty, i.unit, i.inCart]), [
    ["Leite", 4, "", false], ["Arroz", 5, "kg", false], ["Pão", 1, "", true], ["Pão", 1, "", false], ["Café", 1, "", true],
  ]);
  assert.deepEqual(result.ignoredLines, ["🛒 Lista de compras", "10/11/2026"]);
});
test("Zero-width é removido sem separar emoji ZWJ", () => {
  const result = parseShared("— ✨\n- Ca\u200bfé 👩‍🍳\n• ");
  assert.equal(result.items[0].name, "Café 👩‍🍳");
  assert.equal(result.ignoredLines.length, 2);
});
test("Limites de caracteres, linhas e tipo de entrada", () => {
  assert.deepEqual(parseShared(null), { items: [], ignoredLines: [], warnings: [] });
  assert.match(parseShared("x".repeat(20001)).warnings[0], /20.000/);
  const result = parseShared("Arroz\n".repeat(2000) + "Leite");
  assert.match(result.warnings[0], /2.000/);
  assert.deepEqual(result.items.map((i) => [i.name, i.qty]), [["Arroz", 2000]]);
});
test("Uma quantidade inválida não impede as outras linhas", () => {
  const result = parseShared("20000x leite\n- Arroz");
  assert.equal(result.items[0].name, "Arroz");
  assert.deepEqual(result.ignoredLines, ["20000x leite"]);
});
