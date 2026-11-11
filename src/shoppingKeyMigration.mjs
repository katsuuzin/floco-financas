import { productKey, productsOf, purchasesOf } from "./shoppingPurchases.mjs";
import { MAX_PRICE_POINTS } from "./shoppingData.mjs";

const order = (a, b) => a === b ? 0 : a < b ? -1 : 1;
const byDate = (a, b) => order(a.date, b.date);

function combine(group, key) {
  const first = group[0];
  if (group.length === 1) return first.key === key ? first : { ...first, key };
  const points = new Map();
  let latest = first;
  let buys = 0;
  let ean = first.ean;
  for (const product of group) {
    buys += product.buys ?? 0;
    ean ||= product.ean;
    if (order(latest.lastBoughtAt ?? "", product.lastBoughtAt ?? "") < 0) latest = product;
    for (const point of product.prices ?? []) {
      const id = point.purchaseId ? "compra:" + point.purchaseId : "ponto:" + point.date + ":" + point.priceCents;
      const previous = points.get(id);
      if (!previous || byDate(previous, point) < 0) points.set(id, point);
    }
  }
  const prices = [...points.values()].sort((a, b) => byDate(a, b) ||
    order(a.purchaseId ?? "", b.purchaseId ?? "")).slice(-MAX_PRICE_POINTS);
  const last = prices.at(-1);
  return { ...first, key, ...(ean ? { ean } : {}), buys, prices,
    lastBoughtAt: last?.date ?? latest.lastBoughtAt ?? "",
    lastPriceCents: last?.priceCents ?? latest.lastPriceCents ?? null };
}

export function migrateProductKeys(state) {
  const groups = new Map();
  const redirect = new Map();
  let rekeyed = 0;
  let merged = 0;
  for (const product of productsOf(state)) {
    const key = productKey(product.name, product.unit);
    if (key !== product.key) rekeyed++;
    const group = groups.get(key);
    if (group) {
      if (product.id !== group[0].id) redirect.set(product.id, group[0].id);
      group.push(product);
      merged++;
    } else groups.set(key, [product]);
  }
  if (!merged && !rekeyed) return { state, merged, rekeyed };
  const shoppingProducts = [...groups].map(([key, group]) => combine(group, key));
  const next = { ...state, shoppingProducts };
  if (redirect.size && Object.hasOwn(state, "shoppingPurchases")) {
    next.shoppingPurchases = purchasesOf(state).map((purchase) => {
      if (!purchase.items?.some((item) => redirect.has(item.productId))) return purchase;
      return { ...purchase, items: purchase.items.map((item) => redirect.has(item.productId)
        ? { ...item, productId: redirect.get(item.productId) } : item) };
    });
  }
  return { state: next, merged, rekeyed };
}
