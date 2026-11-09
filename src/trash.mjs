// Lixeira (S11): lançamentos excluídos ficam 30 dias recuperáveis e depois são purgados.
// Cada item guarda o grupo inteiro (todas as parcelas de uma compra) para restaurar junto.
import { deleteTransaction } from "./finance.mjs";

export const TRASH_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export function purgeExpired(state, now = Date.now(), days = TRASH_DAYS) {
  const trash = state.trash || [];
  const kept = trash.filter((x) => now - x.deletedAt < days * DAY);
  return kept.length === trash.length ? state : { ...state, trash: kept };
}

export function trashTransaction(state, id, now = Date.now()) {
  const next = deleteTransaction(state, id);
  const left = new Set(next.transactions.map((t) => t.id));
  const removed = state.transactions.filter((t) => !left.has(t.id));
  const first = removed.find((t) => t.id === id) || removed[0];
  const entry = {
    id: "lx-" + first.id + "-" + now,
    deletedAt: now,
    description: first.description,
    amount: removed.reduce((n, t) => n + t.amount, 0),
    type: first.type,
    count: removed.length,
    transactions: removed,
  };
  return purgeExpired({ ...next, trash: [entry, ...(state.trash || [])] }, now);
}

export function restoreTrash(state, trashId) {
  const entry = (state.trash || []).find((x) => x.id === trashId);
  if (!entry) throw Error("Item não está mais na lixeira.");
  const accounts = new Set(state.accounts.map((a) => a.id));
  const cards = new Set(state.cards.map((c) => c.id));
  for (const t of entry.transactions) {
    if (t.cardId ? !cards.has(t.cardId) : !accounts.has(t.accountId))
      throw Error("A conta ou o cartão deste lançamento não existe mais. Recrie-o antes de restaurar.");
    if (t.destinationId && !accounts.has(t.destinationId))
      throw Error("A conta de destino desta transferência não existe mais.");
  }
  const have = new Set(state.transactions.map((t) => t.id));
  return {
    ...state,
    transactions: [...state.transactions, ...entry.transactions.filter((t) => !have.has(t.id))],
    trash: state.trash.filter((x) => x.id !== trashId),
  };
}

export const purgeTrash = (state, trashId) => ({ ...state, trash: (state.trash || []).filter((x) => x.id !== trashId) });
export const emptyTrash = (state) => ({ ...state, trash: [] });
export const daysLeft = (entry, now = Date.now(), days = TRASH_DAYS) =>
  Math.max(0, Math.ceil((entry.deletedAt + days * DAY - now) / DAY));
