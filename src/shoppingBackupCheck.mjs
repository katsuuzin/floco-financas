import { MAX_ITEMS, MAX_NAME, MAX_PRICE_POINTS, MAX_PRODUCTS, MAX_PURCHASE_ITEMS, MAX_PURCHASES,
  PURCHASE_SOURCES, SHOPPING_CATEGORIES } from "./shoppingData.mjs";
import { safeIsChave, safeIsIsoDate } from "./hardened.mjs";

const maxBytes = 2 * 1024 * 1024;
const blocked = new Set(["__proto__", "constructor", "prototype"]);
const units = new Set(["", "kg", "g", "l", "ml"]);
const object = (value) => value !== null && typeof value === "object" &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const text = (value, max) => typeof value === "string" && value.length <= max;
const id = (value) => text(value, 256) && value.trim() !== "";
const cents = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 99_999_999_999;

function bytesOfJsonString(text) {
  let bytes = 2;
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code < 32) bytes += "\b\t\n\f\r".includes(char) ? 2 : 6;
    else if (char === '"' || char === "\\") bytes += 2;
    else if (code >= 0xd800 && code <= 0xdfff) bytes += 6;
    else bytes += code <= 127 ? 1 : code <= 2047 ? 2 : code <= 65535 ? 3 : 4;
    if (bytes > maxBytes) break;
  }
  return bytes;
}

function inspectJson(data, add) {
  let bytes = 0;
  const seen = new Set();
  function visit(value, path, depth) {
    if (bytes > maxBytes) return;
    if (value === null || typeof value === "boolean") { bytes += value === false ? 5 : 4; return; }
    if (typeof value === "string") { bytes += bytesOfJsonString(value); return; }
    if (Number.isFinite(value)) { bytes += String(value).length; return; }
    if (!Array.isArray(value) && !object(value)) {
      add(path, "tipo_json", "O campo não tem um tipo compatível com JSON.");
      return;
    }
    if (depth > 100 || seen.has(value)) {
      add(path, "estrutura_json", "O backup tem referência circular ou níveis demais.");
      return;
    }
    seen.add(value);
    bytes += 2;
    if (Array.isArray(value)) {
      bytes += Math.max(0, value.length - 1);
      for (let i = 0; i < value.length && bytes <= maxBytes; i++) {
        const field = path + "[" + i + "]";
        const descriptor = Object.getOwnPropertyDescriptor(value, i);
        if (!descriptor || !Object.hasOwn(descriptor, "value")) {
          add(field, "tipo_json", "A lista precisa conter dados em cada posição.");
          break;
        }
        visit(descriptor.value, field, depth + 1);
      }
    } else {
      let first = true;
      for (const key of Object.keys(value)) {
        const field = path ? path + "." + key : key;
        bytes += bytesOfJsonString(key) + (first ? 1 : 2);
        if (blocked.has(key)) add(field, "campo_reservado", "O backup contém um campo reservado.");
        else {
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          if (!Object.hasOwn(descriptor, "value")) add(field, "tipo_json", "O campo precisa conter dados.");
          else visit(descriptor.value, field, depth + 1);
        }
        if (bytes > maxBytes) break;
        first = false;
      }
    }
    seen.delete(value);
  }
  visit(data, "", 0);
  if (bytes > maxBytes) add("$", "tamanho", "O backup ultrapassa o limite de 2 MiB.");
}

export function checkShoppingBackup(data) {
  const errors = [];
  const warnings = [];
  const add = (path, code, message) => {
    if (errors.length < 200) errors.push({ path: path || "$", code, message });
  };
  const done = () => ({ ok: errors.length === 0, errors, warnings });
  if (!object(data)) {
    add("$", "tipo", "O backup deve ser um objeto.");
    return done();
  }
  inspectJson(data, add);
  if (errors.length) return done();

  const field = (row, path, name, valid, required = false, code = "campo") => {
    if ((required || Object.hasOwn(row, name)) && !valid(row[name]))
      add(path + "." + name, code, "Campo inválido: " + name + ".");
  };
  const sequence = (rows, path, limit, validate, identities) => {
    if (!Array.isArray(rows)) { add(path, "tipo", "O campo deve ser uma lista."); return; }
    if (rows.length > limit) { add(path, "limite", "A lista ultrapassa o limite de " + limit + " registros."); return; }
    rows.forEach((row, i) => {
      const at = path + "[" + i + "]";
      if (!object(row)) { add(at, "tipo", "O registro deve ser um objeto."); return; }
      if (identities) {
        field(row, at, "id", id, true, "id");
        if (identities.has(row.id)) add(at + ".id", "duplicado", "Identificador repetido.");
        if (id(row.id)) identities.add(row.id);
      }
      validate(row, at);
    });
  };
  const quantity = (max) => (value) => Number.isFinite(value) && value > 0 && value <= max;
  const name = (value) => text(value, MAX_NAME) && value.trim().length > 0;
  const products = new Set();
  const purchases = new Set();
  const keys = new Set();
  const fiscal = new Set();
  const productRefs = [];
  const purchaseRefs = [];
  if (Object.hasOwn(data, "shoppingItems")) sequence(data.shoppingItems, "shoppingItems", MAX_ITEMS, (row, at) => {
    field(row, at, "name", name, true);
    field(row, at, "qty", quantity(9999), true);
    field(row, at, "unit", (value) => units.has(value));
    field(row, at, "priceCents", (value) => value === null || cents(value));
    field(row, at, "category", (value) => SHOPPING_CATEGORIES.includes(value));
    field(row, at, "listId", id);
    field(row, at, "inCart", (value) => typeof value === "boolean");
    field(row, at, "createdAt", Number.isFinite);
    field(row, at, "updatedAt", Number.isFinite);
    field(row, at, "deletedAt", Number.isFinite);
  }, new Set());
  if (Object.hasOwn(data, "shoppingProducts")) sequence(data.shoppingProducts, "shoppingProducts", MAX_PRODUCTS, (row, at) => {
    field(row, at, "name", name, true);
    field(row, at, "key", (value) => text(value, 120) && value.trim().length > 0, true);
    if (keys.has(row.key)) add(at + ".key", "duplicado", "Chave de produto repetida.");
    if (typeof row.key === "string") keys.add(row.key);
    field(row, at, "unit", (value) => units.has(value));
    field(row, at, "category", (value) => SHOPPING_CATEGORIES.includes(value));
    field(row, at, "ean", (value) => value === "" || (typeof value === "string" && /^\d{8,14}$/u.test(value) && !/\D/u.test(value)));
    field(row, at, "lastPriceCents", (value) => value === null || cents(value));
    field(row, at, "lastBoughtAt", (value) => value === "" || safeIsIsoDate(value), false, "data");
    field(row, at, "buys", (value) => Number.isInteger(value) && value >= 0 && value <= 1_000_000, true);
    sequence(row.prices, at + ".prices", MAX_PRICE_POINTS, (point, pointAt) => {
      field(point, pointAt, "date", safeIsIsoDate, true, "data");
      field(point, pointAt, "priceCents", cents, true);
      if (!id(point.purchaseId)) add(pointAt + ".purchaseId", "orfao", "O ponto não tem uma compra de origem.");
      else purchaseRefs.push([pointAt + ".purchaseId", point.purchaseId]);
    });
  }, products);
  if (Object.hasOwn(data, "shoppingPurchases")) sequence(data.shoppingPurchases, "shoppingPurchases", MAX_PURCHASES, (row, at) => {
    field(row, at, "date", safeIsIsoDate, true, "data");
    field(row, at, "marketName", (value) => text(value, MAX_NAME));
    field(row, at, "source", (value) => PURCHASE_SOURCES.includes(value));
    field(row, at, "totalCents", cents, true);
    field(row, at, "cnpj", (value) => value === "" || (typeof value === "string" && value.length === 14 && !/\D/u.test(value)));
    field(row, at, "chave", (value) => value === "" || safeIsChave(value), false, "chave_fiscal");
    if (safeIsChave(row.chave)) {
      if (fiscal.has(row.chave)) add(at + ".chave", "duplicado", "Chave fiscal repetida.");
      fiscal.add(row.chave);
    }
    field(row, at, "transactionId", (value) => value === "" || id(value));
    field(row, at, "createdAt", Number.isFinite);
    if (Array.isArray(row.items) && !row.items.length) add(at + ".items", "limite", "A compra precisa ter pelo menos um item.");
    sequence(row.items, at + ".items", MAX_PURCHASE_ITEMS, (item, itemAt) => {
      field(item, itemAt, "name", name, true);
      field(item, itemAt, "rawName", (value) => text(value, 120));
      field(item, itemAt, "qty", quantity(99999), true);
      field(item, itemAt, "unit", (value) => units.has(value));
      field(item, itemAt, "totalCents", cents, true);
      field(item, itemAt, "unitPriceCents", (value) => value === null || cents(value));
      field(item, itemAt, "productId", (value) => value === "" || id(value));
      if (id(item.productId)) productRefs.push([itemAt + ".productId", item.productId]);
    });
  }, purchases);
  for (const [path, value] of productRefs) {
    if (!products.has(value)) add(path, "orfao", "O item faz referência a um produto ausente.");
  }
  for (const [path, value] of purchaseRefs) {
    if (!purchases.has(value)) add(path, "orfao", "O ponto faz referência a uma compra ausente.");
  }
  for (const field of ["shoppingItems", "shoppingProducts", "shoppingPurchases"]) {
    if (!Object.hasOwn(data, field)) warnings.push("O backup não traz " + field + ".");
  }
  return done();
}
