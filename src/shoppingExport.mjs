import { brDate } from "./dates.mjs";
import { isChave } from "./nfce.mjs";
import { itemsOf, lineTotal } from "./shopping.mjs";
import { MAX_NAME, MAX_PURCHASES, MAX_PURCHASE_ITEMS, PURCHASE_SOURCES } from "./shoppingData.mjs";
import { purchasesOf } from "./shoppingPurchases.mjs";

const maxJsonBytes = 16 * 1024 * 1024;
const units = ["", "g", "kg", "ml", "l"];

function cell(value) {
  let text = String(value ?? "");
  if (/^[\s\u0000-\u001F\u007F\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r]/u.test(text)) text = "'" + text;
  return /[;"\r\n\t]/u.test(text) ? '"' + text.replace(/"/gu, '""') + '"' : text;
}

function csv(rows) {
  return "\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n") + "\r\n";
}

function reais(cents) {
  if (!Number.isSafeInteger(cents)) return "";
  const value = BigInt(cents);
  const absolute = value < 0n ? -value : value;
  return (value < 0n ? "-" : "") + absolute / 100n + "," + String(absolute % 100n).padStart(2, "0");
}

const decimal = (qty) => String(qty ?? "").replace(".", ",");

export function listToCsv(state) {
  return csv([
    ["Item", "Quantidade", "Unidade", "Categoria", "No carrinho", "Preço (R$)", "Total (R$)"],
    ...itemsOf(state).map((item) => [
      item.name, decimal(item.qty), item.unit, item.category, item.inCart ? "Sim" : "Não",
      reais(item.priceCents), reais(lineTotal(item)),
    ]),
  ]);
}

export function purchasesToCsv(state) {
  const rows = [["Data", "Loja", "Compra", "Total da compra (R$)", "Item", "Quantidade", "Unidade", "Preço unitário (R$)", "Total do item (R$)"]];
  for (const purchase of purchasesOf(state)) {
    for (const item of purchase.items) {
      rows.push([
        brDate(purchase.date), purchase.marketName, purchase.id, reais(purchase.totalCents),
        item.name, decimal(item.qty), item.unit, reais(item.unitPriceCents), reais(item.totalCents),
      ]);
    }
  }
  return csv(rows);
}

const object = (value) => value != null && typeof value === "object" && !Array.isArray(value);
const bounded = (value, length) => typeof value === "string" && value.length <= length;
const named = (value, length) => bounded(value, length) && value.trim().length > 0;
const cents = (value) => Number.isSafeInteger(value) && value > 0 && value <= 99999999999;
const optional = (value, validate) => value === undefined || validate(value);
const digitsOrEmpty = (value, digits) => typeof value === "string" &&
  (value === "" || (value.length === digits && !/\D/u.test(value)));

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validItem(item) {
  return object(item) && named(item.name, MAX_NAME) && optional(item.rawName, (value) => bounded(value, 120)) &&
    Number.isFinite(item.qty) && item.qty > 0 && item.qty <= 99999 &&
    optional(item.unit, (value) => units.includes(value)) && cents(item.totalCents) &&
    optional(item.unitPriceCents, (value) => value === null || cents(value)) &&
    optional(item.productId, (value) => bounded(value, 256));
}

function validatePurchases(purchases) {
  if (!Array.isArray(purchases) || purchases.length > MAX_PURCHASES) throw Error("Histórico de compras inválido.");
  const ids = new Set();
  const keys = new Set();
  for (const purchase of purchases) {
    if (!object(purchase) || !named(purchase.id, 256) || ids.has(purchase.id))
      throw Error("Identificador de compra inválido ou repetido.");
    if (!validDate(purchase.date)) throw Error("Data da compra inválida.");
    if (!optional(purchase.marketName, (value) => bounded(value, MAX_NAME))) throw Error("Nome da loja inválido.");
    if (!cents(purchase.totalCents) || !optional(purchase.source, (value) => PURCHASE_SOURCES.includes(value)) ||
        !optional(purchase.createdAt, Number.isFinite) || !optional(purchase.transactionId, (value) => bounded(value, 256)))
      throw Error("Campos da compra inválidos.");
    if (!optional(purchase.cnpj, (value) => digitsOrEmpty(value, 14)) ||
        !optional(purchase.chave, (value) => digitsOrEmpty(value, 44) && (value === "" || isChave(value))) ||
        (purchase.chave && keys.has(purchase.chave))) throw Error("Identificação fiscal inválida ou repetida.");
    if (!Array.isArray(purchase.items) || !purchase.items.length || purchase.items.length > MAX_PURCHASE_ITEMS ||
        !purchase.items.every(validItem)) throw Error("Itens da compra inválidos.");
    ids.add(purchase.id);
    if (purchase.chave) keys.add(purchase.chave);
  }
}

function verifySize(text) {
  if (typeof text !== "string") throw Error("O histórico deve ser texto JSON.");
  let bytes = text.length;
  if (bytes <= maxJsonBytes && bytes * 3 > maxJsonBytes) {
    for (const character of text) {
      const code = character.codePointAt(0);
      bytes += code <= 0x7f ? 0 : code <= 0x7ff ? 1 : 2;
      if (bytes > maxJsonBytes) break;
    }
  }
  if (bytes > maxJsonBytes)
    throw Error("O histórico ultrapassa o limite de 16 MiB.");
}

export function purchasesToJson(state) {
  const purchases = purchasesOf(state);
  validatePurchases(purchases);
  const text = JSON.stringify({ schema: 1, purchases });
  verifySize(text);
  return text;
}

function hasReserved(value, depth = 0) {
  if (!value || typeof value !== "object") return false;
  if (depth > 12) return true;
  for (const key of Object.getOwnPropertyNames(value)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") return true;
    if (hasReserved(value[key], depth + 1)) return true;
  }
  return false;
}

export function parsePurchasesJson(text) {
  verifySize(text);
  let data;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/u, ""));
  } catch {
    throw Error("Histórico em JSON inválido.");
  }
  if (!object(data) || data.schema !== 1) throw Error("Versão do histórico incompatível.");
  if (hasReserved(data)) throw Error("O histórico traz campos reservados e não pode ser importado.");
  validatePurchases(data.purchases);
  return data.purchases;
}
