// Regras de gravação dos formulários. Cada builder recebe os campos digitados e
// devolve uma função (estado) => novo estado, executada pela fila do store.
import {
  uid,
  today,
  parseMoney,
  isDate,
  addTransaction,
  deleteTransaction,
  contribute,
  withdrawGoal,
  transferGoal,
  payInvoice,
} from "../finance.mjs";
import { saveRecurrence, generateRecurrences } from "../planning.mjs";
import { saveContract, changeMethod, payPart, addLateFee, extraAmortization, settleContract } from "../contracts.mjs";
import { expenseOwed } from "../commitments.mjs";
import { saveBudget } from "../analysis.mjs";
import { bankProfile } from "../banks.mjs";
import { setGoalProgress } from "../goals.mjs";

export const toInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const optionalMoney = (text: string) =>
  !text?.trim() || /^0(?:,0{1,2})?$/.test(text.trim()) ? 0 : parseMoney(text);
const day = (text: string, label: string) => {
  const n = Number(text);
  if (!Number.isInteger(n) || n < 1 || n > 31) throw Error(`${label} deve estar entre 1 e 31.`);
  return n;
};

export const formTitles: Record<string, (f: any) => string> = {
  transaction: (f) =>
    f.editId
      ? "Editar lançamento"
      : f.type === "income"
        ? "Nova receita"
        : f.type === "transfer"
          ? "Nova transferência"
          : f.cardId
            ? "Nova despesa no cartão"
            : "Nova despesa",
  account: (f) => (f.id ? "Editar conta" : "Nova conta"),
  card: (f) => (f.id ? "Editar cartão" : "Novo cartão"),
  budget: (f) => (f.id ? "Editar orçamento" : "Novo orçamento"),
  goal: (f) => (f.id ? (f.goalKind === "goal" ? "Editar meta" : "Editar caixinha") : "Nova meta ou caixinha"),
  goalProgress: () => "Atualizar progresso",
  deposit: () => "Guardar dinheiro",
  withdraw: () => "Retirar reserva",
  reserveTransfer: () => "Transferir reserva",
  payment: () => "Pagar fatura",
  contract: (f) => (f.type === "loan" ? "Novo empréstimo" : "Novo financiamento"),
  recurrence: (f) => (f.id ? "Editar recorrência" : "Nova recorrência"),
  contractPay: () => "Pagar parcela",
  lateFee: () => "Juros por atraso",
  extraAmort: () => "Amortização extraordinária",
  settle: () => "Quitar contrato",
  changeMethod: () => "Trocar cálculo",
};
const rate = (text: string) => {
  const n = Number(String(text || "0").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 30) throw Error("Informe a taxa mensal entre 0 e 30%.");
  return n;
};

export function defaults(kind: string, state: any, initial: any = {}) {
  return {
    kind,
    type: "expense",
    date: today(),
    time: "",
    amount: "",
    description: "",
    notes: "",
    category: "Alimentação",
    accountId: state.accounts.find((a: any) => !a.archived)?.id || "",
    destinationId: state.accounts.filter((a: any) => !a.archived)[1]?.id || "",
    cardId: "",
    repeat: "single",
    installments: "2",
    frequency: "monthly",
    confirmed: true,
    refund: false,
    ignored: false,
    tags: [],
    name: "",
    institution: "",
    accountType: "checking",
    initial: "",
    limit: "",
    closingDay: "3",
    dueDay: "10",
    closingDayNext: false,
    businessDayDue: false,
    lastFour: "",
    target: "",
    deadline: "",
    goalId: state.goals[0]?.id || "",
    method: "fixed",
    rate: "",
    principal: "",
    insurance: "",
    count: "12",
    paid: "0",
    owed: false,
    person: "",
    endDate: "",
    mode: "term",
    ...initial,
  };
}

export function buildChange(f: any, month: string): (s: any) => any {
  return (s: any) => {
    switch (f.kind) {
      case "transaction": {
        const amount = parseMoney(f.amount);
        const base = f.editId ? deleteTransaction(s, f.editId) : s;
        if (f.repeat === "recurring" && !f.editId) {
          if (f.cardId) throw Error("Recorrências usam uma conta. Escolha uma conta no lugar do cartão.");
          if (f.type === "transfer") throw Error("Transferências recorrentes ainda não são suportadas.");
          const id = uid();
          const withRule = saveRecurrence(base, {
            id,
            description: f.description?.trim() || f.category,
            amount,
            date: f.date,
            frequency: f.frequency,
            accountId: f.accountId,
            category: f.category,
            type: f.type,
          });
          return generateRecurrences(withRule, f.date < today() ? today() : f.date);
        }
        if (f.owed && !f.editId)
          return expenseOwed(base, { ...f, amount, confirmed: true });
        return addTransaction(base, {
          ...f,
          amount,
          installments: f.repeat === "installments" && f.cardId ? Number(f.installments) : 1,
          confirmed: f.cardId ? true : f.confirmed,
        });
      }
      case "account": {
        if (!f.name.trim()) throw Error("Informe o nome da conta.");
        const profile = bankProfile(f.profileId);
        const row = {
          ...(s.accounts.find((a: any) => a.id === f.id) || {}),
          id: f.id || uid(),
          name: f.name.trim(),
          institution: profile?.institution || f.institution.trim() || "Carteira",
          profileId: profile?.id || "custom",
          holderType: profile?.holderType || f.holderType || "PF",
          accountType: f.accountType || "checking",
          initial: optionalMoney(f.initial),
          color: f.color || "#311E0D",
          hideBalance: !!f.hideBalance,
          includeInTotal: f.includeInTotal !== false,
        };
        return {
          ...s,
          accounts: f.id ? s.accounts.map((a: any) => (a.id === f.id ? row : a)) : [...s.accounts, row],
        };
      }
      case "card": {
        if (!f.name.trim()) throw Error("Informe o nome do cartão.");
        if (f.lastFour && !/^\d{4}$/.test(f.lastFour)) throw Error("Informe os 4 últimos dígitos ou deixe em branco.");
        const row = {
          ...(s.cards.find((c: any) => c.id === f.id) || {}),
          id: f.id || uid(),
          name: f.name.trim(),
          limit: parseMoney(f.limit),
          closingDay: day(f.closingDay, "O fechamento"),
          dueDay: day(f.dueDay, "O vencimento"),
          closingDayNext: !!f.closingDayNext,
          businessDayDue: !!f.businessDayDue,
          lastFour: f.lastFour,
          color: f.color || "#311E0D",
          accountId: f.accountId,
        };
        return { ...s, cards: f.id ? s.cards.map((c: any) => (c.id === f.id ? row : c)) : [...s.cards, row] };
      }
      case "budget":
        return saveBudget(s, {
          id: f.id,
          name: f.name,
          type: f.budgetType || "expense",
          amount: parseMoney(f.amount),
          categories: f.categories?.length ? f.categories : [f.category],
          where: f.where || [],
          cycle: f.cycle || "monthly",
          startDay: Number(f.startDay ?? 1),
          affectsForecast: !!f.affectsForecast,
        });
      case "goal": {
        if (f.deadline && !isDate(f.deadline)) throw Error("Informe o prazo como AAAA-MM-DD.");
        if (!f.name.trim()) throw Error("Dê um nome à sua meta.");
        const prev = s.goals.find((g: any) => g.id === f.id);
        const row = {
          ...(prev || { id: uid(), saved: 0, deposits: [] }),
          name: f.name.trim(),
          target: parseMoney(f.target),
          deadline: f.deadline || "",
          ...(prev ? {} : { kind: f.goalKind === "goal" ? "goal" : "box" }),
        };
        return { ...s, goals: prev ? s.goals.map((g: any) => (g.id === f.id ? row : g)) : [...s.goals, row] };
      }
      case "goalProgress":
        return setGoalProgress(s, f.goalId, f.amount);
      case "deposit":
        return contribute(s, f.goalId, parseMoney(f.amount), f.accountId, f.date);
      case "withdraw":
        return withdrawGoal(s, f.goalId, parseMoney(f.amount), f.accountId, f.date);
      case "reserveTransfer":
        return transferGoal(s, f.goalId, f.destinationGoalId, parseMoney(f.amount), f.accountId, f.date);
      case "contract":
        return saveContract(s, {
          ...f,
          installment: f.method === "sac" || (f.method === "price" && f.principal?.trim()) ? 0 : parseMoney(f.amount),
          principal: f.principal?.trim() ? parseMoney(f.principal) : 0,
          rate: f.method === "fixed" ? 0 : rate(f.rate),
          insurance: optionalMoney(f.insurance),
          count: Number(f.count),
          paid: Number(f.paid || 0),
        });
      case "recurrence": {
        const next = saveRecurrence(s, {
          id: f.id,
          description: f.description?.trim() || f.category,
          amount: parseMoney(f.amount),
          date: f.date,
          endDate: f.endDate,
          frequency: f.frequency,
          accountId: f.accountId,
          category: f.category,
          type: f.type === "income" ? "income" : "expense",
        });
        return generateRecurrences(next, today());
      }
      case "contractPay":
        return payPart(s, f.txId, parseMoney(f.amount), f.accountId, f.date);
      case "lateFee":
        return addLateFee(s, f.txId, parseMoney(f.amount));
      case "extraAmort":
        return extraAmortization(s, f.contractId, parseMoney(f.amount), f.accountId, f.date, f.mode || "term");
      case "settle":
        return settleContract(s, f.contractId, f.accountId, f.date, f.amount?.trim() ? parseMoney(f.amount) : undefined);
      case "changeMethod":
        return changeMethod(s, f.contractId, {
          method: f.method,
          rate: f.method === "fixed" ? 0 : rate(f.rate),
          principal: f.principal?.trim() ? parseMoney(f.principal) : 0,
          installment: f.amount?.trim() ? parseMoney(f.amount) : 0,
          insurance: optionalMoney(f.insurance),
        });
      case "payment":
        return payInvoice(
          s,
          f.cardId,
          f.month || month,
          f.accountId,
          f.date,
          f.amount.trim() ? parseMoney(f.amount) : undefined,
        );
    }
    throw Error("Operação não reconhecida.");
  };
}
