// O3a — Fatura do cartão: pagamento mínimo, total ajustado à mão, análise e escolha da fatura.
import { invoice, invoiceMonth, addMonths, isDate, monthKey } from "./finance.mjs";

// Pagamento mínimo estimado: 15% do total da fatura (para cima), nunca mais que o saldo restante.
// É uma estimativa nossa; o banco informa o valor real na fatura.
export const MIN_PAYMENT_RATE = 0.15;
export function minimumPayment(inv) {
  if (!inv.due) return 0;
  return Math.min(inv.due, Math.ceil(inv.total * MIN_PAYMENT_RATE));
}

// Ajusta o total da fatura de um mês para bater com o do banco. `cents` nulo remove o ajuste.
export function setInvoiceTotal(state, cardId, month, cents) {
  const card = state.cards.find((c) => c.id === cardId);
  if (!card) throw Error("Cartão não encontrado.");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) throw Error("Confira o mês da fatura.");
  const { manualTotals = {}, ...rest } = card;
  const next = { ...manualTotals };
  if (cents === null || cents === undefined) delete next[month];
  else {
    if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 99999999999) throw Error("Informe o total da fatura, maior que zero.");
    const paid = invoice(state, cardId, month).paid;
    if (cents < paid) throw Error("O total não pode ser menor que o valor já pago nesta fatura.");
    next[month] = cents;
  }
  const row = Object.keys(next).length ? { ...rest, manualTotals: next } : rest;
  return { ...state, cards: state.cards.map((c) => (c.id === cardId ? row : c)) };
}

// Análise da fatura por categoria ou tag. Estorno abate. Compra com várias tags aparece em cada
// uma. Se o total foi ajustado à mão, a diferença entra como "Ajuste manual" e a soma bate.
export function invoiceBreakdown(state, cardId, month, by = "category") {
  const inv = invoice(state, cardId, month);
  const map = new Map();
  const add = (name, v) => map.set(name, (map.get(name) || 0) + v);
  for (const t of inv.purchases) {
    const v = t.refund ? -t.amount : t.amount;
    if (by === "tag") {
      const names = (t.tags || []).map((id) => state.tags?.find((x) => x.id === id)?.name).filter(Boolean);
      if (!names.length) add("Sem tag", v);
      for (const n of names) add(`#${n}`, v);
    } else add(t.category || "Outros", v);
  }
  if (inv.adjustment) add("Ajuste manual", inv.adjustment);
  const total = [...map.values()].reduce((n, v) => n + Math.max(0, v), 0) || 1;
  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount, share: Math.max(0, amount) / total }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "pt-BR"));
}

// Fatura escolhida à mão: `shift` meses a partir da automática da data (negativo = anterior).
export function chosenInvoiceMonth(card, date, shift = 0) {
  if (!isDate(date)) return "";
  const auto = invoiceMonth(date, card);
  return shift ? monthKey(addMonths(`${auto}-01`, shift)) : auto;
}
// Quantos meses a fatura de uma compra já gravada está distante da automática.
export function invoiceShiftOf(card, t) {
  if (!card || !t?.invoiceMonth || !isDate(t.date)) return 0;
  const [ay, am] = invoiceMonth(t.date, card).split("-").map(Number);
  const [y, m] = t.invoiceMonth.split("-").map(Number);
  return (y - ay) * 12 + (m - am);
}
