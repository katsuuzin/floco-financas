// W1 — texto exibido pelos widgets. Com valores ocultos ou app protegido, nada aparece.
import { money, totals, totalBalance, monthKey, invoice, invoiceDueDate, today } from "./finance.mjs";
import { dueItems } from "./reminders.mjs";
import { normalizeBudget, budgetUsage } from "./analysis.mjs";

export function widgetData(s, { protectedApp = false, now = today() } = {}) {
  const month = monthKey(now);
  const hide = !!s.settings?.hide || protectedApp;
  const m = (n) => (hide ? "R$ ••••" : money(n));
  const t = totals(s, month);
  const label = new Date(month + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const cards = s.cards.filter((c) => !c.archived);
  const invoices = cards.reduce((n, c) => n + invoice(s, c.id, month).due, 0);
  const until = new Date(now + "T12:00:00");
  until.setDate(until.getDate() + 10);
  const through = until.toISOString().slice(0, 10);
  const bills = dueItems(s, now, through).filter((i) => i.kind === "pagar").slice(0, 4);
  const expenseBudgets = s.budgets.map(normalizeBudget).filter((b) => b.type === "expense");
  const budgets = expenseBudgets.slice(0, 2).map((b) => {
    const u = budgetUsage(s, b, now);
    return `${b.name || b.categories.join(", ")}: ${hide ? "••" : Math.round(u.ratio * 100) + "%"} do teto`;
  });
  // Widget de orçamentos: até 4, com percentual e quanto ainda cabe.
  const budgetLines = expenseBudgets.slice(0, 4).map((b) => {
    const u = budgetUsage(s, b, now);
    return `${b.name || b.categories.join(", ")}: ${hide ? "••" : Math.round(u.ratio * 100) + "%"} · resta ${m(Math.max(0, u.left))}`;
  });
  // Widget de faturas: até 3 cartões, valor do mês e vencimento.
  const invoiceLines = cards.slice(0, 3).map((c) => {
    const due = invoiceDueDate(c, month);
    return `${c.name} · ${m(invoice(s, c.id, month).due)} · vence ${due.slice(8)}/${due.slice(5, 7)}`;
  });
  const closed = (text) => (protectedApp ? "Abra o Floco para ver." : text);
  return {
    month: "Floco · " + label.charAt(0).toUpperCase() + label.slice(1),
    balance: m(totalBalance(s)),
    flow: `Entrou ${m(t.income)} · Saiu ${m(t.expense)}`,
    invoice: invoices ? `Faturas do mês: ${m(invoices)}` : "",
    billsTitle: "Próximas contas",
    bills: closed(
      bills.length
        ? bills.map((b) => `${b.date.slice(8)}/${b.date.slice(5, 7)} · ${b.label} · ${m(b.amount)}`).join("\n")
        : "Nada vence nos próximos 10 dias.",
    ),
    budgets: protectedApp ? "" : budgets.join("\n"),
    invoiceTitle: "Faturas de " + label.split(" ")[0],
    invoices: closed(invoiceLines.length ? invoiceLines.join("\n") : "Nenhum cartão cadastrado."),
    budgetsTitle: "Orçamentos do mês",
    budgetsFull: closed(budgetLines.length ? budgetLines.join("\n") : "Nenhum orçamento de despesa."),
  };
}
