import { itemsOf, lineTotal } from "./shopping.mjs";
import { purchasesOf } from "./shoppingPurchases.mjs";

export const normalizeSearchText = (value) => typeof value === "string" ?
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/gu, " ") : "";

function oneEdit(a, b) {
  const left = [...a];
  const right = [...b];
  if (Math.abs(left.length - right.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (left.length >= right.length) i++;
    if (right.length >= left.length) j++;
  }
  return edits + (left.length - i) + (right.length - j) <= 1;
}

function rank(text, query, terms) {
  if (!query) return 0;
  if (text === query) return 100;
  if (text.startsWith(query)) return 80;
  if (text.includes(query)) return 60;
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  let score = 0;
  for (const term of terms) {
    if (text.includes(term)) score += 3;
    else if (/^\p{L}{5,}$/u.test(term) && words.some((word) => oneEdit(term, word))) score++;
    else return -1;
  }
  return score;
}

function search(values, query, getText, compareDate) {
  if (typeof query === "string" && query.length > 1024) return [];
  const normalized = normalizeSearchText(query);
  const terms = normalized.split(" ");
  return values.flatMap((row) => {
    const score = normalized ? rank(getText(row), normalized, terms) : 0;
    return score < 0 ? [] : [{ row, score }];
  }).sort((a, b) => b.score - a.score || compareDate(a.row, b.row)).map(({ row }) => row);
}

export function searchItems(state, query, { category, inCart, priced } = {}) {
  const group = normalizeSearchText(category);
  const filtered = itemsOf(state).filter((item) => (!group || normalizeSearchText(item.category) === group) &&
    (typeof inCart !== "boolean" || !!item.inCart === inCart) &&
    (typeof priced !== "boolean" || (lineTotal(item) !== null) === priced));
  return search(filtered, query, (item) => normalizeSearchText(item.name),
    (a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0));
}

export function searchPurchases(state, query, { store, from, to, minCents, maxCents } = {}) {
  if (from && to && from > to || Number.isFinite(minCents) && Number.isFinite(maxCents) && minCents > maxCents) return [];
  const market = normalizeSearchText(store);
  const filtered = purchasesOf(state).filter((purchase) =>
    (!market || normalizeSearchText(purchase.marketName) === market) &&
    (!from || purchase.date >= from) && (!to || purchase.date <= to) &&
    (!Number.isFinite(minCents) || purchase.totalCents >= minCents) &&
    (!Number.isFinite(maxCents) || purchase.totalCents <= maxCents));
  return search(filtered, query, (purchase) => normalizeSearchText([
    purchase.marketName, purchase.date, ...(purchase.items ?? []).map((item) => item.name),
  ].join(" ")), (a, b) => a.date === b.date ? (b.createdAt ?? 0) - (a.createdAt ?? 0) : a.date > b.date ? -1 : 1);
}
