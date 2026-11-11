import test from "node:test";
import assert from "node:assert/strict";
import { chaveDv, isChave, parseChave, parseNfceInput } from "../src/nfce.mjs";
import { allowedHosts, centsFromBr, consultSupported, consultUrl, isAllowedUrl, nfceToPurchase, parseNfceHtml } from "../src/nfceParse.mjs";
import { lookupEan } from "../src/openFoodFacts.mjs";
import { parsePastedList } from "../src/pasteList.mjs";
import { requestShoppingSuggestions } from "../src/shopping-ai-client.mjs";
import { addShoppingItem, keepShoppingOnRestore, lineTotal, parseItemText, purchaseDraft, restoreItem,
  sanitizeShoppingItems as sanitizeList, setItemPrice, shoppingSummary } from "../src/shopping.mjs";
import { budgetStatus, suggestCuts } from "../src/shoppingBudget.mjs";
import { isIsoDate, sanitizeProducts, sanitizePurchases, sanitizeShoppingItems } from "../src/shoppingData.mjs";
import { expenseDraftFromPurchase, monthSummary, pricePoints, priceTrend } from "../src/shoppingHistory.mjs";
import { matchListToNota, scorePair } from "../src/shoppingMatch.mjs";
import { lastKnownPrice, normalizeName, priceSummary, productKey } from "../src/shoppingPurchases.mjs";
import { purchaseRhythm, restockCandidates } from "../src/shoppingRhythm.mjs";
import { applySuggestedPrices, suggestPrices } from "../src/shoppingSuggestPrice.mjs";
import { tripSummary } from "../src/shoppingTrip.mjs";
import { parse, parseSession, resumeSession } from "../src/shoppingTripSession.mjs";

const base = "3526010000000000000065001000000001112345678";
const key = (body = base) => body + chaveDv(body);
const secondKey = key(base.slice(0, -1) + "9");
const host = "www.nfce.fazenda.sp.gov.br";
const item = (fields = {}) => ({ id: "x", name: "Arroz", qty: 1, unit: "", priceCents: null,
  category: "Mercearia", inCart: false, ...fields });
const product = (fields = {}) => ({ id: "a", key: "arroz|", name: "Arroz", unit: "", prices: [],
  buys: 2, lastBoughtAt: "2026-01-10", lastPriceCents: 200, ...fields });
const date = (n) => "2026-01-" + String(n).padStart(2, "0");
const point = (n, priceCents = 100) => ({ date: date(n), priceCents, purchaseId: "c" + n });
const purchase = (fields = {}) => ({ id: "c", date: date(1), totalCents: 100, items: [
  { name: "Arroz", qty: 1, totalCents: 100, unitPriceCents: 100, productId: "a" },
], ...fields });
const safe = (read) => {
  try { const n = read(); assert.ok(n === null || Number.isSafeInteger(n)); }
  catch (error) { if (!(error instanceof RangeError)) throw error; }
};

test("chaveDv recusa letra no corpo de 43 caracteres", () => assert.throws(() => chaveDv("0".repeat(42) + "A"), /43 dígitos/));
test("isChave não aceita coerção de objeto nem espaços", () => {
  assert.equal(isChave(" " + key()), false);
  assert.equal(isChave({ toString: () => key() }), false);
});
test("parseChave diagnostica mês 13 e UF fora da tabela", () => {
  const invalid = "002613" + base.slice(6);
  assert.throws(() => parseChave(key(invalid)), /mês|UF|data/i);
});
test("parseNfceInput rejeita dois parâmetros p conflitantes", () => {
  assert.throws(() => parseNfceInput("https://" + host + "/qrcode?p=" + key() + "|3|1&p=" + secondKey + "|3|1"), /chave|duplic|QR/i);
});
test("allowedHosts retorna lista vazia para UF desconhecida ou herdada", () => {
  assert.deepEqual(allowedHosts("XX"), []);
  assert.deepEqual(allowedHosts("toString"), []);
});
test("centsFromBr nunca troca o sinal e não lê formato de outro país como inteiro", () => {
  const negative = centsFromBr("-1,00");
  assert.ok(negative === null || negative === -100);
  assert.equal(centsFromBr("12.34"), null);
});
test("consultSupported não trata propriedades herdadas como UF", () => {
  assert.equal(consultSupported("sp"), false);
  assert.equal(consultSupported("constructor"), false);
});
test("consultUrl rejeita chave de 44 dígitos com DV trocado", () => {
  const correct = key();
  const wrong = correct.slice(0, -1) + String((Number(correct.at(-1)) + 1) % 10);
  assert.throws(() => consultUrl({ uf: "SP", chave: wrong }), /chave|verificador/i);
});
test("isAllowedUrl mantém o filtro de UF para destinos simulados de redirecionamento", () => {
  assert.equal(isAllowedUrl("https://nfce.fazenda.sp.gov.br/x", "SP"), true);
  assert.equal(isAllowedUrl("https://nfce.fazenda.sp.gov.br/x", "PR"), false);
});
test("nfceToPurchase não converte prévia de outra chave em compra", () => {
  assert.throws(() => nfceToPurchase({ ...purchase(), chave: secondKey }, { chave: key() }), /chave|nota/i);
});
test("parseNfceHtml rejeita quantidade acima do contrato de compra", () => {
  const html = '<tr id="Item1"><span class="txtTit">Arroz</span><span class="Rqtd">100000</span><span class="valor">2,00</span></tr>';
  assert.throws(() => parseNfceHtml(html), /quantidade|item/i);
});
test("lookupEan mantém proteção de tamanho com o fetch Android sem stream nem comprimento", async () => {
  const response = { ok: true, text: async () => " ".repeat(65_537) };
  assert.equal(await lookupEan("96385074", async () => response), null);
});
test("lookupEan permite reconsultar um código cujo resultado foi expulso do cache", async () => {
  const calls = new Map();
  const fetcher = async (url) => {
    const code = new URL(url).pathname.split("/").at(-1);
    calls.set(code, (calls.get(code) ?? 0) + 1);
    return { ok: true, json: async () => ({ status: 1, product: { product_name: "Item" } }) };
  };
  const codes = Array.from({ length: 140 }, (_, i) => {
    const body = String(i).padStart(7, "0");
    const sum = [...body].reverse().reduce((n, x, j) => n + Number(x) * (j % 2 ? 1 : 3), 0);
    return body + ((10 - sum % 10) % 10);
  });
  for (const code of codes) await lookupEan(code, fetcher);
  await lookupEan(codes[0], fetcher);
  assert.equal(calls.get(codes[0] + ".json"), 2);
});
test("parsePastedList reconhece a fração Unicode ½ com unidade", () => {
  assert.deepEqual(parsePastedList("½ kg de farinha"), [{ name: "Farinha", qty: 0.5, unit: "kg" }]);
});
test("requestShoppingSuggestions rejeita resposta incompleta e credencial recusada", async () => {
  const cfg = { provider: "openai", model: "modelo-teste" };
  const ask = (payload, ok) => requestShoppingSuggestions(cfg, "Arroz", "credencial-ficticia", { openai: { model: "modelo-teste" } }, undefined,
    async () => ({ ok, status: ok ? 200 : 401, json: async () => payload }));
  await assert.rejects(ask({ choices: [{ message: { content: '{"items":' } }] }, true));
  await assert.rejects(ask({ error: { message: "Credencial recusada" } }, false), /Credencial/);
});
test("addShoppingItem recusa ultrapassar 2 mil itens", () => {
  const state = { shoppingItems: Array.from({ length: 2000 }, (_, id) => item({ id: String(id) })) };
  assert.throws(() => addShoppingItem(state, "Leite", { id: "novo", now: 0 }), /limite/i);
});
test("keepShoppingOnRestore preserva catálogo antigo quando backup não contém a coleção", () => {
  const current = { shoppingProducts: [product()], shoppingPurchases: [purchase()] };
  assert.equal(keepShoppingOnRestore({ shoppingPurchases: [] }, current).shoppingProducts, current.shoppingProducts);
});
test("lineTotal não expõe centavos fora do intervalo inteiro seguro", () => {
  safe(() => lineTotal(item({ qty: 100, priceCents: Number.MAX_SAFE_INTEGER })));
});
test("parseItemText conserva entradas ambíguas em vez de interpretá-las como quantidade", () => {
  for (const name of ["1e3 Arroz", "２ Arroz"]) assert.equal(parseItemText(name).qty, 1);
});
test("purchaseDraft não gera valor de despesa com total zero", () => {
  const result = purchaseDraft({ shoppingItems: [item({ inCart: true, priceCents: 0 })] });
  assert.equal(result.amountText, "");
  assert.equal(result.totalCents, 0);
});
test("restoreItem não duplica ID e limita posição negativa", () => {
  const first = item();
  const state = { shoppingItems: [first] };
  assert.equal(restoreItem(state, first, 999), state);
  assert.equal(restoreItem(state, item({ id: "y" }), -1).shoppingItems[0].id, "y");
});
test("reexportação sanitizeShoppingItems recusa IDs duplicados ou centavos inválidos", () => {
  assert.throws(() => sanitizeList([item(), item({ category: "Nova" })]), /identificadores/i);
  assert.throws(() => sanitizeList([item({ priceCents: 1.1 })]), /inválido/i);
});
test("setItemPrice preserva centavos com separador brasileiro de milhares", () => {
  const state = { shoppingItems: [item()] };
  assert.equal(setItemPrice(state, "x", "1.234,56").shoppingItems[0].priceCents, 123456);
});
test("shoppingSummary não expõe total acima do inteiro seguro", () => {
  safe(() => shoppingSummary({ shoppingItems: [item({ priceCents: Number.MAX_SAFE_INTEGER }), item({ priceCents: 2 })] }).estimatedCents);
});
test("budgetStatus classifica sem arredondar a fronteira de um centavo para zero", () => {
  assert.equal(budgetStatus({ limitCents: 1, cartCents: 0 }).level, "ok");
  assert.equal(budgetStatus({ limitCents: 1, cartCents: 1 }).level, "near");
});
test("suggestCuts limita a cinco mesmo quando nenhum conjunto sugerido cobre todo o excesso", () => {
  const items = Array.from({ length: 8 }, (_, n) => item({ id: String(n), priceCents: 100, name: "Item " + n }));
  items.push(item({ id: "caro", priceCents: 1000, inCart: true }));
  const result = suggestCuts({ shoppingItems: items }, 100);
  assert.equal(result.length, 5);
  assert.ok(result.every(({ id }) => id !== "caro"));
});
test("isIsoDate rejeita data impossível sem depender da normalização do Date.parse", () => {
  assert.equal(isIsoDate("2026-02-30"), false);
});
test("sanitizeProducts identifica ponto sem referência de compra válida", () => {
  const record = product({ prices: [{ ...point(1), purchaseId: "" }] });
  assert.throws(() => sanitizeProducts([record]), /compra|histórico/i);
});
test("sanitizePurchases não aceita chave fiscal com DV inválido", () => {
  const correct = key();
  const wrong = correct.slice(0, -1) + String((Number(correct.at(-1)) + 1) % 10);
  assert.throws(() => sanitizePurchases([purchase({ chave: wrong, source: "nfce" })]), /chave/i);
});
test("sanitizeShoppingItems recusa conflito de IDs em chamada direta", () => assert.throws(() =>
  sanitizeShoppingItems([item(), item({ name: "Leite" })]), /identificadores/i));
test("expenseDraftFromPurchase preserva ausência de data sem gerar texto indefinido", () => {
  const result = expenseDraftFromPurchase({ totalCents: 123, marketName: "" });
  assert.equal(result.amount, "1,23");
  assert.equal(result.date, undefined);
  assert.doesNotMatch(result.description, /undefined/i);
});
test("monthSummary cobre mês vazio e não expõe total inseguro", () => {
  assert.equal(monthSummary({}, "2026-01").totalCents, 0);
  safe(() => monthSummary({ shoppingPurchases: [purchase({ totalCents: Number.MAX_SAFE_INTEGER }), purchase({ totalCents: 2 })] }, "2026-01").totalCents);
});
test("pricePoints conserva ponto órfão com loja vazia", () => {
  assert.deepEqual(pricePoints({}, product({ prices: [point(1)] })), [{ ...point(1), market: "" }]);
});
test("priceTrend evita infinito com preço anterior zero e data igual", () => {
  assert.ok(Number.isFinite(priceTrend(product({ prices: [point(1, 0), point(1, 100)] })).pct));
});
test("matchListToNota não reutiliza linhas numa lista cheia de nomes próximos", () => {
  const shoppingItems = Array.from({ length: 2000 }, (_, n) => item({ id: String(n), name: "Arroz tipo " + n }));
  const lines = Array.from({ length: 12 }, (_, n) => ({ name: "Arroz tipo " + n }));
  const result = matchListToNota({ shoppingItems }, lines);
  assert.equal(result.matches.length, 12);
  assert.equal(new Set(result.matches.map((entry) => entry.notaIndex)).size, 12);
});
test("scorePair não conta palavra repetida como correspondências distintas", () => {
  assert.equal(scorePair("Arroz arroz integral", "Arroz branco").score, 0);
});
test("lastKnownPrice não devolve negativo e não cruza unidade incompatível", () => {
  const state = { shoppingProducts: [product({ lastPriceCents: -100 })] };
  assert.equal(lastKnownPrice(state, "Arroz", "kg"), null);
  assert.equal(lastKnownPrice(state, "Arroz"), null);
});
test("normalizeName mantém algum texto para nome fora do alfabeto latino", () => {
  assert.ok(normalizeName("抹茶").length > 0);
});
test("priceSummary aceita produto que ficou sem pontos", () => {
  assert.equal(priceSummary(product()), null);
});
test("productKey distingue decimal e separador de dois números", () => {
  assert.notEqual(productKey("Produto 1,5"), productKey("Produto 1 5"));
});
test("purchaseRhythm limita influência de um intervalo recente atípico", () => {
  const result = purchaseRhythm(product({ prices: [point(1), point(4), point(7), point(23)] }));
  assert.equal(result.avgDays, 3);
  assert.equal(result.confidence, "medium");
});
test("restockCandidates distingue leite de creme quando um já está pendente", () => {
  const data = { shoppingItems: [item({ name: "Leite" })],
    shoppingProducts: [product({ name: "Creme de leite", prices: [point(1), point(10)] })] };
  assert.equal(restockCandidates(data, date(19))[0]?.name, "Creme de leite");
});
test("applySuggestedPrices não altera estado com seleção vazia mesmo com IDs repetidos", () => {
  const state = { shoppingItems: [item(), item()], shoppingProducts: [product()] };
  assert.equal(applySuggestedPrices(state, []), state);
});
test("suggestPrices desempata opções por qualidade e por posição da palavra", () => {
  const state = { shoppingItems: [item({ name: "Arroz" })],
    shoppingProducts: [product({ name: "Marca arroz", lastPriceCents: 90 }), product({ name: "Arroz branco", lastPriceCents: 100 })] };
  assert.equal(suggestPrices(state)[0].priceCents, 100);
});
test("tripSummary não expõe soma agregada acima do inteiro seguro", () => {
  safe(() => tripSummary({ shoppingItems: [item({ priceCents: Number.MAX_SAFE_INTEGER }), item({ priceCents: 2 })] }).grandEstimateCents);
});
test("parse rejeita horário guardado no futuro após o relógio voltar", () => {
  assert.equal(parse('{"startedAt":10,"lastSeenAt":11}', 10), null);
});
test("parseSession valida a fronteira máxima do timestamp", () => {
  const max = 8.64e15;
  assert.deepEqual(parseSession(JSON.stringify({ startedAt: max, lastSeenAt: max }), max), { startedAt: max, lastSeenAt: max });
  assert.equal(parseSession(JSON.stringify({ startedAt: max + 1, lastSeenAt: max + 1 }), max + 1), null);
});
test("resumeSession trata limite inválido e mantém início em duas retomadas", () => {
  const initial = { startedAt: 0, lastSeenAt: 1 };
  assert.equal(resumeSession(initial, 2, { maxIdleMinutes: NaN }).startedAt, 0);
  assert.equal(resumeSession(initial, 3, { maxIdleMinutes: NaN }).startedAt, 0);
});
