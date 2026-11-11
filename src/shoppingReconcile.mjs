import { normalizeName, purchasesOf } from "./shoppingPurchases.mjs";
import { normalizeStoreName } from "./shoppingStores.mjs";
import { safeCentsFromBr, safeIsIsoDate } from "./hardened.mjs";

const oneDay = 86400000;
const marketWords = new Set(["compra", "de", "em", "mercado", "supermercado", "pagamento", "pix", "ltda"]);
const dateStamp = (date) => safeIsIsoDate(date) ? Date.parse(date + "T00:00:00Z") : NaN;
const market = (tx) => ["mercado", "supermercado"].includes(normalizeName(tx.category)) ||
  normalizeName(tx.subcategory) === "supermercado";
const wordMatch = (description, store) => {
  if (!store || !description) return false;
  if ((" " + description + " ").includes(" " + store + " ")) return true;
  const words = store.split(" ").filter((word) => word.length >= 3 && !marketWords.has(word));
  return words.length > 0 && words.every((word) => (" " + description + " ").includes(" " + word + " "));
};

export function findMatchingTransactions(state, purchase, { daysTolerance = 2 } = {}) {
  const total = purchase?.totalCents ?? purchase?.amountCents;
  const date = dateStamp(purchase?.date);
  if (!Number.isSafeInteger(total) || total <= 0 || !Number.isFinite(date) ||
      !Number.isSafeInteger(daysTolerance) || daysTolerance < 0) return [];
  const blocked = new Set(purchasesOf(state).filter((row) => row.id !== purchase.id)
    .map((row) => row.transactionId).filter(Boolean));
  const store = normalizeStoreName(purchase.marketName ?? "");
  const candidates = [];
  const tolerance = Math.floor(total / 100);
  for (const row of state.transactions ?? []) {
    if (row?.type !== "expense" || row.destinationId || typeof row.id !== "string" || !row.id ||
        blocked.has(row.id) || !Number.isSafeInteger(row.amount) || row.amount <= 0) continue;
    const difference = Math.abs(row.amount - total);
    if (difference > tolerance) continue;
    const distance = Math.abs(dateStamp(row.date) - date) / oneDay;
    if (!Number.isFinite(distance) || distance > daysTolerance) continue;
    const sameStore = wordMatch(normalizeName(row.description), store);
    const category = market(row);
    if (!sameStore && !category) continue;
    const exact = difference === 0;
    const confidence = exact && distance === 0 && sameStore ? "alta" : exact && (distance === 0 || sameStore) ? "média" : "baixa";
    const reason = (exact ? "Mesmo valor" : "Valor próximo") + (distance === 0 ? " e mesma data" : " e data próxima") +
      (sameStore ? ", com a loja na descrição." : ", na categoria de mercado.");
    candidates.push({ transactionId: row.id, confidence, reason, difference, distance, sameStore });
  }
  return candidates.sort((a, b) => a.difference - b.difference || a.distance - b.distance ||
    Number(b.sameStore) - Number(a.sameStore) || a.transactionId.localeCompare(b.transactionId));
}

export function suggestLink(state, purchase) {
  const candidates = findMatchingTransactions(state, purchase);
  if (!candidates.length) return null;
  const [first] = candidates;
  const tied = candidates.filter((row) => row.difference === first.difference && row.distance === first.distance &&
    row.sameStore === first.sameStore);
  if (tied.length > 1) return tied.map(({ transactionId, confidence, reason }) => ({ transactionId, confidence, reason }));
  const { transactionId, confidence, reason } = first;
  return { transactionId, confidence, reason };
}

export function wouldDuplicate(state, draft) {
  if (draft?.type && draft.type !== "expense") return false;
  const totalCents = draft?.totalCents ?? draft?.amountCents ??
    (typeof draft?.amount === "string" ? safeCentsFromBr(draft.amount) : draft?.amount);
  const description = draft?.description?.replace(/^compra\s*[-–]\s*/iu, "");
  return findMatchingTransactions(state, { ...draft, totalCents, marketName: draft?.marketName ?? description }).length > 0;
}
