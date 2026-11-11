import { normalizeName, productKey, purchasesOf } from "./shoppingPurchases.mjs";
import { lineTotal } from "./shopping.mjs";

const DAY = 86_400_000;

export function normalizeStoreName(raw) {
  if (typeof raw !== "string") return "";
  const name = normalizeName(raw.replace(/\b(?:CNPJ\s*:?\s*)?\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/gi, " "));
  return name.replace(/\b(?:filial|loja)\s+\d+\b.*$/, "").trim()
    .replace(/\s+(?:ltda|limitada|s a|sa|eireli|me|epp)(?:\s+(?:me|epp))?$/, "").trim();
}

function priceIndex(state, wanted) {
  const purchases = purchasesOf(state);
  const history = new Map();
  const dates = purchases.map(({ date }) => Date.parse(date + "T00:00:00Z"));
  const latest = dates.reduce((last, time) => Number.isFinite(time) ? Math.max(last, time) : last, -Infinity);
  for (const [index, purchase] of purchases.entries()) {
    const store = normalizeStoreName(purchase.marketName);
    if (!store || !Number.isFinite(dates[index])) continue;
    const weight = latest - dates[index] > 180 * DAY ? 0.25 : 1;
    for (const item of purchase.items ?? []) {
      const key = productKey(item.name, item.unit ?? "");
      if (!wanted.has(key)) continue;
      const price = item.unitPriceCents ?? (item.qty > 0 ? Math.round(item.totalCents / item.qty) : null);
      if (!Number.isSafeInteger(price) || price <= 0) continue;
      if (!history.has(key)) history.set(key, new Map());
      const stores = history.get(key);
      const sample = stores.get(store) ?? { sum: 0, weight: 0, count: 0 };
      sample.sum += price * weight;
      sample.weight += weight;
      sample.count++;
      stores.set(store, sample);
    }
  }
  return history;
}

const estimate = (sample) => Math.round(sample.sum / sample.weight);
const median = (values) => {
  const sorted = values.sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

export function pricesByStore(state, key) {
  const stores = priceIndex(state, new Set([key])).get(key) ?? new Map();
  return [...stores].map(([store, sample]) => ({ store, priceCents: estimate(sample), basedOn: sample.count }))
    .sort((a, b) => a.priceCents - b.priceCents || a.store.localeCompare(b.store, "pt-BR"));
}

// Para comparar cestas com cobertura parcial, usa a mediana das outras lojas como
// referência dos itens sem preço naquela loja. A lista de faltantes continua explícita.
export function basketCompare(state, items = []) {
  if (!items.length) return [];
  const keys = items.map((item) => productKey(item.name, item.unit ?? ""));
  const history = priceIndex(state, new Set(keys));
  const names = new Set();
  const reference = new Map();
  for (const [key, stores] of history) {
    for (const store of stores.keys()) names.add(store);
    reference.set(key, median([...stores.values()].map(estimate)));
  }
  return [...names].map((store) => {
    let totalCents = 0;
    const missing = [];
    items.forEach((item, i) => {
      const own = history.get(keys[i])?.get(store);
      if (!own) missing.push(item);
      const unitCents = own ? estimate(own) : reference.get(keys[i]);
      if (unitCents !== undefined) {
        const qty = item.qty ?? 1;
        // O histórico é preço por unidade física, lineTotal recebe preço da porção nos itens com unidade.
        totalCents += lineTotal({ ...item, qty, priceCents: item.unit ? Math.round(unitCents * qty) : unitCents });
      }
    });
    return { store, totalCents, missing, coverage: (items.length - missing.length) / items.length };
  }).sort((a, b) => a.totalCents - b.totalCents || b.coverage - a.coverage || a.store.localeCompare(b.store, "pt-BR"));
}

export function cheapestStore(state, items) {
  return basketCompare(state, items).find(({ coverage }) => coverage >= 0.6) ?? null;
}
