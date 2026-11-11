import { analysisAmount } from "./finance.mjs";
import { safeIsIsoDate } from "./hardened.mjs";

const day = 86_400_000;
const kind = new Set(["income", "expense", "transfer"]);
const rows = (value) => Array.isArray(value) ? value : [];
const totals = () => ({ income: 0n, expense: 0n, count: 0 });
const asCents = (value) => Number.isSafeInteger(Number(value)) ? Number(value) : null;
const shape = (sum) => ({ incomeCents: asCents(sum.income), expenseCents: asCents(sum.expense), count: sum.count });

function add(sum, row) {
  sum.count++;
  if (row.type === "transfer" || !Number.isSafeInteger(row.amount)) return;
  sum[row.type] += BigInt(analysisAmount(row));
}

function monthInfo(options) {
  const value = typeof options === "string" ? options : Number.isInteger(options?.year) && Number.isInteger(options?.month) ?
    String(options.year).padStart(4, "0") + "-" + String(options.month).padStart(2, "0") : "";
  const date = value + "-01";
  if (!safeIsIsoDate(date)) return null;
  const start = Date.parse(date + "T00:00:00Z");
  const next = new Date(start);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { month: value, start, days: (next.getTime() - start) / day };
}

function collect(transactions, visit) {
  let skipped = 0;
  for (const row of rows(transactions)) {
    if (!safeIsIsoDate(row?.date)) skipped++;
    else if (kind.has(row.type)) visit(row);
  }
  return skipped;
}

export function monthGrid(transactions, options = {}) {
  const info = monthInfo(options);
  if (!info) return { weeks: [], skipped: collect(transactions, () => {}) };
  const weekday = options.weekStart === 1 ? 1 : 0;
  const sums = new Map();
  const skipped = collect(transactions, (row) => {
    if (!sums.has(row.date)) sums.set(row.date, totals());
    add(sums.get(row.date), row);
  });
  const ranking = [...sums].filter(([date, sum]) => date.startsWith(info.month + "-") && sum.expense > 0n)
    .map(([, sum]) => sum.expense).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const ranks = new Map(ranking.map((value, index) => [value, Math.ceil(4 * (index + 1) / ranking.length)]));
  const offset = (new Date(info.start).getUTCDay() - weekday + 7) % 7;
  const count = Math.ceil((offset + info.days) / 7) * 7;
  const weeks = [];
  for (let i = 0; i < count; i++) {
    if (i % 7 === 0) weeks.push([]);
    const date = new Date(info.start + (i - offset) * day).toISOString().split("T")[0];
    const inMonth = i >= offset && i < offset + info.days;
    const sum = sums.get(date) ?? totals();
    weeks.at(-1).push({ date, inMonth, ...shape(sum), level: inMonth ? ranks.get(sum.expense) ?? 0 : 0 });
  }
  return { weeks, skipped };
}

export function dayDetail(transactions, date) {
  const sum = totals();
  const found = [];
  const valid = safeIsIsoDate(date);
  const skipped = collect(transactions, (row) => {
    if (!valid || row.date !== date) return;
    found.push(row);
    add(sum, row);
  });
  return { date: valid ? date : null, transactions: found, ...shape(sum), skipped };
}

export function monthTotals(transactions, options) {
  const info = monthInfo(options);
  const sum = totals();
  const skipped = collect(transactions, (row) => {
    if (info && row.date.startsWith(info.month + "-")) add(sum, row);
  });
  return { month: info?.month ?? null, ...shape(sum), skipped };
}
