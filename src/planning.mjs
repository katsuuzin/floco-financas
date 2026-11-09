import { renameLook } from "./looks.mjs";
import { categoryNames as allCategoryNames, subsOf } from "./categories.mjs";
export { categoryNames } from "./categories.mjs";
import {
  uid,
  today,
  isDate,
  analysisAmount,
  signedAmount,
  addMonths,
  addTransaction,
  balance,
  invoice,
  monthKey,
  includedAccounts,
  totalBalance,
} from "./finance.mjs";

export const extraLists = [
  "recurrences",
  "receivables",
  "financings",
  "customCategories",
  "tags",
];
const amountOK = (n) => Number.isSafeInteger(n) && n > 0 && n <= 99999999999;
const fail = (message) => {
  throw Error(message);
};
export function saveLabel(s, list, input) {
  if (!["tags", "customCategories"].includes(list)) fail("Cadastro inválido.");
  const name = input.name?.trim();
  if (!name || name.length > 80) fail("Use um nome de até 80 caracteres.");
  const rows = s[list] || [];
  if (
    rows.some(
      (r) =>
        r.id !== input.id &&
        r.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
    ) ||
    (list === "customCategories" &&
      allCategoryNames({ ...s, customCategories: [] }).some(
        (n) => n.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
      ))
  )
    fail("Esse nome já existe.");
  if (
    input.parent &&
    (input.parent === name ||
      !allCategoryNames(s).includes(input.parent) ||
      (s.customCategories || []).some(
        (c) => c.name === input.parent && c.parent,
      ))
  )
    fail("Escolha uma categoria principal.");
  if (list === "customCategories" && input.parent && subsOf({ ...s, customCategories: [] }, input.parent).some((n) => n.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR")))
    fail("Essa subcategoria já existe nesta categoria.");
  const previous = rows.find((r) => r.id === input.id);
  if (
    previous &&
    input.parent &&
    (s.customCategories || []).some((c) => c.parent === previous.name)
  )
    fail("Uma categoria com subcategorias deve permanecer principal.");
  const row = {
    id: input.id || uid(),
    name,
    ...(list === "customCategories" ? { parent: input.parent || "" } : {}),
  };
  let next = { ...s, [list]: [...rows.filter((r) => r.id !== row.id), row] };
  if (previous && previous.name !== name) {
    if (list === "customCategories") {
      next.transactions = s.transactions.map((t) => {
        const cat = t.category === previous.name ? { category: name } : {};
        const sub = t.subcategory === previous.name ? { subcategory: name } : {};
        return Object.keys(cat).length || Object.keys(sub).length ? { ...t, ...cat, ...sub } : t;
      });
      if (s.rules)
        next.rules = s.rules.map((r) => ({
          ...r,
          ...(r.category === previous.name ? { category: name } : {}),
          ...(r.subcategory === previous.name ? { subcategory: name } : {}),
        }));
      next.budgets = s.budgets.map((b) =>
        b.category === previous.name ? { ...b, category: name } : b,
      );
      next.recurrences = (s.recurrences || []).map((r) =>
        r.category === previous.name ? { ...r, category: name } : r,
      );
      next.financings = (s.financings || []).map((r) =>
        r.category === previous.name ? { ...r, category: name } : r,
      );
      next.customCategories = next.customCategories.map((c) =>
        c.parent === previous.name ? { ...c, parent: name } : c,
      );
      next = renameLook(next, previous.name, name);
    } // Tags are stored by stable ID, so renaming preserves every link.
  }
  return next;
}
export function removeLabel(s, list, id) {
  const row = (s[list] || []).find((r) => r.id === id);
  if (!row) fail("Cadastro não encontrado.");
  if (list === "customCategories") {
    if (
      s.transactions.some((t) => t.category === row.name || t.subcategory === row.name) ||
      s.budgets.some((t) => t.category === row.name) ||
      (s.recurrences || []).some((t) => t.category === row.name) ||
      (s.customCategories || []).some((t) => t.parent === row.name) ||
      (s.financings || []).some((t) => t.category === row.name)
    )
      fail(
        "Esta categoria está em uso. Edite o nome ou remova os vínculos primeiro.",
      );
  } else if (list !== "tags") fail("Cadastro inválido.");
  return {
    ...s,
    [list]: (s[list] || []).filter((r) => r.id !== id),
    transactions: s.transactions.map((t) => ({
      ...t,
      tags: (t.tags || []).filter((tag) => tag !== id),
    })),
  };
}
export function occurrenceDate(r, index) {
  if (r.frequency === "monthly") return addMonths(r.date, index);
  if (r.frequency === "yearly") return addMonths(r.date, index * 12);
  const d = new Date(r.date + "T12:00:00Z");
  d.setUTCDate(
    d.getUTCDate() +
      index *
        (r.frequency === "weekly" ? 7 : r.frequency === "fortnightly" ? 14 : 1),
  );
  return d.toISOString().slice(0, 10);
}
export function saveRecurrence(s, input) {
  if (
    !input.description?.trim() ||
    !amountOK(input.amount) ||
    !isDate(input.date) ||
    !["income", "expense"].includes(input.type) ||
    !["daily", "weekly", "fortnightly", "monthly", "yearly"].includes(
      input.frequency,
    )
  )
    fail("Confira descrição, valor, data e frequência.");
  if (!s.accounts.some((a) => a.id === input.accountId))
    fail("Selecione uma conta.");
  if (input.endDate && (!isDate(input.endDate) || input.endDate < input.date))
    fail("O término precisa ser igual ou posterior ao início.");
  const existing = (s.recurrences || []).find((r) => r.id === input.id);
  const id = input.id || uid();
  if (
    existing &&
    s.transactions.some((t) => t.recurrenceId === id) &&
    (existing.date !== input.date || existing.frequency !== input.frequency)
  )
    fail(
      "Para alterar o calendário de uma recorrência já gerada, pause esta e crie outra.",
    );
  return {
    ...s,
    recurrences: [
      ...(s.recurrences || []).filter((r) => r.id !== id),
      {
        id,
        description: input.description.trim(),
        amount: input.amount,
        date: input.date,
        endDate: input.endDate || "",
        frequency: input.frequency,
        accountId: input.accountId,
        category: input.category || "Outros",
        ...(input.subcategory ? { subcategory: input.subcategory } : {}),
        type: input.type,
        active: existing?.active ?? true,
      },
    ],
  };
}
export function recurrenceEvents(s, through, from = "0000-01-01") {
  if (!isDate(through)) fail("Data limite inválida.");
  const generated = new Set(
    s.transactions.map((t) => t.occurrenceKey).filter(Boolean),
  );
  const events = [];
  for (const r of s.recurrences || []) {
    if (!r.active) continue;
    let finished = false;
    for (let i = 0; i < 10000; i++) {
      const date = occurrenceDate(r, i);
      if (date > through || (r.endDate && date > r.endDate)) {
        finished = true;
        break;
      }
      const key = r.id + ":" + date;
      if (date >= from && !generated.has(key))
        events.push({ ...r, date, occurrenceKey: key, recurrenceId: r.id });
    }
    if (!finished)
      fail("Período muito longo. Divida a recorrência em intervalos menores.");
  }
  if (events.length > 10000) fail("Muitas ocorrências. Reduza o intervalo.");
  return events.sort((a, b) => a.date.localeCompare(b.date));
}
export function generateRecurrences(s, through = today()) {
  let next = s;
  for (const e of recurrenceEvents(s, through))
    next = addTransaction(next, { ...e, confirmed: false });
  return next;
}
export function installmentSimulation({
  amount,
  count,
  rate = 0,
  date = today(),
  entry = 0,
}) {
  if (
    !amountOK(amount) ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 360 ||
    count > amount - entry ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    rate > 100 ||
    !Number.isSafeInteger(entry) ||
    entry < 0 ||
    entry >= amount ||
    !isDate(date)
  )
    fail(
      "Confira valor, entrada, parcelas (1 a 360), juros mensais e data. Cada parcela deve ter pelo menos um centavo.",
    );
  const principal = amount - entry,
    i = rate / 100;
  const payment = i
    ? Math.round((principal * i) / (1 - Math.pow(1 + i, -count)))
    : Math.ceil(principal / count);
  let remaining = principal;
  const rows = Array.from({ length: count }, (_, n) => {
    const interest = Math.round(remaining * i);
    const value =
      n === count - 1
        ? remaining + interest
        : Math.min(payment, remaining + interest);
    remaining = Math.max(0, remaining + interest - value);
    return {
      number: n + 1,
      date: addMonths(date, n),
      amount: value,
      interest,
      balance: remaining,
    };
  });
  const total = entry + rows.reduce((sum, r) => sum + r.amount, 0);
  if (!Number.isSafeInteger(total) || total > 999999999999)
    fail("Resultado acima do limite suportado.");
  return { rows, payment, total, interest: total - amount, entry };
}
export function saveFinancing(s, input) {
  const count = Number(input.count),
    paid = Number(input.paid || 0);
  if (
    !input.name?.trim() ||
    !amountOK(input.amount) ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 360 ||
    !Number.isInteger(paid) ||
    paid < 0 ||
    paid >= count ||
    !isDate(input.date)
  )
    fail(
      "Confira contrato, parcela, quantidade, parcelas já pagas e primeiro vencimento em aberto.",
    );
  if (!s.accounts.some((a) => a.id === input.accountId))
    fail("Selecione a conta de pagamento.");
  const id = uid(),
    row = {
      id,
      name: input.name.trim(),
      institution: input.institution?.trim() || "",
      type: input.type === "loan" ? "loan" : "financing",
      amount: input.amount,
      count,
      paid,
      date: input.date,
      accountId: input.accountId,
      category: input.category || "Outros",
    };
  const transactions = Array.from({ length: count - paid }, (_, n) => ({
    id: uid(),
    financingId: id,
    type: "expense",
    amount: input.amount,
    description: `${row.name} · ${paid + n + 1}/${count}`,
    date: addMonths(input.date, n),
    accountId: input.accountId,
    category: row.category,
    confirmed: false,
    installment: paid + n + 1,
    installments: count,
  }));
  return {
    ...s,
    financings: [...(s.financings || []), row],
    transactions: [...s.transactions, ...transactions],
  };
}
export const receivableBalance = (r) =>
  r.amount - r.payments.reduce((n, p) => n + p.amount, 0);
export function addReceivable(s, input) {
  if (
    !input.person?.trim() ||
    !input.description?.trim() ||
    !amountOK(input.amount) ||
    !isDate(input.date) ||
    (input.dueDate && (!isDate(input.dueDate) || input.dueDate < input.date))
  )
    fail("Confira pessoa, descrição, valor e datas.");
  return {
    ...s,
    receivables: [
      ...(s.receivables || []),
      {
        id: uid(),
        person: input.person.trim(),
        description: input.description.trim(),
        amount: input.amount,
        date: input.date,
        dueDate: input.dueDate || "",
        payments: [],
      },
    ],
  };
}
export function receiveDebt(s, id, amount, accountId, date = today()) {
  const r = (s.receivables || []).find((r) => r.id === id);
  if (
    !r ||
    !amountOK(amount) ||
    amount > receivableBalance(r) ||
    !isDate(date) ||
    date < r.date ||
    !s.accounts.some((a) => a.id === accountId)
  )
    fail(
      "Confira conta, data e valor. O recebimento não pode superar o saldo a receber.",
    );
  const transactionId = uid(),
    p = { id: uid(), transactionId, accountId, amount, date };
  return {
    ...s,
    receivables: s.receivables.map((x) =>
      x.id === id ? { ...x, payments: [...x.payments, p] } : x,
    ),
    transactions: [
      ...s.transactions,
      {
        id: transactionId,
        type: "income",
        amount,
        date,
        accountId,
        description: `Recebimento · ${r.person} · ${r.description}`,
        category: "Outros",
        confirmed: true,
        loanSettlement: id,
      },
    ],
  };
}
export function undoDebtPayment(s, id, paymentId) {
  const r = (s.receivables || []).find((r) => r.id === id),
    p = r?.payments.find((p) => p.id === paymentId);
  if (!p) fail("Recebimento não encontrado.");
  return {
    ...s,
    receivables: s.receivables.map((x) =>
      x.id === id
        ? { ...x, payments: x.payments.filter((p) => p.id !== paymentId) }
        : x,
    ),
    transactions: s.transactions.filter((t) => t.id !== p.transactionId),
  };
}
export function projection(
  s,
  through,
  { from = today(), scenarioMonthly = 0 } = {},
) {
  if (
    !isDate(from) ||
    !isDate(through) ||
    through < from ||
    through > addMonths(from, 24) ||
    !Number.isSafeInteger(scenarioMonthly)
  )
    fail("Escolha um horizonte de até 24 meses.");
  const initial = totalBalance(s);
  const included = new Set(includedAccounts(s).map((a) => a.id));
  const events = s.transactions
    .filter(
      (t) =>
        !t.confirmed &&
        !t.cardId &&
        t.date <= through &&
        (included.has(t.accountId) ||
          (t.type === "transfer" && included.has(t.destinationId))),
    )
    .map((t) => ({
      date: t.date < from ? from : t.date,
      description: t.description,
      amount:
        t.type === "transfer"
          ? (included.has(t.destinationId) ? t.amount : 0) -
            (included.has(t.accountId) ? t.amount : 0)
          : signedAmount(t) + (t.paidPart || 0),
    }))
    .filter((e) => e.amount !== 0);
  for (const e of recurrenceEvents(s, through, from).filter((e) =>
    included.has(e.accountId),
  ))
    events.push({
      date: e.date,
      description: e.description,
      amount: e.type === "income" ? e.amount : -e.amount,
    });
  for (const card of s.cards) {
    if (card.accountId && !included.has(card.accountId)) continue;
    const months = new Set(
      s.transactions
        .filter((t) => t.cardId === card.id)
        .map((t) => t.invoiceMonth),
    );
    for (const m of months) {
      const due = invoice(s, card.id, m).due;
      const date =
        m +
        "-" +
        String(
          Math.min(
            card.dueDay,
            new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate(),
          ),
        ).padStart(2, "0");
      if (due && date <= through)
        events.push({
          date: date < from ? from : date,
          description: `Fatura · ${card.name}`,
          amount: -due,
        });
    }
  }
  if (scenarioMonthly)
    for (let n = 0; n <= 24; n++) {
      const date = addMonths(from, n);
      if (date > through) break;
      events.push({
        date,
        description: "Cenário mensal simulado",
        amount: scenarioMonthly,
      });
    }
  events.sort((a, b) => a.date.localeCompare(b.date));
  let running = initial,
    min = initial;
  const rows = events.map((e) => {
    running += e.amount;
    min = Math.min(min, running);
    return { ...e, balance: running };
  });
  return { initial, final: running, min, rows };
}
export function report(
  s,
  {
    start,
    end,
    status = "all",
    type = "all",
    accountId = "",
    category = "",
    tag = "",
    group = "category",
  },
) {
  if (!isDate(start) || !isDate(end) || end < start)
    fail("Confira o período do relatório.");
  const rows = s.transactions.filter(
    (t) =>
      t.date >= start &&
      t.date <= end &&
      t.type !== "transfer" &&
      !t.invoicePayment &&
      !t.loanSettlement &&
      !t.ignored &&
      (status === "all" || t.confirmed === (status === "confirmed")) &&
      (type === "all" || t.type === type) &&
      (!accountId || t.accountId === accountId || t.cardId === accountId) &&
      (!category || t.category === category) &&
      (!tag || (t.tags || []).includes(tag)),
  );
  const groups = new Map();
  for (const t of rows) {
    let key = t.category;
    if (group === "month") key = monthKey(t.date);
    if (group === "account")
      key =
        s.accounts.find((a) => a.id === t.accountId)?.name ||
        s.cards.find((c) => c.id === t.cardId)?.name ||
        "Sem conta";
    if (group === "weekday")
      key = [
        "Domingo",
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
      ][new Date(t.date + "T12:00:00Z").getUTCDay()];
    if (group === "fixed")
      key =
        t.recurrenceId || t.financingId
          ? "Fixas / recorrentes"
          : "Variáveis / avulsas";
    const g = groups.get(key) || { name: key, income: 0, expense: 0, count: 0 };
    g[t.type] += analysisAmount(t);
    g.count++;
    groups.set(key, g);
  }
  return {
    rows,
    groups: [...groups.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    ),
    income: rows
      .filter((t) => t.type === "income")
      .reduce((n, t) => n + analysisAmount(t), 0),
    expense: rows
      .filter((t) => t.type === "expense")
      .reduce((n, t) => n + analysisAmount(t), 0),
  };
}
