import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, validateBackup } from "../src/finance.mjs";
import { diffState, assembleState } from "../src/storage.mjs";
import { layoutOf, orderedBlocks, HOME_BLOCKS, DESTINATIONS } from "../src/layout.mjs";
import {
  parseItemText,
  categorize,
  addShoppingItem,
  toggleCart,
  setItemPrice,
  renameItem,
  setItemCategory,
  removeItem,
  restoreItem,
  clearCart,
  shoppingSummary,
  groupByCategory,
  shareText,
  sanitizeShoppingItems,
  keepShoppingOnRestore,
  purchaseDraft,
  MAX_ITEMS,
} from "../src/shopping.mjs";

const add = (s, text, id) => addShoppingItem(s, text, { id, now: 1 });
const sample = () => {
  let s = emptyState();
  s = add(s, "2 leite", "a");
  s = add(s, "500g farinha de mandioca", "b");
  s = add(s, "pão", "c");
  return s;
};

test("parseItemText entende quantidade, unidade e nome", () => {
  assert.deepEqual(parseItemText("2 leite"), { qty: 2, unit: "", name: "Leite" });
  assert.deepEqual(parseItemText("2x leite"), { qty: 2, unit: "", name: "Leite" });
  assert.deepEqual(parseItemText("500g farinha"), { qty: 500, unit: "g", name: "Farinha" });
  assert.deepEqual(parseItemText("1,5 kg de tomate"), { qty: 1.5, unit: "kg", name: "Tomate" });
  assert.deepEqual(parseItemText("pão francês"), { qty: 1, unit: "", name: "Pão francês" });
});

test("parseItemText rejeita vazio, nome longo e fração sem unidade vira nome", () => {
  assert.throws(() => parseItemText("   "), /nome do item/);
  assert.throws(() => parseItemText("x".repeat(81)), /até 80/);
  assert.deepEqual(parseItemText("1,5 leite"), { qty: 1, unit: "", name: "1,5 leite" });
});

test("categorize usa o dicionário e cai em Outros", () => {
  assert.equal(categorize("Leite integral"), "Frios e laticínios");
  assert.equal(categorize("picanha"), "Carnes e peixes");
  assert.equal(categorize("Detergente"), "Limpeza");
  assert.equal(categorize("parafuso"), "Outros");
});

test("adicionar não altera o estado original e usa lista principal", () => {
  const s0 = emptyState();
  const s1 = add(s0, "2 leite", "a");
  assert.equal(s0.shoppingItems.length, 0);
  assert.equal(s1.shoppingItems.length, 1);
  assert.equal(s1.shoppingItems[0].listId, "main");
  assert.equal(s1.shoppingItems[0].category, "Frios e laticínios");
});

test("limite de itens", () => {
  const s = { ...emptyState(), shoppingItems: Array.from({ length: MAX_ITEMS }, (_, i) => ({ id: String(i) })) };
  assert.throws(() => add(s, "leite", "z"), /limite/);
});

test("marcar no carrinho alterna e erra com id inexistente", () => {
  let s = toggleCart(sample(), "a");
  assert.equal(s.shoppingItems[0].inCart, true);
  s = toggleCart(s, "a");
  assert.equal(s.shoppingItems[0].inCart, false);
  assert.throws(() => toggleCart(s, "nada"), /não encontrado/);
});

test("preço em centavos e total estimado só dos pendentes", () => {
  let s = sample();
  s = setItemPrice(s, "a", "6,50"); // 2 × 6,50 = 13,00
  s = setItemPrice(s, "b", "8,90"); // com unidade: total = 8,90
  let sum = shoppingSummary(s);
  assert.equal(sum.estimatedCents, 1300 + 890);
  assert.equal(sum.pending, 3);
  assert.equal(sum.unpriced, 1);
  s = toggleCart(s, "a");
  sum = shoppingSummary(s);
  assert.equal(sum.estimatedCents, 890);
  assert.equal(sum.inCart, 1);
  assert.equal(sum.preview.length, 2);
});

test("preço inválido é recusado e vazio limpa o preço", () => {
  let s = setItemPrice(sample(), "a", "3,00");
  assert.throws(() => setItemPrice(s, "a", "abc"), /valor/i);
  assert.throws(() => setItemPrice(s, "a", "0"), /maior que zero/);
  s = setItemPrice(s, "a", "");
  assert.equal(s.shoppingItems[0].priceCents, null);
});

test("renomear reclassifica e trocar categoria valida o nome", () => {
  let s = renameItem(sample(), "c", "3 sabonete");
  assert.equal(s.shoppingItems[2].name, "Sabonete");
  assert.equal(s.shoppingItems[2].qty, 3);
  assert.equal(s.shoppingItems[2].category, "Higiene");
  s = setItemCategory(s, "c", "Pet");
  assert.equal(s.shoppingItems[2].category, "Pet");
  assert.throws(() => setItemCategory(s, "c", "Inventada"), /inválida/);
});

test("excluir e desfazer devolvem o item na mesma posição", () => {
  const s = sample();
  const { state, removed, index } = removeItem(s, "b");
  assert.deepEqual(state.shoppingItems.map((i) => i.id), ["a", "c"]);
  const back = restoreItem(state, removed, index);
  assert.deepEqual(back.shoppingItems.map((i) => i.id), ["a", "b", "c"]);
  assert.equal(restoreItem(back, removed, index), back);
});

test("limpar o carrinho remove só o que foi comprado", () => {
  const s = clearCart(toggleCart(sample(), "a"));
  assert.deepEqual(s.shoppingItems.map((i) => i.id), ["b", "c"]);
});

test("agrupa por categoria, com No carrinho no fim", () => {
  const s = toggleCart(sample(), "a");
  const g = groupByCategory(s).map((x) => x.category);
  assert.equal(g[g.length - 1], "No carrinho");
  assert.ok(g.includes("Padaria") && g.includes("Mercearia"));
});

test("texto de compartilhar lista só pendentes e a estimativa", () => {
  let s = setItemPrice(sample(), "a", "6,50");
  s = toggleCart(s, "c");
  const text = shareText(s);
  assert.match(text, /- 2x Leite/);
  assert.match(text, /- 500 g de Farinha de mandioca/);
  assert.doesNotMatch(text, /Pão/);
  assert.match(text, /Estimativa: R\$\s?13,00 \(1 sem preço\)/);
  assert.equal(shareText(emptyState()), "Lista de compras vazia.");
});

test("backup: ausente devolve undefined; válido é normalizado; inválido falha", () => {
  assert.equal(sanitizeShoppingItems(undefined), undefined);
  assert.deepEqual(sanitizeShoppingItems([]), []);
  const ok = sanitizeShoppingItems([{ id: "x", name: " Leite ", qty: 2, unit: "zz", priceCents: 650, category: "?", inCart: "sim" }]);
  assert.equal(ok[0].name, "Leite");
  assert.equal(ok[0].unit, "");
  assert.equal(ok[0].category, "Outros");
  assert.equal(ok[0].inCart, false);
  assert.equal(ok[0].listId, "main");
  assert.throws(() => sanitizeShoppingItems("x"), /inválido/);
  assert.throws(() => sanitizeShoppingItems([{ id: "x", name: "a", qty: 1 }, { id: "x", name: "b", qty: 1 }]), /Identificadores/);
  assert.throws(() => sanitizeShoppingItems([{ id: "x", name: "a", qty: 0 }]), /inválido/);
  assert.throws(() => sanitizeShoppingItems([{ id: "x", name: "a", qty: 1, priceCents: -5 }]), /inválido/);
});

// ---- Etapa 2: persistência e backup ----

test("estado novo já nasce com lista vazia", () => {
  assert.deepEqual(emptyState().shoppingItems, []);
});

test("backup antigo (sem a chave) continua válido e não inventa lista", () => {
  const old = JSON.parse(JSON.stringify(emptyState()));
  delete old.shoppingItems;
  const v = validateBackup(old);
  assert.equal(v.shoppingItems, undefined);
});

test("restaurar backup sem lista mantém a lista atual", () => {
  const old = JSON.parse(JSON.stringify(emptyState()));
  delete old.shoppingItems;
  const restored = keepShoppingOnRestore(validateBackup(old), sample());
  assert.deepEqual(restored.shoppingItems.map((i) => i.id), ["a", "b", "c"]);
});

test("restaurar backup com lista substitui a atual (inclusive por lista vazia)", () => {
  const withList = validateBackup(JSON.parse(JSON.stringify(sample())));
  const swapped = keepShoppingOnRestore(withList, add(emptyState(), "ovos", "z"));
  assert.deepEqual(swapped.shoppingItems.map((i) => i.id), ["a", "b", "c"]);
  const empty = keepShoppingOnRestore(validateBackup(JSON.parse(JSON.stringify(emptyState()))), sample());
  assert.deepEqual(empty.shoppingItems, []);
});

test("backup com lista inválida é recusado", () => {
  const bad = { ...JSON.parse(JSON.stringify(emptyState())), shoppingItems: [{ id: "x", name: "", qty: 1 }] };
  assert.throws(() => validateBackup(bad), /Item de compras inválido/);
  const dup = { ...JSON.parse(JSON.stringify(emptyState())), shoppingItems: [{ id: "x", name: "a", qty: 1 }, { id: "x", name: "b", qty: 1 }] };
  assert.throws(() => validateBackup(dup), /Identificadores/);
});

test("ida e volta: backup JSON preserva itens, preços e carrinho", () => {
  let s = setItemPrice(sample(), "a", "6,50");
  s = toggleCart(s, "c");
  const back = validateBackup(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.shoppingItems, s.shoppingItems);
  assert.deepEqual(shoppingSummary(back), shoppingSummary(s));
});

test("armazenamento SQLite: itens viram coleção própria e voltam na mesma ordem", () => {
  const s = setItemPrice(sample(), "a", "6,50");
  const diff = diffState(null, s);
  const rows = diff.upserts
    .filter((u) => u.collection === "shoppingItems")
    .sort((x, y) => x.ord - y.ord)
    .map((u) => ({ collection: u.collection, json: u.json }));
  assert.equal(rows.length, 3);
  const loaded = assembleState(rows, [], emptyState());
  assert.deepEqual(loaded.shoppingItems, s.shoppingItems);
  // Excluir um item apaga só a linha dele.
  const { state } = removeItem(s, "b");
  const d2 = diffState(s, state);
  assert.deepEqual(d2.deletes, [{ collection: "shoppingItems", id: "b" }]);
});

test("banco de uma versão anterior (sem linhas da lista) carrega com lista vazia", () => {
  const loaded = assembleState([], [], emptyState());
  assert.deepEqual(loaded.shoppingItems, []);
  assert.doesNotThrow(() => validateBackup(loaded));
});

// ---- Etapa 4: bloco na Início ----

test("bloco Lista de compras existe na Início, visível por padrão, e é atalho possível", () => {
  assert.ok(HOME_BLOCKS.some(([id, label]) => id === "shopping" && label === "Lista de compras"));
  const home = layoutOf(emptyState()).home;
  assert.equal(home.find((b) => b.id === "shopping").visible, true);
  assert.ok(DESTINATIONS.some(([id]) => id === "shopping"));
});

test("quem já personalizou a Início mantém a ordem e recebe o bloco no fim", () => {
  const saved = [{ id: "recent", visible: true }, { id: "accounts", visible: false }];
  const list = orderedBlocks(HOME_BLOCKS, saved, []);
  assert.deepEqual(list.slice(0, 2).map((b) => b.id), ["recent", "accounts"]);
  assert.ok(list.some((b) => b.id === "shopping" && b.visible));
});

test("resumo do bloco: vazio, só no carrinho e com mais de 3 pendentes", () => {
  assert.deepEqual(shoppingSummary(emptyState()), { total: 0, pending: 0, inCart: 0, estimatedCents: 0, unpriced: 0, preview: [] });
  let s = toggleCart(sample(), "a");
  s = toggleCart(toggleCart(s, "b"), "c");
  assert.equal(shoppingSummary(s).pending, 0);
  s = add(add(add(add(emptyState(), "a1", "1"), "a2", "2"), "a3", "3"), "a4", "4");
  const sum = shoppingSummary(s);
  assert.equal(sum.pending, 4);
  assert.equal(sum.preview.length, 3);
});

// ---- Etapa 6: registrar a compra como despesa ----

test("rascunho da compra soma só o carrinho, com preço, e conta os sem preço", () => {
  let s = setItemPrice(sample(), "a", "6,50"); // 2 × 6,50 = 13,00
  s = setItemPrice(s, "b", "8,90"); // com unidade: 8,90
  s = toggleCart(toggleCart(toggleCart(s, "a"), "b"), "c"); // c (pão) sem preço
  const d = purchaseDraft(s);
  assert.equal(d.items, 3);
  assert.equal(d.priced, 2);
  assert.equal(d.unpriced, 1);
  assert.equal(d.totalCents, 1300 + 890);
  assert.equal(d.amountText, "21,90");
  assert.equal(d.description, "Compra de mercado");
});

test("rascunho: sem nada no carrinho ou sem preços o valor fica vazio", () => {
  assert.deepEqual(purchaseDraft(emptyState()), { items: 0, priced: 0, unpriced: 0, totalCents: 0, amountText: "", description: "Compra de mercado" });
  const d = purchaseDraft(toggleCart(sample(), "a"));
  assert.equal(d.amountText, "");
  assert.equal(d.unpriced, 1);
});

test("rascunho: itens fora do carrinho não entram e o texto é aceito pelo parseMoney", async () => {
  const s = toggleCart(setItemPrice(setItemPrice(sample(), "a", "1.234,50"), "c", "5"), "a");
  const d = purchaseDraft(s);
  assert.equal(d.totalCents, 2 * 123450);
  const { parseMoney } = await import("../src/finance.mjs");
  assert.equal(parseMoney(d.amountText), d.totalCents);
});
