import { itemsOf } from "./shopping.mjs";
import { productKey, productsOf } from "./shoppingPurchases.mjs";
import { purchaseRhythm } from "./shoppingRhythm.mjs";

const DAY = 86_400_000;
const keyFor = (item) => productKey(item.name, item.unit ?? "");
const validInterval = (n) => Number.isInteger(n) && n >= 1 && n <= 365;

function civilDay(value) {
  if (typeof value === "number") return Math.abs(value) <= 8.64e15 ? Math.floor(value / DAY) : NaN;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const time = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(time) && new Date(time).toISOString().startsWith(value) ? time / DAY : NaN;
}

export function markStaple(state, id, everyDays) {
  if (everyDays !== null && !validInterval(everyDays)) throw Error("Informe um intervalo inteiro de 1 a 365 dias.");
  const current = itemsOf(state).find((item) => item.id === id) ??
    (state.shoppingStaples ?? []).find((item) => item.id === id);
  if (!current) throw Error("Item não encontrado.");
  const key = keyFor(current);
  const records = (state.shoppingStaples ?? []).filter((entry) => keyFor(entry) !== key);
  if (everyDays !== null) records.push({ ...current, staple: true, everyDays, inCart: false });
  return {
    ...state,
    shoppingStaples: records,
    shoppingItems: itemsOf(state).map((item) => item.id === id
      ? { ...item, staple: everyDays !== null, everyDays } : item),
  };
}

// Passe a data civil do celular como AAAA-MM-DD quando a virada local for relevante.
export function staplesToRestock(state, now) {
  const today = civilDay(now);
  if (!Number.isFinite(today)) return [];
  const list = itemsOf(state);
  const existing = new Set(list.map(keyFor));
  const history = new Map(productsOf(state).map((product) => [keyFor(product), product]));
  const due = [];
  for (const entry of state.shoppingStaples ?? []) {
    if (entry.staple !== true || !validInterval(entry.everyDays)) continue;
    const key = keyFor(entry);
    if (existing.has(key)) continue;
    const rhythm = purchaseRhythm(history.get(key));
    const dates = [rhythm.lastBoughtAt, entry.lastRestockedAt, entry.createdAt]
      .map(civilDay).filter(Number.isFinite);
    const last = dates.length ? Math.max(...dates) : -Infinity;
    if (today - last < Math.max(entry.everyDays, rhythm.avgDays ?? 0)) continue;
    due.push({ ...entry, inCart: false });
    existing.add(key);
  }
  return due;
}
