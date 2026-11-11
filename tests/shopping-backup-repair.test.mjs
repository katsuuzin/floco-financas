import test from "node:test";
import assert from "node:assert/strict";
import { checkShoppingBackup } from "../src/shoppingBackupCheck.mjs";
import { repairShoppingBackup } from "../src/shoppingBackupRepair.mjs";
import { makeState, makePurchase, makeNota, seededRandom } from "./helpers/shoppingFixtures.mjs";

test("Backup limpo mantém referência e não gera ações", () => {
  const data = makeState({ purchases: [makePurchase()] });
  assert.deepEqual(repairShoppingBackup(data), { data, actions: [] });
  assert.equal(repairShoppingBackup(data).data, data);
});
test("Repara dados corrompidos em conjunto e conserva as compras válidas", () => {
  const kept = makePurchase();
  const wrongKey = makeNota().chave.slice(1);
  const broken = makePurchase({ id: "b", date: "2026-01-02", totalCents: -20, marketName: "x".repeat(81), chave: wrongKey });
  const old = { id: "x", name: "Arroz", qty: 1, createdAt: 1 };
  const input = makeState({ items: [old, { ...old, name: "Leite", updatedAt: 2, priceCents: -10 }], purchases: [kept, broken],
    products: [{ id: "p", name: "Arroz", key: "arroz|", buys: 1, prices: [{ date: "2026-01-01", purchaseId: "x", priceCents: 200 }] }] });
  const before = structuredClone(input);
  const { data, actions } = repairShoppingBackup(input);
  assert.equal(checkShoppingBackup(data).ok, true);
  assert.deepEqual(input, before);
  assert.deepEqual(data.shoppingPurchases[0], kept);
  assert.equal(data.shoppingPurchases[1].totalCents, 0);
  assert.equal(data.shoppingItems[0].name, "Leite");
  assert.equal(data.shoppingItems[0].priceCents, 0);
  assert.deepEqual(data.shoppingProducts[0].prices, []);
  for (const code of ["remover_duplicata", "corrigir_preco", "corrigir_chave", "descartar_orfao", "cortar_texto"])
    assert.ok(actions.some((action) => action.code === code));
  assert.deepEqual(repairShoppingBackup(data), { data, actions: [] });
});
test("Duzentos estados com corrupção variada voltam válidos", () => {
  const random = seededRandom(73);
  for (let i = 0; i < 200; i++) {
    const p = makePurchase({ id: "p" + i });
    const row = { id: "i", name: "Leite", qty: 2, priceCents: 100 };
    const data = makeState({ items: [row], purchases: [p] });
    const changes = [
      () => { data.shoppingItems[0].name += "é".repeat(120); },
      () => { data.shoppingItems[0].qty = 10000; },
      () => { data.shoppingItems.push({ ...row, createdAt: 10, priceCents: -40 }); },
      () => { data.shoppingPurchases[0].items[0].productId = "fantasma"; },
      () => { data.shoppingPurchases[0].marketName = 45; },
      () => { data.shoppingPurchases[0].chave = "fictícia"; },
      () => { data.shoppingProducts = null; },
      () => { data.extra = data; },
      () => { Object.defineProperty(data, "__proto__", { value: 5, enumerable: true }); },
    ];
    for (const change of changes) if (random() > 0.5) change();
    const repaired = repairShoppingBackup(data);
    assert.equal(checkShoppingBackup(repaired.data).ok, true, "Estado sintético " + i);
    assert.equal(repaired.data.shoppingPurchases.length, 1);
    assert.deepEqual(repairShoppingBackup(repaired.data).actions, []);
  }
});
test("Quando o limite conflita com preservação, mantém compras e sinaliza revisão", () => {
  const purchases = Array.from({ length: 5001 }, (_, i) => makePurchase({ id: "c" + i }));
  const result = repairShoppingBackup(makeState({ purchases }));
  assert.equal(result.data.shoppingPurchases.length, 5001);
  assert.equal(result.actions.at(-1).code, "revisao_manual");
});
