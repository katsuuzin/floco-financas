// Recorrências (A1), central de parcelas (A2) e atalho "alguém me deve" (L7).
import { uid, isDate, monthKey, addMonths, addTransaction, invoice } from "./finance.mjs";
import { recurrenceEvents, occurrenceDate, addReceivable } from "./planning.mjs";

const PER_MONTH = { daily: 365 / 12, weekly: 52 / 12, fortnightly: 26 / 12, monthly: 1, yearly: 1 / 12 };
export const frequencyLabel = {
  daily: "Diária",
  weekly: "Semanal",
  fortnightly: "A cada 14 dias",
  monthly: "Mensal",
  yearly: "Anual",
};

// Total equivalente por mês e por ano das recorrências ativas.
export function recurrenceTotals(s) {
  const out = { expense: { month: 0, year: 0, count: 0 }, income: { month: 0, year: 0, count: 0 } };
  for (const r of s.recurrences || []) {
    if (!r.active || !out[r.type]) continue;
    const m = Math.round(r.amount * (PER_MONTH[r.frequency] || 0));
    out[r.type].month += m;
    out[r.type].year += Math.round(r.amount * (PER_MONTH[r.frequency] || 0) * 12);
    out[r.type].count++;
  }
  return out;
}

// Próxima ocorrência a partir de uma data (gerada ou não).
export function nextOccurrence(r, from) {
  for (let i = 0; i < 10000; i++) {
    const d = occurrenceDate(r, i);
    if (r.endDate && d > r.endDate) return null;
    if (d >= from) return d;
  }
  return null;
}

// Calendário do mês: ocorrências de recorrências (geradas ou previstas) por dia.
export function recurrenceCalendar(s, month) {
  const start = month + "-01";
  const end = monthKey(addMonths(start, 1)) + "-01";
  const last = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const through = `${month}-${String(last).padStart(2, "0")}`;
  const days = new Map();
  const push = (date, item) => days.set(date, [...(days.get(date) || []), item]);
  for (const t of s.transactions)
    if (t.recurrenceId && t.date >= start && t.date < end)
      push(t.date, { description: t.description, amount: t.amount, type: t.type, confirmed: t.confirmed, generated: true });
  for (const e of recurrenceEvents(s, through, start))
    push(e.date, { description: e.description, amount: e.amount, type: e.type, confirmed: false, generated: false });
  return [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

// Compromisso de parcelas por mês (cartão por fatura, conta por data, contratos).
export function installmentPlan(s, fromMonth, months = 12) {
  const map = new Map();
  const add = (m, v, kind) => {
    const row = map.get(m) || { month: m, card: 0, account: 0, contract: 0, total: 0 };
    row[kind] += v;
    row.total += v;
    map.set(m, row);
  };
  const paidInvoice = new Map();
  for (const t of s.transactions) {
    if (t.cardId && t.installments > 1) {
      if (t.invoiceMonth < fromMonth) continue;
      const key = t.cardId + ":" + t.invoiceMonth;
      if (!paidInvoice.has(key)) {
        const inv = invoice(s, t.cardId, t.invoiceMonth);
        paidInvoice.set(key, inv.total ? inv.paid / inv.total : 0);
      }
      add(t.invoiceMonth, Math.round(t.amount * (1 - Math.min(1, paidInvoice.get(key)))), "card");
    } else if (!t.confirmed && t.financingId && monthKey(t.date) >= fromMonth) {
      add(monthKey(t.date), t.amount - (t.paidPart || 0), "contract");
    } else if (!t.confirmed && t.installments > 1 && !t.cardId && monthKey(t.date) >= fromMonth) {
      add(monthKey(t.date), t.amount, "account");
    }
  }
  const rows = Array.from({ length: months }, (_, i) => {
    const m = monthKey(addMonths(fromMonth + "-01", i));
    return map.get(m) || { month: m, card: 0, account: 0, contract: 0, total: 0 };
  });
  const remaining = [...map.values()].filter((r) => r.month >= fromMonth).reduce((n, r) => n + r.total, 0);
  const cardMonths = [...map.values()].filter((r) => r.card > 0).map((r) => r.month).sort();
  const lastCard = cardMonths[cardMonths.length - 1] || null;
  const freeFromCards = lastCard ? monthKey(addMonths(lastCard + "-01", 1)) : fromMonth;
  return { rows, remaining, freeFromCards };
}

// Compras parceladas em andamento, agrupadas por compra.
export function installmentPurchases(s, fromMonth) {
  const groups = new Map();
  for (const t of s.transactions) {
    if (!(t.installments > 1) || t.financingId || !t.groupId) continue;
    const g = groups.get(t.groupId) || { groupId: t.groupId, description: t.description, cardId: t.cardId, accountId: t.accountId, total: 0, count: t.installments, left: 0, leftValue: 0, last: "", first: "" };
    const m = t.invoiceMonth || monthKey(t.date);
    g.total += t.amount;
    if (m >= fromMonth && (t.cardId ? true : !t.confirmed)) {
      g.left++;
      g.leftValue += t.amount;
    }
    if (!g.last || m > g.last) g.last = m;
    if (!g.first || m < g.first) g.first = m;
    groups.set(t.groupId, g);
  }
  return [...groups.values()].sort((a, b) => a.last.localeCompare(b.last));
}

// L7: a despesa sai da conta, mas vira valor a receber — fora dos relatórios de gasto.
export function expenseOwed(s, input) {
  if (!input.person?.trim()) throw Error("Informe quem deve esse valor.");
  if (input.cardId) throw Error("Lance a compra do cartão normalmente e registre o valor em Quem me deve.");
  const receivableId = uid();
  const description = input.description?.trim() || input.category || "Valor emprestado";
  let next = addTransaction(s, { ...input, ignored: true, description, installments: 1 });
  const tx = next.transactions[next.transactions.length - 1];
  next = addReceivable(next, {
    person: input.person,
    description,
    amount: input.amount,
    date: input.date,
    dueDate: input.dueDate && isDate(input.dueDate) ? input.dueDate : "",
  });
  const rec = next.receivables[next.receivables.length - 1];
  return {
    ...next,
    receivables: next.receivables.map((r) => (r.id === rec.id ? { ...r, id: receivableId, sourceTransactionId: tx.id } : r)),
    transactions: next.transactions.map((t) => (t.id === tx.id ? { ...t, receivableId } : t)),
  };
}
