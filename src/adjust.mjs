// O6 — Ajustar saldo: o usuário informa o saldo real da conta e escolhe o que a
// diferença representa. Tudo é um lançamento comum marcado com `adjustment`.
//   income   → entra como receita (ou despesa, se o saldo real é menor) e conta nos relatórios.
//   only     → corrige o saldo e fica fora dos relatórios (usa a marca `ignored` que já existe).
//   transfer → a diferença veio de outra conta sua (ou foi para ela); totais do mês não mudam.
import { addTransaction, balance, isDate, parseMoney, today } from "./finance.mjs";

export const ADJUST_MODES = ["income", "only", "transfer"];
const LIMIT = 99999999999;

// Como parseMoney, mas aceita saldo zero e negativo ("-88,00"): conta no vermelho é saldo válido.
export function parseSignedMoney(text) {
  const raw = String(text ?? "").trim().replace(/R\$\s*/g, "");
  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1).trim() : raw;
  if (/^0+(?:,0{1,2})?$/.test(body)) return 0;
  const cents = parseMoney(body);
  return negative ? -cents : cents;
}

export const adjustmentDifference = (state, accountId, newBalance) =>
  newBalance - balance(state, accountId);

export function adjustBalance(state, input) {
  const { accountId, newBalance, mode, sourceId, category, description } = input;
  const date = input.date || today();
  const account = state.accounts.find((a) => a.id === accountId);
  if (!account) throw Error("Selecione a conta.");
  if (!Number.isSafeInteger(newBalance) || Math.abs(newBalance) > LIMIT)
    throw Error("Informe o saldo real da conta.");
  if (!isDate(date)) throw Error("Confira a data do ajuste.");
  if (!ADJUST_MODES.includes(mode)) throw Error("Escolha o que a diferença representa.");

  const diff = adjustmentDifference(state, accountId, newBalance);
  if (diff === 0) throw Error("O saldo da conta já é esse. Não há o que ajustar.");
  const amount = Math.abs(diff);
  const label = description?.trim() || "Ajuste de saldo";

  let next;
  if (mode === "transfer") {
    if (!state.accounts.some((a) => a.id === sourceId) || sourceId === accountId)
      throw Error("Escolha a outra conta da transferência.");
    // Saldo maior: o dinheiro veio da outra conta. Saldo menor: foi para ela.
    next = addTransaction(state, {
      type: "transfer",
      amount,
      date,
      description: label,
      accountId: diff > 0 ? sourceId : accountId,
      destinationId: diff > 0 ? accountId : sourceId,
      confirmed: true,
    });
  } else {
    next = addTransaction(state, {
      type: diff > 0 ? "income" : "expense",
      amount,
      date,
      description: label,
      category: category || "Outros",
      accountId,
      confirmed: true,
      ignored: mode === "only",
    });
  }
  const last = next.transactions.length - 1;
  return {
    ...next,
    transactions: next.transactions.map((t, i) => (i === last ? { ...t, adjustment: true } : t)),
  };
}
