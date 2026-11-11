import { applyFilters, emptyFilters } from "./tx-filters.mjs";
import { money } from "./finance.mjs";
import { normalizeSearchText } from "./shoppingSearch.mjs";

const kinds = new Map([["expense", "Despesas"], ["income", "Receitas"], ["transfer", "Transferências"]]);
const reserved = new Set(["__proto__", "constructor", "prototype"]);
const own = (value, key) => value && typeof value === "object" && Object.hasOwn(value, key) ? value[key] : undefined;
const ids = (value) => [...new Set((Array.isArray(value) ? value : []).filter((entry) =>
  typeof entry === "string" && entry.trim() && !reserved.has(entry)))];
const validCents = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
const textOf = (value) => typeof value === "string" ? value.trim().slice(0, 200) : "";

export function sanitizeFilter(raw) {
  let minCents = validCents(own(raw, "minCents"));
  let maxCents = validCents(own(raw, "maxCents"));
  if (minCents !== null && maxCents !== null && minCents > maxCents) [minCents, maxCents] = [maxCents, minCents];
  return { accountIds: ids(own(raw, "accountIds")), tagIds: ids(own(raw, "tagIds")), minCents, maxCents,
    types: ids(own(raw, "types")).filter((type) => kinds.has(type)), text: textOf(own(raw, "text")) };
}

const count = (f) => Number(f.accountIds.length > 0) + Number(f.tagIds.length > 0) +
  Number(f.minCents !== null || f.maxCents !== null) + Number(f.types.length > 0) + Number(!!f.text);
export const activeFilterCount = (filter) => count(sanitizeFilter(filter));

function amountText(cents) {
  if (cents === null) return "";
  const value = BigInt(cents);
  return value / 100n + "," + String(value % 100n).padStart(2, "0");
}

export function applyStatementFilter(transactions, filter) {
  const rows = Array.isArray(transactions) ? transactions : [];
  const f = sanitizeFilter(filter);
  if (!count(f)) return rows;
  const needle = normalizeSearchText(f.text);
  const options = { ...emptyFilters(), sources: f.accountIds.map((id) => "a:" + id), tags: f.tagIds,
    min: amountText(f.minCents), max: amountText(f.maxCents) };
  const range = f.minCents !== null || f.maxCents !== null;
  const selected = [];
  for (const row of rows) {
    if (!row || typeof row !== "object" || f.types.length && !f.types.includes(row.type)) continue;
    if (range && !Number.isSafeInteger(row.amount)) continue;
    if (needle && !normalizeSearchText([row.description, row.category, row.subcategory, row.notes]
      .filter((text) => typeof text === "string").join(" ")).includes(needle)) continue;
    selected.push({ ...row, cardId: null, amount: Math.abs(row.amount ?? 0),
      tags: Array.isArray(row.tags) ? row.tags : [], row });
  }
  return applyFilters(selected, options).map(({ row }) => row);
}

export function describeFilter(filter, { accounts, tags } = {}) {
  const f = sanitizeFilter(filter);
  const names = (list, selected, fallback) => {
    const labels = new Map((Array.isArray(list) ? list : []).map((row) => [row?.id, row?.name]));
    const found = selected.map((id) => labels.get(id)).filter(Boolean);
    return found.length === selected.length && found.length <= 2 ? found.join(", ") : selected.length + " " + fallback;
  };
  const parts = [];
  if (f.accountIds.length) parts.push(names(accounts, f.accountIds, f.accountIds.length === 1 ? "conta" : "contas"));
  if (f.tagIds.length) parts.push(names(tags, f.tagIds, f.tagIds.length === 1 ? "etiqueta" : "etiquetas"));
  if (f.minCents !== null && f.maxCents !== null) parts.push(money(f.minCents) + " a " + money(f.maxCents));
  else if (f.minCents !== null) parts.push("A partir de " + money(f.minCents));
  else if (f.maxCents !== null) parts.push("Até " + money(f.maxCents));
  if (f.types.length) parts.push(f.types.map((type) => kinds.get(type)).join(", "));
  if (f.text) parts.push("Busca por “" + f.text.slice(0, 40) + (f.text.length > 40 ? "…" : "") + "”");
  return parts.join(" · ");
}
