import test from "node:test";
import assert from "node:assert/strict";
import { parseShared } from "../src/shoppingImportShared.mjs";
import { parsePurchasesJson } from "../src/shoppingExport.mjs";
import { splitDraft } from "../src/shoppingSplit.mjs";
import { applyDeal } from "../src/shoppingDeals.mjs";
import { repairShoppingBackup } from "../src/shoppingBackupRepair.mjs";
import { makeState, makePurchase, makeNota } from "./helpers/shoppingFixtures.mjs";

test("Achado: E01 cabeçalhos comuns da lista compartilhada viram itens", () => {
  const result = ["Lista 🛒", "Compras da semana", "LISTA DE COMPRAS:", "Mercado - 10/11"].map((heading) =>
    parseShared(heading + "\n- leite").items.map(({ name }) => name));
  assert.deepEqual(result, [["Leite"], ["Leite"], ["Leite"], ["Leite"]]);
});
test("Achado: E02 despesas divididas devem identificar a categoria", () => {
  const items = ["Higiene", "Limpeza"].map((category) => ({ name: category, category, qty: 1, priceCents: 100, inCart: true }));
  const { expenses } = splitDraft(makeState({ items }), { mode: "category" });
  assert.equal(new Set(expenses.map((entry) => entry.description)).size, 2);
});
test("Achado: soma de quantidades decimais na colagem deve preservar a medida", () => {
  assert.equal(parseShared("Banana 0,1kg\nBanana 0,2kg").items[0].qty, 0.3);
});
test("Achado: histórico JSON aceita chave fiscal com dígito trocado", () => {
  const key = makeNota().chave;
  const chave = key.slice(0, -1) + (Number(key.at(-1)) + 1) % 10;
  const purchase = makePurchase({ chave, source: "nfce" });
  assert.throws(() => parsePurchasesJson(JSON.stringify({ schema: 1, purchases: [purchase] })), /fiscal|chave|verificador/i);
});
test("Achado: divisão arredonda dez parcelas de cinco centésimos de centavo para zero", () => {
  const items = Array.from({ length: 10 }, () => ({ name: "Arroz", qty: 0.05, priceCents: 1, inCart: true }));
  assert.equal(splitDraft(makeState({ items })).totalCents, 1);
});
test("Achado: preço unitário promocional acima do preço base aumenta a cobrança", () => {
  assert.equal(applyDeal({ priceCents: 100, qty: 1 }, { type: "unitPrice", cents: 120 }).totalCents, 100);
});
test("Achado: remover ponto órfão deve atualizar o último preço pelo ponto restante", () => {
  const state = makeState({ purchases: [makePurchase({ id: "c" })], products: [{
    id: "p", key: "arroz|", name: "Arroz", buys: 2, lastPriceCents: 200, lastBoughtAt: "2026-01-02", prices: [
      { date: "2026-01-01", priceCents: 100, purchaseId: "c" },
      { date: "2026-01-02", priceCents: 200, purchaseId: "ausente" },
    ],
  }] });
  const [product] = repairShoppingBackup(state).data.shoppingProducts;
  assert.deepEqual([product.lastPriceCents, product.lastBoughtAt], [100, "2026-01-01"]);
});
