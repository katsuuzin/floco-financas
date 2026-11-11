import { categorize, itemsOf } from "./shopping.mjs";
import { purchasesOf } from "./shoppingPurchases.mjs";
import { applyDeal } from "./shoppingDeals.mjs";
import { safeIsIsoDate, safeLineTotal, safeSum } from "./hardened.mjs";

const weekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto",
  "setembro", "outubro", "novembro", "dezembro"];
const dateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;
const cents = (value) => Number.isSafeInteger(value) && value >= 0;

function instant(value) {
  if (typeof value === "number") return Math.abs(value) <= 8.64e15 ? value : NaN;
  if (typeof value !== "string" || !safeIsIsoDate(value.slice(0, 10))) return NaN;
  if (value.length === 10) return Date.parse(value + "T00:00:00Z");
  return dateTime.test(value) ? Date.parse(value) : NaN;
}

function monthOf(value) {
  const time = instant(value);
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 7) : "";
}

function savings(item) {
  if (!item.deal) return 0;
  const priceCents = item.priceCents ?? (item.unit && cents(item.unitPriceCents) && Number.isFinite(item.qty)
    ? Math.round(item.unitPriceCents * item.qty) : item.unitPriceCents);
  try { return applyDeal({ ...item, priceCents }, item.deal).savedCents; }
  catch (error) { if (error instanceof RangeError) return 0; throw error; }
}

export function monthlyReport(state, { month, now } = {}) {
  const selected = month ?? monthOf(now);
  if (typeof selected !== "string" || !safeIsIsoDate(selected + "-01"))
    throw Error("Informe o mês no formato AAAA-MM.");
  const [year, number] = selected.split("-").map(Number);
  const previous = number === 1 ? String(year - 1).padStart(4, "0") + "-12" :
    String(year).padStart(4, "0") + "-" + String(number - 1).padStart(2, "0");
  const before = [];
  const current = [];
  const weekdaysCount = Array(7).fill(0);
  const categories = new Map();
  const discounts = [];
  let unpriced = itemsOf(state).filter((item) => safeLineTotal(item) === null).length;
  for (const purchase of purchasesOf(state)) {
    const paidAt = instant(purchase.date);
    if (!Number.isFinite(paidAt)) continue;
    const date = new Date(paidAt);
    const key = date.toISOString().slice(0, 7);
    if (key === previous && cents(purchase.totalCents)) before.push(purchase.totalCents);
    if (key !== selected) continue;
    if (cents(purchase.totalCents)) current.push(purchase.totalCents);
    else current.push(null);
    weekdaysCount[date.getUTCDay()]++;
    for (const item of purchase.items ?? []) {
      if (!cents(item.totalCents)) unpriced++;
      else {
        const group = item.category || categorize(item.name);
        if (!categories.has(group)) categories.set(group, []);
        categories.get(group).push(item.totalCents);
      }
      discounts.push(savings(item));
    }
  }
  const totalCents = safeSum(current);
  const priorCents = safeSum(before);
  const count = current.length;
  const percent = priorCents > 0 && totalCents !== null ? Math.round((totalCents - priorCents) / priorCents * 100) : null;
  const monthName = months[(number + 10) % 12];
  let comparison = null;
  if (percent !== null) {
    const message = percent === 0 ? "O gasto ficou estável em relação a " + monthName + "." :
      "Você gastou " + Math.abs(percent) + "% " + (percent < 0 ? "menos" : "mais") + " que em " + monthName + ".";
    comparison = { month: previous, totalCents: priorCents, percent, message };
  }
  const ranked = [...categories].map(([category, amounts]) => ({ category, totalCents: safeSum(amounts) }))
    .filter((entry) => entry.totalCents !== null)
    .sort((a, b) => b.totalCents - a.totalCents || a.category.localeCompare(b.category, "pt-BR"));
  return {
    month: selected, totalCents, trips: count, averageCents: count && totalCents !== null ? Math.round(totalCents / count) : null,
    mostFrequentWeekday: count ? weekdays[weekdaysCount.indexOf(Math.max(...weekdaysCount))] : null,
    topCategory: ranked[0] ?? null, comparison, savedCents: safeSum(discounts), unpriced,
  };
}
