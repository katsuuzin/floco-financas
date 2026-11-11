import { balance, includedAccounts, signedAmount } from "./finance.mjs";
import { safeIsIsoDate } from "./hardened.mjs";

const rows = (value) => Array.isArray(value) ? value : [];
const orderOf = (account, index) => Number.isSafeInteger(account.order) && account.order >= 0 ? account.order : index;
const refDate = (now) => safeIsIsoDate(now) ? now : Number.isFinite(now) && Math.abs(now) <= 8.64e15 ?
  new Date(now).toISOString().slice(0, 10) : "";

export function normalizeOrder(accounts) {
  const source = rows(accounts);
  const sorted = source.flatMap((account, index) => account && typeof account === "object" ?
    [{ account, index, order: orderOf(account, index) }] : [])
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map(({ account }, order) => account.order === order ? account : { ...account, order });
  return sorted.length === source.length && sorted.every((account, i) => account === source[i]) ? source : sorted;
}

export function moveAccount(accounts, id, toIndex) {
  const ordered = normalizeOrder(accounts);
  const index = ordered.findIndex((row) => row.id === id);
  if (index < 0 || !Number.isInteger(toIndex)) return ordered;
  const next = ordered.slice();
  const [account] = next.splice(index, 1);
  next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, account);
  return next.map((row, order) => row.order === order ? row : { ...row, order });
}

export function visibleAccounts(state = {}, { includeArchived = false } = {}) {
  return normalizeOrder(state.accounts).filter((account) => includeArchived || !account.archived);
}

export function visibleTotalBalance(state = {}) {
  const accounts = includedAccounts({ accounts: visibleAccounts(state) });
  const ids = new Set(accounts.map((row) => row.id));
  let total = 0n;
  for (const row of accounts) if (Number.isSafeInteger(row.initial)) total += BigInt(row.initial);
  for (const row of rows(state.transactions)) {
    if (!row?.confirmed || row.cardId || !Number.isSafeInteger(row.amount)) continue;
    if (ids.has(row.accountId)) total += BigInt(signedAmount(row));
    if (row.type === "transfer" && ids.has(row.destinationId)) total += BigInt(row.amount);
  }
  const result = Number(total);
  return Number.isSafeInteger(result) ? result : null;
}

export function archiveAccount(state = {}, id, { force = false, now } = {}) {
  const accounts = rows(state.accounts);
  const account = typeof id === "string" && id ? accounts.find((row) => row?.id === id) : undefined;
  if (!account) return { error: "Conta não encontrada.", blockers: [] };
  if (account.archived) return state;
  const transactions = rows(state.transactions).filter(Boolean);
  const date = refDate(now);
  const blockers = [];
  const current = balance({ accounts: [{ ...account, initial: account.initial ?? 0 }], transactions }, id);
  if (current !== 0 && !force) blockers.push({ code: "saldo", message: "A conta ainda tem saldo." });
  if (rows(state.cards).some((card) => card?.accountId === id || card?.paymentAccountId === id))
    blockers.push({ code: "cartao", message: "Há um cartão vinculado a esta conta." });
  if (transactions.some((row) => (row.accountId === id || row.destinationId === id) &&
      safeIsIsoDate(row.date) && (row.confirmed === false || (date && row.date > date))))
    blockers.push({ code: "futuro", message: "Há um lançamento futuro ou pendente vinculado a esta conta." });
  if (rows(state.pots).some((pot) => pot && !pot.archived && rows(pot.deposits).some((row) => row?.accountId === id && row.amount > 0)))
    blockers.push({ code: "reserva", message: "Há dinheiro reservado em caixinha nesta conta. Retire a reserva antes de arquivar." });
  if (blockers.length) return { error: "Resolva os vínculos e confira o saldo antes de arquivar a conta.", blockers };
  return { ...state, accounts: accounts.map((row) => row === account ? { ...account, archived: true } : row) };
}

export function unarchiveAccount(state = {}, id) {
  const accounts = rows(state.accounts);
  const account = typeof id === "string" && id ? accounts.find((row) => row?.id === id) : undefined;
  if (!account) return { error: "Conta não encontrada.", blockers: [] };
  return account.archived ? { ...state, accounts: accounts.map((row) =>
    row === account ? { ...account, archived: false } : row) } : state;
}
