import { itemsOf } from "./shopping.mjs";
import { productsOf, purchasesOf } from "./shoppingPurchases.mjs";
import { normalizeSearchText } from "./shoppingSearch.mjs";

const day = 86_400_000;
const time = (value) => typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) : NaN;

export function completeQuantity(text) {
  const value = typeof text === "string" ? text.trimStart() : "";
  const match = /^(\d+(?:[.,]\d+)?)(?:\s*[x×]\s*|\s+)(.*)$/iu.exec(value);
  if (!match) return { qty: 1, prefix: value.trim() };
  const qty = Number(match[1].replace(",", "."));
  if (!Number.isFinite(qty) || qty <= 0 || qty > 9999) return { qty: 1, prefix: value.trim() };
  return { qty, prefix: match[2].trim() };
}

export function suggestNames(state, prefix, { limit = 6, now } = {}) {
  if (typeof prefix !== "string" || prefix.length > 80 || !Number.isInteger(limit) || limit <= 0) return [];
  const needle = normalizeSearchText(completeQuantity(prefix).prefix);
  if (!needle) return [];
  const current = new Set(itemsOf(state).filter((item) => !Number.isFinite(item.deletedAt))
    .map((item) => normalizeSearchText(item.name)));
  const events = new Map();
  const candidates = new Map();
  const anchor = time(now);
  const observe = (name, date, frequency) => {
    const key = normalizeSearchText(name);
    if (!key.startsWith(needle) || current.has(key)) return;
    const raw = time(date);
    const observed = Number.isFinite(raw) && (!Number.isFinite(anchor) || raw <= anchor) ? raw : -Infinity;
    const previous = candidates.get(key);
    candidates.set(key, {
      name: !previous || observed > previous.observed || observed === previous.observed && name < previous.name ? name : previous.name,
      observed: Math.max(previous?.observed ?? -Infinity, observed),
      frequency: Math.max(previous?.frequency ?? 0, frequency || 0),
    });
  };
  for (const product of productsOf(state)) observe(product.name, product.lastBoughtAt, product.buys);
  const observedPurchases = new Map();
  for (const purchase of purchasesOf(state)) {
    const seen = new Set();
    for (const item of purchase.items ?? []) {
      const key = normalizeSearchText(item.name);
      if (!key.startsWith(needle) || current.has(key) || seen.has(key)) continue;
      seen.add(key);
      const count = (observedPurchases.get(key) ?? 0) + 1;
      observedPurchases.set(key, count);
      observe(item.name, purchase.date, count);
    }
  }
  for (const item of state.shoppingRecentItems ?? []) observe(item.name, item.updatedAt ?? item.createdAt, 1);
  for (const event of state.shoppingNameEvents ?? []) {
    if (event.type !== "add" && event.type !== "remove") continue;
    const key = normalizeSearchText(event.name);
    if (!key.startsWith(needle) || current.has(key)) continue;
    if (!events.has(key)) events.set(key, []);
    events.get(key).push(event);
    if (event.type === "add") observe(event.name, event.at, 1);
  }
  const score = (candidate) => {
    const age = Number.isFinite(anchor) ? Math.max(0, (anchor - candidate.observed) / day) : Infinity;
    return 100 / (1 + age / 14) + Math.min(12, Math.log2(1 + Math.max(0, candidate.frequency)) * 2);
  };
  return [...candidates].filter(([key]) => {
    const recent = events.get(key);
    if (!recent || recent.length < 3) return true;
    const last = recent.slice().reverse().sort((a, b) => (time(b.at) || 0) - (time(a.at) || 0)).slice(0, 3);
    return !last.every((event) => event.type === "remove");
  }).map(([, candidate]) => ({ ...candidate, score: score(candidate) }))
    .sort((a, b) => b.score - a.score || (a.observed === b.observed ? 0 : b.observed - a.observed) || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, limit).map(({ name }) => name);
}
