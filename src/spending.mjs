// Calendário de gastos e rosca de categorias (aba Análise).
// Valores em centavos; datas ISO. Sem imports de tela: tudo testável em Node.
import { monthKey, addMonths, analysisAmount, totalBalance, signedAmount, includedAccounts, today } from "./finance.mjs";
import { projection } from "./planning.mjs";

const pad = (n) => String(n).padStart(2, "0");
const daysIn = (month) => new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
const dateOf = (month, day) => `${month}-${pad(day)}`;

// Lançamento que conta como entrada ou saída real do período (sem transferência, pagamento
// de fatura, recebimento de dívida e itens ignorados), igual aos totais da Análise.
const real = (t) => t.type !== "transfer" && !t.invoicePayment && !t.loanSettlement && !t.ignored;

// Saldo das contas incluídas ao fim de `date`, a partir do saldo de hoje e dos lançamentos
// confirmados que vieram depois. Só vale para hoje e dias passados.
export function balanceAtEndOf(state, date) {
  const ids = new Set(includedAccounts(state).map((a) => a.id));
  const after = state.transactions
    .filter((t) => t.confirmed && !t.cardId && t.date > date)
    .reduce((n, t) => n + (ids.has(t.accountId) ? signedAmount(t) : 0) + (t.type === "transfer" && ids.has(t.destinationId) ? t.amount : 0), 0);
  return totalBalance(state) - after;
}

// ---------- Calendário ----------

// Um mês em dias. `ref` é "hoje": até ele o saldo é o realizado; depois, o previsto
// (pendentes, recorrências e faturas a vencer, como em Projeções).
export function monthCalendar(state, month, ref = today()) {
  const n = daysIn(month);
  const first = dateOf(month, 1);
  const last = dateOf(month, n);
  const rows = Array.from({ length: n }, (_, i) => ({
    date: dateOf(month, i + 1),
    day: i + 1,
    income: 0,
    expense: 0,
    plannedIn: 0,
    plannedOut: 0,
    hasInvoice: false,
    pending: 0,
    balance: null,
    projected: false,
  }));
  const at = (date) => rows[Number(date.slice(8)) - 1];
  for (const t of state.transactions) {
    if (monthKey(t.date) !== month || !real(t)) continue;
    if (t.confirmed) {
      if (t.type === "income") at(t.date).income += analysisAmount(t);
      else at(t.date).expense += analysisAmount(t);
    } else {
      at(t.date).pending++;
    }
  }
  // Futuro do mês: eventos previstos da projeção que caem neste mês.
  const monthEndsAfterRef = last >= ref;
  const horizon = addMonths(ref, 24); // Projeções valem até 24 meses
  let futureRows = [];
  if (monthEndsAfterRef && first <= horizon) {
    const through = last > horizon ? horizon : last;
    if (through >= ref) futureRows = projection(state, through, { from: ref }).rows;
    for (const e of futureRows) {
      if (monthKey(e.date) !== month) continue;
      const cell = at(e.date);
      if (e.amount >= 0) cell.plannedIn += e.amount;
      else cell.plannedOut += -e.amount;
      if (/^Fatura ·/.test(e.description)) cell.hasInvoice = true;
    }
  }
  // Saldo ao fim de cada dia: realizado até `ref`, previsto depois.
  const start = totalBalance(state);
  for (const r of rows) {
    if (r.date <= ref) r.balance = balanceAtEndOf(state, r.date);
    else if (monthEndsAfterRef && r.date <= horizon) {
      let b = start;
      for (const e of futureRows) if (e.date <= r.date) b = e.balance;
      r.balance = b;
      r.projected = true;
    }
  }
  const sum = (key) => rows.reduce((a, r) => a + r[key], 0);
  const income = sum("income");
  const expense = sum("expense");
  const lastRow = rows[n - 1];
  // Semanas começando no domingo, com vazios antes do dia 1.
  const lead = new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1).getDay();
  const cells = [...Array(lead).fill(null), ...rows];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  return {
    month,
    days: rows,
    weeks,
    income,
    expense,
    result: income - expense,
    plannedIn: sum("plannedIn"),
    plannedOut: sum("plannedOut"),
    endBalance: lastRow.balance,
    endProjected: lastRow.projected,
    peakExpense: Math.max(0, ...rows.map((r) => r.expense)),
    minBalance: rows.some((r) => r.balance !== null) ? Math.min(...rows.filter((r) => r.balance !== null).map((r) => r.balance)) : null,
    isEmpty: !rows.some((r) => r.income || r.expense || r.plannedIn || r.plannedOut || r.pending),
  };
}

// Intensidade (0 a 3) do gasto do dia em relação ao maior gasto do mês.
export function intensity(expense, peak) {
  if (!expense || !peak) return 0;
  const f = expense / peak;
  return f > 0.66 ? 3 : f > 0.33 ? 2 : 1;
}

// Detalhe de um dia: o que aconteceu (confirmado ou pendente) e o que está previsto.
export function dayDetail(state, date, ref = today()) {
  const items = state.transactions
    .filter((t) => t.date === date && t.type !== "transfer" && !t.invoicePayment && !t.loanSettlement)
    .map((t) => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      type: t.refund ? "income" : t.type,
      category: t.category || "Outros",
      subcategory: t.subcategory || "",
      confirmed: !!t.confirmed,
      ignored: !!t.ignored,
      card: !!t.cardId,
    }));
  const planned = [];
  if (date >= ref && date <= addMonths(ref, 24)) {
    for (const e of projection(state, date, { from: ref }).rows)
      if (e.date === date && !items.some((i) => !i.confirmed && i.description === e.description && Math.abs(i.amount) === Math.abs(e.amount)))
        planned.push({ description: e.description, amount: Math.abs(e.amount), type: e.amount >= 0 ? "income" : "expense" });
  }
  const sum = (type) => items.filter((i) => i.confirmed && !i.ignored && i.type === type).reduce((a, i) => a + i.amount, 0);
  return { date, income: sum("income"), expense: sum("expense"), items, planned };
}

// ---------- Rosca ----------

// Fatias por categoria principal. `kind`: "expense" | "income". `hidden`: nomes fora do
// gráfico (continuam na lista). Subcategorias somam na principal.
export function donutSlices(state, month, { kind = "expense", hidden = [] } = {}) {
  const off = new Set(hidden);
  const byCat = new Map();
  for (const t of state.transactions) {
    if (!t.confirmed || monthKey(t.date) !== month || !real(t)) continue;
    const isIncome = t.type === "income";
    if ((kind === "income") !== isIncome) continue;
    const name = t.category || "Outros";
    const row = byCat.get(name) || { name, cents: 0, subs: new Map() };
    const v = analysisAmount(t);
    row.cents += v;
    const sub = t.subcategory || "";
    row.subs.set(sub, (row.subs.get(sub) || 0) + v);
    byCat.set(name, row);
  }
  const all = [...byCat.values()]
    .filter((r) => r.cents > 0)
    .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name, "pt-BR"))
    .map((r) => ({
      name: r.name,
      cents: r.cents,
      hidden: off.has(r.name),
      subs: [...r.subs.entries()].filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).map(([name, cents]) => ({ name: name || "Sem subcategoria", cents })),
    }));
  const shown = all.filter((r) => !r.hidden);
  const total = shown.reduce((a, r) => a + r.cents, 0);
  const slices = shown.map((r) => ({ ...r, fraction: total ? r.cents / total : 0 }));
  return {
    kind,
    month,
    total,
    slices,
    hidden: all.filter((r) => r.hidden),
    count: slices.length,
    isEmpty: !all.length,
    allHidden: all.length > 0 && !shown.length,
  };
}

// Ângulos dos arcos (radianos, começando no topo, sentido horário) com folga entre fatias.
// Uma fatia sozinha fecha o anel. Fatias pequenas demais para a folga ficam como ponto.
export function donutArcs(fractions, gap = 0.06) {
  const TAU = Math.PI * 2;
  const start0 = -Math.PI / 2;
  if (fractions.length === 1) return [{ start: start0, end: start0 + TAU - 0.0001, mid: start0 + Math.PI }];
  let acc = 0;
  return fractions.map((f) => {
    const a0 = start0 + acc * TAU;
    acc += f;
    const a1 = start0 + acc * TAU;
    const room = Math.max(0, (a1 - a0) - gap);
    const start = a0 + gap / 2;
    const end = start + room;
    return { start, end, mid: (a0 + a1) / 2 };
  });
}

// Caminho SVG de um arco de circunferência.
export function arcPath(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)].map((v) => Number(v.toFixed(2)));
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
}

// Texto sob o total: "gasto até hoje · 5 categorias" no mês atual; "gasto no mês" nos outros.
export function donutCaption(data, ref = today()) {
  const now = data.month === monthKey(ref);
  const word = data.kind === "income" ? (now ? "recebido até hoje" : "recebido no mês") : now ? "gasto até hoje" : "gasto no mês";
  return `${word} · ${data.count} ${data.count === 1 ? "categoria" : "categorias"}`;
}

// Valor curto para caber na célula do calendário: 85, 1,2 mil, 12 mil, 1,5 mi (sem centavos).
export function compactCents(cents) {
  const sign = cents < 0 ? "−" : "";
  const reais = Math.abs(cents) / 100;
  const fmt = (n) => n.toFixed(1).replace(".", ",").replace(/,0$/, "");
  if (reais < 1000) return sign + String(Math.round(reais));
  if (reais < 1_000_000) return sign + (reais < 10_000 ? fmt(reais / 1000) : String(Math.round(reais / 1000))) + " mil";
  return sign + fmt(reais / 1_000_000) + " mi";
}
