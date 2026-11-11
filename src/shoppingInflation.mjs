import { productKey, purchasesOf } from "./shoppingPurchases.mjs";

const dateOf = (value) => {
  if (typeof value === "number") return Math.abs(value) <= 8.64e15 ? value : NaN;
  return typeof value === "string" ? Date.parse(value + "T00:00:00Z") : NaN;
};
const monthCount = (value) => Number.isInteger(value) && value >= 1 && value <= 120 ? value : 3;

function cutoff(anchor, months) {
  const start = new Date(anchor);
  const day = start.getUTCDate();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - months);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  start.setUTCDate(Math.min(day, end.getUTCDate()));
  return start.getTime();
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const roundPct = (pct) => Math.round(pct * 100) / 100 || 0;

function histories(state, wanted, start = -Infinity, end = Infinity) {
  const result = new Map();
  for (const purchase of purchasesOf(state)) {
    const time = dateOf(purchase.date);
    if (!Number.isFinite(time) || time < start || time > end) continue;
    const lines = new Map();
    for (const item of purchase.items ?? []) {
      const key = productKey(item.name, item.unit ?? "");
      if (wanted !== null && key !== wanted) continue;
      const price = item.unitPriceCents ?? (item.qty > 0 ? Math.round(item.totalCents / item.qty) : null);
      if (!Number.isSafeInteger(price) || price <= 0) continue;
      const line = lines.get(key) ?? { name: item.name, prices: [], spend: 0 };
      line.prices.push(price);
      const total = item.totalCents ?? price * (item.qty ?? 1);
      if (Number.isFinite(total) && total > 0) line.spend += total;
      lines.set(key, line);
    }
    for (const [key, line] of lines) {
      if (!result.has(key)) result.set(key, []);
      result.get(key).push({ time, name: line.name, price: median(line.prices), spend: line.spend });
    }
  }
  return result;
}

function change(key, points, months) {
  if (points.length < 3) return null;
  const dates = new Map();
  for (const point of points) {
    if (!dates.has(point.time)) dates.set(point.time, []);
    dates.get(point.time).push(point.price);
  }
  const ordered = [...dates].sort(([a], [b]) => a - b).map(([, prices]) => median(prices));
  if (ordered.length < 2) return null;
  const middle = Math.floor(ordered.length / 2);
  const firstCents = median(ordered.slice(0, middle));
  const lastCents = median(ordered.slice(middle));
  const percent = roundPct((lastCents - firstCents) / firstCents * 100);
  const direction = percent > 0 ? "up" : percent < 0 ? "down" : "same";
  const name = points[0].name;
  const period = months === 1 ? "1 mês" : months + " meses";
  const number = String(Math.abs(percent)).replace(".", ",");
  const message = direction === "same" ? name + " ficou estável em " + period + "." :
    name + (direction === "up" ? " subiu " : " baixou ") + number + "% em " + period + ".";
  return { key, name, percent, direction, firstCents, lastCents, purchases: points.length, message };
}

export function priceChange(state, key, { months } = {}) {
  const window = monthCount(months);
  const points = histories(state, key).get(key) ?? [];
  const anchor = points.reduce((max, point) => Math.max(max, point.time), -Infinity);
  return points.length ? change(key, points.filter(({ time }) => time >= cutoff(anchor, window)), window) : null;
}

export function basketInflation(state, { months, now } = {}) {
  const window = monthCount(months);
  const anchor = dateOf(now);
  if (!Number.isFinite(anchor)) return null;
  let spend = 0;
  let weighted = 0;
  const products = [];
  for (const [key, points] of histories(state, null, cutoff(anchor, window), anchor)) {
    const result = change(key, points, window);
    if (!result) continue;
    const total = points.reduce((sum, point) => sum + point.spend, 0);
    if (!total) continue;
    spend += total;
    weighted += result.percent * total;
    products.push({ ...result, spendCents: total });
  }
  if (!spend) return null;
  const byName = (a, b) => a.name.localeCompare(b.name, "pt-BR");
  const percent = roundPct(weighted / spend);
  return {
    percent,
    direction: percent > 0 ? "up" : percent < 0 ? "down" : "same",
    topIncreases: products.filter((p) => p.percent > 0).sort((a, b) => b.percent - a.percent || byName(a, b)).slice(0, 5),
    topDecreases: products.filter((p) => p.percent < 0).sort((a, b) => a.percent - b.percent || byName(a, b)).slice(0, 5),
  };
}
