import { chaveDv, parseNfceInput } from "./nfce.mjs";

export function safeIsIsoDate(value) {
  if (typeof value !== "string" || value.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function safeCentsFromBr(value) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/^R\$\s*/u, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/u.test(text)) return null;
  const [whole, fraction = ""] = text.replace(/\./gu, "").split(",");
  const digits = (whole + fraction.padEnd(2, "0")).replace(/^0+(?=\d)/u, "");
  if (digits.length > 16) return null;
  const result = Number(digits);
  return Number.isSafeInteger(result) ? result : null;
}

export const safeHasUf = (map, uf) => map != null && typeof uf === "string" && Object.hasOwn(map, uf);

export function safeIsChave(value) {
  return typeof value === "string" && value.length === 44 && /^\d{44}$/u.test(value) &&
    chaveDv(value.slice(0, 43)) === Number(value[43]);
}

export function safeParseNfceInput(input) {
  if (typeof input !== "string") throw Error("Use o texto do QR ou a chave da nota.");
  const text = input.trim();
  if (text.length <= 2000 && /^https?:\/\//iu.test(text)) {
    let url;
    try { url = new URL(text); } catch { throw Error("O endereço do QR não é válido."); }
    if (url.searchParams.getAll("p").length > 1) throw Error("O QR contém mais de um parâmetro p.");
  }
  return parseNfceInput(input);
}

export function safeLineTotal(item) {
  if (!Number.isSafeInteger(item?.priceCents) || item.priceCents < 0) return null;
  if (item.unit) return item.priceCents;
  if (!Number.isFinite(item.qty) || item.qty <= 0) return null;
  const total = item.priceCents * item.qty;
  return Number.isSafeInteger(total) ? total : null;
}

export function safeSum(values) {
  if (values == null || typeof values[Symbol.iterator] !== "function") return null;
  let total = 0n;
  for (const value of values) {
    if (!Number.isSafeInteger(value)) return null;
    total += BigInt(value);
  }
  const result = Number(total);
  return Number.isSafeInteger(result) ? result : null;
}

export function safeProductKey(name, unit = "") {
  const normalized = String(name ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/(\d)[.,](?=\d)/gu, "$1,")
    .replace(/[^\p{L}\p{N}]|,/gu, (character, index, text) =>
      character === "," && /\d/u.test(text[index - 1] ?? "") && /\d/u.test(text[index + 1] ?? "") ? "," : " ")
    .replace(/\s+/gu, " ").trim();
  return normalized + "|" + unit;
}

export function safePriceTrend(product) {
  const prices = (Array.isArray(product?.prices) ? product.prices : [])
    .filter((point) => safeIsIsoDate(point?.date) && Number.isSafeInteger(point.priceCents) && point.priceCents >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const from = prices.at(-2)?.priceCents ?? null;
  const to = prices.at(-1)?.priceCents ?? null;
  if (!from) return { dir: "none", pct: 0, from, to };
  return { dir: to > from ? "up" : to < from ? "down" : "same",
    pct: Math.round(Math.abs((to - from) / from) * 1000) / 10, from, to };
}
