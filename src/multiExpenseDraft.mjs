import { splitDraft } from "./shoppingSplit.mjs";
import { wouldDuplicate } from "./shoppingReconcile.mjs";
import { money } from "./finance.mjs";
import { safeIsIsoDate, safeSum } from "./hardened.mjs";

const cap = 20;
const array = (batch) => Array.isArray(batch) ? batch : batch?.expenses;
const text = (value) => typeof value === "string" && !!value.trim();
const id = (value) => text(value) && !["__proto__", "constructor", "prototype"].includes(value);
const failure = (message) => ({ ok: false, message });

export function validateBatch(batch) {
  const expenses = array(batch);
  if (!Array.isArray(expenses) || !expenses.length) return failure("O lote precisa ter pelo menos uma despesa com valor.");
  if (expenses.length > cap) return failure("O lote pode ter até 20 despesas.");
  for (const [index, expense] of expenses.entries()) {
    const prefix = "Despesa " + (index + 1) + ": ";
    if (!Number.isSafeInteger(expense?.amountCents) || expense.amountCents <= 0) return failure(prefix + "informe um valor maior que zero.");
    if (!text(expense.category) || !text(expense.description)) return failure(prefix + "informe a categoria e a descrição.");
    if (!safeIsIsoDate(expense.date)) return failure(prefix + "informe uma data válida.");
    if (!id(expense.accountId)) return failure(prefix + "escolha uma conta.");
  }
  const totalCents = safeSum(expenses.map((expense) => expense.amountCents));
  if (totalCents === null) return failure("O total do lote ultrapassa o limite de centavos.");
  if (batch?.totalCents !== undefined && batch.totalCents !== totalCents) return failure("As despesas não somam o total do carrinho.");
  return { ok: true, totalCents };
}

export function buildExpenseBatch(state = {}, { date, accountId, split = false } = {}) {
  if (!(state.shoppingItems ?? []).some((item) => item?.inCart))
    return { ...failure("O carrinho está vazio."), expenses: [], skipped: [], totalCents: 0 };
  let draft;
  try {
    draft = splitDraft(state, { mode: split === true || split === "category" ? "category" : "single" });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return { ...failure(error.message), expenses: [], skipped: [], totalCents: null };
  }
  const { expenses, unpriced: skipped, totalCents } = draft;
  const batch = { expenses: expenses.map(({ type, ...expense }) => ({ ...expense, date, accountId })), skipped, totalCents };
  return { ...batch, ...validateBatch(batch) };
}

export function batchDuplicates(state = {}, batch) {
  const expenses = array(batch);
  if (!Array.isArray(expenses) || !validateBatch(batch).ok) return [];
  return expenses.filter((expense) => wouldDuplicate(state, { type: "expense", ...expense }));
}

export function batchSummaryText(batch) {
  const expenses = array(batch);
  if (!Array.isArray(expenses) || !expenses.length) return "Nenhuma despesa no lote.";
  const parts = expenses.slice(0, 3).map(({ category, amountCents }) => category + " " + money(amountCents));
  if (expenses.length > 3) parts.push("…");
  return expenses.length + (expenses.length === 1 ? " despesa: " : " despesas: ") + parts.join(" · ");
}
