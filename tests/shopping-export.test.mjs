import test from "node:test";
import assert from "node:assert/strict";
import { listToCsv, purchasesToCsv, purchasesToJson, parsePurchasesJson } from "../src/shoppingExport.mjs";

const item = { name: 'A, B; "C"\nD', qty: 1.5, unit: "kg", unitPriceCents: 823, totalCents: 1234 };
const purchase = (id = "compra-1", extra = {}) => ({
  id, date: "2024-02-29", marketName: "Loja fictícia", source: "manual", totalCents: 1234, items: [item], ...extra,
});
const json = (p) => JSON.stringify({ schema: 1, purchases: [p] });

test("CSV com BOM, quebra de linha, vírgula decimal, separador e aspas", () => {
  const csv = listToCsv({ shoppingItems: [{ ...item, priceCents: 1234, category: "Mercearia", inCart: true }] });
  assert.ok(csv.startsWith("\uFEFFItem;"));
  assert.ok(csv.includes('"A, B; ""C""\nD";1,5;kg;Mercearia;Sim;12,34;12,34'));
});
test("CSV escapa fórmulas em todos os campos livres", () => {
  const names = ['=HYPERLINK("exemplo")', "+A1", "-A1", "@A1", "\tA1", "\rA1"];
  const csv = listToCsv({ shoppingItems: names.map((name) => ({ name, qty: 1 })) });
  for (const name of names) assert.ok(csv.includes("'" + name.replace(/"/gu, '""')));
  assert.ok(purchasesToCsv({ shoppingPurchases: [purchase("compra-1", { marketName: "=A1" })] }).includes(";'=A1;"));
});
test("CSV do histórico inclui preço unitário e total em reais", () => {
  const csv = purchasesToCsv({ shoppingPurchases: [purchase()] });
  assert.ok(csv.includes("29/02/2024;Loja fictícia;compra-1;12,34;"));
  assert.ok(csv.includes(";1,5;kg;8,23;12,34"));
});
test("Histórico versionado e ida e volta sem perda", () => {
  const purchases = [purchase()];
  const serialized = purchasesToJson({ shoppingPurchases: purchases });
  assert.equal(JSON.parse(serialized).schema, 1);
  assert.deepEqual(parsePurchasesJson(serialized), purchases);
  assert.deepEqual(parsePurchasesJson(purchasesToJson({})), []);
});
test("JSON recusa versão errada, datas impossíveis e tipos errados", () => {
  assert.throws(() => parsePurchasesJson('{"schema":2,"purchases":[]}'), /Versão/);
  assert.throws(() => parsePurchasesJson(json(purchase("a", { date: "2026-02-29" }))), /Data/);
  assert.throws(() => parsePurchasesJson(json(purchase("a", { marketName: "x".repeat(81) }))), /loja/);
  assert.throws(() => parsePurchasesJson(json(purchase("a", { marketName: 10 }))), /loja/);
  assert.throws(() => parsePurchasesJson(json(purchase("a", { items: [{ ...item, qty: "1" }] }))), /Itens/);
  assert.throws(() => parsePurchasesJson(json(purchase("a", { cnpj: 0 }))), /fiscal/);
});
test("JSON recusa duplicatas e tamanho excessivo", () => {
  const same = purchase();
  assert.throws(() => parsePurchasesJson(JSON.stringify({ schema: 1, purchases: [same, same] })), /repetido/);
  assert.throws(() => parsePurchasesJson("x".repeat(16 * 1024 * 1024 + 1)), /16 MiB/);
});
test("Ida e volta com 5.000 compras", () => {
  const purchases = Array.from({ length: 5000 }, (_, i) => purchase("compra-" + i));
  assert.deepEqual(parsePurchasesJson(purchasesToJson({ shoppingPurchases: purchases })), purchases);
});
