import { scorePair } from "./shoppingMatch.mjs";
import { normalizeName } from "./shoppingPurchases.mjs";

export const MIN_PURCHASES = 2; // compras em datas diferentes para existir ritmo
const DAY_MS = 86_400_000;

function dayNumber(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = Date.parse(date + "T00:00:00Z");
  // Date.parse pode normalizar uma data impossível, como 30 de fevereiro.
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) return null;
  return time / DAY_MS;
}

const isoDay = (day) => new Date(day * DAY_MS).toISOString().split("T")[0];

// Ritmo de um produto do catálogo (item de state.shoppingProducts).
// Retorno: { purchases, avgDays, lastBoughtAt, nextExpectedAt, confidence }
//   purchases: número de datas de compra diferentes (use product.prices[].date)
//   avgDays: intervalo típico entre compras, em dias inteiros (mediana), ou null se purchases < MIN_PURCHASES
//   lastBoughtAt: "AAAA-MM-DD" ou ""
//   nextExpectedAt: "AAAA-MM-DD" (lastBoughtAt + avgDays) ou null
//   confidence: "none" | "low" | "medium" | "high"
export function purchaseRhythm(product) {
  const days = [...new Set((product?.prices ?? [])
    .map((point) => dayNumber(point?.date))
    .filter((day) => day !== null))].sort((a, b) => a - b);
  const purchases = days.length;
  const lastDay = days.at(-1);
  const lastBoughtAt = purchases ? isoDay(lastDay) : product?.lastBoughtAt || "";
  if (purchases < MIN_PURCHASES) {
    return { purchases, avgDays: null, lastBoughtAt, nextExpectedAt: null, confidence: "none" };
  }

  // Dias distintos e ordenados garantem intervalos positivos.
  const gaps = days.slice(1).map((day, i) => day - days[i]).sort((a, b) => a - b);
  const middle = Math.floor(gaps.length / 2);
  const median = gaps.length % 2 ? gaps[middle] : (gaps[middle - 1] + gaps[middle]) / 2;
  const avgDays = Math.max(1, Math.round(median));
  const regular = gaps.at(-1) <= 2 * gaps[0];
  const confidence = purchases === 2 ? "low" : purchases >= 5 && regular ? "high" : "medium";
  return { purchases, avgDays, lastBoughtAt, nextExpectedAt: isoDay(lastDay + avgDays), confidence };
}

// Produtos que provavelmente estão acabando, do mais atrasado para o menos.
// today: "AAAA-MM-DD" (injetado, para testar). Retorno: array de
//   { productId, name, unit, avgDays, daysSinceLast, daysLate, nextExpectedAt, lastPriceCents, status }
//   daysLate: daysSinceLast - avgDays (positivo = atrasado; negativo = ainda cedo)
//   status: "due" (daysSinceLast >= 90% de avgDays) | "soon" (faltam até 3 dias para o "due")
export function restockCandidates(state, today, { limit = 10 } = {}) {
  const todayDay = dayNumber(today);
  if (todayDay === null || limit <= 0) return [];

  const pending = (state?.shoppingItems ?? [])
    .filter((item) => item.inCart === false)
    .map(({ name }) => ({ name, normalized: normalizeName(name) }))
    .filter(({ normalized }) => normalized);
  const candidates = [];
  for (const product of state?.shoppingProducts ?? []) {
    const { avgDays, lastBoughtAt, nextExpectedAt, confidence } = purchaseRhythm(product);
    if (avgDays === null || (confidence === "low" && avgDays < 5)) continue;
    const lastDay = dayNumber(lastBoughtAt);
    if (lastDay === null) continue;
    const daysSinceLast = todayDay - lastDay;
    if (daysSinceLast < 0 || daysSinceLast > 365 || daysSinceLast > 6 * avgDays) continue;

    const dueDay = Math.ceil((9 * avgDays) / 10);
    if (daysSinceLast < dueDay - 3) continue;
    const { id: productId, name, unit, lastPriceCents } = product;
    const normalized = normalizeName(name);
    if (pending.some((item) => item.normalized === normalized || scorePair(item.name, name).score > 0)) continue;

    candidates.push({
      productId, name, unit, avgDays, daysSinceLast, daysLate: daysSinceLast - avgDays,
      nextExpectedAt, lastPriceCents, status: daysSinceLast >= dueDay ? "due" : "soon",
    });
  }
  return candidates.sort((a, b) => b.daysLate - a.daysLate || a.name.localeCompare(b.name, "pt-BR")).slice(0, limit);
}
