// Constantes e validação da lista de compras. Só importa nfce.mjs (sem dependências), para o backup (finance.mjs)
// poder validar a lista sem dependência circular com shopping.mjs.
import { isChave } from "./nfce.mjs";
export const MAIN_LIST = "main";
// Soma de centavos que nunca passa do maior inteiro seguro (evita total impreciso com dados absurdos).
export const addCents = (a, b) => Math.min(Number.MAX_SAFE_INTEGER, a + b);
export const MAX_ITEMS = 2000;
export const MAX_NAME = 80;

export const SHOPPING_CATEGORIES = [
  "Hortifrúti",
  "Carnes e peixes",
  "Frios e laticínios",
  "Padaria",
  "Mercearia",
  "Bebidas",
  "Congelados",
  "Limpeza",
  "Higiene",
  "Pet",
  "Outros",
];

// Valida e normaliza o que veio do backup. `undefined` = o backup não traz lista.
export function sanitizeShoppingItems(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > MAX_ITEMS) throw Error("Backup inválido: shoppingItems");
  const ids = new Set();
  return value.map((i) => {
    if (!i || typeof i.id !== "string" || ids.has(i.id)) throw Error("Identificadores inválidos: shoppingItems");
    ids.add(i.id);
    if (typeof i.name !== "string" || !i.name.trim() || i.name.length > MAX_NAME)
      throw Error("Item de compras inválido.");
    if (!Number.isFinite(i.qty) || i.qty <= 0 || i.qty > 9999) throw Error("Item de compras inválido.");
    if (i.priceCents != null && !(Number.isSafeInteger(i.priceCents) && i.priceCents > 0 && i.priceCents <= 99999999999))
      throw Error("Item de compras inválido.");
    return {
      id: i.id,
      listId: MAIN_LIST,
      name: i.name.trim(),
      qty: i.qty,
      unit: ["", "g", "kg", "ml", "l"].includes(i.unit) ? i.unit : "",
      priceCents: i.priceCents ?? null,
      category: SHOPPING_CATEGORIES.includes(i.category) ? i.category : "Outros",
      inCart: i.inCart === true,
      createdAt: Number.isFinite(i.createdAt) ? i.createdAt : 0,
    };
  });
}

// ---- Compras (notas) e produtos: histórico local da Lista de compras ----
export const MAX_PURCHASES = 5000;
export const MAX_PRODUCTS = 20000;
export const MAX_PURCHASE_ITEMS = 500;
export const MAX_PRICE_POINTS = 24;
export const PURCHASE_SOURCES = ["manual", "nfce"];
const UNITS = ["", "g", "kg", "ml", "l"];

const isCents = (n) => Number.isSafeInteger(n) && n > 0 && n <= 99999999999;
export const isIsoDate = (s) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Valida e normaliza `shoppingPurchases` do backup. `undefined` = o backup não traz compras.
export function sanitizePurchases(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > MAX_PURCHASES) throw Error("Backup inválido: shoppingPurchases");
  const ids = new Set();
  const chaves = new Set();
  return value.map((p) => {
    if (!p || typeof p.id !== "string" || ids.has(p.id)) throw Error("Identificadores inválidos: shoppingPurchases");
    ids.add(p.id);
    if (!isIsoDate(p.date)) throw Error("Compra inválida: data.");
    if (!isCents(p.totalCents)) throw Error("Compra inválida: total.");
    const chave = p.chave === undefined || p.chave === "" ? "" : String(p.chave);
    if (chave && !isChave(chave)) throw Error("Compra inválida: chave.");
    if (chave && chaves.has(chave)) throw Error("Compra repetida: mesma nota fiscal.");
    if (chave) chaves.add(chave);
    const cnpj = p.cnpj === undefined || p.cnpj === "" ? "" : String(p.cnpj);
    if (cnpj && !/^\d{14}$/.test(cnpj)) throw Error("Compra inválida: CNPJ.");
    if (!Array.isArray(p.items) || p.items.length === 0 || p.items.length > MAX_PURCHASE_ITEMS)
      throw Error("Compra inválida: itens.");
    const items = p.items.map((i) => {
      const name = text(i?.name, MAX_NAME);
      if (!name) throw Error("Compra inválida: item sem nome.");
      if (!Number.isFinite(i.qty) || i.qty <= 0 || i.qty > 99999) throw Error("Compra inválida: quantidade.");
      if (!isCents(i.totalCents)) throw Error("Compra inválida: valor do item.");
      if (i.unitPriceCents != null && !isCents(i.unitPriceCents)) throw Error("Compra inválida: preço do item.");
      return {
        name,
        rawName: text(i.rawName, 120),
        qty: i.qty,
        unit: UNITS.includes(i.unit) ? i.unit : "",
        unitPriceCents: i.unitPriceCents ?? null,
        totalCents: i.totalCents,
        productId: typeof i.productId === "string" ? i.productId : "",
      };
    });
    return {
      id: p.id,
      date: p.date,
      marketName: text(p.marketName, MAX_NAME),
      cnpj,
      chave,
      source: PURCHASE_SOURCES.includes(p.source) ? p.source : "manual",
      totalCents: p.totalCents,
      items,
      transactionId: typeof p.transactionId === "string" ? p.transactionId : "",
      createdAt: Number.isFinite(p.createdAt) ? p.createdAt : 0,
    };
  });
}

// Valida e normaliza `shoppingProducts` do backup. `undefined` = o backup não traz produtos.
export function sanitizeProducts(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > MAX_PRODUCTS) throw Error("Backup inválido: shoppingProducts");
  const ids = new Set();
  const keys = new Set();
  return value.map((p) => {
    if (!p || typeof p.id !== "string" || ids.has(p.id)) throw Error("Identificadores inválidos: shoppingProducts");
    ids.add(p.id);
    const key = text(p.key, 120);
    const name = text(p.name, MAX_NAME);
    if (!key || !name) throw Error("Produto inválido.");
    if (keys.has(key)) throw Error("Produto repetido.");
    keys.add(key);
    const ean = p.ean === undefined || p.ean === "" ? "" : String(p.ean);
    if (ean && !/^\d{8,14}$/.test(ean)) throw Error("Produto inválido: código de barras.");
    if (p.lastPriceCents != null && !isCents(p.lastPriceCents)) throw Error("Produto inválido: preço.");
    if (!Array.isArray(p.prices) || p.prices.length > MAX_PRICE_POINTS) throw Error("Produto inválido: histórico.");
    const prices = p.prices.map((x) => {
      if (!x || !isIsoDate(x.date) || !isCents(x.priceCents)) throw Error("Produto inválido: histórico.");
      if (typeof x.purchaseId !== "string" || !x.purchaseId) throw Error("Produto inválido: ponto do histórico sem compra.");
      return { date: x.date, priceCents: x.priceCents, purchaseId: x.purchaseId };
    });
    if (!Number.isInteger(p.buys) || p.buys < 0 || p.buys > 1000000) throw Error("Produto inválido: compras.");
    if (p.lastBoughtAt !== "" && p.lastBoughtAt !== undefined && !isIsoDate(p.lastBoughtAt))
      throw Error("Produto inválido: data.");
    return {
      id: p.id,
      key,
      name,
      ean,
      unit: UNITS.includes(p.unit) ? p.unit : "",
      category: SHOPPING_CATEGORIES.includes(p.category) ? p.category : "Outros",
      lastPriceCents: p.lastPriceCents ?? null,
      prices,
      buys: p.buys,
      lastBoughtAt: p.lastBoughtAt || "",
    };
  });
}
