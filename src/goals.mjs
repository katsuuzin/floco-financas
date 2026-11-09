// P2/P3: metas (só acompanham um objetivo) e caixinhas (reservam dinheiro numa conta).
// Registros antigos sem `kind` são caixinhas.
import { parseMoney, addTransaction, isDate, today, uid, addMonths, monthKey } from "./finance.mjs";

export const isBox = (g) => g.kind !== "goal";

// Meta sem conta: o usuário informa quanto já juntou (pode ser zero).
export function setGoalProgress(state, goalId, text) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal || isBox(goal)) throw Error("Só metas sem conta têm progresso manual.");
  const saved = String(text).trim() === "" || /^0+(,0+)?$/.test(String(text).trim()) ? 0 : parseMoney(text);
  // A correção manual entra no histórico como "ajuste" (valor com sinal), sem contar como depósito.
  const delta = saved - goal.saved;
  return {
    ...state,
    goals: state.goals.map((g) =>
      g.id === goalId
        ? { ...g, saved, ...(delta ? { moves: [...(g.moves || []), { id: uid(), type: "adjust", date: today(), amount: delta }] } : {}) }
        : g,
    ),
  };
}

// P2a — Metas: depósitos com histórico, previsão e concluir/reabrir. Não mexem em nenhuma conta.
const MOVE_LIMIT = 99999999999;
const ownGoal = (state, goalId) => {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal || isBox(goal)) throw Error("Só metas sem conta recebem depósitos de acompanhamento.");
  return goal;
};

export function addGoalDeposit(state, goalId, /** @type {any} */ opts = {}) {
  const { amount, date = today(), note } = opts;
  const goal = ownGoal(state, goalId);
  if (goal.archived) throw Error("Meta arquivada. Restaure-a para depositar.");
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MOVE_LIMIT) throw Error("Informe um valor maior que zero.");
  if (!isDate(date)) throw Error("Confira a data do depósito.");
  const move = { id: uid(), type: "deposit", date, amount, ...(note?.trim() ? { note: note.trim().slice(0, 200) } : {}) };
  return {
    ...state,
    goals: state.goals.map((g) => (g.id === goalId ? { ...g, saved: g.saved + amount, moves: [...(g.moves || []), move] } : g)),
  };
}

// Remove um depósito (ou ajuste) do histórico e devolve o progresso ao que era.
export function removeGoalMove(state, goalId, moveId) {
  const goal = ownGoal(state, goalId);
  const move = (goal.moves || []).find((m) => m.id === moveId);
  if (!move) throw Error("Movimento não encontrado.");
  if (goal.saved - move.amount < 0) throw Error("Remover esse movimento deixaria o progresso negativo.");
  return {
    ...state,
    goals: state.goals.map((g) => (g.id === goalId ? { ...g, saved: g.saved - move.amount, moves: g.moves.filter((m) => m.id !== moveId) } : g)),
  };
}

// Concluir marca a meta como feita mesmo sem atingir o valor; reabrir desfaz.
export function completeGoal(state, goalId, done = true, date = today()) {
  ownGoal(state, goalId);
  return {
    ...state,
    goals: state.goals.map((g) => {
      if (g.id !== goalId) return g;
      const { completedAt, ...rest } = g;
      return done ? { ...rest, completedAt: date } : rest;
    }),
  };
}

// Previsão da meta, pelo ritmo dos depósitos:
//  - média por mês = total depositado ÷ meses desde o primeiro depósito até o mês de hoje (mínimo 1);
//    ajustes manuais não entram;
//  - previsão = faltante ÷ média, arredondado para cima (em meses), e a data é hoje + esses meses;
//  - com prazo, "noPrazo" compara a data prevista com o prazo e "neededMonthly" é quanto falta por mês até lá.
export function goalForecast(goal, ref = today()) {
  const remaining = Math.max(0, goal.target - goal.saved);
  const deposits = (goal.moves || []).filter((m) => m.type === "deposit");
  const out = { remaining, reached: remaining === 0, average: 0, months: null, date: "", noPrazo: null, neededMonthly: null };
  if (goal.deadline && remaining > 0 && goal.deadline >= ref) {
    const [ry, rm] = ref.split("-").map(Number);
    const [dy, dm] = goal.deadline.split("-").map(Number);
    out.neededMonthly = Math.ceil(remaining / Math.max(1, (dy - ry) * 12 + (dm - rm)));
  }
  if (!deposits.length || out.reached) return out;
  const first = deposits.map((m) => m.date).sort()[0];
  const [fy, fm] = first.split("-").map(Number);
  const [ty, tm] = monthKey(ref).split("-").map(Number);
  const span = Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
  out.average = Math.round(deposits.reduce((n, m) => n + m.amount, 0) / span);
  if (out.average <= 0) return out;
  out.months = Math.ceil(remaining / out.average);
  out.date = addMonths(ref, out.months);
  if (goal.deadline) out.noPrazo = out.date <= goal.deadline;
  return out;
}

// Arquivar caixinha só sem dinheiro reservado: o saldo reservado precisa voltar à conta antes.
export function archiveGoal(state, goalId, archived = true) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) throw Error("Meta não encontrada.");
  if (archived && isBox(goal) && goal.saved > 0)
    throw Error("Retire ou transfira o valor guardado antes de arquivar a caixinha.");
  return { ...state, goals: state.goals.map((g) => (g.id === goalId ? { ...g, archived } : g)) };
}

// Resumo de uma caixinha por mês: depósitos e retiradas (relatório da caixinha).
export function boxReport(goal) {
  const map = {};
  for (const h of goal.history || []) {
    const m = h.date.slice(0, 7);
    map[m] = map[m] || { month: m, deposits: 0, withdrawals: 0, yields: 0 };
    if (h.type === "deposit") map[m].deposits += h.amount;
    else if (h.type === "yield") map[m].yields += h.amount;
    else map[m].withdrawals += h.amount;
  }
  return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
}

// P3a — Rendimento: o que a caixinha rendeu entra como receita na conta (sobe o saldo total) e
// também na reserva da caixinha. Como os dois sobem juntos, o Disponível da conta não muda.
const LIMIT = 99999999999;
const reservedIn = (goal, accountId) =>
  (goal.deposits || []).filter((d) => d.accountId === accountId).reduce((n, d) => n + d.amount, 0);

// Conta que mais guarda desta caixinha: é onde o rendimento cai por padrão.
export function yieldAccount(goal) {
  const ids = [...new Set((goal.deposits || []).map((d) => d.accountId))];
  return ids.sort((a, b) => reservedIn(goal, b) - reservedIn(goal, a))[0] || "";
}

// Informe `amount` (quanto rendeu) ou `newSaved` (saldo atual da caixinha, maior que o guardado).
export function registerYield(state, goalId, /** @type {any} */ opts = {}) {
  const { amount, newSaved, accountId, date = today(), note } = opts;
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal || !isBox(goal)) throw Error("Escolha uma caixinha.");
  if (goal.archived) throw Error("Caixinha arquivada. Restaure-a para registrar rendimento.");
  if (!(goal.saved > 0)) throw Error("Guarde dinheiro na caixinha antes de registrar rendimento.");
  if (!isDate(date)) throw Error("Confira a data do rendimento.");
  const gain = amount ?? (newSaved === undefined ? NaN : newSaved - goal.saved);
  if (!Number.isSafeInteger(gain) || gain <= 0 || gain > LIMIT)
    throw Error(
      newSaved !== undefined
        ? "O saldo atual precisa ser maior que o valor guardado."
        : "Informe quanto a caixinha rendeu, maior que zero.",
    );
  const account = accountId || yieldAccount(goal);
  if (!reservedIn(goal, account)) throw Error("Escolha uma conta onde esta caixinha tenha dinheiro guardado.");
  const label = `Rendimento · ${goal.name}`;
  const withTx = addTransaction(state, {
    type: "income",
    amount: gain,
    date,
    description: label,
    category: "Outros",
    accountId: account,
    confirmed: true,
    notes: note,
  });
  const tx = withTx.transactions.at(-1);
  const depositId = uid();
  return {
    ...withTx,
    transactions: withTx.transactions.map((t) => (t.id === tx.id ? { ...t, boxYield: goalId } : t)),
    goals: withTx.goals.map((g) =>
      g.id === goalId
        ? {
            ...g,
            saved: g.saved + gain,
            deposits: [...g.deposits, { id: depositId, accountId: account, amount: gain, date }],
            history: [
              ...(g.history || []),
              { id: uid(), type: "yield", accountId: account, amount: gain, date, txId: tx.id, depositId },
            ],
          }
        : g,
    ),
  };
}

// Desfaz um rendimento: some o lançamento de receita e a parte da reserva. Se esse dinheiro já foi
// retirado da caixinha, recusa para não deixar a reserva maior que o saldo.
export function undoYield(state, goalId, historyId) {
  const goal = state.goals.find((g) => g.id === goalId);
  const entry = (goal?.history || []).find((h) => h.id === historyId && h.type === "yield");
  if (!entry) throw Error("Rendimento não encontrado.");
  if (reservedIn(goal, entry.accountId) < entry.amount)
    throw Error("Parte desse rendimento já foi retirada da caixinha. Guarde o valor de volta antes de desfazer.");
  let remaining = entry.amount;
  const order = [
    ...goal.deposits.filter((d) => d.id === entry.depositId),
    ...goal.deposits.filter((d) => d.id !== entry.depositId && d.accountId === entry.accountId),
  ];
  const cut = new Map();
  for (const d of order) {
    const take = Math.min(remaining, d.amount);
    cut.set(d.id, take);
    remaining -= take;
    if (!remaining) break;
  }
  return {
    ...state,
    transactions: state.transactions.filter((t) => t.id !== entry.txId),
    goals: state.goals.map((g) =>
      g.id === goalId
        ? {
            ...g,
            saved: g.saved - entry.amount,
            deposits: g.deposits.map((d) => (cut.has(d.id) ? { ...d, amount: d.amount - cut.get(d.id) } : d)).filter((d) => d.amount > 0),
            history: g.history.filter((h) => h.id !== historyId),
          }
        : g,
    ),
  };
}
