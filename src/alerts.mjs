// Avisos da aba Análise: o que merece atenção agora, em frases curtas e com gravidade.
// Junta os insights do Resumo, orçamentos perto do teto, fatura vencendo, categoria que subiu
// e assinatura que mudou de preço. Funções puras, valores em centavos, datas ISO.
import { monthKey, addMonths, today, invoice, invoiceDueDate, invoiceMonth } from "./finance.mjs";
import { monthInsights as overviewInsights } from "./overview.mjs";
import { monthInsights as categoryInsights } from "./insights.mjs";
import { normalizeBudget, budgetUsage } from "./analysis.mjs";

export const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
export const MAX_DISMISSED = 200;

const money = (c) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dd = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}`;
const normName = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const SEVERITY_BY_KIND = { danger: "high", warning: "medium", success: "low", info: "low" };
const real = (t) => t.type !== "transfer" && !t.invoicePayment && !t.loanSettlement && !t.ignored;
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);

// Assinaturas e cobranças que mudaram de preço: a última cobrança contra a anterior, quando as
// anteriores eram estáveis (até 5% de diferença) e a mudança passa de 5% e de R$ 1,00.
export function priceChanges(state, month, ref = today()) {
  const groups = new Map();
  for (const t of state.transactions || []) {
    if (!t.confirmed || t.type !== "expense" || !real(t) || t.installments > 1) continue;
    const k = normName(t.description);
    if (!k) continue;
    (groups.get(k) || groups.set(k, []).get(k)).push(t);
  }
  const since = addMonths(monthKey(ref) + "-01", -6);
  const watched = [month, monthKey(addMonths(month + "-01", -1))];
  const out = [];
  for (const [k, rows] of groups) {
    // uma cobrança por mês, a mais recente
    const byMonth = new Map();
    for (const t of rows.filter((x) => x.date >= since).sort((a, b) => a.date.localeCompare(b.date))) byMonth.set(monthKey(t.date), t);
    const list = [...byMonth.values()];
    if (list.length < 3) continue;
    const last = list[list.length - 1];
    const prev = list[list.length - 2];
    const before = list[list.length - 3];
    if (!watched.includes(monthKey(last.date))) continue;
    if (Math.abs(prev.amount - before.amount) > before.amount * 0.05) continue;
    const diff = last.amount - prev.amount;
    if (Math.abs(diff) < 100 || Math.abs(diff) <= prev.amount * 0.05) continue;
    out.push({
      id: `price:${k}:${last.date}`,
      severity: diff > 0 ? "medium" : "low",
      kind: "price",
      title: `${last.description} ${diff > 0 ? "subiu" : "caiu"} de ${money(prev.amount)} para ${money(last.amount)}`,
      value: Math.abs(diff),
      note: diff > 0 ? "A cobrança ficou mais cara que nos meses anteriores" : "A cobrança ficou mais barata que nos meses anteriores",
      go: null,
    });
  }
  return out;
}

// Avisos do mês, do mais grave ao menos. Cada item: { id, severity, kind, title, value, note,
// description?, go? }. O id inclui o período, então um aviso dispensado volta no mês seguinte.
export function analysisAlerts(state, month = monthKey(today()), ref = today()) {
  const out = [];
  const current = month === monthKey(ref);

  for (const i of overviewInsights(state, month, ref))
    out.push({
      id: `${i.id}:${month}`,
      severity: SEVERITY_BY_KIND[i.kind] || "low",
      kind: i.id,
      title: i.title,
      value: i.value,
      note: String(i.note || "").replace(/:\s*$/, ""),
      description: i.description,
      go: i.id === "invoice" ? { name: "cards" } : null,
    });

  if (current) {
    for (const raw of state.budgets || []) {
      const b = normalizeBudget(raw);
      if (b.type !== "expense" || !b.amount) continue;
      const u = budgetUsage(state, b, ref);
      const name = b.name || b.categories.join(", ");
      if (u.ratio >= 1)
        out.push({ id: `budget:${b.id}:${u.start}`, severity: "high", kind: "budget", title: `O orçamento ${name} passou do teto`, value: u.used - u.limit, note: `usou ${money(u.used)} de ${money(u.limit)}`, go: { name: "budgets" } });
      else if (u.ratio >= 0.8)
        out.push({ id: `budget:${b.id}:${u.start}`, severity: "medium", kind: "budget", title: `O orçamento ${name} já usou ${Math.round(u.ratio * 100)}%`, value: null, note: `usou ${money(u.used)} de ${money(u.limit)} · restam ${money(u.left)}`, go: { name: "budgets" } });
    }

    // Fatura em aberto (a que recebe compras agora) e a anterior, já fechada e ainda não paga.
    for (const c of (state.cards || []).filter((x) => !x.archived)) {
      const open = invoiceMonth(ref, c);
      for (const m of [monthKey(addMonths(open + "-01", -1)), open]) {
        const due = invoice(state, c.id, m).due;
        const dueDate = invoiceDueDate(c, m);
        if (!(due > 0) || !dueDate) continue;
        const left = daysBetween(ref, dueDate);
        if (left < 0 || left > 3) continue;
        out.push({ id: `due:${c.id}:${dueDate}`, severity: left === 0 ? "high" : "medium", kind: "due", title: `A fatura do ${c.name} vence ${left === 0 ? "hoje" : left === 1 ? "amanhã" : `dia ${dd(dueDate)}`}`, value: due, note: "fatura em aberto", go: { name: "cards", cardId: c.id } });
      }
    }
  }

  // Sem gasto algum nos 3 meses anteriores não há média para comparar: tudo pareceria "novo".
  const before = [1, 2, 3].map((i) => monthKey(addMonths(month + "-01", -i)));
  const hasHistory = (state.transactions || []).some((t) => t.confirmed && t.type === "expense" && real(t) && before.includes(monthKey(t.date)));
  for (const i of hasHistory ? categoryInsights(state, month) : []) {
    if (i.kind !== "up" && i.kind !== "new") continue;
    out.push({ id: `cat:${month}:${normName(i.text).slice(0, 48)}`, severity: i.kind === "up" ? "medium" : "low", kind: "category", title: i.text, value: null, note: i.kind === "up" ? "contra a média dos 3 meses anteriores" : "categoria que não aparecia nos últimos 3 meses", go: null });
  }

  out.push(...priceChanges(state, month, ref));

  const seen = new Set();
  return out
    .filter((a) => (seen.has(a.id) ? false : seen.add(a.id)))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (b.value || 0) - (a.value || 0));
}

// Separa o que está ativo do que foi dispensado.
export function splitDismissed(alerts, dismissed = []) {
  const gone = new Set(dismissed);
  return { active: alerts.filter((a) => !gone.has(a.id)), dismissed: alerts.filter((a) => gone.has(a.id)) };
}

// Lista de dispensados com o aviso novo no fim, sem repetir e com tamanho limitado.
export function dismiss(dismissed = [], id) {
  return [...dismissed.filter((x) => x !== id), id].slice(-MAX_DISMISSED);
}

export function restore(dismissed = [], id) {
  return dismissed.filter((x) => x !== id);
}
