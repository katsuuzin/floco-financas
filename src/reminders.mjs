// S7 — lembretes. Planejamento puro (testável); o agendamento usa expo-notifications.
import { money, monthKey, addMonths, invoice, invoiceDueDate } from "./finance.mjs";
import { recurrenceEvents } from "./planning.mjs";

export const DEFAULT_REMINDERS = { enabled: false, morning: "08:00", evening: "", comeback: 7, backup: true, daysAhead: 0 };
export const reminderSettings = (s) => ({ ...DEFAULT_REMINDERS, ...(s.settings?.reminders || {}) });

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (date, n) => {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return iso(d);
};

// Tudo o que vence entre `from` e `through`: pendências, faturas e recorrências.
export function dueItems(s, from, through) {
  const items = [];
  for (const t of s.transactions)
    if (!t.confirmed && !t.cardId && t.date >= from && t.date <= through && (t.type === "expense" || t.type === "income"))
      items.push({ date: t.date, label: t.description, amount: t.amount - (t.paidPart || 0), kind: t.type === "income" ? "receber" : "pagar" });
  for (const card of s.cards.filter((c) => !c.archived)) {
    for (let i = -1; i <= 2; i++) {
      const m = monthKey(addMonths(from.slice(0, 7) + "-01", i));
      const date = invoiceDueDate(card, m);
      const due = invoice(s, card.id, m).due;
      if (due > 0 && date >= from && date <= through) items.push({ date, label: `Fatura ${card.name}`, amount: due, kind: "pagar" });
    }
  }
  for (const e of recurrenceEvents(s, through, from))
    items.push({ date: e.date, label: e.description, amount: e.amount, kind: e.type === "income" ? "receber" : "pagar" });
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

// Notificações a agendar a partir de `now` (Date). No máximo `limit`.
export function planReminders(s, now = new Date(), limit = 60) {
  const r = reminderSettings(s);
  if (!r.enabled) return [];
  const today = iso(now);
  const out = [];
  const at = (date, time) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date + "T00:00:00");
    d.setHours(h, m, 0, 0);
    return d;
  };
  const byDay = new Map();
  for (const it of dueItems(s, today, addDays(today, 30))) byDay.set(it.date, [...(byDay.get(it.date) || []), it]);
  for (const [date, items] of byDay) {
    const notifyDate = addDays(date, -(r.daysAhead || 0));
    const pay = items.filter((i) => i.kind === "pagar");
    const receive = items.filter((i) => i.kind === "receber");
    const lines = [...pay, ...receive].slice(0, 4).map((i) => `${i.kind === "pagar" ? "Pagar" : "Receber"} ${i.label}: ${money(i.amount)}`);
    const when = r.daysAhead ? `Em ${r.daysAhead} dia(s)` : "Hoje";
    const title = pay.length ? `${when}: ${pay.length} conta(s) a pagar` : `${when}: ${receive.length} a receber`;
    for (const time of [r.morning, r.evening].filter(Boolean)) {
      const fire = at(notifyDate, time);
      if (fire > now) out.push({ id: `due:${date}:${time}`, fire, title, body: lines.join("\n") + (items.length > 4 ? `\n+${items.length - 4}` : "") });
    }
  }
  if (r.comeback) {
    const fire = at(addDays(today, r.comeback), r.morning || "10:00");
    out.push({ id: "comeback", fire, title: "Seu Floco sente sua falta", body: `Faz ${r.comeback} dias que você não registra nada. Que tal atualizar seus lançamentos?` });
  }
  if (r.backup) {
    const last = s.settings?.lastBackup || "";
    const dueBackup = last ? addDays(last, 30) : addDays(today, 7);
    const fire = at(dueBackup < today ? addDays(today, 1) : dueBackup, r.morning || "10:00");
    out.push({ id: "backup", fire, title: "Hora de fazer um backup", body: "Seus lançamentos estão há muito tempo sem cópia. Salve um backup em Configurações." });
  }
  return out.sort((a, b) => a.fire - b.fire).slice(0, limit);
}
