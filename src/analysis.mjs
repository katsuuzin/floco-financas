// F4 — orçamentos por ciclo (P1), projeção contratado × estimado (P5) e
// relatórios avançados (R3–R6, R9). Valores em centavos.
import { uid, isDate, monthKey, addMonths, analysisAmount, invoice, totals, today } from "./finance.mjs";
import { recurrenceEvents, projection } from "./planning.mjs";
import { inCategory } from "./categories.mjs";

const fail = (m) => {
  throw Error(m);
};
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (date) => new Date(date + "T12:00:00");
const addDays = (date, n) => {
  const d = at(date);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const lastDay = (month) => new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();

// Lançamentos que contam como receita/despesa real (sem transferências, pagamento
// de fatura, recebimento de dívida ou itens ignorados).
export const counts = (t) =>
  t.type !== "transfer" && !t.invoicePayment && !t.loanSettlement && !t.ignored;

// ---------- Orçamentos (P1) ----------
export function normalizeBudget(b) {
  return {
    type: "expense",
    cycle: "monthly",
    startDay: 1,
    where: [],
    affectsForecast: false,
    name: "",
    ...b,
    categories: b.categories?.length ? b.categories : b.category ? [b.category] : [],
  };
}

// Intervalo do ciclo que contém `date`.
export function budgetCycle(budget, date = today()) {
  const b = normalizeBudget(budget);
  if (b.cycle === "monthly") {
    const day = Math.min(b.startDay, 28);
    const [y, m, d] = date.split("-").map(Number);
    const startMonth = d >= day ? `${y}-${pad(m)}` : monthKey(addMonths(`${y}-${pad(m)}-01`, -1));
    const start = `${startMonth}-${pad(day)}`;
    const end = addDays(monthKey(addMonths(startMonth + "-01", 1)) + `-${pad(day)}`, -1);
    return { start, end };
  }
  const length = b.cycle === "weekly" ? 7 : 14;
  // Âncora: primeira segunda-feira de 2024 ajustada pelo dia de início (0=domingo).
  const anchor = at("2024-01-01");
  anchor.setDate(anchor.getDate() + (((b.startDay % 7) - anchor.getDay() + 7) % 7));
  const diff = Math.floor((at(date) - anchor) / 86400000);
  const offset = Math.floor(diff / length) * length;
  const start = addDays(iso(anchor), offset);
  return { start, end: addDays(start, length - 1) };
}

export function budgetUsage(s, budget, date = today()) {
  const b = normalizeBudget(budget);
  const { start, end } = budgetCycle(b, date);
  const where = new Set(b.where || []);
  const used = s.transactions
    .filter(
      (t) =>
        counts(t) &&
        t.confirmed &&
        t.type === b.type &&
        t.date >= start &&
        t.date <= end &&
        b.categories.some((name) => inCategory(t, name)) &&
        (!where.size || where.has(t.accountId) || where.has(t.cardId)),
    )
    .reduce((n, t) => n + analysisAmount(t), 0);
  return { start, end, used, limit: b.amount, left: b.amount - used, ratio: b.amount ? used / b.amount : 0 };
}

export function budgetHistory(s, budget, cycles = 6, date = today()) {
  const out = [];
  let ref = date;
  for (let i = 0; i < cycles; i++) {
    const u = budgetUsage(s, budget, ref);
    out.unshift(u);
    ref = addDays(u.start, -1);
  }
  const within = out.filter((u) => (normalizeBudget(budget).type === "income" ? u.used >= u.limit : u.used <= u.limit)).length;
  return { cycles: out, within };
}

export function saveBudget(s, input) {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) fail("Informe o valor do orçamento.");
  if (!input.categories?.length) fail("Escolha pelo menos uma categoria.");
  if (!["monthly", "fortnightly", "weekly"].includes(input.cycle)) fail("Escolha o ciclo.");
  const startDay = Number(input.startDay || 1);
  if (input.cycle === "monthly" ? startDay < 1 || startDay > 28 : startDay < 0 || startDay > 6)
    fail("Confira o dia de início do ciclo.");
  const row = {
    id: input.id || uid(),
    name: input.name?.trim() || input.categories.join(", "),
    type: input.type === "income" ? "income" : "expense",
    amount: input.amount,
    categories: [...new Set(input.categories)],
    category: input.categories[0],
    where: input.where || [],
    cycle: input.cycle,
    startDay,
    affectsForecast: !!input.affectsForecast,
    color: input.color || "",
  };
  return { ...s, budgets: input.id ? s.budgets.map((b) => (b.id === input.id ? row : b)) : [...s.budgets, row] };
}

// ---------- Projeção médio prazo (P5) ----------
const variable = (t) =>
  counts(t) && t.confirmed && !t.recurrenceId && !t.financingId && !(t.installments > 1);

// Média mensal do que é avulso nos últimos `n` meses fechados (receita − despesa).
export function variableRhythm(s, refMonth = monthKey(today()), n = 3) {
  let income = 0,
    expense = 0;
  for (let i = 1; i <= n; i++) {
    const m = monthKey(addMonths(refMonth + "-01", -i));
    for (const t of s.transactions)
      if (variable(t) && monthKey(t.date) === m) {
        if (t.type === "income") income += analysisAmount(t);
        else expense += analysisAmount(t);
      }
  }
  return { income: Math.round(income / n), expense: Math.round(expense / n), net: Math.round((income - expense) / n) };
}

// Saldo mês a mês: o que está contratado (pendências, recorrências, faturas,
// parcelas) e o que é estimado pelo ritmo avulso recente.
export function mediumTerm(s, months = 6, from = today()) {
  const rhythm = variableRhythm(s, monthKey(from));
  const rows = [];
  let estimatedAcc = 0;
  for (let i = 1; i <= months; i++) {
    const m = monthKey(addMonths(monthKey(from) + "-01", i - 1));
    const end = `${m}-${pad(lastDay(m))}`;
    const p = projection(s, end > addMonths(from, 24) ? addMonths(from, 24) : end, { from });
    estimatedAcc += rhythm.net;
    rows.push({ month: m, contracted: p.final, estimated: p.final + estimatedAcc, rhythm: rhythm.net });
  }
  const initial = projection(s, from, { from }).initial;
  const last = rows[rows.length - 1];
  const contractedShare =
    last && last.estimated - initial !== 0
      ? Math.max(0, Math.min(1, (last.contracted - initial) / (last.estimated - initial)))
      : 1;
  const negative = rows.find((r) => r.estimated < 0);
  return { initial, rows, rhythm, contractedShare, firstNegative: negative?.month || null };
}

// ---------- Relatórios ----------
// R4 fluxo de caixa: cartão entra pelo mês da fatura; com previstos inclui pendências e recorrências.
export function cashFlow(s, year, { forecast = true, tag = "" } = {}) {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}`);
  const map = new Map(months.map((m) => [m, { month: m, income: 0, expense: 0, forecastIncome: 0, forecastExpense: 0 }]));
  for (const t of s.transactions) {
    if (!counts(t) || (tag && !(t.tags || []).includes(tag))) continue;
    const m = t.cardId ? t.invoiceMonth : monthKey(t.date);
    const row = map.get(m);
    if (!row) continue;
    const v = analysisAmount(t);
    const pending = !t.confirmed;
    if (pending && !forecast) continue;
    if (t.type === "income") row[pending ? "forecastIncome" : "income"] += v;
    else row[pending ? "forecastExpense" : "expense"] += v;
  }
  if (forecast) {
    const from = today() > `${year}-01-01` ? today() : `${year}-01-01`;
    const through = `${year}-12-31`;
    if (from <= through)
      for (const e of recurrenceEvents(s, through, from)) {
        const row = map.get(monthKey(e.date));
        if (row) row[e.type === "income" ? "forecastIncome" : "forecastExpense"] += e.amount;
      }
  }
  let acc = 0;
  const rows = months.map((m) => {
    const r = map.get(m);
    const income = r.income + r.forecastIncome,
      expense = r.expense + r.forecastExpense;
    acc += income - expense;
    return { ...r, totalIncome: income, totalExpense: expense, net: income - expense, cumulative: acc };
  });
  const worst = rows.reduce((a, r) => (r.net < a.net ? r : a), rows[0]);
  return { rows, total: acc, worst };
}

// Categoria que mais pesou num mês.
export function topCategory(s, month) {
  const map = new Map();
  for (const t of s.transactions)
    if (counts(t) && t.type === "expense" && (t.cardId ? t.invoiceMonth : monthKey(t.date)) === month)
      map.set(t.category, (map.get(t.category) || 0) + analysisAmount(t));
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0] || null;
}

// R5 resultado por categoria no período.
export function categoryNet(s, start, end) {
  if (!isDate(start) || !isDate(end) || end < start) fail("Confira o período.");
  const map = new Map();
  for (const t of s.transactions) {
    if (!counts(t) || !t.confirmed || t.date < start || t.date > end) continue;
    const r = map.get(t.category) || { category: t.category, income: 0, expense: 0 };
    r[t.type] += analysisAmount(t);
    map.set(t.category, r);
  }
  return [...map.values()]
    .map((r) => ({ ...r, net: r.income - r.expense }))
    .sort((a, b) => a.net - b.net);
}

// R6 comparar dois períodos.
export function comparePeriods(s, a, b) {
  const sum = (p) => {
    const rows = categoryNet(s, p.start, p.end);
    return {
      income: rows.reduce((n, r) => n + r.income, 0),
      expense: rows.reduce((n, r) => n + r.expense, 0),
      byCategory: new Map(rows.map((r) => [r.category, r.expense])),
    };
  };
  const A = sum(a),
    B = sum(b);
  const cats = [...new Set([...A.byCategory.keys(), ...B.byCategory.keys()])];
  return {
    current: { income: A.income, expense: A.expense, result: A.income - A.expense },
    previous: { income: B.income, expense: B.expense, result: B.income - B.expense },
    categories: cats
      .map((c) => ({ category: c, current: A.byCategory.get(c) || 0, previous: B.byCategory.get(c) || 0 }))
      .map((r) => ({ ...r, diff: r.current - r.previous }))
      .filter((r) => r.current || r.previous)
      .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff)),
  };
}

// Período anterior equivalente (mesmo número de dias, logo antes).
export function previousPeriod(start, end) {
  const days = Math.round((at(end) - at(start)) / 86400000);
  const pEnd = addDays(start, -1);
  return { start: addDays(pEnd, -days), end: pEnd };
}

// R3 relatório de faturas de um mês, agrupado por cartão, categoria ou tag.
export function invoiceReport(s, month, { cardIds = [], group = "card" } = {}) {
  const cards = s.cards.filter((c) => !cardIds.length || cardIds.includes(c.id));
  const items = [];
  for (const c of cards) items.push(...invoice(s, c.id, month).purchases.map((t) => ({ ...t, cardName: c.name })));
  const map = new Map();
  for (const t of items) {
    const keys =
      group === "card"
        ? [t.cardName]
        : group === "category"
          ? [t.category]
          : (t.tags || []).length
            ? t.tags.map((id) => "#" + (s.tags?.find((x) => x.id === id)?.name || "tag"))
            : ["Sem tag"];
    for (const key of keys) map.set(key, (map.get(key) || 0) + analysisAmount(t));
  }
  return {
    total: items.reduce((n, t) => n + analysisAmount(t), 0),
    count: items.length,
    groups: [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
  };
}

// R9 previsto × realizado, mês a mês, para orçamentos mensais de despesa.
export function budgetVsActual(s, endMonth = monthKey(today()), months = 6) {
  const budgets = s.budgets.map(normalizeBudget).filter((b) => b.type === "expense");
  return Array.from({ length: months }, (_, i) => {
    const m = monthKey(addMonths(endMonth + "-01", i - months + 1));
    const ref = `${m}-${pad(Math.min(28, lastDay(m)))}`;
    let planned = 0,
      actual = 0;
    for (const b of budgets) {
      const u = budgetUsage(s, b.cycle === "monthly" ? b : { ...b, cycle: "monthly", startDay: 1, amount: b.amount * (b.cycle === "weekly" ? 52 / 12 : 26 / 12) }, ref);
      planned += Math.round(u.limit);
      actual += u.used;
    }
    return { month: m, planned, actual, diff: planned - actual };
  });
}

// Planilha mensal por conta (R10): receitas e despesas por conta e mês.
export function monthlyByAccount(s, start, end) {
  const rows = new Map();
  for (const t of s.transactions) {
    if (!counts(t) || !t.confirmed || t.date < start || t.date > end) continue;
    const owner = s.accounts.find((a) => a.id === t.accountId)?.name || s.cards.find((c) => c.id === t.cardId)?.name || "—";
    const key = monthKey(t.date) + "|" + owner;
    const r = rows.get(key) || { month: monthKey(t.date), account: owner, income: 0, expense: 0 };
    r[t.type] += analysisAmount(t);
    rows.set(key, r);
  }
  return [...rows.values()].sort((a, b) => (a.month + a.account).localeCompare(b.month + b.account));
}

export { totals };
