import { itemsOf, lineTotal } from "./shopping.mjs";
import { SHOPPING_CATEGORIES } from "./shoppingData.mjs";

const CATEGORY_ORDER = new Map(SHOPPING_CATEGORIES.map((category, index) => [category, index]));
const categoryOrder = (category) => CATEGORY_ORDER.get(category) ?? CATEGORY_ORDER.size;

export function tripSummary(state, { startedAt, now } = {}) {
  const items = itemsOf(state);
  let inCartCount = 0;
  let cartCents = 0;
  let cartUnpriced = 0;
  let pendingEstimateCents = 0;
  let pendingUnpriced = 0;

  for (const item of items) {
    const cents = lineTotal(item);
    if (item.inCart) {
      inCartCount++;
      if (cents === null) cartUnpriced++;
      else cartCents += cents;
    } else if (cents === null) {
      pendingUnpriced++;
    } else {
      pendingEstimateCents += cents;
    }
  }
  const total = items.length;
  const duration = Number.isFinite(startedAt) && Number.isFinite(now) ? now - startedAt : NaN;
  return {
    total,
    inCartCount,
    pendingCount: total - inCartCount,
    progress: total ? inCartCount / total : 0,
    cartCents,
    cartUnpriced,
    pendingEstimateCents,
    pendingUnpriced,
    grandEstimateCents: cartCents + pendingEstimateCents,
    elapsedMinutes: Number.isFinite(duration) && duration >= 0 ? Math.floor(duration / 60_000) : 0,
  };
}

export function formatElapsed(minutes) {
  if (!Number.isFinite(minutes) || minutes < 1) return "menos de 1 min";
  const whole = Math.floor(minutes);
  if (whole < 60) return `${whole} min`;
  return `${Math.floor(whole / 60)} h ${String(whole % 60).padStart(2, "0")} min`;
}

function sortedPending(state) {
  return itemsOf(state).filter((item) => !item.inCart).sort((a, b) =>
    categoryOrder(a.category) - categoryOrder(b.category) || a.name.localeCompare(b.name, "pt-BR"));
}

export function nextToGet(state, { limit = 5 } = {}) {
  if (limit <= 0) return [];
  return sortedPending(state).slice(0, limit).map(({ id, name, qty, unit, category, priceCents }) =>
    ({ id, name, qty, unit, category, priceCents }));
}

export function pendingByCategory(state) {
  const groups = new Map();
  for (const { id, name, qty, unit, category, priceCents } of sortedPending(state)) {
    if (!groups.has(category)) groups.set(category, { category, count: 0, items: [] });
    const group = groups.get(category);
    group.items.push({ id, name, qty, unit, priceCents });
    group.count++;
  }
  return [...groups.values()];
}
