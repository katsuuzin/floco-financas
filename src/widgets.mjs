// W1 — texto exibido pelos widgets. Com valores ocultos ou app protegido, nada aparece.
import { money, totals, totalBalance, monthKey, invoice, today } from "./finance.mjs";
import { dueItems } from "./reminders.mjs";
import { normalizeBudget, budgetUsage } from "./analysis.mjs";

export function widgetData(s, { protectedApp = false, now = today() } = {}) {
  const month = monthKey(now);
  const hide = !!s.settings?.hide || protectedApp;
  const m = (n) => (hide ? "R$ ••••" : money(n));
  const t = totals(s, month);
  const label = new Date(month + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const invoices = s.cards.filter((c) => !c.archived).reduce((n, c) => n + invoice(s, c.id, month).due, 0);
  const until = new Date(now + "T12:00:00");
  until.setDate(until.getDate() + 10);
  const through = until.toISOString().slice(0, 10);
  const bills = dueItems(s, now, through).filter((i) => i.kind === "pagar").slice(0, 4);
  const budgets = s.budgets
    .map(normalizeBudget)
    .filter((b) => b.type === "expense")
    .slice(0, 2)
    .map((b) => {
      const u = budgetUsage(s, b, now);
      return `${b.name || b.categories.join(", ")}: ${hide ? "••" : Math.round(u.ratio * 100) + "%"} do teto`;
    });
  return {
    month: "Floco · " + label.charAt(0).toUpperCase() + label.slice(1),
    balance: m(totalBalance(s)),
    flow: `Entrou ${m(t.income)} · Saiu ${m(t.expense)}`,
    invoice: invoices ? `Faturas do mês: ${m(invoices)}` : "",
    billsTitle: "Próximas contas",
    bills: protectedApp
      ? "Abra o Floco para ver."
      : bills.length
        ? bills.map((b) => `${b.date.slice(8)}/${b.date.slice(5, 7)} · ${b.label} · ${m(b.amount)}`).join("\n")
        : "Nada vence nos próximos 10 dias.",
    budgets: protectedApp ? "" : budgets.join("\n"),
  };
}
