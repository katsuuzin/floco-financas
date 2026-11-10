import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction } from "../src/finance.mjs";
import { saveRecurrence } from "../src/planning.mjs";
import { spendPace, invoiceTrend, cardsOverview, yearBars, subscriptions, monthInsights, topCategories, recentActivity } from "../src/overview.mjs";

const REF = "2026-11-09";
const base = () => ({
  ...emptyState(),
  accounts: [{ id: "a1", name: "Conta", initial: 100000, includeInTotal: true }],
  cards: [{ id: "c1", name: "Cartão", limit: 100000, closingDay: 10, dueDay: 20, accountId: "a1" }],
});
const tx = (s, extra) => addTransaction(s, { description: "x", amount: 1000, date: "2026-11-05", type: "expense", accountId: "a1", confirmed: true, category: "Outros", ...extra });

test("ritmo do mês: acumulado, comparação no mesmo dia do mês passado e previsão", () => {
  let s = base();
  s = tx(s, { amount: 10000, date: "2026-10-03" });
  s = tx(s, { amount: 20000, date: "2026-10-20" });
  s = tx(s, { amount: 30000, date: "2026-11-02" });
  s = tx(s, { amount: 6000, date: "2026-11-08" });
  const p = spendPace(s, "2026-11", REF);
  assert.equal(p.day, 9);
  assert.equal(p.total, 36000);
  assert.equal(p.lastToDate, 10000);
  assert.equal(p.lastTotal, 30000);
  assert.equal(p.diff, 26000);
  assert.equal(p.pct, 260);
  assert.equal(p.current.length, 9);
  assert.equal(p.current[8], 36000);
  assert.equal(p.last.length, 31);
  assert.equal(p.projectedEnd, Math.round((36000 / 9) * 30));
});

test("ritmo do mês passado usa o mês inteiro; mês vazio é marcado", () => {
  const s = tx(base(), { amount: 5000, date: "2026-10-10" });
  const p = spendPace(s, "2026-10", REF);
  assert.equal(p.day, 31);
  assert.equal(p.total, 5000);
  assert.equal(p.projectedEnd, 5000);
  assert.equal(spendPace(base(), "2026-11", REF).isEmpty, true);
  assert.equal(spendPace(base(), "2027-03", REF).total, 0);
});

test("tendência da fatura: mês anterior, mês e seguinte com variação", () => {
  let s = base();
  s = tx(s, { amount: 20000, date: "2026-09-05", cardId: "c1" });
  s = tx(s, { amount: 30000, date: "2026-10-05", cardId: "c1" });
  s = tx(s, { amount: 15000, date: "2026-11-02", cardId: "c1" });
  const t = invoiceTrend(s, "2026-11", []);
  assert.deepEqual(t.months.map((m) => m.month), ["2026-10", "2026-11", "2026-12"]);
  assert.equal(t.months[0].total, 30000);
  assert.equal(t.months[0].change, 50);
  assert.equal(t.cards, 1);
  assert.equal(invoiceTrend(s, "2026-11", ["nao-existe"]).isEmpty, true);
});

test("cartões: fatura aberta, vencimento e uso do limite", () => {
  const s = tx(base(), { amount: 25000, date: "2026-11-02", cardId: "c1" });
  const [c] = cardsOverview(s, REF);
  assert.equal(c.open, 25000);
  assert.equal(c.dueDate, "2026-11-20");
  assert.equal(c.usedPct, 25);
  assert.equal(cardsOverview(base(), REF)[0].open, 0);
});

test("12 meses: seis antes, o mês e cinco depois; gasto e previsto", () => {
  let s = tx(base(), { amount: 7000, date: "2026-10-10" });
  s = tx(s, { amount: 3000, date: "2026-12-05", confirmed: false });
  s = saveRecurrence(s, { description: "Academia", amount: 9000, date: "2026-11-15", frequency: "monthly", accountId: "a1", category: "Saúde", type: "expense" });
  const bars = yearBars(s, "2026-11", REF);
  assert.equal(bars.length, 12);
  assert.equal(bars[0].month, "2026-05");
  assert.equal(bars[6].month, "2026-11");
  assert.equal(bars[11].month, "2027-04");
  assert.equal(bars[5].spent, 7000);
  assert.equal(bars[7].plannedOut >= 3000, true);
  assert.equal(bars[6].plannedOut, 9000);
  assert.equal(bars[8].plannedOut, 9000);
});

test("assinaturas: recorrência mensal e cobrança que se repete em 3 meses seguidos", () => {
  let s = base();
  s = saveRecurrence(s, { description: "Internet", amount: 10000, date: "2026-11-07", frequency: "monthly", accountId: "a1", category: "Serviços", type: "expense" });
  for (const m of ["2026-09", "2026-10", "2026-11"]) s = tx(s, { description: "Streaming X", amount: 3990, date: `${m}-07` });
  s = tx(s, { description: "Mercado", amount: 5000, date: "2026-11-01" });
  s = tx(s, { description: "Mercado", amount: 9000, date: "2026-10-01" });
  const list = subscriptions(s, REF);
  assert.deepEqual(list.map((x) => [x.name, x.source]), [["Internet", "recurrence"], ["Streaming X", "detected"]]);
  assert.equal(list[1].day, 7);
  // valores muito diferentes ou meses com buraco não contam
  let t = base();
  for (const m of ["2026-07", "2026-09", "2026-11"]) t = tx(t, { description: "Sem seguir", amount: 1000, date: `${m}-07` });
  assert.equal(subscriptions(t, REF).length, 0);
});

test("insights: fatura que não cabe, gasto fora do padrão, mês com um lugar e saldo que zera", () => {
  let s = base();
  s = { ...s, accounts: [{ ...s.accounts[0], initial: 10000 }] };
  s = tx(s, { amount: 50000, date: "2026-11-03", cardId: "c1" });
  for (const m of ["2026-08", "2026-09", "2026-10"]) s = tx(s, { description: "Almoço", amount: 3000, date: `${m}-10`, category: "Alimentação" });
  s = tx(s, { description: "Jantar chique", amount: 12000, date: "2026-11-06", category: "Alimentação" });
  for (const d of ["02", "04", "08"]) s = tx(s, { description: "Padaria Boa", amount: 1500, date: `2026-11-${d}` });
  const ids = monthInsights(s, "2026-11", REF).map((i) => i.id);
  assert.ok(ids.includes("invoice"));
  assert.ok(ids.includes("outlier"));
  assert.ok(ids.includes("merchant"));
  const out = monthInsights(s, "2026-11", REF).find((i) => i.id === "outlier");
  assert.equal(out.value, 12000);
  assert.match(out.note, /4×/);
  const inv = monthInsights(s, "2026-11", REF).find((i) => i.id === "invoice");
  assert.match(inv.title, /20\/11/);
  assert.equal(monthInsights(base(), "2026-11", REF).length, 0);
});

test("top categorias e atividade recente", () => {
  let s = base();
  s = tx(s, { amount: 5000, category: "Alimentação", date: "2026-11-02" });
  s = tx(s, { amount: 3000, category: "Transporte", date: "2026-11-03" });
  s = tx(s, { amount: 1000, category: "Lazer", date: "2026-11-04" });
  s = tx(s, { amount: 500, category: "Saúde", date: "2026-11-05" });
  const top = topCategories(s, "2026-11");
  assert.deepEqual(top.rows.map((r) => r.name), ["Alimentação", "Transporte", "Lazer"]);
  assert.equal(top.total, 9500);
  const rec = recentActivity(s, 2, REF);
  assert.deepEqual(rec.map((r) => r.category), ["Saúde", "Lazer"]);
  assert.equal(recentActivity(base(), 3, REF).length, 0);
});
