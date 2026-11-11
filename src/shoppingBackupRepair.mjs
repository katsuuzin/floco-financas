import { checkShoppingBackup } from "./shoppingBackupCheck.mjs";
import { safeIsChave, safeIsIsoDate, safeProductKey, safeSum } from "./hardened.mjs";
import { MAX_ITEMS, MAX_NAME, MAX_PRICE_POINTS, MAX_PRODUCTS, MAX_PURCHASE_ITEMS,
  PURCHASE_SOURCES, SHOPPING_CATEGORIES } from "./shoppingData.mjs";

const omit = Symbol("campo inválido");
const blocked = new Set(["__proto__", "constructor", "prototype"]);
const units = ["", "g", "kg", "ml", "l"];
const record = (value) => value != null && typeof value === "object" && !Array.isArray(value);
const dateRank = (date) => safeIsIsoDate(date) ? Date.parse(date + "T00:00:00Z") : -Infinity;
const age = (row) => [row.updatedAt, row.createdAt, dateRank(row.date), dateRank(row.lastBoughtAt)]
  .find(Number.isFinite) ?? -Infinity;
const clippedText = (value, limit) => typeof value === "string" ? value.slice(0, limit).replace(/[\uD800-\uDBFF]$/u, "") : "";
const validId = (value) => typeof value === "string" && value.trim() !== "" && value.length <= 256;
const money = (value) => Number.isSafeInteger(value) ? Math.max(0, Math.min(value, 99_999_999_999)) : 0;

export function repairShoppingBackup(input) {
  if (checkShoppingBackup(input).ok) return { data: input, actions: [] };
  const actions = [];
  const note = (code, path, description) => actions.push({ code, path: path || "$", description });
  const ancestors = new Set();
  function clone(value, path, depth) {
    if (value === null || ["string", "boolean"].includes(typeof value) || Number.isFinite(value)) return value;
    const array = Array.isArray(value);
    if ((!array && (!record(value) || ![null, Object.prototype].includes(Object.getPrototypeOf(value)))) ||
        depth > 100 || ancestors.has(value)) {
      note("remover_estrutura", path, "Removida estrutura incompatível com JSON.");
      return omit;
    }
    const copy = array ? [] : {};
    ancestors.add(value);
    for (const key of Object.keys(value)) {
      const at = array ? path + "[" + key + "]" : path ? path + "." + key : key;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (blocked.has(key) || !Object.hasOwn(descriptor, "value")) {
        note("remover_campo", at, "Removido campo reservado ou sem dados.");
        continue;
      }
      const entry = clone(descriptor.value, at, depth + 1);
      if (entry !== omit) {
        if (array) copy.push(entry);
        else copy[key] = entry;
      }
    }
    ancestors.delete(value);
    return copy;
  }

  const copied = clone(input, "", 0);
  const data = record(copied) ? copied : {};
  if (!record(copied)) note("backup_vazio", "$", "Criado um objeto de backup vazio.");
  const change = (row, path, key, value, code = "normalizar") => {
    if (Object.is(row[key], value)) return;
    row[key] = value;
    note(code, path + "." + key, "Corrigido o campo " + key + ".");
  };
  const optional = (row, path, key, transform, code) => {
    if (Object.hasOwn(row, key)) change(row, path, key, transform(row[key]), code);
  };
  const trim = (row, at, field, limit) => optional(row, at, field, (value) => clippedText(value, limit), "cortar_texto");
  const read = (owner, field, at, apply) => {
    if (!Object.hasOwn(owner, field)) return undefined;
    if (!Array.isArray(owner[field])) {
      note("lista_invalida", at, "Substituída lista inválida por uma lista vazia.");
      return [];
    }
    return owner[field].flatMap((row, index) => {
      const path = at + "[" + index + "]";
      if (record(row) && apply(row, path)) return [{ row, path }];
      note("descartar_invalido", path, "Descartado registro sem informações suficientes.");
      return [];
    });
  };
  function unique(entries, keyOf, onDuplicate = () => {}) {
    const retained = new Map();
    for (const entry of entries) {
      const key = keyOf(entry.row);
      const previous = retained.get(key);
      if (!previous) { retained.set(key, entry); continue; }
      const newest = age(entry.row) >= age(previous.row) ? entry : previous;
      const discarded = newest === entry ? previous : entry;
      retained.set(key, newest);
      onDuplicate(discarded.row, newest.row);
      note("remover_duplicata", discarded.path, "Removida duplicata, mantendo o registro mais recente.");
    }
    return [...retained.values()];
  }
  function basic(row, at, max) {
    trim(row, at, "name", MAX_NAME);
    if (!row.name?.trim()) return false;
    if (!Number.isFinite(row.qty) || row.qty <= 0) change(row, at, "qty", 1);
    else if (row.qty > max) change(row, at, "qty", max);
    optional(row, at, "unit", (value) => units.includes(value) ? value : "");
    return true;
  }

  const list = read(data, "shoppingItems", "shoppingItems", (row, at) => {
    if (!validId(row.id) || !basic(row, at, 9999)) return false;
    optional(row, at, "priceCents", (value) => value === null ? null : money(value), "corrigir_preco");
    optional(row, at, "category", (value) => SHOPPING_CATEGORIES.includes(value) ? value : "Outros");
    optional(row, at, "listId", (value) => validId(value) ? value : "main");
    optional(row, at, "inCart", (value) => value === true);
    for (const field of ["createdAt", "updatedAt", "deletedAt"]) {
      if (Object.hasOwn(row, field) && !Number.isFinite(row[field])) {
        delete row[field];
        note("remover_campo", at + "." + field, "Removida marca de tempo inválida.");
      }
    }
    return true;
  });
  const purchases = read(data, "shoppingPurchases", "shoppingPurchases", (row, at) => {
    if (!validId(row.id) || !safeIsIsoDate(row.date)) return false;
    const lines = read(row, "items", at + ".items", (item, path) => {
      if (!basic(item, path, 99999)) return false;
      trim(item, path, "rawName", 120);
      optional(item, path, "productId", (value) => validId(value) ? value : "");
      optional(item, path, "unitPriceCents", (value) => value === null ? null : money(value), "corrigir_preco");
      change(item, path, "totalCents", money(item.totalCents), "corrigir_preco");
      return true;
    });
    if (!lines?.length) return false;
    if (lines.length > MAX_PURCHASE_ITEMS) return false;
    row.items = lines.map(({ row: item }) => item);
    trim(row, at, "marketName", MAX_NAME);
    optional(row, at, "cnpj", (value) => typeof value === "string" && value.length === 14 && !/\D/u.test(value) ? value : "");
    optional(row, at, "chave", (value) => safeIsChave(value) ? value : "", "corrigir_chave");
    optional(row, at, "source", (value) => PURCHASE_SOURCES.includes(value) ? value : "manual");
    optional(row, at, "transactionId", (value) => validId(value) ? value : "");
    optional(row, at, "createdAt", (value) => Number.isFinite(value) ? value : 0);
    const total = row.totalCents ?? safeSum(row.items.map((item) => item.totalCents));
    change(row, at, "totalCents", money(total), "corrigir_preco");
    return true;
  });
  const products = read(data, "shoppingProducts", "shoppingProducts", (row, at) => {
    if (!validId(row.id)) return false;
    trim(row, at, "name", MAX_NAME);
    if (!row.name?.trim()) return false;
    optional(row, at, "unit", (value) => units.includes(value) ? value : "");
    optional(row, at, "category", (value) => SHOPPING_CATEGORIES.includes(value) ? value : "Outros");
    optional(row, at, "ean", (value) => typeof value === "string" && /^\d{8,14}$/u.test(value) && !/\D/u.test(value) ? value : "");
    optional(row, at, "lastPriceCents", (value) => value === null ? null : money(value), "corrigir_preco");
    optional(row, at, "lastBoughtAt", (value) => safeIsIsoDate(value) ? value : "", "corrigir_data");
    change(row, at, "buys", Number.isInteger(row.buys) ? Math.min(1_000_000, Math.max(0, row.buys)) : 0);
    const key = clippedText(row.key, 120).trim() || safeProductKey(row.name, row.unit);
    change(row, at, "key", key);
    if (!Object.hasOwn(row, "prices")) change(row, at, "prices", []);
    return true;
  });

  const capped = (entries, limit) => {
    for (const { path } of entries.slice(limit)) note("limite", path, "Removido registro acima do limite da coleção.");
    return entries.slice(0, limit);
  };
  if (list) data.shoppingItems = capped(unique(list, (row) => row.id), MAX_ITEMS).map(({ row }) => row);

  const distinctPurchases = purchases ? unique(unique(purchases, (row) => row.id),
    (row) => row.chave ? "chave:" + row.chave : "id:" + row.id) : [];
  const purchaseIds = new Set(distinctPurchases.map(({ row }) => row.id));
  const productAliases = new Map();
  const distinctProducts = products ? capped(unique(unique(products, (row) => row.id), (row) => row.key,
    (removed, kept) => productAliases.set(removed.id, kept.id)), MAX_PRODUCTS) : [];
  const productIds = new Set(distinctProducts.map(({ row }) => row.id));
  for (const { row, path } of distinctProducts) {
    const pointsBefore = Array.isArray(row.prices) ? row.prices.length : 0;
    const points = read(row, "prices", path + ".prices", (point, at) => {
      if (!purchaseIds.has(point.purchaseId)) {
        note("descartar_orfao", at, "Removido ponto sem compra de origem.");
        return false;
      }
      if (!safeIsIsoDate(point.date)) return false;
      change(point, at, "priceCents", money(point.priceCents), "corrigir_preco");
      return true;
    });
    if (points.length > MAX_PRICE_POINTS) points.sort((a, b) => b.row.date.localeCompare(a.row.date));
    row.prices = capped(points, MAX_PRICE_POINTS).map(({ row: point }) => point);
    if (row.prices.length && row.prices.length < pointsBefore) {
      const latest = row.prices.reduce((a, b) => (b.date >= a.date ? b : a));
      if (row.lastBoughtAt !== latest.date || row.lastPriceCents !== latest.priceCents) {
        row.lastBoughtAt = latest.date;
        row.lastPriceCents = latest.priceCents;
        note("recalcular_ultimo_preco", path, "Último preço recalculado a partir do histórico que restou.");
      }
    }
  }
  for (const { row, path } of distinctPurchases) {
    row.items.forEach((item, index) => {
      if (!item.productId) return;
      let productId = item.productId;
      while (productAliases.has(productId)) productId = productAliases.get(productId);
      change(item, path + ".items[" + index + "]", "productId", productIds.has(productId) ? productId : "", "corrigir_vinculo");
    });
  }
  if (purchases) data.shoppingPurchases = distinctPurchases.map(({ row }) => row);
  if (products) data.shoppingProducts = distinctProducts.map(({ row }) => row);
  const remaining = checkShoppingBackup(data);
  if (!remaining.ok) note("revisao_manual", remaining.errors[0].path,
    "O backup ainda excede um limite. Divida o arquivo para preservar as compras válidas.");
  return { data, actions };
}
