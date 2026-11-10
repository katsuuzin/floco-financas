// Fluxo da Análise (equivale a Fluxo do Calen): o que entrou e saiu no mês, recorrentes e
// avulsas, caixa do mês e sugestões de recorrência. Valores em centavos, datas ISO.
import { monthKey, addMonths, analysisAmount, totalBalance, includedAccounts, reserved, today } from "./finance.mjs";
import { recurrenceEvents } from "./planning.mjs";
import { balanceAtEndOf } from "./spending.mjs";

const pad = (n) => String(n).padStart(2, "0");
const daysIn = (month) => new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
const real = (t) => t.type !== "transfer" && !t.invoicePayment && !t.loanSettlement && !t.ignored;
const prevMonth = (m) => monthKey(addMonths(m + "-01", -1));
const normName = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const sumKind = (state, month, kind) =>
  state.transactions.filter((t) => t.confirmed && real(t) && monthKey(t.date) === month && (kind === "income" ? t.type === "income" : t.type === "expense")).reduce((a, t) => a + analysisAmount(t), 0);

// Cabeçalho: total do mês, do mês anterior e a variação (null sem base).
export function flowHeader(state, month, kind = "income") {
  const total = sumKind(state, month, kind);
  const prev = sumKind(state, prevMonth(month), kind);
  return { month, kind, total, prev, pct: prev > 0 ? Math.round(((total - prev) / prev) * 100) : null };
}

// Recorrentes (da lista de recorrências) e avulsas (o resto) do mês, para receita ou despesa.
// status: "done" (já aconteceu), "pending" (lançado e ainda não confirmado, ou atrasado) e
// "planned" (ainda vai acontecer).
export function flowLists(state, month, kind = "income", ref = today()) {
  const last = `${month}-${pad(daysIn(month))}`;
  const type = kind === "income" ? "income" : "expense";
  const sameMonth = (t) => monthKey(t.date) === month && t.type === type && real(t);
  const recurring = [];
  const used = new Set();
  const recs = (state.recurrences || []).filter((r) => r.active && r.type === type);
  for (const t of state.transactions) {
    if (!sameMonth(t) || !t.recurrenceId) continue;
    used.add(t.id);
    recurring.push({ key: t.id, name: t.description, amount: t.amount, date: t.date, status: t.confirmed ? "done" : "pending", category: t.category || "Outros", subcategory: t.subcategory || "" });
  }
  let events = [];
  try {
    events = recurrenceEvents(state, last, `${month}-01`).filter((e) => e.type === type && monthKey(e.date) === month);
  } catch {
    events = [];
  }
  for (const e of events) {
    if (!recs.some((r) => r.id === e.recurrenceId)) continue;
    recurring.push({ key: e.occurrenceKey, name: e.description, amount: e.amount, date: e.date, status: e.date < ref ? "pending" : "planned", category: e.category || "Outros", subcategory: e.subcategory || "" });
  }
  const sporadic = state.transactions
    .filter((t) => sameMonth(t) && !used.has(t.id) && !t.recurrenceId && !t.occurrenceKey)
    .map((t) => ({ id: t.id, description: t.description, amount: t.amount, date: t.date, category: t.category || "Outros", subcategory: t.subcategory || "", confirmed: !!t.confirmed }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
  recurring.sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
  const sum = (rows, f) => rows.filter(f).reduce((a, r) => a + r.amount, 0);
  return {
    recurring,
    sporadic,
    recurringDone: sum(recurring, (r) => r.status === "done"),
    recurringLeft: sum(recurring, (r) => r.status !== "done"),
    sporadicDone: sum(sporadic, (r) => r.confirmed),
    sporadicLeft: sum(sporadic, (r) => !r.confirmed),
  };
}

// Caixa do mês: do saldo no começo até o saldo no fim, passando pelo que entrou e saiu.
export function flowCash(state, month, ref = today()) {
  const prevLast = `${prevMonth(month)}-${pad(daysIn(prevMonth(month)))}`;
  const last = `${month}-${pad(daysIn(month))}`;
  const opening = balanceAtEndOf(state, prevLast);
  const isPast = last < ref;
  const isFuture = `${month}-01` > ref;
  const cashIn = state.transactions.filter((t) => t.confirmed && !t.cardId && real(t) && t.type === "income" && monthKey(t.date) === month).reduce((a, t) => a + t.amount, 0);
  const cashOut = state.transactions.filter((t) => t.confirmed && !t.cardId && real(t) && t.type === "expense" && monthKey(t.date) === month).reduce((a, t) => a + t.amount - (t.refund ? 2 * t.amount : 0), 0);
  const between = state.transactions
    .filter((t) => t.confirmed && !t.cardId && monthKey(t.date) === month && (t.type === "transfer" || t.invoicePayment || t.loanSettlement || t.ignored))
    .reduce((a, t) => a + (t.type === "income" || t.loanSettlement ? t.amount : t.type === "transfer" ? 0 : -t.amount), 0);
  const now = totalBalance(state);
  const closingRealized = isPast ? balanceAtEndOf(state, last) : isFuture ? opening : now;
  return {
    month,
    opening: isFuture ? now : opening,
    income: cashIn,
    expense: cashOut,
    other: between,
    current: closingRealized,
    reserved: includedAccounts(state).reduce((a, acc) => a + reserved(state, acc.id), 0),
    isPast,
    isFuture,
  };
}

// Sugestões de recorrência: mesma descrição, valor parecido, 3 meses seguidos, ainda fora da lista.
export function recurrenceSuggestions(state, kind = "income", ref = today()) {
  const type = kind === "income" ? "income" : "expense";
  const known = new Set((state.recurrences || []).map((r) => normName(r.description)));
  const groups = new Map();
  for (const t of state.transactions) {
    if (!t.confirmed || t.type !== type || !real(t) || t.installments > 1) continue;
    const k = normName(t.description);
    if (!k || known.has(k)) continue;
    (groups.get(k) || groups.set(k, []).get(k)).push(t);
  }
  const from = addMonths(monthKey(ref) + "-01", -6);
  const out = [];
  for (const rows of groups.values()) {
    const recent = rows.filter((t) => t.date >= from);
    const months = [...new Set(recent.map((t) => monthKey(t.date)))].sort();
    if (months.length < 3) continue;
    const tail = months.slice(-3);
    if (!tail.every((m, i) => i === 0 || monthKey(addMonths(tail[i - 1] + "-01", 1)) === m)) continue;
    const avg = recent.reduce((a, t) => a + t.amount, 0) / recent.length;
    if (!recent.every((t) => Math.abs(t.amount - avg) <= avg * 0.1)) continue;
    const newest = [...recent].sort((a, b) => b.date.localeCompare(a.date))[0];
    out.push({ name: newest.description, amount: newest.amount, day: Number(newest.date.slice(8)), category: newest.category || "Outros", frequency: "monthly", type });
  }
  return out.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "pt-BR"));
}
