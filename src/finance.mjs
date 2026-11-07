// All monetary values are integer centavos. Dates are local ISO calendar dates.
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
  financings: [],
  customCategories: [],
  tags: [],
  settings: { dark: false, biometric: false, hide: false },
});
export function balance(state, id) {
  return (
    state.accounts.find((a) => a.id === id)?.initial +
    state.transactions
      .filter((t) => t.confirmed && !t.cardId)
      .reduce(
        (n, t) =>
          n +
          (t.accountId === id
            ? t.type === "income"
              ? t.amount
              : -t.amount
            : 0) +
          (t.type === "transfer" && t.destinationId === id ? t.amount : 0),
        0,
      )
  );
}
export const includedAccounts = (state) =>
  state.accounts.filter((a) => a.includeInTotal !== false);
export const totalBalance = (state) =>
  includedAccounts(state).reduce((n, a) => n + balance(state, a.id), 0);
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
  return {
    income: tx
      .filter((t) => t.type === "income" && t.confirmed)
      .reduce((a, t) => a + t.amount, 0),
    expense: tx
      .filter((t) => t.type === "expense" && t.confirmed)
      .reduce((a, t) => a + t.amount, 0),
    pay: tx
      .filter((t) => t.type === "expense" && !t.confirmed)
      .reduce((a, t) => a + t.amount, 0),
    receive: tx
      .filter((t) => t.type === "income" && !t.confirmed)
      .reduce((a, t) => a + t.amount, 0),
  };
}
export function invoiceMonth(date, card) {
  // A purchase on the closing day remains in that cycle; after it goes to the next.
  const [, , day] = date.split("-").map(Number);
  let offset = day > card.closingDay ? 1 : 0;
  if (card.dueDay <= card.closingDay) offset++;
  return monthKey(addMonths(date, offset));
}
export function invoice(state, cardId, month) {
  const purchases = state.transactions.filter(
    (t) => t.cardId === cardId && t.invoiceMonth === month,
  );
  const total = purchases.reduce((a, t) => a + t.amount, 0);
  const paid = state.transactions
    .filter((t) => t.invoicePayment === `${cardId}:${month}`)
    .reduce((a, t) => a + t.amount, 0);
  return { purchases, total, paid, due: Math.max(0, total - paid) };
}
export function addTransaction(state, input) {
  const { type, amount, date, description, accountId, destinationId, cardId } =
    input;
  if (
    !["income", "expense", "transfer"].includes(type) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !isDate(date) ||
    !description?.trim()
  )
    throw Error("Confira descrição, valor e data.");
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
  const first = card ? invoiceMonth(date, card) : null;
  const rows = Array.from({ length: count }, (_, i) => ({
    id: uid(),
    groupId,
    type,
    amount: base + (i < remainder ? 1 : 0),
    description: description.trim(),
    date: addMonths(date, i),
    accountId: cardId ? null : accountId,
    destinationId: type === "transfer" ? destinationId : null,
    cardId: cardId || null,
    invoiceMonth: card ? monthKey(addMonths(first + "-01", i)) : null,
    category: input.category || "Outros",
    confirmed: cardId ? true : Boolean(input.confirmed),
    installment: i + 1,
    installments: count,
    tags: [...new Set(input.tags || [])],
    ...(input.recurrenceId
      ? { recurrenceId: input.recurrenceId, occurrenceKey: input.occurrenceKey }
      : {}),
  }));
  return { ...state, transactions: [...state.transactions, ...rows] };
}
export function deleteTransaction(state, id) {
  const target = state.transactions.find((t) => t.id === id);
  if (!target) throw Error("Lançamento não encontrado.");
  if (target.loanSettlement)
    throw Error(
      "Desfaça este recebimento em Quem me deve para manter o histórico da dívida correto.",
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
    .reduce((n, t) => n + t.amount, 0);
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
  return state.goals.reduce(
    (n, g) =>
      n +
      (g.deposits || [])
        .filter((d) => d.accountId === accountId)
        .reduce((v, d) => v + d.amount, 0),
    0,
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
  for (const key of [
    "recurrences",
    "receivables",
    "financings",
    "customCategories",
    "tags",
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
  for (const c of value.cards)
    if (
      typeof c.name !== "string" ||
      !integer(c.limit) ||
      c.limit <= 0 ||
      !Number.isInteger(c.closingDay) ||
      c.closingDay < 1 ||
      c.closingDay > 28 ||
      !Number.isInteger(c.dueDay) ||
      c.dueDay < 1 ||
      c.dueDay > 28
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
        : !value.accounts.some((a) => a.id === t.accountId)
    )
      throw Error("Lançamento sem conta/cartão válido.");
    if (
      t.type === "transfer" &&
      (!value.accounts.some((a) => a.id === t.destinationId) ||
        t.accountId === t.destinationId)
    )
      throw Error("Transferência inválida.");
  }
  for (const b of value.budgets)
    if (
      ![...categories, ...value.customCategories.map((c) => c.name)].includes(
        b.category,
      ) ||
      !integer(b.amount) ||
      b.amount <= 0
    )
      throw Error("Orçamento inválido.");
  for (const g of value.goals)
    if (
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
          !value.accounts.some((a) => a.id === d.accountId),
      ) ||
      g.saved !== g.deposits.reduce((n, d) => n + d.amount, 0)
    )
      throw Error("Meta inválida.");
  const positive = (n) => integer(n) && n > 0 && n <= 99999999999;
  const account = (id) => value.accounts.some((a) => a.id === id);
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
  return {
    ...value,
    settings: {
      dark: !!value.settings?.dark,
      hide: !!value.settings?.hide,
      biometric: false,
    },
  };
}
