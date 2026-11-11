import test from "node:test";
import assert from "node:assert/strict";
import { formatCnpj, parseChave, chaveDv } from "../src/nfce.mjs";
import { parsePastedList } from "../src/pasteList.mjs";
import { sanitizePurchases } from "../src/shoppingData.mjs";
import { expandName } from "../src/nfceNames.mjs";
import { readableName } from "../src/nfceParse.mjs";
import { isValidEan } from "../src/openFoodFacts.mjs";
import { categorize, clearCart, groupByCategory, itemsOf, removeItem, renameItem, setItemCategory,
  setItemPrice, shareText, toggleCart, SHOPPING_CATEGORIES } from "../src/shopping.mjs";
import { learnAisleOrder, sortByAisles, aisleOrder } from "../src/shoppingAisles.mjs";
import { budgetStatus } from "../src/shoppingBudget.mjs";
import { displayName, purchasesByDate, searchProducts } from "../src/shoppingHistory.mjs";
import { tokenMatch, tokens } from "../src/shoppingMatch.mjs";
import { productsOf, purchasesOf } from "../src/shoppingPurchases.mjs";
import { formatElapsed, nextToGet, pendingByCategory } from "../src/shoppingTrip.mjs";
import { parseSession, serialize, serializeSession, startSession } from "../src/shoppingTripSession.mjs";
import { makeState, makeNota, makePurchase } from "./helpers/shoppingFixtures.mjs";

const item = (fields = {}) => ({ id: "i", name: "Farinha", category: "Mercearia", qty: 1, unit: "", priceCents: 500, ...fields });
const max = 8.64e15;
test("Matriz C02: CNPJ fictício pontuado e quantidade errada de dígitos", () => {
  assert.equal(formatCnpj("00.000.000/0000-00!"), "00.000.000/0000-00");
  assert.equal(formatCnpj("00.0"), "000");
});
test("Matriz C03: mês zero e UF desconhecida com DV recalculado", () => {
  const base = "002600" + makeNota().chave.slice(6, 43);
  assert.throws(() => parseChave(base + chaveDv(base)), /UF|estado|mês|data/i);
});
test("Matriz C04: expansão preserva dois tamanhos e marca truncada desconhecida", () => {
  const result = expandName("FARIN TRIGO MARCX 250G 500G");
  assert.match(result, /farinha.*trigo.*marcx.*250\s*g.*500\s*g/i);
});
test("Matriz C07: nome fiscal preserva texto misto e marca em várias palavras", () => {
  const result = readableName("FARIN TRIGO CASA VERD 抹茶");
  assert.match(result, /farinha.*trigo.*casa.*verd.*抹茶/i);
});
test("Matriz C08: caracteres de controle no EAN não são dígitos", () => {
  assert.equal(isValidEan("0000000\u200e0"), false);
  assert.equal(isValidEan("0000000A"), false);
});
test("Matriz C13: nome composto usa a primeira categoria aplicável", () => {
  assert.equal(categorize("Pão com queijo"), "Frios e laticínios");
});
test("Matriz C14: limpar carrinho vazio preserva as referências das linhas", () => {
  const state = makeState({ items: [item()] });
  assert.equal(clearCart(state).shoppingItems[0], state.shoppingItems[0]);
});
test("Matriz C15: categoria desconhecida não elimina grupos conhecidos", () => {
  const state = makeState({ items: SHOPPING_CATEGORIES.map((category) => item({ category })).concat(item({ category: "Outra" })) });
  assert.equal(groupByCategory(state).length, SHOPPING_CATEGORIES.length + 1);
  assert.ok(groupByCategory(state).some((group) => group.category === "Outra"));
});
test("Matriz C16: lista ausente ou nula equivale a vazia", () => {
  assert.deepEqual(itemsOf({}), []);
  assert.deepEqual(itemsOf({ shoppingItems: null }), []);
});
test("Matriz C19: remover ID ausente em lista cheia recusa a operação", () => {
  const state = makeState({ items: Array.from({ length: 2000 }, (_, id) => item({ id: String(id) })) });
  assert.throws(() => removeItem(state, "ausente"), /não encontrado/);
  assert.equal(state.shoppingItems.length, 2000);
});
test("Matriz C20: renomear item pesado preserva o preço e reavalia a categoria", () => {
  const state = makeState({ items: [item({ qty: 2, unit: "kg" })] });
  const [updated] = renameItem(state, "i", "0,5 kg de tomate").shoppingItems;
  assert.deepEqual([updated.qty, updated.unit, updated.priceCents, updated.category], [0.5, "kg", 500, "Hortifrúti"]);
});
test("Matriz C23: categoria inexistente não substitui a atual", () => {
  const state = makeState({ items: [item()] });
  assert.throws(() => setItemCategory(state, "i", "Inválida"), /Categoria inválida/);
  assert.equal(state.shoppingItems[0].category, "Mercearia");
});
test("Matriz C24: preço brasileiro grande preserva os centavos", () => {
  const state = makeState({ items: [item()] });
  assert.equal(setItemPrice(state, "i", "999.999.999,99").shoppingItems[0].priceCents, 99999999999);
});
test("Matriz C25: lista com 2.000 linhas compartilha todos os pendentes", () => {
  const state = makeState({ items: Array.from({ length: 2000 }, (_, i) => item({ id: String(i), name: "Item " + i })) });
  assert.equal(shareText(state).split("\n").filter((line) => line.startsWith("- ")).length, 2000);
});
test("Matriz C26: alternância recusa ID ausente e recupera estado falso corrompido", () => {
  const state = makeState({ items: [item({ inCart: null })] });
  assert.throws(() => toggleCart(state, "ausente"), /não encontrado/);
  assert.equal(toggleCart(state, "i").shoppingItems[0].inCart, true);
});
test("Matriz C27: duas sessões contraditórias mantêm a ordem padrão", () => {
  const path = (a, b) => [{ category: a, at: 1 }, { category: b, at: 2 }];
  assert.deepEqual(learnAisleOrder([path("Limpeza", "Padaria"), path("Padaria", "Limpeza"), null]), aisleOrder);
});
test("Matriz C28: ordem personalizada parcial preserva o empate de categorias novas", () => {
  const groups = ["Nova B", "Hortifrúti", "Nova A", "Padaria"].map((category) => ({ category }));
  assert.deepEqual(sortByAisles(groups, ["", "Padaria"]).map(({ category }) => category),
    ["Padaria", "Hortifrúti", "Nova B", "Nova A"]);
});
test("Matriz C29: 84 e 85 centavos distinguem a fronteira de aviso", () => {
  assert.equal(budgetStatus({ limitCents: 100, cartCents: 84 }).level, "ok");
  assert.equal(budgetStatus({ limitCents: 100, cartCents: 85 }).level, "near");
});
test("Matriz C33: nome misto preserva marca e dimensão reconhecíveis", () => {
  assert.match(displayName("Café MARCA 500G"), /café.*marca.*500g/i);
});
test("Matriz C36: empate de data e horário preserva as duas compras e é estável", () => {
  const data = makeState({ purchases: [makePurchase({ id: "a" }), makePurchase({ id: "b" })] });
  assert.deepEqual(purchasesByDate(data).map(({ id }) => id), ["a", "b"]);
});
test("Matriz C37: busca aceita acento decomposto e espaço não separável na borda", () => {
  const data = makeState({ products: [{ name: "Café moído" }, { name: "Chá" }] });
  assert.equal(searchProducts(data, "\u00a0Cafe\u0301\u00a0")[0].name, "Café moído");
});
test("Matriz C40: tokens acentuados decompostos e limite de três caracteres", () => {
  assert.deepEqual(tokens("Cafe\u0301"), tokens("Café"));
  assert.equal(tokenMatch("caf", "cafe"), true);
  assert.equal(tokenMatch("ca", "cafe"), false);
});
test("Matriz C41: número grudado na marca permanece no token", () => {
  assert.ok(tokens("Marca7 ovos").includes("marca7"));
});
test("Matriz C43: catálogo ausente ou nulo", () => {
  assert.deepEqual(productsOf({}), []);
  assert.deepEqual(productsOf({ shoppingProducts: null }), []);
});
test("Matriz C44: compras ausentes ou nulas", () => {
  assert.deepEqual(purchasesOf({}), []);
  assert.deepEqual(purchasesOf({ shoppingPurchases: null }), []);
});
test("Matriz C49: tempo extremo produz horas e minutos em texto", () => {
  assert.match(formatElapsed(Number.MAX_SAFE_INTEGER + 1), /^\d+ h \d{2} min$/);
  assert.equal(formatElapsed(Infinity), "menos de 1 min");
});
test("Matriz C50: limite fracionário trunca e mantém a ordem dos empates", () => {
  const state = makeState({ items: [item({ id: "a" }), item({ id: "b" }), item({ id: "c" })] });
  assert.deepEqual(nextToGet(state, { limit: 2.9 }).map(({ id }) => id), ["a", "b"]);
});
test("Matriz C51: nenhum pendente desaparece com categorias antigas ausentes ou variantes", () => {
  const state = makeState({ items: [item({ category: null }), item({ category: "Padaria" }), item({ category: "padaria" })] });
  assert.equal(pendingByCategory(state).reduce((n, group) => n + group.count, 0), 3);
});
test("Matriz C54: parseSession aceita o limite e recusa o próximo valor", () => {
  const raw = JSON.stringify({ startedAt: max, lastSeenAt: max });
  assert.deepEqual(parseSession(raw, max), JSON.parse(raw));
  assert.equal(parseSession(raw, max + 1), null);
});
test("Matriz C56: alias serialize grava null para timestamp fora do limite", () => {
  assert.equal(serialize({ startedAt: 0, lastSeenAt: max + 1 }), "null");
});
test("Matriz C57: export direto serializeSession recusa ordem de horário invertida", () => {
  assert.equal(serializeSession({ startedAt: 2, lastSeenAt: 1 }), "null");
});
test("Matriz C58: startSession verifica a fronteira superior exata", () => {
  assert.deepEqual(startSession(max), { startedAt: max, lastSeenAt: max });
  assert.equal(startSession(max + 1), null);
});

test("Matriz C10: vírgula decimal e separador coexistem com nome composto", () => {
  assert.deepEqual(parsePastedList("½ kg de arroz, biscoito de água e sal").map(({ name, qty, unit }) =>
    [name, qty, unit]), [["Arroz", 0.5, "kg"], ["Biscoito de água e sal", 1, ""]]);
});
test("Matriz C31: total fiscal divergente conserva o total informado para notas com ajuste", () => {
  const purchase = makePurchase({ totalCents: 475 });
  assert.notEqual(purchase.totalCents, purchase.items[0].totalCents);
  assert.equal(sanitizePurchases([purchase])[0].totalCents, 475);
});
