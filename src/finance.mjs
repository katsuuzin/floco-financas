// All monetary values are integer centavos. Dates are local ISO calendar dates.
import { sanitizeShoppingItems, sanitizeShoppingLayout, sanitizeShoppingLists, sanitizeShoppingTemplates, sanitizeShoppingStaples, sanitizePurchases, sanitizeProducts } from "./shoppingData.mjs";
export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const money = (cents) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function parseMoney(text) {
  const raw = String(text)
    .trim()
    .replace(/R\$\s*/g, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw))
    throw Error("Informe um valor como 150,00.");
  const [whole, decimal = ""] = raw.replace(/\./g, "").split(",");
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 99999999999)
    throw Error("O valor deve ser maior que zero e menor que R$ 1 bilhão.");
  return cents;
}
export const isDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T12:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
};
export const monthKey = (date) => date.slice(0, 7);
export function addMonths(date, count) {
  const [y, m, d] = date.split("-").map(Number);
  const last = new Date(y, m + count, 0).getDate();
  const result = new Date(y, m - 1 + count, Math.min(d, last), 12);
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, "0")}-${String(result.getDate()).padStart(2, "0")}`;
}
import { isAttachment } from "./attachments.mjs";
import { migrateSubcategories, LEGACY_ROOTS, CATALOG } from "./categories.mjs";
import { migratePotsFromGoals } from "./goalPots.mjs";
import { ALLOWED_COLORS, ALLOWED_ICONS, defaultStyleFor } from "./categoryStyle.mjs";
import { CALEN_PREFIX, CATEGORY_COLORS, ICONS, PALETTE, isCalenChoice } from "./looks.mjs";
import { hasCalenIcon } from "./calenArt.mjs";
export const categories = [
  "Alimentação",
  "Mercado",
  "Transporte",
  "Moradia",
  "Saúde",
  "Lazer",
  "Assinaturas",
  "Educação",
  "Salário",
  "Outros",
];
export const emptyState = () => ({
  version: 1,
  accounts: [],
  cards: [],
  transactions: [],
  budgets: [],
  goals: [],
  recurrences: [],
  receivables: [],
  payables: [],
  financings: [],
  customCategories: [],
  tags: [],
  shoppingItems: [],
  shoppingPurchases: [],
  shoppingProducts: [],
  settings: { dark: true, darkDefault: 1, biometric: false, hide: false },
});

// O tema escuro é o padrão do app. Quem já tinha dados passa para o escuro uma única vez
// (marca darkDefault); depois disso a escolha manual em Configurações é respeitada.
export function applyDarkDefault(state) {
  const settings = state?.settings && typeof state.settings === "object" ? state.settings : {};
  if (settings.darkDefault === 1) return state;
  return { ...state, settings: { ...settings, dark: true, darkDefault: 1 } };
}
// Sinal do lançamento no saldo da conta de origem. Estorno de despesa devolve dinheiro.
export const signedAmount = (t) =>
  t.type === "income" || (t.type === "expense" && t.refund) ? t.amount : -t.amount;
// Valor que conta como gasto/receita em totais e relatórios (estorno abate o gasto).
export const analysisAmount = (t) =>
  t.ignored ? 0 : t.type === "expense" && t.refund ? -t.amount : t.amount;
export function balance(state, id) {
  return (
    state.accounts.find((a) => a.id === id)?.initial +
    state.transactions
      .filter((t) => t.confirmed && !t.cardId)
      .reduce(
        (n, t) =>
          n +
          (t.accountId === id ? signedAmount(t) : 0) +
          (t.type === "transfer" && t.destinationId === id ? t.amount : 0),
        0,
      )
  );
}
export const ACCOUNT_TYPES = [
  ["checking", "Corrente"],
  ["savings", "Poupança"],
  ["wallet", "Carteira"],
  ["investment", "Investimento"],
  ["benefit", "Benefício (VR/VA)"],
  ["other", "Outra"],
];
export const includedAccounts = (state) =>
  state.accounts.filter((a) => a.includeInTotal !== false);
export const totalBalance = (state) =>
  includedAccounts(state).filter((a) => a.archived !== true).reduce((n, a) => n + balance(state, a.id), 0);
export const accountBalanceHidden = (state, id) =>
  Boolean(
    state.settings.hide || state.accounts.find((a) => a.id === id)?.hideBalance,
  );
export function totals(state, month) {
  const tx = state.transactions.filter(
    (t) =>
      monthKey(t.date) === month &&
      t.type !== "transfer" &&
      !t.invoicePayment &&
      !t.loanSettlement,
  );
  const sum = (rows) => rows.reduce((a, t) => a + analysisAmount(t), 0);
  return {
    income: sum(tx.filter((t) => t.type === "income" && t.confirmed)),
    expense: sum(tx.filter((t) => t.type === "expense" && t.confirmed)),
    // Pendências são compromissos de caixa: entram mesmo se ignoradas na análise.
    pay: tx
      .filter((t) => t.type === "expense" && !t.confirmed && !t.refund)
      .reduce((a, t) => a + t.amount - (t.paidPart || 0), 0),
    receive: tx
      .filter((t) => (t.type === "income" || t.refund) && !t.confirmed)
      .reduce((a, t) => a + t.amount, 0),
  };
}
export function invoiceMonth(date, card) {
  // Por padrão a compra no dia do fechamento ainda entra no ciclo corrente; com
  // closingDayNext ela vai para a próxima fatura (como alguns bancos fazem).
  // Dias 29–31 valem como o último dia em meses mais curtos.
  const [y, m, day] = date.split("-").map(Number);
  const closing = Math.min(card.closingDay, new Date(y, m, 0).getDate());
  let offset = day > closing || (card.closingDayNext && day === closing) ? 1 : 0;
  if (card.dueDay <= card.closingDay) offset++;
  return monthKey(addMonths(`${date.slice(0, 7)}-01`, offset));
}
// Data de vencimento da fatura de um mês; com businessDayDue, sábado/domingo
// passam para a segunda-feira seguinte (feriados não são considerados).
export function invoiceDueDate(card, month) {
  const [y, m] = month.split("-").map(Number);
  const day = Math.min(card.dueDay, new Date(y, m, 0).getDate());
  const d = new Date(y, m - 1, day, 12);
  if (card.businessDayDue) while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function invoice(state, cardId, month) {
  const purchases = state.transactions.filter(
    (t) => t.cardId === cardId && t.invoiceMonth === month,
  );
  const purchasesTotal = purchases.reduce((a, t) => a + t.amount, 0);
  // O total ajustado à mão (O3a) vale no lugar da soma das compras, até ser removido.
  const manual = state.cards.find((c) => c.id === cardId)?.manualTotals?.[month];
  const total = manual ?? purchasesTotal;
  const paid = state.transactions
    .filter((t) => t.invoicePayment === `${cardId}:${month}`)
    .reduce((a, t) => a + t.amount, 0);
  return { purchases, total, paid, due: Math.max(0, total - paid), purchasesTotal, manual: manual !== undefined, adjustment: total - purchasesTotal };
}
export function addTransaction(state, input) {
  const { type, amount, date, description, accountId, destinationId, cardId } =
    input;
  if (
    !["income", "expense", "transfer"].includes(type) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !isDate(date)
  )
    throw Error("Confira o valor e a data.");
  if (input.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))
    throw Error("Informe o horário como HH:MM.");
  if (input.refund && type !== "expense")
    throw Error("Só despesas podem ser marcadas como estorno.");
  const label =
    description?.trim() ||
    (type === "transfer" ? "Transferência" : input.category || "Outros");
  if (
    cardId &&
    (type !== "expense" || !state.cards.some((c) => c.id === cardId))
  )
    throw Error("Selecione um cartão válido para a despesa.");
  if (!cardId && !state.accounts.some((a) => a.id === accountId))
    throw Error("Selecione uma conta.");
  if (
    type === "transfer" &&
    (!state.accounts.some((a) => a.id === destinationId) ||
      destinationId === accountId)
  )
    throw Error("Escolha duas contas diferentes.");
  const count = Number(input.installments || 1);
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 120 ||
    (!cardId && count !== 1) ||
    count > amount
  )
    throw Error("Parcelamento inválido (de 1 a 120 parcelas).");
  const groupId = uid(),
    base = Math.floor(amount / count),
    remainder = amount % count;
  const card = state.cards.find((c) => c.id === cardId);
  if (input.invoiceMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.invoiceMonth))
    throw Error("Fatura inválida.");
  // A fatura pode ser escolhida à mão; sem escolha, vale a regra de fechamento do cartão.
  const first = card ? input.invoiceMonth || invoiceMonth(date, card) : null;
  const rows = Array.from({ length: count }, (_, i) => ({
    id: uid(),
    groupId,
    type,
    amount: base + (i < remainder ? 1 : 0),
    description: label,
    date: addMonths(date, i),
    ...(input.time ? { time: input.time } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim().slice(0, 2000) } : {}),
    ...(input.refund ? { refund: true } : {}),
    ...(input.ignored ? { ignored: true } : {}),
    accountId: cardId ? null : accountId,
    destinationId: type === "transfer" ? destinationId : null,
    cardId: cardId || null,
    invoiceMonth: card ? monthKey(addMonths(first + "-01", i)) : null,
    category: input.category || "Outros",
    ...(input.subcategory ? { subcategory: String(input.subcategory).slice(0, 80) } : {}),
    ...(input.spendType ? { spendType: String(input.spendType).slice(0, 40) } : {}),
    confirmed: cardId ? true : Boolean(input.confirmed),
    installment: i + 1,
    installments: count,
    tags: [...new Set(input.tags || [])],
    ...(input.importKey ? { importKey: input.importKey } : {}),
    ...(input.notificationId ? { notificationId: input.notificationId } : {}),
    ...(input.recurrenceId
      ? { recurrenceId: input.recurrenceId, occurrenceKey: input.occurrenceKey }
      : {}),
  }));
  return { ...state, transactions: [...state.transactions, ...rows] };
}
export function deleteTransaction(state, id) {
  const target = state.transactions.find((t) => t.id === id);
  if (!target) throw Error("Lançamento não encontrado.");
  if (target.boxYield)
    throw Error("Desfaça este rendimento na caixinha para manter a reserva correta.");
  if (target.loanSettlement)
    throw Error(
      "Desfaça este recebimento em Quem me deve para manter o histórico da dívida correto.",
    );
  if (target.payableId)
    throw Error(
      "Desfaça este pagamento em Quem eu devo para manter o histórico da dívida correto.",
    );
  const removed = state.transactions.filter((t) =>
    target.groupId ? t.groupId === target.groupId : t.id === id,
  );
  if (
    removed.some(
      (t) => t.cardId && invoice(state, t.cardId, t.invoiceMonth).paid > 0,
    )
  ) {
    throw Error(
      "Esta compra pertence a uma fatura com pagamento. Exclua o lançamento do pagamento antes de remover a compra.",
    );
  }
  const ids = new Set(removed.map((t) => t.id));
  return {
    ...state,
    transactions: state.transactions.filter((t) => !ids.has(t.id)),
  };
}
export function payInvoice(
  state,
  cardId,
  month,
  accountId,
  date = today(),
  amount,
) {
  const due = invoice(state, cardId, month).due;
  if (!due) throw Error("Esta fatura não tem saldo a pagar.");
  const payment = amount ?? due;
  if (
    !isDate(date) ||
    !Number.isSafeInteger(payment) ||
    payment <= 0 ||
    payment > due
  )
    throw Error(
      "Informe uma data e um valor entre um centavo e o saldo da fatura.",
    );
  if (!state.accounts.some((a) => a.id === accountId))
    throw Error("Cadastre uma conta para pagar a fatura.");
  return {
    ...state,
    transactions: [
      ...state.transactions,
      {
        id: uid(),
        type: "expense",
        amount: payment,
        description: `Pagamento de fatura · ${state.cards.find((c) => c.id === cardId).name}`,
        date,
        accountId,
        category: "Outros",
        confirmed: true,
        invoicePayment: `${cardId}:${month}`,
      },
    ],
  };
}
export function spent(state, category, month) {
  return state.transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        t.confirmed &&
        !t.invoicePayment &&
        t.category === category &&
        monthKey(t.date) === month,
    )
    .reduce((n, t) => n + analysisAmount(t), 0);
}
export function migratePotState(state) {
  const next = migratePotsFromGoals(state);
  if (next === state) return state;
  return { ...next, goals: next.goals.map((goal) =>
    goal.kind === "goal" && !Array.isArray(goal.deposits) ? { ...goal, deposits: [] } : goal) };
}

export function applyPotYieldChange(state, id, change) {
  const pot = state.pots?.find((item) => item.id === id);
  if (!pot) throw Error("Escolha uma caixinha.");
  const updated = change({ ...state, goals: [{ ...pot, kind: "box" }] });
  const { kind, ...nextPot } = updated.goals[0];
  return { ...state, transactions: updated.transactions, pots: state.pots.map((item) => item === pot ? nextPot : item) };
}

export function contribute(state, goalId, amount, accountId, date = today()) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (
    !goal ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !state.accounts.some((a) => a.id === accountId)
  )
    throw Error("Confira a meta, a conta e o valor.");
  if (goal.kind === "goal")
    throw Error("Esta meta não reserva dinheiro em conta. Use Atualizar progresso.");
  if (goal.archived) throw Error("Caixinha arquivada. Restaure-a para guardar dinheiro.");
  if (balance(state, accountId) - reserved(state, accountId) < amount)
    throw Error(
      "O saldo disponível da conta é insuficiente para reservar esse valor.",
    );
  return {
    ...state,
    goals: state.goals.map((g) =>
      g.id === goalId
        ? {
            ...g,
            saved: g.saved + amount,
            history: [
              ...(g.history || []),
              { id: uid(), type: "deposit", accountId, amount, date },
            ],
            deposits: [
              ...(g.deposits || []),
              { id: uid(), accountId, amount, date },
            ],
          }
        : g,
    ),
  };
}
export function reserved(state, accountId) {
  return [...(state.goals || []), ...(state.pots || [])].reduce(
    (n, g) =>
      n +
      (g.deposits || [])
        .filter((d) => d.accountId === accountId)
        .reduce((v, d) => v + d.amount, 0),
    0,
  );
}
export function withdrawGoal(state, goalId, amount, accountId, date = today()) {
  const g = state.goals.find((g) => g.id === goalId);
  if (
    !g ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !isDate(date) ||
    !state.accounts.some((a) => a.id === accountId)
  )
    throw Error("Confira a caixinha, a conta, o valor e a data.");
  const available = g.deposits
    .filter((d) => d.accountId === accountId)
    .reduce((n, d) => n + d.amount, 0);
  if (amount > available)
    throw Error("A retirada supera o valor reservado nesta conta.");
  let remaining = amount;
  const deposits = g.deposits
    .map((d) => {
      if (d.accountId !== accountId || !remaining) return d;
      const remove = Math.min(remaining, d.amount);
      remaining -= remove;
      return { ...d, amount: d.amount - remove };
    })
    .filter((d) => d.amount > 0);
  return {
    ...state,
    goals: state.goals.map((x) =>
      x.id === g.id
        ? {
            ...x,
            saved: x.saved - amount,
            deposits,
            history: [
              ...(x.history || []),
              { id: uid(), type: "withdrawal", accountId, amount, date },
            ],
          }
        : x,
    ),
  };
}
export function transferGoal(
  state,
  from,
  to,
  amount,
  accountId,
  date = today(),
) {
  if (from === to || !state.goals.some((g) => g.id === to))
    throw Error("Escolha duas caixinhas diferentes.");
  return contribute(
    withdrawGoal(state, from, amount, accountId, date),
    to,
    amount,
    accountId,
    date,
  );
}
export function demoState() {
  let s = emptyState();
  const date = today(),
    month = monthKey(date);
  s.accounts = [
    {
      id: "itau",
      name: "Conta Corrente",
      institution: "Itaú",
      initial: 2224400,
      color: "#E67E22",
    },
    {
      id: "nu",
      name: "Conta Nubank",
      institution: "Nubank",
      initial: 1250000,
      color: "#820AD1",
    },
  ];
  s.cards = [
    {
      id: "card",
      name: "Cartão Itaú",
      limit: 800000,
      closingDay: 3,
      dueDay: 10,
      lastFour: "4821",
      color: "#E67E22",
      accountId: "itau",
    },
  ];
  for (const x of [
    {
      description: "Salário",
      type: "income",
      amount: 381200,
      accountId: "itau",
      category: "Salário",
    },
    {
      description: "Mercado Pão de Açúcar",
      type: "expense",
      amount: 14290,
      accountId: "nu",
      category: "Mercado",
    },
    {
      description: "Uber · Vila Madalena",
      type: "expense",
      amount: 4200,
      accountId: "itau",
      category: "Transporte",
    },
    {
      description: "Aluguel",
      type: "expense",
      amount: 180000,
      accountId: "itau",
      category: "Moradia",
      confirmed: false,
    },
  ])
    s = addTransaction(s, { date, confirmed: true, ...x });
  s = addTransaction(s, {
    date: month + "-01",
    description: "Notebook Lenovo",
    type: "expense",
    amount: 374880,
    cardId: "card",
    category: "Outros",
    installments: 12,
    confirmed: true,
  });
  s.budgets = [
    { id: "b1", category: "Mercado", amount: 60000 },
    { id: "b2", category: "Transporte", amount: 40000 },
    { id: "b3", category: "Lazer", amount: 30000 },
  ];
  s.goals = [
    {
      id: "g1",
      name: "Reserva de emergência",
      target: 1200000,
      saved: 840000,
      deposits: [{ id: "d1", amount: 840000, accountId: "itau", date }],
    },
    {
      id: "g2",
      name: "Viagem de fim de ano",
      target: 700000,
      saved: 198000,
      deposits: [{ id: "d2", amount: 198000, accountId: "nu", date }],
    },
  ];
  return s;
}
export function validateBackup(value) {
  if (!value || value.version !== 1)
    throw Error("Formato de backup incompatível.");
  value = { ...value };
  // Lista de compras: ausente em backups antigos (quem restaura mantém a lista atual).
  const lists = sanitizeShoppingLists(value.shoppingLists);
  if (lists) value.shoppingLists = lists;
  else delete value.shoppingLists;
  if (!lists?.some((list) => list.id === value.shoppingListId && !list.archived)) delete value.shoppingListId;
  const layout = lists ? sanitizeShoppingLayout(value.shoppingListLayout, lists) : undefined;
  if (layout === undefined) delete value.shoppingListLayout;
  else value.shoppingListLayout = layout;
  const templates = sanitizeShoppingTemplates(value.shoppingListTemplates);
  if (templates === undefined) delete value.shoppingListTemplates;
  else value.shoppingListTemplates = templates;
  if (value.shoppingRunOutAlerts !== true) delete value.shoppingRunOutAlerts;
  const shopping = sanitizeShoppingItems(value.shoppingItems, lists);
  if (shopping === undefined) delete value.shoppingItems;
  else value.shoppingItems = shopping;
  const staples = sanitizeShoppingStaples(value.shoppingStaples, lists);
  if (staples === undefined) delete value.shoppingStaples;
  else value.shoppingStaples = staples;
  const purchases = sanitizePurchases(value.shoppingPurchases);
  if (purchases === undefined) delete value.shoppingPurchases;
  else value.shoppingPurchases = purchases;
  const products = sanitizeProducts(value.shoppingProducts);
  if (products === undefined) delete value.shoppingProducts;
  else value.shoppingProducts = products;
  for (const key of [
    "recurrences",
    "receivables",
    "payables",
    "financings",
    "customCategories",
    "tags",
    "trash",
  ]) {
    if (value[key] === undefined) value[key] = [];
    if (!Array.isArray(value[key]) || value[key].length > 100000)
      throw Error("Backup inválido: " + key);
    const ids = new Set();
    for (const row of value[key]) {
      if (!row || typeof row.id !== "string" || ids.has(row.id))
        throw Error("Identificadores inválidos: " + key);
      ids.add(row.id);
    }
  }
  for (const key of ["accounts", "cards", "transactions", "budgets", "goals"])
    if (!Array.isArray(value[key]) || value[key].length > 100000)
      throw Error("Backup inválido: " + key);
  const integer = (n) => Number.isSafeInteger(n) && Math.abs(n) <= 999999999999;
  for (const key of ["accounts", "cards", "transactions", "budgets", "goals"]) {
    const ids = new Set();
    for (const row of value[key]) {
      if (!row || typeof row.id !== "string" || ids.has(row.id))
        throw Error("Identificadores inválidos.");
      ids.add(row.id);
    }
  }
  for (const a of value.accounts)
    if (
      typeof a.name !== "string" ||
      !integer(a.initial) ||
      (a.hideBalance !== undefined && typeof a.hideBalance !== "boolean") ||
      (a.includeInTotal !== undefined && typeof a.includeInTotal !== "boolean")
    )
      throw Error("Conta inválida.");
  value.accounts = value.accounts.map(({ order, archived, ...account }) => ({ ...account,
    ...(Number.isSafeInteger(order) && order >= 0 ? { order } : {}),
    ...(typeof archived === "boolean" ? { archived } : {}),
  }));
  // Índice de contas: as validações abaixo consultam por id milhares de vezes; com .some seria O(n²).
  const accountIds = new Set(value.accounts.map((a) => a.id));
  for (const c of value.cards)
    if (
      typeof c.name !== "string" ||
      !integer(c.limit) ||
      c.limit <= 0 ||
      !Number.isInteger(c.closingDay) ||
      c.closingDay < 1 ||
      c.closingDay > 31 ||
      !Number.isInteger(c.dueDay) ||
      c.dueDay < 1 ||
      c.dueDay > 31 ||
      (c.manualTotals !== undefined &&
        (!c.manualTotals ||
          typeof c.manualTotals !== "object" ||
          Object.entries(c.manualTotals).some(([m, v]) => !/^\d{4}-\d{2}$/.test(m) || !integer(v) || v <= 0)))
    )
      throw Error("Cartão inválido.");
  for (const t of value.transactions) {
    if (
      !["income", "expense", "transfer"].includes(t.type) ||
      !integer(t.amount) ||
      t.amount <= 0 ||
      !isDate(t.date) ||
      typeof t.description !== "string" ||
      typeof t.confirmed !== "boolean"
    )
      throw Error("Lançamento inválido.");
    if (
      t.cardId
        ? !value.cards.some((c) => c.id === t.cardId) ||
          !/^\d{4}-\d{2}$/.test(t.invoiceMonth)
        : !accountIds.has(t.accountId)
    )
      throw Error("Lançamento sem conta/cartão válido.");
    if (
      t.type === "transfer" &&
      (!accountIds.has(t.destinationId) ||
        t.accountId === t.destinationId)
    )
      throw Error("Transferência inválida.");
  }
  for (const b of value.budgets)
    if (
      ![...categories, ...LEGACY_ROOTS, ...CATALOG.map((c) => c.name), ...value.customCategories.map((c) => c.name)].includes(
        b.category,
      ) ||
      !integer(b.amount) ||
      b.amount <= 0
    )
      throw Error("Orçamento inválido.");
  for (const g of value.goals)
    if (
      (g.deadline && !isDate(g.deadline)) ||
      (g.history !== undefined &&
        (!Array.isArray(g.history) ||
          g.history.some(
            (h) =>
              !h ||
              !["deposit", "withdrawal", "yield"].includes(h.type) ||
              !integer(h.amount) ||
              h.amount <= 0 ||
              !isDate(h.date) ||
              !accountIds.has(h.accountId),
          ))) ||
      (g.completedAt && !isDate(g.completedAt)) ||
      (g.moves !== undefined &&
        (!Array.isArray(g.moves) ||
          g.moves.some(
            (m) =>
              !m ||
              !["deposit", "adjust"].includes(m.type) ||
              !integer(m.amount) ||
              m.amount === 0 ||
              (m.type === "deposit" && m.amount < 0) ||
              !isDate(m.date),
          ))) ||
      typeof g.name !== "string" ||
      !integer(g.target) ||
      g.target <= 0 ||
      !integer(g.saved) ||
      g.saved < 0 ||
      !Array.isArray(g.deposits) ||
      g.deposits.some(
        (d) =>
          !integer(d.amount) ||
          d.amount <= 0 ||
          !isDate(d.date) ||
          !accountIds.has(d.accountId),
      ) ||
      // Caixinha: o guardado é a soma dos depósitos. Meta sem conta: progresso manual, sem depósitos.
      (g.kind === "goal"
        ? g.deposits.length > 0
        : g.saved !== g.deposits.reduce((n, d) => n + d.amount, 0))
    )
      throw Error("Meta inválida.");
  const positive = (n) => integer(n) && n > 0 && n <= 99999999999;
  const account = (id) => accountIds.has(id);
  for (const key of ["tags", "customCategories"]) {
    const names = new Set();
    for (const row of value[key]) {
      if (
        typeof row.name !== "string" ||
        !row.name.trim() ||
        row.name.length > 80 ||
        names.has(row.name.toLocaleLowerCase("pt-BR"))
      )
        throw Error("Nome inválido: " + key);
      names.add(row.name.toLocaleLowerCase("pt-BR"));
      if (
        key === "customCategories" &&
        row.parent &&
        (row.parent === row.name ||
          ![
            ...categories,
            ...LEGACY_ROOTS,
            ...CATALOG.map((c) => c.name),
            ...value.customCategories
              .filter((c) => !c.parent)
              .map((c) => c.name),
          ].includes(row.parent))
      )
        throw Error("Subcategoria inválida.");
    }
  }
  for (const t of value.transactions) {
    if (
      t.tags &&
      (!Array.isArray(t.tags) ||
        t.tags.some((id) => !value.tags.some((tag) => tag.id === id)))
    )
      throw Error("Tag de lançamento inválida.");
    if (
      t.recurrenceId &&
      (!value.recurrences.some((r) => r.id === t.recurrenceId) ||
        typeof t.occurrenceKey !== "string")
    )
      throw Error("Recorrência de lançamento inválida.");
  }
  const occurrenceKeys = value.transactions
    .map((t) => t.occurrenceKey)
    .filter(Boolean);
  if (new Set(occurrenceKeys).size !== occurrenceKeys.length)
    throw Error("Ocorrências duplicadas.");
  for (const r of value.recurrences) {
    if (
      !positive(r.amount) ||
      typeof r.description !== "string" ||
      !r.description.trim() ||
      !isDate(r.date) ||
      (r.endDate && (!isDate(r.endDate) || r.endDate < r.date)) ||
      !account(r.accountId) ||
      typeof r.active !== "boolean" ||
      !["income", "expense"].includes(r.type) ||
      !["daily", "weekly", "fortnightly", "monthly", "yearly"].includes(
        r.frequency,
      )
    )
      throw Error("Recorrência inválida.");
  }
  for (const f of value.financings) {
    if (
      !positive(f.amount) ||
      typeof f.name !== "string" ||
      !f.name.trim() ||
      !account(f.accountId) ||
      !isDate(f.date) ||
      !Number.isInteger(f.count) ||
      f.count < 1 ||
      f.count > 360 ||
      !Number.isInteger(f.paid) ||
      f.paid < 0 ||
      f.paid >= f.count
    )
      throw Error("Contrato inválido.");
  }
  const linked = new Set();
  for (const r of value.receivables) {
    if (
      !positive(r.amount) ||
      typeof r.person !== "string" ||
      !r.person.trim() ||
      typeof r.description !== "string" ||
      !isDate(r.date) ||
      (r.dueDate && (!isDate(r.dueDate) || r.dueDate < r.date)) ||
      !Array.isArray(r.payments)
    )
      throw Error("Valor a receber inválido.");
    const ids = new Set();
    let paid = 0;
    for (const p of r.payments) {
      const t = value.transactions.find((t) => t.id === p.transactionId);
      if (
        typeof p.id !== "string" ||
        ids.has(p.id) ||
        linked.has(p.transactionId) ||
        !positive(p.amount) ||
        !isDate(p.date) ||
        p.date < r.date ||
        !account(p.accountId) ||
        !t ||
        t.loanSettlement !== r.id ||
        t.amount !== p.amount ||
        t.accountId !== p.accountId ||
        t.date !== p.date ||
        t.type !== "income" ||
        !t.confirmed
      )
        throw Error("Recebimento de dívida inválido.");
      ids.add(p.id);
      linked.add(p.transactionId);
      paid += p.amount;
    }
    if (paid > r.amount) throw Error("Recebimentos acima da dívida.");
  }
  if (value.transactions.some((t) => t.loanSettlement && !linked.has(t.id)))
    throw Error("Recebimento sem histórico da dívida.");
  const attachmentsOk = (row) => row.attachments === undefined ||
    (Array.isArray(row.attachments) && row.attachments.length <= 10 && row.attachments.every(isAttachment));
  if (!value.receivables.every(attachmentsOk)) throw Error("Anexo inválido em Quem me deve.");
  const paidLinks = new Set();
  for (const d of value.payables) {
    if (
      !positive(d.amount) ||
      typeof d.person !== "string" ||
      !d.person.trim() ||
      typeof d.description !== "string" ||
      !isDate(d.date) ||
      (d.dueDate && (!isDate(d.dueDate) || d.dueDate < d.date)) ||
      !Array.isArray(d.payments) ||
      !attachmentsOk(d)
    )
      throw Error("Dívida a pagar inválida.");
    const ids = new Set();
    let paid = 0;
    for (const p of d.payments) {
      const t = value.transactions.find((t) => t.id === p.transactionId);
      if (
        typeof p.id !== "string" ||
        ids.has(p.id) ||
        paidLinks.has(p.transactionId) ||
        !positive(p.amount) ||
        !isDate(p.date) ||
        p.date < d.date ||
        !account(p.accountId) ||
        !t ||
        t.payableId !== d.id ||
        t.amount !== p.amount ||
        t.accountId !== p.accountId ||
        t.date !== p.date ||
        t.type !== "expense" ||
        !t.confirmed
      )
        throw Error("Pagamento de dívida inválido.");
      ids.add(p.id);
      paidLinks.add(p.transactionId);
      paid += p.amount;
    }
    if (paid > d.amount) throw Error("Pagamentos acima da dívida.");
  }
  if (value.transactions.some((t) => t.payableId && !paidLinks.has(t.id)))
    throw Error("Pagamento sem histórico da dívida.");
  if (value.categoryLooks && typeof value.categoryLooks === "object" && !Array.isArray(value.categoryLooks)) {
    value.categoryLooks = Object.fromEntries(Object.entries(value.categoryLooks).filter(([name]) =>
      !["__proto__", "constructor", "prototype"].includes(name)).map(([name, style]) => {
      const fallback = defaultStyleFor(name);
      const icon = style?.icon;
      const color = style?.color;
      return [name, {
        icon: ALLOWED_ICONS.includes(icon) || ICONS.includes(icon) ||
          (isCalenChoice(icon) && hasCalenIcon(icon.slice(CALEN_PREFIX.length))) ? icon : fallback.icon,
        color: ALLOWED_COLORS.includes(color) || PALETTE.includes(color) || CATEGORY_COLORS.includes(color) ? color : fallback.color,
      }];
    }));
  } else delete value.categoryLooks;
  value.tags = value.tags.map(({ icon, color, ...tag }) => ({
    ...tag, ...(ALLOWED_ICONS.includes(icon) ? { icon } : {}), ...(ALLOWED_COLORS.includes(color) || PALETTE.includes(color) ? { color } : {}),
  }));
  if (Object.hasOwn(value, "pots")) {
    const ids = new Set();
    value.pots = (Array.isArray(value.pots) ? value.pots : []).slice(0, 100000).filter((pot) => {
      if (!pot || typeof pot.id !== "string" || !pot.id || ids.has(pot.id) ||
          typeof pot.name !== "string" || !pot.name.trim() || !integer(pot.saved) || pot.saved < 0 ||
          !Array.isArray(pot.deposits) || pot.deposits.some((d) => !d || !positive(d.amount) || !isDate(d.date) || !account(d.accountId)) ||
          pot.deposits.reduce((n, d) => n + d.amount, 0) !== pot.saved) return false;
      ids.add(pot.id);
      return true;
    }).map((pot) => ({ ...pot, archived: pot.archived === true, history: (Array.isArray(pot.history) ? pot.history : []).filter((h) =>
      h && ["deposit", "withdrawal", "yield"].includes(h.type) && positive(h.amount) && isDate(h.date) &&
      (!h.accountId || account(h.accountId))) }));
    value.goals = value.goals.map((goal) => {
      if (goal.potId == null || ids.has(goal.potId)) return goal;
      const { potId, ...rest } = goal;
      return rest;
    });
  } else {
    value.goals = value.goals.map(({ potId, ...goal }) => goal);
  }
  return migrateSubcategories({
    ...value,
    // Preferências (layout, extrato, lembretes, cor...) seguem junto. O bloqueio biométrico
    // nunca vem de um backup; quem lê o armazenamento local o devolve (sqliteStore).
    settings: {
      ...(value.settings && typeof value.settings === "object" && !Array.isArray(value.settings) ? value.settings : {}),
      dark: !!value.settings?.dark,
      hide: !!value.settings?.hide,
      biometric: false,
    },
  });
}

// O1: move um item ativo (não arquivado) uma posição para cima (-1) ou para baixo (+1).
// Itens arquivados mantêm o lugar; a ordem do array é a ordem exibida e gravada.
export function moveItem(list, id, delta) {
  const active = list.filter((x) => !x.archived);
  const from = active.findIndex((x) => x.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= active.length) return list;
  const a = list.indexOf(active[from]);
  const b = list.indexOf(active[to]);
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
