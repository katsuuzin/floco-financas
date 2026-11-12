// Constantes e validação da lista de compras. Só importa nfce.mjs (sem dependências), para o backup (finance.mjs)
// poder validar a lista sem dependência circular com shopping.mjs.
import { isChave } from "./nfce.mjs";
import { validateDeal } from "./shoppingDeals.mjs";
export const MAIN_LIST = "main";
// Soma de centavos que nunca passa do maior inteiro seguro (evita total impreciso com dados absurdos).
export const addCents = (a, b) => Math.min(Number.MAX_SAFE_INTEGER, a + b);
export const MAX_ITEMS = 2000;
export const MAX_NAME = 80;

// Ordem de exibição (perto da ordem de um mercado). As 11 primeiras versões continuam com o mesmo nome:
// itens antigos não mudam de categoria. As novas entraram na 1.12 (Frutas, Matinais, Doces e lanches,
// Bebidas alcoólicas, Farmácia, Bebê, Casa e utilidades).
export const SHOPPING_CATEGORIES = [
  "Hortifrúti",
  "Frutas",
  "Carnes e peixes",
  "Frios e laticínios",
  "Padaria",
  "Matinais",
  "Mercearia",
  "Doces e lanches",
  "Bebidas",
  "Bebidas alcoólicas",
  "Congelados",
  "Limpeza",
  "Higiene",
  "Farmácia",
  "Bebê",
  "Pet",
  "Casa e utilidades",
  "Outros",
];

// Cores de lista (chaves; os tons ficam no tema, claro e escuro).
export const LIST_COLORS = ["amarelo", "areia", "terracota", "oliva", "petroleo", "ameixa", "grafite"];
// Estados do item além de pendente / no carrinho: faltou no mercado, ou fica para outra compra.
export const ITEM_STATUSES = ["missing", "later"];
export const MAX_DETAILS = 120;
const PHOTO_NAME = /^[A-Za-z0-9_-]{1,100}\.jpg$/u;

// Campos opcionais do item (1.12). Ausentes = comportamento antigo.
function optionalItemFields(i, unit, inCart) {
  const out = {};
  if (!inCart && ITEM_STATUSES.includes(i.status)) out.status = i.status;
  if (inCart && Number.isFinite(i.cartAt) && i.cartAt > 0) out.cartAt = i.cartAt;
  if (i.pricePer === "kg" && (unit === "g" || unit === "kg")) out.pricePer = "kg";
  const details = typeof i.details === "string" ? i.details.trim().slice(0, MAX_DETAILS) : "";
  if (details) out.details = details;
  if (typeof i.photo === "string" && PHOTO_NAME.test(i.photo)) out.photo = i.photo;
  return out;
}

export function sanitizeItemDeal(deal) {
  if (!validateDeal(deal).ok) return undefined;
  if (deal.type === "percent") return { type: deal.type, value: deal.value };
  if (deal.type === "buyXPayY") return { type: deal.type, x: deal.x, y: deal.y };
  return { type: deal.type, cents: deal.cents };
}

const recurringDays = (n) => Number.isInteger(n) && n >= 1 && n <= 365;
const recurringFields = (item) => item.staple === true && recurringDays(item.everyDays) ?
  { staple: true, everyDays: item.everyDays } : {};

export function sanitizeShoppingStaples(value, lists) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  const ids = new Set();
  return value.slice(0, MAX_ITEMS).flatMap((row) => {
    if (!row || !row.staple || ids.has(row.id)) return [];
    try {
      const [{ status, cartAt, photo, ...item }] = sanitizeShoppingItems([row], lists);
      if (!item.staple) return [];
      ids.add(item.id);
      return [{ ...item, inCart: false, ...(isIsoDate(row.lastRestockedAt) ? { lastRestockedAt: row.lastRestockedAt } : {}) }];
    } catch { return []; }
  });
}

const safeListId = (id) => typeof id === "string" && id.length <= 100 && /^[\p{L}\p{N}_-]+$/u.test(id) &&
  !["__proto__", "constructor", "prototype"].includes(id);

export function sanitizeShoppingLists(value) {
  if (!Array.isArray(value)) return undefined;
  const ids = new Set();
  const names = new Set();
  const lists = value.slice(0, 100).flatMap((row) => {
    const name = typeof row?.name === "string" ? row.name.trim() : "";
    const normalized = name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
    if (!safeListId(row?.id) || !name || name.length > 60 || ids.has(row.id) || names.has(normalized)) return [];
    ids.add(row.id);
    names.add(normalized);
    return [{ id: row.id, name, archived: row.archived === true, ...(LIST_COLORS.includes(row.color) ? { color: row.color } : {}) }];
  });
  if (lists.length && !lists.some((list) => !list.archived)) lists[0].archived = false;
  return lists.length ? lists : undefined;
}

export function sanitizeShoppingTemplates(value) {
  if (value === undefined) return undefined;
  const ids = new Set();
  return (Array.isArray(value) ? value : []).slice(0, 20).flatMap((row) => {
    const name = typeof row?.name === "string" ? row.name.trim() : "";
    if (!safeListId(row?.id) || !name || name.length > 60 || ids.has(row.id) || !Array.isArray(row.items)) return [];
    ids.add(row.id);
    const items = row.items.slice(0, MAX_ITEMS).flatMap((item, index) => {
      try {
        const [{ name, qty, unit, priceCents, category }] = sanitizeShoppingItems([{ ...item, id: String(index) }]);
        return [{ name, qty, unit, priceCents, category }];
      } catch { return []; }
    });
    return [{ id: row.id, name, items }];
  });
}

// Valida e normaliza o que veio do backup. `undefined` = o backup não traz lista.
export function sanitizeShoppingItems(value, lists) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > MAX_ITEMS) throw Error("A lista de compras deste backup é inválida. Escolha outro arquivo.");
  const ids = new Set();
  return value.map((i) => {
    if (!i || typeof i.id !== "string" || ids.has(i.id)) throw Error("Identificadores inválidos: shoppingItems");
    ids.add(i.id);
    if (typeof i.name !== "string" || !i.name.trim() || i.name.length > MAX_NAME)
      throw Error("Item de compras inválido.");
    if (!Number.isFinite(i.qty) || i.qty <= 0 || i.qty > 9999) throw Error("Item de compras inválido.");
    if (i.priceCents != null && !(Number.isSafeInteger(i.priceCents) && i.priceCents > 0 && i.priceCents <= 99999999999))
      throw Error("Item de compras inválido.");
    const deal = sanitizeItemDeal(i.deal);
    return {
      id: i.id,
      listId: lists?.some((list) => list.id === i.listId) ? i.listId : lists?.find((list) => !list.archived)?.id ?? MAIN_LIST,
      ...recurringFields(i),
      ...(deal ? { deal } : {}),
      name: i.name.trim(),
      qty: i.qty,
      unit: ["", "g", "kg", "ml", "l"].includes(i.unit) ? i.unit : "",
      priceCents: i.priceCents ?? null,
      category: SHOPPING_CATEGORIES.includes(i.category) ? i.category : "Outros",
      inCart: i.inCart === true,
      createdAt: Number.isFinite(i.createdAt) ? i.createdAt : 0,
      ...optionalItemFields(i, ["", "g", "kg", "ml", "l"].includes(i.unit) ? i.unit : "", i.inCart === true),
    };
  });
}

// Ordem das listas e divisores (grupos). `undefined` = sem ordem própria (vale a ordem das listas).
// Entradas de lista que não existem são descartadas; repetidas também.
export const MAX_DIVIDER = 40;
export function sanitizeShoppingLayout(value, lists) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  const known = new Set((lists || []).map((list) => list.id));
  const seen = new Set();
  return value.slice(0, 300).flatMap((row) => {
    if (!row || !safeListId(row.id) || seen.has(row.id)) return [];
    if (row.kind === "list" && known.has(row.id)) {
      seen.add(row.id);
      return [{ kind: "list", id: row.id }];
    }
    const name = typeof row.name === "string" ? row.name.trim().slice(0, MAX_DIVIDER) : "";
    if (row.kind === "divider" && name && !known.has(row.id)) {
      seen.add(row.id);
      return [{ kind: "divider", id: row.id, name }];
    }
    return [];
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
  if (!Array.isArray(value) || value.length > MAX_PURCHASES) throw Error("O histórico de compras deste backup é inválido. Escolha outro arquivo.");
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
  if (!Array.isArray(value) || value.length > MAX_PRODUCTS) throw Error("O catálogo deste backup é inválido. Escolha outro arquivo.");
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
