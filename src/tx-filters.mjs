import { inCategory } from "./categories.mjs";
// Filtros avançados do extrato (L13): conta/cartão, categoria, tags, faixa de valor e ordem.
// Origem: "a:<id>" para conta, "c:<id>" para cartão. Listas vazias não filtram.

export const emptyFilters = () => ({ sources: [], categories: [], tags: [], min: "", max: "", sort: "date" });

// Aceita "50", "50,5", "1.234,56" ou "R$ 10". Texto inválido ou vazio = sem limite.
export function centsOf(text) {
  const raw = String(text || "").replace(/R\$\s*/gi, "").trim();
  if (!raw || !/^\d{1,3}(\.\d{3})*(,\d{0,2})?$|^\d+(,\d{0,2})?$/.test(raw)) return null;
  const [whole, dec = ""] = raw.replace(/\./g, "").split(",");
  return Number(whole) * 100 + Number(dec.padEnd(2, "0"));
}

export function activeCount(f) {
  return (
    (f.sources.length ? 1 : 0) +
    (f.categories.length ? 1 : 0) +
    (f.tags.length ? 1 : 0) +
    (centsOf(f.min) != null || centsOf(f.max) != null ? 1 : 0) +
    (f.sort !== "date" ? 1 : 0)
  );
}

export const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

const stamp = (t) => t.date + (t.time || "");

export function applyFilters(rows, f) {
  const min = centsOf(f.min);
  const max = centsOf(f.max);
  const out = rows.filter((t) => {
    if (f.sources.length) {
      const own = [t.cardId ? "c:" + t.cardId : "a:" + t.accountId];
      if (t.type === "transfer" && t.destinationId) own.push("a:" + t.destinationId);
      if (!own.some((s) => f.sources.includes(s))) return false;
    }
    if (f.categories.length && !f.categories.some((n) => inCategory(t, n))) return false;
    if (f.tags.length && !(t.tags || []).some((id) => f.tags.includes(id))) return false;
    if (min != null && t.amount < min) return false;
    if (max != null && t.amount > max) return false;
    return true;
  });
  const by = {
    date: (a, b) => stamp(b).localeCompare(stamp(a)),
    dateAsc: (a, b) => stamp(a).localeCompare(stamp(b)),
    amountDesc: (a, b) => b.amount - a.amount || stamp(b).localeCompare(stamp(a)),
    amountAsc: (a, b) => a.amount - b.amount || stamp(b).localeCompare(stamp(a)),
  };
  return out.sort(by[f.sort] || by.date);
}

// L12: semanas do mês (domingo a sábado) com datas "AAAA-MM-DD"; null nas sobras.
export function calendarWeeks(month) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1, 12).getDay();
  const days = new Date(y, m, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

// Saldo do dia (receitas − despesas; transferências não contam), em centavos.
export function dailyNet(rows) {
  const map = {};
  for (const t of rows) {
    if (t.type === "transfer") continue;
    map[t.date] = (map[t.date] || 0) + (t.type === "income" || t.refund ? t.amount : -t.amount);
  }
  return map;
}
