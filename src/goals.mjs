// P2/P3: metas (só acompanham um objetivo) e caixinhas (reservam dinheiro numa conta).
// Registros antigos sem `kind` são caixinhas.
import { parseMoney } from "./finance.mjs";

export const isBox = (g) => g.kind !== "goal";

// Meta sem conta: o usuário informa quanto já juntou (pode ser zero).
export function setGoalProgress(state, goalId, text) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal || isBox(goal)) throw Error("Só metas sem conta têm progresso manual.");
  const saved = String(text).trim() === "" || /^0+(,0+)?$/.test(String(text).trim()) ? 0 : parseMoney(text);
  return { ...state, goals: state.goals.map((g) => (g.id === goalId ? { ...g, saved } : g)) };
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
    map[m] = map[m] || { month: m, deposits: 0, withdrawals: 0 };
    if (h.type === "deposit") map[m].deposits += h.amount;
    else map[m].withdrawals += h.amount;
  }
  return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
}
