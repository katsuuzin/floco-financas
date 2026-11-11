import { assertFast } from "./helpers/timing.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { checkShoppingBackup } from "../src/shoppingBackupCheck.mjs";
import { makeState, makePurchase, makeNota } from "./helpers/shoppingFixtures.mjs";

test("Backups antigo e vazio são válidos", () => {
  assert.equal(checkShoppingBackup({}).ok, true);
  assert.deepEqual(checkShoppingBackup(makeState()), { ok: true, errors: [], warnings: [] });
  assert.equal(checkShoppingBackup(null).ok, false);
});
test("Relata data, órfãos, preço, duplicata e dígito fiscal sem alterar entrada", () => {
  const key = makeNota().chave;
  const p = makePurchase({ date: "2026-02-30", chave: key.slice(0, -1) + (Number(key.at(-1)) + 1) % 10 });
  p.items[0].productId = "ausente";
  const item = { id: "a", name: "Arroz", qty: 1, priceCents: -100 };
  const backup = makeState({ items: [item, item], purchases: [p],
    products: [{ id: "p", name: "Arroz", key: "arroz|", buys: 1, prices: [{ date: "2026-01-01", priceCents: 100, purchaseId: "ausente" }] }] });
  const before = structuredClone(backup);
  const { ok, errors } = checkShoppingBackup(backup);
  assert.equal(ok, false);
  assert.deepEqual(new Set(errors.map((error) => error.code)), new Set(["campo", "duplicado", "data", "chave_fiscal", "orfao"]));
  assert.equal(errors.filter((error) => error.code === "orfao").length, 2);
  assert.deepEqual(backup, before);
});
test("Recusa tipos errados, textos longos e quantidades inválidas", () => {
  const result = checkShoppingBackup({ shoppingItems: [{ id: "a", name: "x".repeat(81), qty: 10000, inCart: 1 }], shoppingPurchases: {} });
  assert.deepEqual(result.errors.map((error) => error.path), [
    "shoppingItems[0].name", "shoppingItems[0].qty", "shoppingItems[0].inCart", "shoppingPurchases",
  ]);
});
test("Bloqueia campos reservados, ciclos e estruturas incompatíveis", () => {
  const bad = JSON.parse('{"__proto__":{"x":1},"nested":{"constructor":0}}');
  assert.deepEqual(checkShoppingBackup(bad).errors.map((error) => error.code), ["campo_reservado", "campo_reservado"]);
  const cyclic = {};
  cyclic.next = cyclic;
  assert.equal(checkShoppingBackup(cyclic).errors[0].code, "estrutura_json");
  assert.equal(checkShoppingBackup({ nested: new Date(0) }).errors[0].code, "tipo_json");
});
test("Valida tamanho UTF-8, arrays gigantes e 24 pontos", () => {
  assert.equal(checkShoppingBackup({ note: "é".repeat(1_100_000) }).errors[0].code, "tamanho");
  assert.equal(checkShoppingBackup({ shoppingItems: Array(2_000_000).fill(null) }).ok, false);
  const products = [{ id: "p", key: "arroz|", name: "Arroz", buys: 25, prices: Array(25).fill({}) }];
  assert.equal(checkShoppingBackup(makeState({ products })).errors[0].code, "limite");
});
test("Cinco mil compras são validadas abaixo de 300 ms", () => {
  const data = makeState({ purchases: Array.from({ length: 5000 }, (_, i) => makePurchase({ id: "c" + i })) });
  assertFast(() => {
    assert.equal(checkShoppingBackup(data).ok, true);
  }, 300, "shopping-backup-check");
});
