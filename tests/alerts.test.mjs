import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction } from "../src/finance.mjs";
import { saveBudget } from "../src/analysis.mjs";
import { analysisAlerts, priceChanges, splitDismissed, dismiss, restore, MAX_DISMISSED } from "../src/alerts.mjs";

const REF = "2026-11-09";
const base = () => ({
  ...emptyState(),
  accounts: [{ id: "a1", name: "Conta", initial: 500000, includeInTotal: true }],
  cards: [{ id: "c1", name: "Cartão Itaú", limit: 100000, closingDay: 5, dueDay: 11, accountId: "a1" }],
});
const tx = (s, extra) => addTransaction(s, { description: "x", amount: 1000, date: "2026-11-05", type: "expense", accountId: "a1", confirmed: true, category: "Outros", ...extra });

test("sem movimento não há avisos", () => {
  assert.deepEqual(analysisAlerts(base(), "2026-11", REF), []);
});

test("orçamento: 80% é aviso médio, acima do teto é grave", () => {
  let s = base();
  s = saveBudget(s, { amount: 10000, categories: ["Mercado"], cycle: "monthly", startDay: 1 });
  s = tx(s, { amount: 8500, category: "Mercado" });
  let a = analysisAlerts(s, "2026-11", REF).find((x) => x.kind === "budget");
  assert.equal(a.severity, "medium");
  assert.match(a.title, /85%/);
  assert.match(a.note, /restam R\$ 15,00/);
  s = tx(s, { amount: 3000, category: "Mercado", date: "2026-11-07" });
  a = analysisAlerts(s, "2026-11", REF).find((x) => x.kind === "budget");
  assert.equal(a.severity, "high");
  assert.match(a.title, /passou do teto/);
  assert.equal(a.value, 1500);
});

test("orçamento só avisa no mês corrente", () => {
  let s = base();
  s = saveBudget(s, { amount: 10000, categories: ["Mercado"], cycle: "monthly", startDay: 1 });
  s = tx(s, { amount: 20000, category: "Mercado", date: "2026-10-05" });
  assert.equal(analysisAlerts(s, "2026-10", REF).some((x) => x.kind === "budget"), false);
});

test("fatura vencendo em até 3 dias avisa; mais longe não", () => {
  let s = base();
  s = tx(s, { amount: 20000, date: "2026-11-02", cardId: "c1" });
  const due = analysisAlerts(s, "2026-11", REF).find((x) => x.kind === "due");
  assert.ok(due, "fatura de 11/11 está a 2 dias");
  assert.match(due.title, /vence dia 11\/11/);
  assert.equal(due.severity, "medium");
  assert.equal(analysisAlerts(s, "2026-11", "2026-11-01").some((x) => x.kind === "due"), false);
});

test("categoria que subiu contra a média entra como aviso médio", () => {
  let s = base();
  for (const m of ["2026-08", "2026-09", "2026-10"]) s = tx(s, { amount: 10000, date: `${m}-10`, category: "Lazer" });
  s = tx(s, { amount: 20000, date: "2026-11-03", category: "Lazer" });
  const a = analysisAlerts(s, "2026-11", REF).find((x) => x.kind === "category");
  assert.ok(a);
  assert.equal(a.severity, "medium");
  assert.match(a.title, /Lazer subiu/);
});

test("assinatura que mudou de preço", () => {
  let s = base();
  for (const [m, v] of [["2026-08", 3990], ["2026-09", 3990], ["2026-10", 3990], ["2026-11", 4990]]) s = tx(s, { description: "Streaming X", amount: v, date: `${m}-03` });
  const p = priceChanges(s, "2026-11", REF);
  assert.equal(p.length, 1);
  assert.match(p[0].title, /subiu de R\$\s39,90 para R\$\s49,90/);
  assert.equal(p[0].value, 1000);
  assert.equal(p[0].severity, "medium");
});

test("preço estável ou variação pequena não avisa; queda é aviso baixo", () => {
  let s = base();
  for (const [m, v] of [["2026-08", 3990], ["2026-09", 3990], ["2026-10", 3990], ["2026-11", 4050]]) s = tx(s, { description: "Streaming X", amount: v, date: `${m}-03` });
  assert.equal(priceChanges(s, "2026-11", REF).length, 0);
  let t = base();
  for (const [m, v] of [["2026-08", 5000], ["2026-09", 5000], ["2026-10", 5000], ["2026-11", 3000]]) t = tx(t, { description: "Plano Y", amount: v, date: `${m}-03` });
  const p = priceChanges(t, "2026-11", REF);
  assert.equal(p[0].severity, "low");
  assert.match(p[0].title, /caiu/);
});

test("ordem: grave primeiro, depois médio, depois baixo", () => {
  let s = base();
  s = saveBudget(s, { amount: 10000, categories: ["Mercado"], cycle: "monthly", startDay: 1 });
  s = tx(s, { amount: 12000, category: "Mercado" });
  for (const [m, v] of [["2026-08", 3990], ["2026-09", 3990], ["2026-10", 5000], ["2026-11", 3000]]) s = tx(s, { description: "Plano Y", amount: v, date: `${m}-03` });
  const order = analysisAlerts(s, "2026-11", REF).map((a) => a.severity);
  const sorted = [...order].sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a] - ({ high: 0, medium: 1, low: 2 })[b]);
  assert.deepEqual(order, sorted);
  assert.equal(order[0], "high");
});

test("dispensar, restaurar e limite da lista; o id muda no mês seguinte", () => {
  let s = base();
  s = saveBudget(s, { amount: 10000, categories: ["Mercado"], cycle: "monthly", startDay: 1 });
  s = tx(s, { amount: 12000, category: "Mercado" });
  const all = analysisAlerts(s, "2026-11", REF);
  const id = all.find((x) => x.kind === "budget").id;
  const gone = dismiss([], id);
  assert.deepEqual(gone, [id]);
  assert.deepEqual(dismiss(gone, id), [id], "sem repetir");
  const split = splitDismissed(all, gone);
  assert.equal(split.dismissed.length, 1);
  assert.equal(split.active.length, all.length - 1);
  assert.deepEqual(restore(gone, id), []);
  const big = Array.from({ length: MAX_DISMISSED + 20 }, (_, i) => `id${i}`).reduce((acc, x) => dismiss(acc, x), []);
  assert.equal(big.length, MAX_DISMISSED);
  assert.equal(big[big.length - 1], `id${MAX_DISMISSED + 19}`);
  const dec = analysisAlerts(s, "2026-12", "2026-12-09").find((x) => x.kind === "budget");
  assert.equal(dec, undefined, "orçamento zerou no ciclo novo");
});

test("sem histórico nos 3 meses anteriores não há aviso de categoria nova", () => {
  let s = base();
  s = tx(s, { amount: 31240, category: "Eletrônicos" });
  assert.equal(analysisAlerts(s, "2026-11", REF).some((x) => x.kind === "category"), false);
  s = tx(s, { amount: 5000, category: "Lazer", date: "2026-10-10" });
  const a = analysisAlerts(s, "2026-11", REF).find((x) => x.kind === "category");
  assert.ok(a, "com histórico, categoria nova volta a avisar");
  assert.equal(a.severity, "low");
});

test("itens da mesma nota fiscal não viram aviso de 'seu mês com' um produto", () => {
  let s = base();
  for (const d of ["Leite", "Leite", "Leite"]) s = tx(s, { description: d, amount: 525 });
  s = { ...s, transactions: s.transactions.map((t) => ({ ...t, purchaseId: "p1", purchaseTitle: "Mercado X" })) };
  assert.equal(analysisAlerts(s, "2026-11", REF).some((a) => a.kind === "merchant"), false);
  let r = base();
  for (const d of ["02", "04", "08"]) r = tx(r, { description: "Padaria Boa", amount: 1500, date: `2026-11-${d}` });
  assert.equal(analysisAlerts(r, "2026-11", REF).some((a) => a.kind === "merchant"), true, "3 compras avulsas continuam avisando");
});
