import test from "node:test";
import assert from "node:assert/strict";
import { createList, renameList, archiveList, moveItem, saveAsTemplate, fromTemplate,
  migrateToLists, flattenLists } from "../src/shoppingLists.mjs";
import { makeState, makePurchase } from "./helpers/shoppingFixtures.mjs";

const item = { id: "i", listId: "main", name: "Arroz", qty: 2, unit: "", priceCents: 120, inCart: true, category: "Mercearia" };
test("Migrar é idempotente e o estado anterior volta idêntico com histórico intacto", () => {
  const before = makeState({ items: [item], purchases: [makePurchase()] });
  const next = migrateToLists(before);
  assert.equal(next.shoppingLists[0].name, "Mercado");
  assert.equal(next.shoppingItems, before.shoppingItems);
  assert.equal(next.shoppingPurchases, before.shoppingPurchases);
  assert.equal(migrateToLists(next), next);
  assert.deepEqual(flattenLists(next), before);
  assert.deepEqual(flattenLists(migrateToLists({})), {});
});
test("Criar e renomear impedem nomes duplicados por acento e caixa", () => {
  let state = createList(makeState(), "Feira", { id: "feira" });
  state = renameList(state, "feira", "Farmácia");
  assert.equal(state.shoppingLists[1].name, "Farmácia");
  assert.throws(() => createList(state, "farmacia"), /já existe/i);
  assert.throws(() => renameList(state, "feira", "Mercado"), /já existe/i);
});
test("Mover mantém preço e carrinho e arquivar preserva itens", () => {
  const before = createList(makeState({ items: [item] }), "Feira", { id: "feira" });
  const moved = moveItem(before, "i", "feira");
  assert.equal(before.shoppingItems[0].listId, "main");
  assert.deepEqual(moved.shoppingItems[0], { ...item, listId: "feira" });
  assert.deepEqual(flattenLists(moved).shoppingItems[0], item);
  const archived = archiveList(moved, "feira");
  assert.equal(archived.shoppingItems, moved.shoppingItems);
  assert.throws(() => moveItem(archived, "i", "feira"), /arquivada/i);
  assert.throws(() => archiveList(archived, "main"), /pelo menos uma/i);
});
test("Modelo com dois mil itens cria novos IDs sem copiar carrinho", () => {
  const items = Array.from({ length: 2000 }, (_, index) => ({ ...item, id: String(index) }));
  const template = saveAsTemplate(makeState({ items }), "main");
  const result = fromTemplate(template, 10, { id: "nova" });
  assert.equal(result.items.length, 2000);
  assert.equal(new Set(result.items.map((row) => row.id)).size, 2000);
  assert.deepEqual(result.items[0], { ...item, id: "nova-1", listId: "nova", inCart: false, createdAt: 10 });
  assert.throws(() => fromTemplate({ ...template, items: [...template.items, item] }, 0), /grande/i);
});
