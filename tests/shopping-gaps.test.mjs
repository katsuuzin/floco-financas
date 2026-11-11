import test from "node:test";
import assert from "node:assert/strict";
import { keepShoppingOnRestore } from "../src/shopping.mjs";
import { emptyState, validateBackup } from "../src/finance.mjs";
import { recordPurchase, removePurchase } from "../src/shoppingPurchases.mjs";
import { applyConferencia, matchListToNota } from "../src/shoppingMatch.mjs";
import { consultUrl, parseNfceHtml } from "../src/nfceParse.mjs";
import { interpretPastedList } from "../src/pasteListAi.mjs";

const item = (priceCents = 100) => ({ name: "Arroz", qty: 1, unitPriceCents: priceCents });
const day = (n) => "2026-01-" + String(n).padStart(2, "0");
const buy = (state, date, cents, id) => recordPurchase(state, { date, items: [item(cents)] },
  { id, now: 0, newId: () => "arroz" });

test("Lacuna 3: restauração recusa compra com data impossível", () => {
  const valid = buy(emptyState(), day(1), 100, "a");
  const backup = { ...valid, shoppingPurchases: [{ ...valid.shoppingPurchases[0], date: "2026-02-30" }] };
  assert.throws(() => keepShoppingOnRestore(validateBackup(backup), valid), /data|inválid/i);
});
test("Lacuna 4: restauração diagnostica uma referência a produto ausente", () => {
  const current = buy({}, day(1), 100, "a");
  const backup = { ...emptyState(), shoppingPurchases: [{ ...current.shoppingPurchases[0], items: [
    { ...current.shoppingPurchases[0].items[0], productId: "inexistente" },
  ] }], shoppingProducts: [] };
  assert.throws(() => keepShoppingOnRestore(validateBackup(backup), current), /produto|catálogo|referênc/i);
  assert.equal(current.shoppingProducts[0].id, "arroz");
});
test("Lacuna 5: valor fiscal negativo nunca vira cobrança positiva", () => {
  const html = '<tr id="Item1"><span class="txtTit">Arroz</span><span class="Rqtd">1</span><span class="valor">-1,00</span></tr>';
  let result;
  try { result = parseNfceHtml(html); } catch (error) {
    assert.match(error.message, /valor|preço|incompleto|negativo/i);
    return;
  }
  assert.ok(result.items[0].totalCents <= 0, "O leitor não pode transformar -1,00 em 100 centavos.");
});
test("Lacuna 6: excluir pontos recentes recupera preços das compras restantes", () => {
  let state = {};
  for (let n = 1; n <= 26; n++) state = buy(state, day(n), 100 + n, String(n));
  for (let n = 26; n > 2; n--) state = removePurchase(state, String(n));
  const [product] = state.shoppingProducts;
  assert.deepEqual([product.lastBoughtAt, product.lastPriceCents], [day(2), 102]);
});
test("Lacuna 7: compra retroativa não remove ponto cronologicamente recente", () => {
  let state = {};
  for (let n = 2; n <= 25; n++) state = buy(state, day(n), 100 + n, String(n));
  const points = state.shoppingProducts[0].prices;
  state = buy(state, day(1), 100, "1");
  assert.deepEqual(new Set(state.shoppingProducts[0].prices.map(({ purchaseId }) => purchaseId)),
    new Set(points.map(({ purchaseId }) => purchaseId)));
});
test("Lacuna 8: seleção antiga não altera item renomeado para outro produto", () => {
  const data = { shoppingItems: [{ id: "a", name: "Arroz", qty: 1, unit: "", priceCents: null, inCart: false }] };
  const lines = [{ name: "Arroz", qty: 1, unit: "", unitPriceCents: 100, totalCents: 100 }];
  const picks = matchListToNota(data, lines).matches;
  assert.equal(picks.length, 1);
  const renamed = { shoppingItems: [{ ...data.shoppingItems[0], name: "Sabão" }] };
  const after = applyConferencia(renamed, picks, lines);
  assert.deepEqual(after.shoppingItems, renamed.shoppingItems);
});
test("Lacuna 9: abortar descarta resposta válida tardia que ignora o sinal", async () => {
  const controller = new AbortController();
  let finish;
  const task = interpretPastedList("1 arroz", () => new Promise((resolve) => { finish = resolve; }),
    { signal: controller.signal });
  controller.abort();
  finish([{ name: "Leite", qty: 1, unit: "" }]);
  const result = await task;
  assert.equal(result.source, "local");
  assert.equal(result.items[0].name, "Arroz");
});
test("Lacuna 10: nome herdado do objeto não é UF válida", () => {
  assert.throws(() => consultUrl({ uf: "toString", chave: "0".repeat(44) }), /Ainda não consulto notas de toString/);
});
