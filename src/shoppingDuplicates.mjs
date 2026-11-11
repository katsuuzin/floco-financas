import { purchasesOf, productsOf } from "./shoppingPurchases.mjs";
import { normalizeStoreName } from "./shoppingStores.mjs";
import { safeIsChave, safeIsIsoDate, safeProductKey } from "./hardened.mjs";

const cleanKey = (row) => safeIsChave(row.chave) ? row.chave : "";
const soldAt = (row) => {
  const raw = row.issuedTime ?? row.time ?? (typeof row.date === "string" ? row.date.slice(11) : "");
  const match = typeof raw === "string" && /^(\d{2}):(\d{2})(?::(\d{2}))?/u.exec(raw);
  return match ? match[1] + ":" + match[2] + ":" + (match[3] ?? "00") : "";
};

function sample(row) {
  const store = normalizeStoreName(row.marketName);
  const date = typeof row.date === "string" ? row.date.slice(0, 10) : "";
  if (!store || !safeIsIsoDate(date) || !Number.isSafeInteger(row.totalCents) || row.totalCents <= 0) return null;
  const terms = new Map();
  let count = 0;
  for (const item of row.items ?? []) {
    if (typeof item.name !== "string" || !item.name.trim()) continue;
    const term = JSON.stringify([safeProductKey(item.name, item.unit), item.qty, item.totalCents]);
    terms.set(term, (terms.get(term) ?? 0) + 1);
    count++;
  }
  if (!count) return null;
  return { bucket: JSON.stringify([store, date, row.totalCents]), terms, count, time: soldAt(row) };
}

function similar(a, b) {
  const maximum = Math.max(a.count, b.count);
  if (Math.min(a.count, b.count) * 5 < maximum * 4) return false;
  let common = 0;
  for (const [term, count] of a.terms) common += Math.min(count, b.terms.get(term) ?? 0);
  return common * 5 >= maximum * 4;
}

export function findDuplicatePurchases(state) {
  const groups = [];
  const byKey = new Map();
  const unkeyed = [];
  for (const row of purchasesOf(state)) {
    if (typeof row.id !== "string" || !row.id) continue;
    const key = cleanKey(row);
    const entry = { row, sample: sample(row) };
    if (!key) { unkeyed.push(entry); continue; }
    if (!byKey.has(key)) {
      const group = { entries: [], times: new Set(), reason: "chave" };
      groups.push(group);
      byKey.set(key, group);
    }
    byKey.get(key).entries.push(entry);
  }
  const index = new Map();
  const put = (group, entry) => {
    if (!entry.sample) return;
    const { bucket, terms, time } = entry.sample;
    if (time) group.times.add(time);
    for (const term of terms.keys()) {
      const key = JSON.stringify([bucket, term]);
      if (!index.has(key)) index.set(key, { all: new Set(), byTime: new Map() });
      const bucketIndex = index.get(key);
      bucketIndex.all.add(group);
      if (!bucketIndex.byTime.has(time)) bucketIndex.byTime.set(time, new Set());
      bucketIndex.byTime.get(time).add(group);
    }
  };
  for (const group of groups) for (const entry of group.entries) put(group, entry);
  unkeyed.sort((a, b) => Number(!!b.sample?.time) - Number(!!a.sample?.time) ||
    (a.row.id < b.row.id ? -1 : a.row.id > b.row.id ? 1 : 0));
  for (const entry of unkeyed) {
    const data = entry.sample;
    const matches = new Set();
    const seen = new Set();
    if (data) {
      outer: for (const term of data.terms.keys()) {
        const bucketIndex = index.get(JSON.stringify([data.bucket, term]));
        if (!bucketIndex) continue;
        const candidates = data.time
          ? [...(bucketIndex.byTime.get(data.time) ?? []), ...(bucketIndex.byTime.get("") ?? [])]
          : bucketIndex.all;
        for (const group of candidates) {
          if (seen.has(group)) continue;
          seen.add(group);
          if (data.time && group.times.size && !group.times.has(data.time)) continue;
          if (group.entries.some(({ sample }) => sample?.bucket === data.bucket &&
              (!data.time || !sample.time || data.time === sample.time) && similar(data, sample))) {
            matches.add(group);
            if (matches.size > 1) break outer;
          }
        }
      }
    }
    const group = matches.size === 1 ? matches.values().next().value : { entries: [], times: new Set(), reason: "semelhanca" };
    if (matches.size !== 1) groups.push(group);
    group.entries.push(entry);
    put(group, entry);
  }
  return groups.filter(({ entries }) => entries.length > 1).map(({ entries, reason }) => ({
    ids: entries.map(({ row }) => row.id).sort(),
    reason: reason === "chave" && entries.filter(({ row }) => cleanKey(row)).length > 1 ? "chave" : "semelhanca",
  })).sort((a, b) => a.ids[0].localeCompare(b.ids[0]));
}

function completeness(row) {
  return Number(!!cleanKey(row)) * 10 + Number(!!row.transactionId) * 5 + Number(!!row.marketName) +
    Number(!!soldAt(row)) + (row.items ?? []).reduce((n, item) =>
      n + 1 + Number(item.unitPriceCents != null) + Number(!!item.productId) + Number(!!item.rawName), 0);
}

export function mergeDuplicates(state, group) {
  const ids = new Set(group?.ids ?? group ?? []);
  const selected = purchasesOf(state).filter((row) => ids.has(row.id));
  if (selected.length < 2) return state;
  const keep = selected.slice().sort((a, b) => completeness(b) - completeness(a) || a.id.localeCompare(b.id))[0];
  const removed = new Set(selected.filter((row) => row !== keep).map((row) => row.id));
  const purchasedByKeeper = new Set((keep.items ?? []).map((item) => item.productId).filter(Boolean));
  const removedCounts = new Map();
  for (const row of selected) {
    if (row === keep) continue;
    for (const { productId } of row.items ?? []) {
      if (productId) removedCounts.set(productId, (removedCounts.get(productId) ?? 0) + 1);
    }
  }
  const shoppingProducts = productsOf(state).map((product) => {
    const points = product.prices ?? [];
    const orphans = points.filter((point) => removed.has(point.purchaseId));
    const decrement = removedCounts.get(product.id) ?? 0;
    if (!orphans.length && !decrement) return product;
    const prices = points.filter((point) => !removed.has(point.purchaseId));
    if (purchasedByKeeper.has(product.id) && !prices.some((point) => point.purchaseId === keep.id) && orphans.length)
      prices.push({ ...orphans.at(-1), date: keep.date.slice(0, 10), purchaseId: keep.id });
    prices.sort((a, b) => a.date.localeCompare(b.date));
    const last = prices.at(-1);
    return { ...product, prices, buys: Math.max(0, (product.buys ?? 0) - decrement),
      lastBoughtAt: last?.date ?? "", lastPriceCents: last?.priceCents ?? null };
  });
  return { ...state, shoppingPurchases: purchasesOf(state).filter((row) => !removed.has(row.id)),
    ...(Object.hasOwn(state, "shoppingProducts") ? { shoppingProducts } : {}) };
}
