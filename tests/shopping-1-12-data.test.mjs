// Passo 1 da lista no funcionamento do Lemonlist: campos novos, 18 categorias, ordem e divisores das listas.
import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, validateBackup } from "../src/finance.mjs";
import {
  CART_GROUP, LATER_GROUP, SHOPPING_CATEGORIES, addShoppingItem, categorize, configureShoppingItem, createShoppingList,
  groupByCategory, keepShoppingOnRestore, lineTotal, listOverview, setItemStatus, shareText, shoppingSummary, toggleCart,
} from "../src/shopping.mjs";
import { sanitizeShoppingItems, sanitizeShoppingLayout, sanitizeShoppingLists, sanitizeShoppingStaples } from "../src/shoppingData.mjs";
import {
  addDivider, groupOfList, listLayout, moveLayoutEntry, removeDivider, renameDivider, setListColor, setListGroup, setListLayout, visibleLayout,
} from "../src/shoppingLists.mjs";
import { tripSummary } from "../src/shoppingTrip.mjs";

const add = (s, text, id, opts = {}) => addShoppingItem(s, text, { id, now: 1, ...opts });
const base = () => add(add(add(emptyState(), "2 leite", "a"), "pão", "b"), "detergente", "c");

test("18 categorias, com as 11 antigas mantendo o nome", () => {
  assert.equal(SHOPPING_CATEGORIES.length, 18);
  for (const old of ["Hortifrúti", "Carnes e peixes", "Frios e laticínios", "Padaria", "Mercearia", "Bebidas", "Congelados",
    "Limpeza", "Higiene", "Pet", "Outros"]) assert.ok(SHOPPING_CATEGORIES.includes(old), old);
  assert.equal(SHOPPING_CATEGORIES.at(-1), "Outros");
});

test("categorize conhece as categorias novas e mantém as antigas", () => {
  assert.equal(categorize("Banana prata"), "Frutas");
  assert.equal(categorize("Café em pó"), "Matinais");
  assert.equal(categorize("Biscoito recheado"), "Doces e lanches");
  assert.equal(categorize("doce de leite"), "Doces e lanches");
  assert.equal(categorize("Cerveja lata"), "Bebidas alcoólicas");
  assert.equal(categorize("Dipirona"), "Farmácia");
  assert.equal(categorize("Fralda G"), "Bebê");
  assert.equal(categorize("Saco de lixo 50l"), "Casa e utilidades");
  assert.equal(categorize("Papel higiênico"), "Higiene");
  assert.equal(categorize("farinha de mandioca"), "Mercearia");
  assert.equal(categorize("mandioca"), "Hortifrúti");
  assert.equal(categorize("Refrigerante"), "Bebidas");
  assert.equal(categorize("Leite integral"), "Frios e laticínios");
});

test("adicionar aceita categoria escolhida e ignora categoria inválida", () => {
  assert.equal(add(emptyState(), "pão", "x", { category: "Congelados" }).shoppingItems[0].category, "Congelados");
  assert.equal(add(emptyState(), "pão", "x", { category: "Inventada" }).shoppingItems[0].category, "Padaria");
});

test("carrinho grava cartAt, limpa o estado e sai sem cartAt", () => {
  let s = setItemStatus(base(), "a", "missing");
  s = toggleCart(s, "a", 50);
  assert.deepEqual([s.shoppingItems[0].inCart, s.shoppingItems[0].cartAt, s.shoppingItems[0].status], [true, 50, undefined]);
  s = toggleCart(s, "a", 60);
  assert.equal(s.shoppingItems[0].inCart, false);
  assert.equal("cartAt" in s.shoppingItems[0], false);
});

test("estado tira do carrinho; null volta ao normal; inválido falha", () => {
  let s = setItemStatus(toggleCart(base(), "a", 5), "a", "later");
  assert.deepEqual([s.shoppingItems[0].inCart, s.shoppingItems[0].status, "cartAt" in s.shoppingItems[0]], [false, "later", false]);
  s = setItemStatus(s, "a", null);
  assert.equal("status" in s.shoppingItems[0], false);
  assert.throws(() => setItemStatus(s, "a", "sumiu"), /inválido/);
});

test("grupos: pendentes, Para outra compra e No carrinho com o mais recente no topo", () => {
  let s = setItemStatus(base(), "c", "later");
  s = toggleCart(toggleCart(s, "a", 10), "b", 20);
  const g = groupByCategory(s);
  assert.deepEqual(g.map((x) => x.category), [LATER_GROUP, CART_GROUP]);
  assert.deepEqual(g[1].items.map((i) => i.id), ["b", "a"]);
  s = setItemStatus(toggleCart(s, "a", 30), "a", "missing");
  assert.deepEqual(groupByCategory(s).map((x) => x.category), ["Frios e laticínios", LATER_GROUP, CART_GROUP]);
});

test("Depois sai do resumo, da compra e do texto compartilhado; Faltou continua", () => {
  let s = setItemStatus(setItemStatus(base(), "c", "later"), "b", "missing");
  const sum = shoppingSummary(s);
  assert.deepEqual([sum.total, sum.pending, sum.later, sum.missing], [2, 2, 1, 1]);
  assert.ok(!shareText(s).includes("Detergente"));
  assert.ok(shareText(s).includes("Pão"));
  assert.equal(tripSummary(s).total, 2);
});

test("preço por quilo multiplica pelo peso; sem o campo vale a porção", () => {
  const item = { qty: 500, unit: "g", priceCents: 2000 };
  assert.equal(lineTotal(item), 2000);
  assert.equal(lineTotal({ ...item, pricePer: "kg" }), 1000);
  assert.equal(lineTotal({ ...item, unit: "kg", qty: 1.5, pricePer: "kg" }), 3000);
  assert.equal(lineTotal({ qty: 2, unit: "", priceCents: 300, pricePer: "kg" }), 600);
});

test("editar grava detalhes e preço por quilo; undefined mantém", () => {
  let s = add(emptyState(), "500g queijo", "q");
  s = configureShoppingItem(s, "q", { text: "500g queijo", price: "40,00", category: "Frios e laticínios", everyDays: null, deal: null,
    details: "  minas frescal ", pricePer: "kg" });
  assert.deepEqual([s.shoppingItems[0].details, s.shoppingItems[0].pricePer, lineTotal(s.shoppingItems[0])], ["minas frescal", "kg", 2000]);
  s = configureShoppingItem(s, "q", { text: "500g queijo", price: "40,00", category: "Frios e laticínios", everyDays: null, deal: null });
  assert.equal(s.shoppingItems[0].details, "minas frescal");
  s = configureShoppingItem(s, "q", { text: "500g queijo", price: "40,00", category: "Frios e laticínios", everyDays: null, deal: null,
    details: "", pricePer: null });
  assert.equal("details" in s.shoppingItems[0], false);
  assert.equal("pricePer" in s.shoppingItems[0], false);
  assert.throws(() => configureShoppingItem(add(emptyState(), "leite", "l"), "l",
    { text: "leite", price: "", category: "Outros", everyDays: null, deal: null, pricePer: "kg" }), /quilo/);
});

test("validador guarda os campos novos válidos e descarta os inválidos", () => {
  const [ok] = sanitizeShoppingItems([{ id: "1", name: "Queijo", qty: 300, unit: "g", priceCents: 100, category: "Frutas",
    status: "later", pricePer: "kg", details: "x".repeat(200), photo: "1.jpg" }]);
  assert.deepEqual([ok.category, ok.status, ok.pricePer, ok.details.length, ok.photo], ["Frutas", "later", "kg", 120, "1.jpg"]);
  const [cart] = sanitizeShoppingItems([{ id: "2", name: "A", qty: 1, inCart: true, status: "missing", cartAt: 9, pricePer: "kg",
    photo: "../x.jpg" }]);
  assert.deepEqual([cart.status, cart.cartAt, cart.pricePer, cart.photo], [undefined, 9, undefined, undefined]);
  const [old] = sanitizeShoppingItems([{ id: "3", name: "Velho", qty: 1, priceCents: null, category: "Mercearia", inCart: false, createdAt: 1 }]);
  assert.deepEqual(Object.keys(old).sort(), ["category", "createdAt", "id", "inCart", "listId", "name", "priceCents", "qty", "unit"]);
});

test("recorrentes não carregam estado, carrinho nem foto", () => {
  const [row] = sanitizeShoppingStaples([{ id: "s", name: "Café", qty: 1, staple: true, everyDays: 7, status: "later", photo: "s.jpg",
    inCart: true, cartAt: 3 }]);
  assert.deepEqual([row.status, row.photo, row.cartAt, row.inCart], [undefined, undefined, undefined, false]);
});

test("cor de lista válida fica; inválida some", () => {
  const lists = sanitizeShoppingLists([{ id: "a", name: "A", color: "oliva" }, { id: "b", name: "B", color: "#fff" }]);
  assert.deepEqual(lists.map((l) => l.color), ["oliva", undefined]);
});

test("layout do backup: só listas conhecidas, divisores com nome, sem repetidos", () => {
  const lists = [{ id: "a" }, { id: "b" }];
  assert.equal(sanitizeShoppingLayout(undefined, lists), undefined);
  assert.deepEqual(sanitizeShoppingLayout([{ kind: "list", id: "b" }, { kind: "divider", id: "g1", name: " Casa " },
    { kind: "list", id: "b" }, { kind: "list", id: "zz" }, { kind: "divider", id: "g2", name: "" }, { kind: "divider", id: "a", name: "X" }], lists),
  [{ kind: "list", id: "b" }, { kind: "divider", id: "g1", name: "Casa" }]);
});

const twoLists = () => createShoppingList(createShoppingList(emptyState(), "Feira"), "Farmácia");

test("ordem: sem layout vale a ordem das listas; listas novas entram no fim", () => {
  const s = twoLists();
  assert.deepEqual(listLayout(s).map((r) => r.id), s.shoppingLists.map((l) => l.id));
  const moved = moveLayoutEntry(s, 2, 0);
  assert.equal(listLayout(moved)[0].id, s.shoppingLists[2].id);
  const more = createShoppingList(moved, "Padaria");
  assert.equal(listLayout(more).at(-1).id, more.shoppingLists.at(-1).id);
  assert.deepEqual(listLayout(listLayout(more) && more), listLayout(more));
});

test("divisores: criar, renomear, apagar pelo nome vazio e agrupar listas", () => {
  let s = addDivider(twoLists(), 1, "Casa", { id: "g1" });
  assert.deepEqual(visibleLayout(s).map((r) => r.kind), ["list", "divider", "list", "list"]);
  const [, , second] = visibleLayout(s);
  assert.deepEqual(groupOfList(s, second.id), { id: "g1", name: "Casa" });
  s = renameDivider(s, "g1", "Casa da praia");
  assert.equal(groupOfList(s, second.id).name, "Casa da praia");
  const first = visibleLayout(s)[0].id;
  s = setListGroup(s, first, "g1");
  assert.equal(groupOfList(s, first).id, "g1");
  s = setListGroup(s, first, null);
  assert.equal(groupOfList(s, first), null);
  s = renameDivider(s, "g1", "  ");
  assert.equal(visibleLayout(s).some((r) => r.kind === "divider"), false);
  assert.throws(() => addDivider(s, 0, ""), /nome de grupo/);
  assert.throws(() => removeDivider(s, "nada") && renameDivider(s, "nada", "x"), /Grupo/);
});

test("listas arquivadas somem da tela mas mantêm o lugar no layout", () => {
  const s = twoLists();
  const id = s.shoppingLists[1].id;
  const archived = { ...s, shoppingLists: s.shoppingLists.map((l) => l.id === id ? { ...l, archived: true } : l) };
  assert.equal(visibleLayout(archived).some((r) => r.id === id), false);
  const reordered = setListLayout(archived, [...visibleLayout(archived)].reverse());
  assert.ok(listLayout(reordered).some((r) => r.id === id));
});

test("cor da lista: grava, troca e apaga; cor inválida falha", () => {
  let s = setListColor(twoLists(), "main", "terracota");
  assert.equal(s.shoppingLists[0].color, "terracota");
  s = setListColor(s, "main", null);
  assert.equal("color" in s.shoppingLists[0], false);
  assert.throws(() => setListColor(s, "main", "rosa"), /Cor/);
});

test("visão geral: cartões com resumo por lista, na ordem do layout", () => {
  let s = twoLists();
  const feira = s.shoppingLists[1].id;
  s = { ...s, shoppingListId: feira };
  s = add(add(s, "banana", "f1"), "2 maçã", "f2");
  s = toggleCart(s, "f1", 1);
  s = addDivider(s, 0, "Semana", { id: "g" });
  const view = listOverview(s);
  assert.equal(view[0].kind, "divider");
  const card = view.find((r) => r.id === feira);
  assert.deepEqual([card.total, card.pending, card.inCart], [2, 1, 1]);
  assert.equal(view.find((r) => r.id === "main").total, 0);
});

test("backup com layout e campos novos passa duas vezes igual (idempotente)", () => {
  let s = addDivider(twoLists(), 0, "Casa", { id: "g" });
  s = setItemStatus(add(s, "café", "c1"), "c1", "later");
  const once = validateBackup(JSON.parse(JSON.stringify(s)));
  const twice = validateBackup(JSON.parse(JSON.stringify(once)));
  assert.deepEqual(twice.shoppingListLayout, once.shoppingListLayout);
  assert.deepEqual(twice.shoppingItems, once.shoppingItems);
  assert.equal(once.shoppingItems[0].status, "later");
});

test("backup antigo sem layout restaura e mantém o layout atual só sem listas no backup", () => {
  const current = addDivider(twoLists(), 0, "Casa", { id: "g" });
  const old = validateBackup({ ...emptyState(), shoppingItems: undefined });
  assert.deepEqual(keepShoppingOnRestore(old, current).shoppingListLayout, current.shoppingListLayout);
  const withLists = validateBackup(JSON.parse(JSON.stringify(twoLists())));
  assert.equal(keepShoppingOnRestore(withLists, current).shoppingListLayout, undefined);
});
