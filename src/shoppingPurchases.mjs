// Compras (notas) e produtos da Lista de compras. Lógica pura: sem React, sem armazenamento.
// Estado: state.shoppingPurchases (uma compra por nota ou por registro manual, com os itens dentro)
//         state.shoppingProducts  (um produto por nome normalizado + unidade, com histórico de preço).
// Valores em centavos inteiros. Preço unitário = preço de 1 unidade (ou 1 kg/l, quando há unidade).
import { uid } from "./finance.mjs";
import { categorize } from "./shopping.mjs";
import {
  MAX_NAME,
  MAX_PRICE_POINTS,
  MAX_PRODUCTS,
  MAX_PURCHASES,
  MAX_PURCHASE_ITEMS,
  sanitizePurchases,
  isIsoDate,
} from "./shoppingData.mjs";

export const purchasesOf = (state) => state.shoppingPurchases || [];
export const productsOf = (state) => state.shoppingProducts || [];

// "MOL TOM HEINZ SACH 240G" → "mol tom heinz sach 240g": sem acento, sem pontuação, espaços únicos.
export function normalizeName(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Chave de produto: nome normalizado + unidade (tomate por kg não se mistura com tomate por unidade).
export const productKey = (name, unit = "") => `${normalizeName(name)}|${unit}`;

const roundCents = (n) => Math.round(n);

function parseItem(raw) {
  const name = String(raw?.name ?? "").replace(/\s+/g, " ").trim();
  if (!name) throw Error("Item da compra sem nome.");
  if (name.length > MAX_NAME) throw Error(`O nome do item deve ter até ${MAX_NAME} letras.`);
  const qty = Number(raw.qty ?? 1);
  if (!Number.isFinite(qty) || qty <= 0 || qty > 99999) throw Error("Quantidade inválida.");
  const unit = ["", "g", "kg", "ml", "l"].includes(raw.unit) ? raw.unit : "";
  let unitPriceCents = raw.unitPriceCents ?? null;
  let totalCents = raw.totalCents ?? null;
  if (unitPriceCents == null && totalCents == null) throw Error(`Informe o preço de "${name}".`);
  if (totalCents == null) totalCents = roundCents(unitPriceCents * qty);
  if (unitPriceCents == null) unitPriceCents = roundCents(totalCents / qty);
  for (const v of [unitPriceCents, totalCents])
    if (!Number.isSafeInteger(v) || v <= 0 || v > 99999999999) throw Error(`Preço inválido em "${name}".`);
  return { name, rawName: String(raw.rawName ?? "").trim().slice(0, 120), qty, unit, unitPriceCents, totalCents, ean: raw.ean ? String(raw.ean) : "" };
}

// Registra uma compra e atualiza o histórico de produtos. Não grava nada fora do estado.
// input: { date, marketName?, cnpj?, chave?, source?, transactionId?, totalCents?, items: [{ name, qty?, unit?, unitPriceCents?, totalCents?, rawName?, ean? }] }
export function recordPurchase(state, input, { id = uid(), now = Date.now(), newId = uid } = {}) {
  const purchases = purchasesOf(state);
  if (purchases.length >= MAX_PURCHASES) throw Error("O histórico de compras chegou ao limite.");
  if (!isIsoDate(input?.date)) throw Error("Informe a data da compra.");
  if (!Array.isArray(input.items) || input.items.length === 0) throw Error("A compra precisa de pelo menos um item.");
  if (input.items.length > MAX_PURCHASE_ITEMS) throw Error("Itens demais na mesma compra.");
  const chave = input.chave ? String(input.chave) : "";
  if (chave && purchases.some((p) => p.chave === chave)) throw Error("Esta nota fiscal já foi registrada.");

  const products = productsOf(state).slice();
  // Primeiro acha ou cria o produto de cada linha; depois grava UM ponto de preço por produto na compra
  // (média ponderada pela quantidade), porque a mesma nota pode repetir o produto em várias linhas.
  const agg = new Map(); // id do produto → { qty, total, ean }
  const items = input.items.map((raw) => {
    const it = parseItem(raw);
    const key = productKey(it.name, it.unit);
    let at = it.ean ? products.findIndex((p) => p.ean === it.ean) : -1;
    if (at < 0) at = products.findIndex((p) => p.key === key);
    if (at < 0) {
      if (products.length >= MAX_PRODUCTS) throw Error("O catálogo de produtos chegou ao limite.");
      products.push({ id: newId(), key, name: it.name, ean: it.ean, unit: it.unit, category: categorize(it.name), lastPriceCents: null, prices: [], buys: 0, lastBoughtAt: "" });
      at = products.length - 1;
    }
    const prod = products[at];
    const a = agg.get(prod.id) || { qty: 0, total: 0, ean: "" };
    a.qty += it.qty;
    a.total += it.totalCents;
    a.ean = a.ean || it.ean;
    agg.set(prod.id, a);
    return { name: it.name, rawName: it.rawName, qty: it.qty, unit: it.unit, unitPriceCents: it.unitPriceCents, totalCents: it.totalCents, productId: prod.id };
  });
  for (const [pid, a] of agg) {
    const at = products.findIndex((p) => p.id === pid);
    const prod = products[at];
    const price = Math.max(1, Math.round(a.total / a.qty));
    const prices = [...prod.prices, { date: input.date, priceCents: price, purchaseId: id }].slice(-MAX_PRICE_POINTS);
    const newer = !prod.lastBoughtAt || input.date >= prod.lastBoughtAt;
    products[at] = {
      ...prod,
      ean: prod.ean || a.ean,
      prices,
      buys: prod.buys + 1,
      lastBoughtAt: newer ? input.date : prod.lastBoughtAt,
      lastPriceCents: newer ? price : prod.lastPriceCents,
    };
  }

  const sum = items.reduce((n, i) => n + i.totalCents, 0);
  const purchase = {
    id,
    date: input.date,
    marketName: String(input.marketName ?? "").trim().slice(0, MAX_NAME),
    cnpj: input.cnpj ? String(input.cnpj) : "",
    chave,
    source: input.source === "nfce" ? "nfce" : "manual",
    totalCents: input.totalCents ?? sum,
    items,
    transactionId: input.transactionId ? String(input.transactionId) : "",
    createdAt: now,
  };
  sanitizePurchases([purchase]); // mesma validação do backup
  return { ...state, shoppingPurchases: [...purchases, purchase], shoppingProducts: products };
}

// Remove a compra e desfaz o que ela somou no histórico de cada produto.
// O produto some se nenhuma compra restante o usa; senão perde uma compra e os preços dela.
export function removePurchase(state, id) {
  const purchases = purchasesOf(state);
  const gone = purchases.find((p) => p.id === id);
  if (!gone) throw Error("Compra não encontrada.");
  const rest = purchases.filter((p) => p.id !== id);
  const used = new Set(rest.flatMap((p) => p.items.map((i) => i.productId)));
  const inGone = new Set(gone.items.map((i) => i.productId));
  const products = productsOf(state)
    .filter((prod) => !inGone.has(prod.id) || used.has(prod.id))
    .map((prod) => {
      if (!inGone.has(prod.id)) return prod;
      const prices = prod.prices.filter((x) => x.purchaseId !== id);
      const last = prices.length ? prices.reduce((a, b) => (b.date >= a.date ? b : a)) : null;
      return { ...prod, prices, buys: Math.max(1, prod.buys - 1), lastBoughtAt: last ? last.date : prod.lastBoughtAt, lastPriceCents: last ? last.priceCents : prod.lastPriceCents };
    });
  return { ...state, shoppingPurchases: rest, shoppingProducts: products };
}

// Último preço conhecido de um produto (por nome e unidade), ou null.
export function lastKnownPrice(state, name, unit = "") {
  const prod = productsOf(state).find((p) => p.key === productKey(name, unit));
  return prod ? prod.lastPriceCents : null;
}

// Resumo de um produto para a tela de histórico: último, médio, mínimo e máximo dos pontos guardados.
export function priceSummary(prod) {
  const v = prod.prices.map((x) => x.priceCents);
  if (!v.length) return null;
  return {
    last: prod.lastPriceCents,
    avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length),
    min: Math.min(...v),
    max: Math.max(...v),
    points: v.length,
  };
}
