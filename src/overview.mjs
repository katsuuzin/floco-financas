// Resumo da aba Análise (inspirado no Início do Calen): ritmo de gasto do mês, tendência da
// fatura, cartões, 12 meses, assinaturas, insights e atividade recente. Valores em centavos,
// datas ISO. Sem imports de tela: tudo testável em Node.
import { monthKey, addMonths, analysisAmount, invoice, invoiceDueDate, invoiceMonth, totalBalance, today } from "./finance.mjs";
import { projection, recurrenceEvents } from "./planning.mjs";
import { donutSlices } from "./spending.mjs";

const pad = (n) => String(n).padStart(2, "0");
const daysIn = (month) => new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
const real = (t) => t.type !== "transfer" && !t.invoicePayment && !t.loanSettlement && !t.ignored;
const prevMonth = (m) => monthKey(addMonths(m + "-01", -1));
const nextMonth = (m) => monthKey(addMonths(m + "-01", 1));
const normName = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// Soma de despesas confirmadas por dia do mês (índice 1 = dia 1).
function spendByDay(state, month) {
  const n = daysIn(month);
  const out = Array(n + 1).fill(0);
  for (const t of state.transactions)
    if (t.confirmed && t.type === "expense" && real(t) && monthKey(t.date) === month) out[Number(t.date.slice(8))] += analysisAmount(t);
  return out;
}
const cumulative = (arr) => arr.map((_, i) => arr.slice(1, i + 1).reduce((a, b) => a + b, 0));

// ---------- Gasto no mês (linha acumulada, comparação e previsão) ----------

// Acumulado de gasto dia a dia: este mês até hoje, o mês passado inteiro e a previsão até o
// fim do mês (ritmo de hoje mantido). `behind` = quanto a mais (ou a menos, negativo) do que o
// mês passado no mesmo dia.
export function spendPace(state, month, ref = today()) {
  const n = daysIn(month);
  const isCurrent = month === monthKey(ref);
  const isPast = month < monthKey(ref);
  const day = isCurrent ? Number(ref.slice(8)) : isPast ? n : 0;
  const cur = cumulative(spendByDay(state, month));
  const lastMonth = prevMonth(month);
  const last = cumulative(spendByDay(state, lastMonth));
  const total = day ? cur[Math.min(day, n)] : 0;
  const lastToDate = last[Math.min(day || 0, daysIn(lastMonth))] || 0;
  const lastTotal = last[daysIn(lastMonth)] || 0;
  const projectedEnd = isCurrent && day ? Math.round((total / day) * n) : total;
  const series = (arr, len) => Array.from({ length: len }, (_, i) => arr[i + 1]);
  return {
    month,
    days: n,
    day,
    total,
    lastToDate,
    lastTotal,
    diff: total - lastToDate,
    pct: lastToDate > 0 ? Math.round(((total - lastToDate) / lastToDate) * 100) : null,
    current: series(cur, day),
    last: series(last, daysIn(lastMonth)),
    projectedEnd,
    isCurrent,
    isEmpty: total === 0 && lastTotal === 0,
  };
}

// ---------- Tendência da fatura ----------

// Total da fatura (soma dos cartões escolhidos, ou todos) no mês anterior, no mês e no
// seguinte, com a variação em relação ao mês de antes.
export function invoiceTrend(state, month, cardIds = []) {
  const cards = state.cards.filter((c) => !c.archived && (!cardIds.length || cardIds.includes(c.id)));
  const total = (m) => cards.reduce((a, c) => a + invoice(state, c.id, m).total, 0);
  const months = [prevMonth(month), month, nextMonth(month)];
  const values = months.map(total);
  const before = total(prevMonth(months[0]));
  return {
    cards: cards.length,
    months: months.map((m, i) => {
      const base = i === 0 ? before : values[i - 1];
      return { month: m, total: values[i], change: base > 0 ? Math.round(((values[i] - base) / base) * 100) : null };
    }),
    isEmpty: values.every((v) => v === 0),
  };
}

// ---------- Cartões ----------

// Fatura aberta de cada cartão: valor, vencimento e quanto do limite ela usa.
export function cardsOverview(state, ref = today()) {
  return state.cards
    .filter((c) => !c.archived)
    .map((c) => {
      const month = invoiceMonth(ref, c);
      const inv = invoice(state, c.id, month);
      return {
        id: c.id,
        name: c.name,
        institution: c.institution || "",
        month,
        open: inv.due,
        dueDate: invoiceDueDate(c, month),
        limit: c.limit || 0,
        usedPct: c.limit ? Math.round((inv.due / c.limit) * 100) : null,
      };
    })
    .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name, "pt-BR"));
}

// ---------- 12 meses ----------

// Doze meses em volta de `month` (6 antes, o mês e 5 depois): o que já aconteceu e o que ainda
// está previsto (pendentes e recorrências), de despesa e de receita.
export function yearBars(state, month, ref = today(), n = 12) {
  const first = addMonths(month + "-01", -6);
  const months = Array.from({ length: n }, (_, i) => monthKey(addMonths(first, i)));
  const last = months[n - 1];
  const lastDay = `${last}-${pad(daysIn(last))}`;
  let planned = [];
  try {
    planned = recurrenceEvents(state, lastDay, ref);
  } catch {
    planned = [];
  }
  return months.map((m) => {
    const row = { month: m, spent: 0, income: 0, plannedOut: 0, plannedIn: 0 };
    for (const t of state.transactions) {
      if (monthKey(t.date) !== m || !real(t)) continue;
      const v = t.type === "income" ? analysisAmount(t) : analysisAmount(t);
      if (t.confirmed) {
        if (t.type === "income") row.income += v;
        else if (t.type === "expense") row.spent += v;
      } else if (t.type === "income") row.plannedIn += t.amount;
      else if (t.type === "expense") row.plannedOut += t.amount - (t.paidPart || 0);
    }
    for (const e of planned) {
      if (monthKey(e.date) !== m) continue;
      if (e.type === "income") row.plannedIn += e.amount;
      else row.plannedOut += e.amount;
    }
    return row;
  });
}

// ---------- Assinaturas ----------

// Cobranças que se repetem: as recorrências mensais de despesa e as que o app encontra sozinho
// (mesma descrição, valor parecido, em pelo menos 3 meses seguidos).
export function subscriptions(state, ref = today()) {
  const out = [];
  const known = new Set();
  for (const r of state.recurrences || []) {
    if (!r.active || r.type !== "expense" || !["monthly", "yearly"].includes(r.frequency)) continue;
    known.add(normName(r.description));
    out.push({ key: "r:" + r.id, name: r.description, amount: r.amount, day: Number(r.date.slice(8)), category: r.category || "Outros", subcategory: r.subcategory || "", source: "recurrence" });
  }
  const groups = new Map();
  for (const t of state.transactions) {
    if (!t.confirmed || t.type !== "expense" || !real(t) || t.installments > 1) continue;
    const k = normName(t.description);
    if (!k || known.has(k)) continue;
    (groups.get(k) || groups.set(k, []).get(k)).push(t);
  }
  const limit = addMonths(monthKey(ref) + "-01", -6);
  for (const [k, rows] of groups) {
    const recent = rows.filter((t) => t.date >= limit);
    const months = [...new Set(recent.map((t) => monthKey(t.date)))].sort();
    if (months.length < 3) continue;
    // meses seguidos: os 3 últimos sem buraco
    const tail = months.slice(-3);
    const seq = tail.every((m, i) => i === 0 || nextMonth(tail[i - 1]) === m);
    if (!seq) continue;
    const amounts = recent.map((t) => t.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    if (!amounts.every((v) => Math.abs(v - avg) <= avg * 0.1)) continue;
    const lastTx = recent.sort((a, b) => b.date.localeCompare(a.date))[0];
    out.push({ key: "d:" + k, name: lastTx.description, amount: lastTx.amount, day: Number(lastTx.date.slice(8)), category: lastTx.category || "Outros", subcategory: lastTx.subcategory || "", source: "detected" });
  }
  return out.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "pt-BR"));
}

// ---------- Insights ----------

const money = (c) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Pontos do mês que valem atenção, do mais importante ao menos. Cada item: { id, kind, title,
// value (centavos ou null), note }.
export function monthInsights(state, month, ref = today()) {
  const out = [];
  // 1. Saldo que zera: primeiro dia em que a projeção fica negativa nos próximos 2 meses.
  try {
    const through = addMonths(ref, 60);
    const rows = projection(state, through > addMonths(ref, 24) ? addMonths(ref, 24) : through, { from: ref }).rows;
    const first = rows.find((r) => r.balance < 0);
    if (first) out.push({ id: "zero", kind: "danger", title: first.date.slice(0, 7) === monthKey(ref) ? "Seu saldo zera neste mês" : "Seu saldo zera no mês que vem", value: first.balance, note: `em ${first.date.slice(8)}/${first.date.slice(5, 7)}, mantendo o ritmo de agora` });
  } catch {
    /* sem projeção */
  }
  // 2. Fatura que não cabe no saldo.
  const balance = totalBalance(state);
  const due = cardsOverview(state, ref).filter((c) => c.open > 0 && c.dueDate >= ref).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  if (due && due.open > balance)
    out.push({ id: "invoice", kind: "danger", title: `A fatura de ${due.dueDate.slice(8)}/${due.dueDate.slice(5, 7)} não cabe no saldo`, value: due.open - Math.max(0, balance), note: `fatura de ${money(due.open)}, faltam:` });
  // 3. Gasto fora do padrão: compra bem acima da média da categoria nos 3 meses anteriores.
  const before = [1, 2, 3].map((i) => monthKey(addMonths(month + "-01", -i)));
  const avgBy = new Map();
  for (const t of state.transactions)
    if (t.confirmed && t.type === "expense" && real(t) && before.includes(monthKey(t.date))) {
      const a = avgBy.get(t.category || "Outros") || { sum: 0, n: 0 };
      a.sum += t.amount;
      a.n++;
      avgBy.set(t.category || "Outros", a);
    }
  let best = null;
  for (const t of state.transactions) {
    if (!t.confirmed || t.type !== "expense" || !real(t) || monthKey(t.date) !== month) continue;
    const a = avgBy.get(t.category || "Outros");
    if (!a || a.n < 3) continue;
    const avg = a.sum / a.n;
    const ratio = t.amount / avg;
    if (ratio >= 2.5 && t.amount >= 2000 && (!best || ratio > best.ratio)) best = { t, ratio, avg };
  }
  if (best) out.push({ id: "outlier", kind: "warning", title: "Gasto fora do padrão", value: best.t.amount, note: `${best.ratio.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}× a média, sua média é ${money(Math.round(best.avg))}`, description: best.t.description });
  // 4. Seu mês com um lugar: descrição com 3+ compras no mês.
  const byName = new Map();
  for (const t of state.transactions)
    if (t.confirmed && t.type === "expense" && real(t) && monthKey(t.date) === month) {
      const k = normName(t.description);
      if (!k) continue;
      const g = byName.get(k) || { name: t.description, sum: 0, n: 0, from: t.date, to: t.date };
      g.sum += analysisAmount(t);
      g.n++;
      if (t.date < g.from) g.from = t.date;
      if (t.date > g.to) g.to = t.date;
      byName.set(k, g);
    }
  const top = [...byName.values()].filter((g) => g.n >= 3).sort((a, b) => b.sum - a.sum)[0];
  if (top) out.push({ id: "merchant", kind: "info", title: `Seu mês com ${top.name}`, value: top.sum, note: `${top.n} compras · ${top.from.slice(8)}/${top.from.slice(5, 7)} a ${top.to.slice(8)}/${top.to.slice(5, 7)}` });
  // 5. Guardando mais que no mês passado.
  const net = (m) => {
    let i = 0;
    let e = 0;
    for (const t of state.transactions) if (t.confirmed && real(t) && monthKey(t.date) === m) (t.type === "income" ? (i += analysisAmount(t)) : t.type === "expense" ? (e += analysisAmount(t)) : 0);
    return i - e;
  };
  const now = net(month);
  const was = net(prevMonth(month));
  if (now > 0 && now > was && was !== 0) out.push({ id: "saving", kind: "success", title: "Você está guardando mais", value: now - Math.max(0, was), note: `a mais do que no mês passado (${money(now)} sobraram até agora)` });
  return out;
}

// ---------- Top categorias e atividade recente ----------

export function topCategories(state, month, n = 3) {
  const d = donutSlices(state, month, { kind: "expense" });
  return { total: d.total, rows: d.slices.slice(0, n) };
}

// Últimos lançamentos confirmados (inclui transferência), do mais recente ao mais antigo.
export function recentActivity(state, n = 3, ref = today()) {
  return state.transactions
    .filter((t) => t.confirmed && !t.invoicePayment && !t.loanSettlement && t.date <= ref)
    .sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")) || String(b.id).localeCompare(String(a.id)))
    .slice(0, n)
    .map((t) => ({ id: t.id, description: t.description, amount: t.amount, type: t.refund ? "income" : t.type, category: t.category || "Outros", subcategory: t.subcategory || "", date: t.date, time: t.time || "" }));
}
