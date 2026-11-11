import { productsOf } from "./shoppingPurchases.mjs";
import { purchaseRhythm } from "./shoppingRhythm.mjs";

const DAY = 86_400_000;
const LABELS = { low: "baixa", medium: "média", high: "alta" };

function dayOf(value) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.floor(value / DAY) : NaN;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const time = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(time) && new Date(time).toISOString().startsWith(value) ? time / DAY : NaN;
}

export function runningLow(state, now, { days = 3 } = {}) {
  const today = dayOf(now);
  const window = Number.isInteger(days) && days >= 0 ? days : 3;
  if (!Number.isFinite(today)) return [];
  return productsOf(state).flatMap((product) => {
    const rhythm = purchaseRhythm(product);
    if (rhythm.avgDays === null) return [];
    const elapsed = today - dayOf(rhythm.lastBoughtAt);
    if (!Number.isFinite(elapsed) || elapsed < rhythm.avgDays / 5 || elapsed > rhythm.avgDays * 5) return [];
    const daysUntil = rhythm.avgDays - elapsed;
    if (daysUntil > window) return [];
    const reason = daysUntil > 0 ? "Pelo histórico, pode acabar em " + daysUntil + (daysUntil === 1 ? " dia." : " dias.") :
      "Pelo histórico, pode estar na hora de repor.";
    return [{
      productId: product.id, name: product.name, daysUntil, nextExpectedAt: rhythm.nextExpectedAt,
      confidence: LABELS[rhythm.confidence], reason,
    }];
  }).sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name, "pt-BR"));
}

// Horário local calculado com o deslocamento em minutos fornecido pela interface.
export function quietHours(now, { start = 22, end = 7, offsetMinutes = 0 } = {}) {
  if (!Number.isFinite(now) || !Number.isFinite(offsetMinutes) ||
      ![start, end].every((hour) => Number.isFinite(hour) && hour >= 0 && hour <= 24) || start === end) return false;
  const local = Math.floor(now / 60_000) + offsetMinutes;
  const minute = ((local % 1440) + 1440) % 1440;
  const from = start * 60;
  const to = end * 60;
  return from < to ? minute >= from && minute < to : minute >= from || minute < to;
}

export function pickAlerts(list, { max = 3, alreadySentToday = 0, now, quiet } = {}) {
  if (quiet !== false && quietHours(now, quiet ?? {})) return [];
  const cap = Number.isFinite(max) ? Math.min(3, Math.max(0, Math.floor(max))) : 3;
  const sent = Number.isFinite(alreadySentToday) ? Math.max(0, Math.floor(alreadySentToday)) : 0;
  return (list ?? []).slice(0, Math.max(0, cap - sent));
}
