import { balance } from "./finance.mjs";
import { isBox, boxReport } from "./goals.mjs";
import { safeIsIsoDate, safeSum } from "./hardened.mjs";

const rows = (value) => Array.isArray(value) ? value : [];
const amountOk = (value) => Number.isSafeInteger(value) && value >= 0;
const sum = (list) => safeSum(list.map((n) => amountOk(n) ? n : 0));
const fail = (error) => ({ error });
const cleanId = (value) => typeof value === "string" && value !== "" && !["__proto__", "constructor", "prototype"].includes(value);
const saved = (row) => amountOk(row?.saved) ? row.saved : sum(rows(row?.deposits).map((d) => d?.amount)) ?? 0;

export function migratePotsFromGoals(state = {}) {
  const goals = rows(state.goals);
  if (!goals.some((goal) => goal && isBox(goal) && cleanId(goal.id))) return state;
  const pots = [...rows(state.pots)];
  const used = new Set(pots.map((pot) => pot?.id));
  const nextGoals = [];
  for (const goal of goals) {
    if (!goal || !isBox(goal) || !cleanId(goal.id)) { nextGoals.push(goal); continue; }
    const { target, deadline, kind, completedAt, ...funds } = goal;
    let potId = goal.id;
    for (let suffix = 1; used.has(potId); suffix++) potId = goal.id + "-caixinha-" + suffix;
    used.add(potId);
    pots.push({ ...funds, id: potId, saved: saved(goal), deposits: rows(goal.deposits), history: rows(goal.history) });
    if (target > 0 || deadline || completedAt) {
      const { deposits, history, moves, ...goalFields } = goal;
      nextGoals.push({ ...goalFields, kind: "goal", saved: 0, potId });
    }
  }
  return { ...state, pots, goals: nextGoals };
}

const findPot = (state, id) => cleanId(id) ? rows(state.pots).find((pot) => pot?.id === id) : undefined;
const replacePot = (state, pot, updated) => ({ ...state, pots: rows(state.pots).map((entry) => entry === pot ? updated : entry) });

export function linkGoalToPot(state = {}, goalId, potId) {
  const goal = cleanId(goalId) ? rows(state.goals).find((entry) => entry?.id === goalId && !isBox(entry)) : undefined;
  if (!goal) return fail("Meta não encontrada.");
  const pot = potId === null ? null : findPot(state, potId);
  if (potId !== null && (!pot || pot.archived)) return fail("Escolha uma caixinha ativa.");
  if ((goal.potId ?? null) === potId) return state;
  return { ...state, goals: state.goals.map((row) => row === goal ? { ...goal, potId } : row) };
}

function movement(pot, type, amount, accountId, date, id) {
  const history = rows(pot.history);
  const used = new Set([...history, ...rows(pot.deposits)].map((row) => row.id));
  let newId = id;
  if (newId === undefined) {
    let i = history.length + 1;
    while (used.has(pot.id + "-mov-" + i)) i++;
    newId = pot.id + "-mov-" + i;
  }
  if (!cleanId(newId) || used.has(newId)) return null;
  return { id: newId, type, amount, ...(accountId ? { accountId } : {}), date };
}

function ledger(state, accountId) {
  const account = rows(state.accounts).find((row) => row?.id === accountId && !row.archived);
  if (!account) return null;
  const total = balance({ accounts: [{ ...account, initial: account.initial ?? 0 }], transactions: rows(state.transactions).filter(Boolean) }, accountId);
  const reserved = sum([...rows(state.pots), ...rows(state.goals)].flatMap((pot) =>
    rows(pot?.deposits).filter((row) => row?.accountId === accountId).map((row) => row.amount)));
  return reserved === null ? null : total - reserved;
}

export function depositToPot(state = {}, id, { amountCents, amount = amountCents, accountId, date, id: moveId } = {}) {
  const pot = findPot(state, id);
  if (!pot || pot.archived) return fail("Escolha uma caixinha ativa.");
  if (!amountOk(amount) || !amount || !safeIsIsoDate(date)) return fail("Confira o valor e a data do depósito.");
  const available = ledger(state, accountId);
  if (available === null || !Number.isSafeInteger(available) || available < amount) return fail("O saldo disponível da conta é insuficiente.");
  const next = safeSum([saved(pot), amount]);
  if (next === null) return fail("O saldo da caixinha ultrapassa o limite.");
  const move = movement(pot, "deposit", amount, accountId, date, moveId);
  if (!move) return fail("O depósito já está registrado ou tem identificador inválido.");
  return replacePot(state, pot, { ...pot, saved: next, history: [...rows(pot.history), move],
    deposits: [...rows(pot.deposits), { id: move.id, amount, accountId, date }] });
}

export function withdrawFromPot(state = {}, id, { amountCents, amount = amountCents, accountId, date, id: moveId } = {}) {
  const pot = findPot(state, id);
  if (!pot || pot.archived) return fail("Escolha uma caixinha ativa.");
  if (!amountOk(amount) || !amount || !safeIsIsoDate(date)) return fail("Confira o valor e a data da retirada.");
  if (!rows(state.accounts).some((row) => row?.id === accountId)) return fail("Conta da retirada não encontrada.");
  const available = sum(rows(pot.deposits).filter((row) => row.accountId === accountId).map((row) => row.amount));
  if (available === null || amount > available || amount > saved(pot)) return fail("A retirada supera o saldo reservado na conta.");
  const move = movement(pot, "withdrawal", amount, accountId, date, moveId);
  if (!move) return fail("A retirada já está registrada ou tem identificador inválido.");
  let left = amount;
  const deposits = rows(pot.deposits).flatMap((row) => {
    if (!left || row.accountId !== accountId) return [row];
    const used = Math.min(left, row.amount);
    left -= used;
    return used === row.amount ? [] : [{ ...row, amount: row.amount - used }];
  });
  return replacePot(state, pot, { ...pot, saved: saved(pot) - amount, deposits, history: [...rows(pot.history), move] });
}

// Meta ligada a uma caixinha arquivada não pode seguir lendo uma caixinha zerada e fora das opções:
// com o saldo indo para outra caixinha, o vínculo acompanha o dinheiro; indo para uma conta, a meta
// volta ao progresso manual (potId nulo).
export function archivePot(state = {}, id, options = {}) {
  const next = archivePotCore(state, id, options);
  if (next === state || next?.error || !Array.isArray(next?.goals)) return next;
  const target = options.toPotId && !options.toAccountId ? options.toPotId : null;
  if (!next.goals.some((goal) => goal?.potId === id)) return next;
  return { ...next, goals: next.goals.map((goal) => goal?.potId === id ? { ...goal, potId: target } : goal) };
}

function archivePotCore(state = {}, id, { toPotId, toAccountId, date } = {}) {
  const pot = findPot(state, id);
  if (!pot) return fail("Caixinha não encontrada.");
  if (pot.archived) return state;
  const value = saved(pot);
  if (!value) return replacePot(state, pot, { ...pot, archived: true });
  if (!safeIsIsoDate(date)) return fail("Escolha um destino para o saldo e informe a data.");
  if (toPotId && !toAccountId) {
    const target = findPot(state, toPotId);
    if (!target || target === pot || target.archived) return fail("Escolha outra caixinha ativa para receber o saldo.");
    const combined = safeSum([saved(target), value]);
    if (combined === null) return fail("O saldo do destino ultrapassa o limite.");
    const out = movement(pot, "withdrawal", value, undefined, date);
    const into = movement(target, "deposit", value, undefined, date);
    const moved = rows(pot.deposits).map((row, index) => ({ ...row, id: into.id + "-reserva-" + index }));
    const next = replacePot(state, target, { ...target, saved: combined,
      deposits: [...rows(target.deposits), ...moved], history: [...rows(target.history), { ...into, fromPotId: id }] });
    return replacePot(next, pot, { ...pot, archived: true, saved: 0, deposits: [],
      history: [...rows(pot.history), { ...out, toPotId }] });
  }
  if (toAccountId && !toPotId) {
    if (!rows(state.accounts).some((row) => row?.id === toAccountId && !row.archived))
      return fail("Escolha uma conta ativa.");
    const byAccount = new Map();
    const accounts = new Map(rows(state.accounts).filter(Boolean).map((row) => [row.id, row]));
    for (const reserve of rows(pot.deposits)) {
      const source = reserve?.accountId;
      if (!accounts.has(source) || !amountOk(reserve.amount)) return fail("Confira as contas e os valores da reserva.");
      const next = safeSum([byAccount.get(source) ?? 0, reserve.amount]);
      if (next === null) return fail("O saldo da reserva ultrapassa o limite.");
      byAccount.set(source, next);
    }
    if (safeSum(byAccount.values()) !== value) return fail("Vincule todo o saldo às contas de origem antes de arquivar.");
    const current = rows(state.transactions).filter(Boolean);
    const available = (accountId) => balance({
      accounts: [{ ...accounts.get(accountId), initial: accounts.get(accountId).initial ?? 0 }], transactions: current,
    }, accountId);
    const incoming = value - (byAccount.get(toAccountId) ?? 0);
    if (incoming && safeSum([available(toAccountId), incoming]) === null)
      return fail("A conta de destino ultrapassaria o limite de saldo.");
    const used = new Set(current.flatMap((row) => [row.id, row.groupId]));
    const transfers = [];
    let sequence = 1;
    for (const [source, amount] of byAccount) {
      if (!amount || source === toAccountId) continue;
      const funds = available(source);
      if (!Number.isSafeInteger(funds) || funds < amount) return fail("Uma conta de origem não tem saldo para transferir a reserva.");
      while (used.has(pot.id + "-transferencia-" + sequence)) sequence++;
      const transactionId = pot.id + "-transferencia-" + sequence++;
      transfers.push({ id: transactionId, groupId: transactionId, type: "transfer", amount, date,
        description: "Saldo de caixinha arquivada", accountId: source, destinationId: toAccountId,
        confirmed: true, cardId: null, invoiceMonth: null, category: "Transferência", installment: 1, installments: 1, tags: [] });
    }
    const move = movement(pot, "withdrawal", value, toAccountId, date);
    const next = replacePot(state, pot, { ...pot, archived: true, saved: 0, deposits: [], history: [...rows(pot.history), move] });
    return transfers.length ? { ...next, transactions: [...rows(state.transactions), ...transfers] } : next;
  }
  return fail("Escolha uma caixinha ou a conta da reserva para receber o saldo.");
}

export function potSummary(state = {}, now) {
  const pots = rows(state.pots).filter(Boolean);
  const date = safeIsIsoDate(now) ? now : Number.isFinite(now) && Math.abs(now) <= 8.64e15 ?
    new Date(now).toISOString().slice(0, 10) : "";
  const byId = new Map(pots.map((pot) => [pot.id, pot]));
  const summaries = pots.map((pot) => ({ id: pot.id, name: pot.name, savedCents: saved(pot), archived: pot.archived === true,
    monthly: boxReport({ history: rows(pot.history).filter((row) => safeIsIsoDate(row?.date) && amountOk(row.amount) &&
      (!date || row.date <= date)) }) }));
  return { pots: summaries, totalCents: sum(summaries.map((pot) => pot.savedCents)),
    goals: rows(state.goals).filter((goal) => goal && !isBox(goal)).map((goal) => ({
      id: goal.id, potId: goal.potId ?? null, savedCents: byId.has(goal.potId) ? saved(byId.get(goal.potId)) : saved(goal), targetCents: goal.target ?? null, deadline: goal.deadline ?? "",
    })) };
}
