import { safeCentsFromBr } from "./hardened.mjs";
import { currentItemsOf as itemsOf, lineTotal, purchaseDraft } from "./shopping.mjs";
import { sortByAisles } from "./shoppingAisles.mjs";
import { budgetStatus } from "./shoppingBudget.mjs";
import { wouldDuplicate } from "./shoppingReconcile.mjs";
import { describeItem, describeProgress } from "./shoppingSpeech.mjs";
import { formatElapsed, pendingByCategory, tripSummary } from "./shoppingTrip.mjs";

const maxCents = 99_999_999_999;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function parseLimitInput(text) {
  const cents = typeof text === "string" && !text.trim() ? 0 : safeCentsFromBr(text);
  return cents !== null && cents <= maxCents ? { ok: true, cents } :
    { ok: false, message: "Informe um limite como 250,00 ou deixe o campo vazio." };
}

export function finishPlan(state = {}) {
  const draft = purchaseDraft(state);
  const items = itemsOf(state);
  const skipped = items.filter((item) => item.inCart && lineTotal(item) === null);
  const pending = items.length - draft.items;
  if (!draft.items) return { ok: false, expense: null, skipped, pending, warning: "O carrinho está vazio." };
  const warnings = [];
  if (skipped.length) warnings.push(draft.priced ? "Itens sem preço ficam fora do valor sugerido." :
    "Informe o valor da compra no formulário.");
  if (pending) warnings.push(pending === 1 ? "Ainda há 1 item pendente." : "Ainda há " + pending + " itens pendentes.");
  return { ok: true, expense: { type: "expense", amountCents: draft.totalCents, amount: draft.amountText,
    description: draft.description }, skipped, pending, warning: warnings.join(" ") };
}

export function tripViewModel(state = {}, { session, limitCents, now } = {}) {
  const hidden = state.settings?.hide === true;
  const display = (cents) => hidden ? "R$ ••••" : money.format(cents / 100);
  const startedAt = session?.startedAt ?? now;
  const sum = tripSummary(state, { startedAt, now });
  const elapsed = { minutes: sum.elapsedMinutes, text: formatElapsed(sum.elapsedMinutes) };
  const limit = Number.isSafeInteger(limitCents) && limitCents > 0 ? limitCents : 0;
  const budget = budgetStatus({ limitCents: limit, cartCents: sum.cartCents, pendingEstimateCents: sum.pendingEstimateCents });
  const row = (item, inCart) => {
    const totalCents = lineTotal(item);
    const qty = String(item.qty).replace(".", ",");
    const quantityText = item.unit ? qty + " " + item.unit : item.qty > 1 ? qty + "x" : "";
    const spoken = hidden ? describeItem({ ...item, inCart, priceCents: null }).replace(/, sem preço$/u,
      totalCents === null ? ", sem preço" : ", valor oculto") : describeItem({ ...item, inCart });
    return { ...item, inCart, totalCents, totalText: totalCents === null ? "" : display(totalCents), quantityText, spoken };
  };
  const allGroups = sortByAisles(pendingByCategory(state)).map((group) => ({
    ...group, items: group.items.map((item) => ({ ...row(item, false), category: group.category })),
  }));
  // "Faltou" vai para uma seção própria no fim ("Em falta"); o resto segue agrupado por categoria.
  const missingRows = allGroups.flatMap((group) => group.items.filter((item) => item.status === "missing"));
  const groups = allGroups.map((group) => {
    const items = group.items.filter((item) => item.status !== "missing");
    return { ...group, items, count: items.length };
  }).filter((group) => group.items.length);
  const inCart = itemsOf(state).filter((item) => item.inCart).map((item) => row(item, true));
  const cart = { cents: sum.cartCents, text: display(sum.cartCents), unpriced: sum.cartUnpriced };
  const progress = { items: sum.inCartCount, total: sum.total, pending: sum.pendingCount,
    percent: Math.round(sum.progress * 100) };
  const missing = sum.pendingUnpriced ? " (" + sum.pendingUnpriced + " sem preço)" : "";
  const pendingText = sum.pendingEstimateCents > 0 ?
    "Falta pegar cerca de " + display(sum.pendingEstimateCents) + missing + ". Total estimado " + display(sum.grandEstimateCents) + "." :
    sum.pendingUnpriced ? (sum.pendingUnpriced === 1 ? "1 item pendente sem preço." : sum.pendingUnpriced + " itens pendentes sem preço.") : "";
  const spoken = {
    lines: [...groups.flatMap((group) => group.items), ...missingRows, ...inCart].map(({ id, spoken }) => ({ id, text: spoken })),
    header: [describeProgress(hidden ? { ...sum, cartCents: undefined } : sum) + ".",
      sum.cartUnpriced ? sum.cartUnpriced + " no carrinho sem preço." : "", "Tempo " + elapsed.text + ".",
      limit ? budget.message : ""].filter(Boolean).join(" "),
  };
  const finish = finishPlan(state);
  const validNow = Number.isFinite(now) && Math.abs(now) <= 8.64e15;
  const date = validNow ? new Date(now).toISOString().slice(0, 10) : "";
  return { cart, progress, elapsed, budget: { ...budget, color: budget.level, limitCents: limit,
    visible: limit > 0, text: limit ? "Limite " + display(limit) + " · " + budget.message : "",
    action: limit ? "Alterar limite" : "Definir limite de gasto" }, groups, missing: missingRows, inCart,
    estimate: { pendingCents: sum.pendingEstimateCents, grandCents: sum.grandEstimateCents,
      unpriced: sum.pendingUnpriced, text: pendingText }, canFinish: finish.ok, empty: sum.total === 0, spoken,
    finish, duplicateWarning: finish.ok && !!date && wouldDuplicate(state, { ...finish.expense, date }) };
}
