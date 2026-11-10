import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction, totalBalance } from "../src/finance.mjs";
import { monthCalendar, balanceAtEndOf, intensity, dayDetail, donutSlices, donutArcs, arcPath, donutCaption, compactCents, categoryList, tagTotals } from "../src/spending.mjs";

const REF = "2026-11-09";
const base = () => ({
  ...emptyState(),
  accounts: [
    { id: "a1", name: "Conta", initial: 100000, includeInTotal: true },
    { id: "a2", name: "Reserva", initial: 0, includeInTotal: true },
  ],
  cards: [{ id: "c1", name: "Cartão", limit: 500000, closingDay: 10, dueDay: 20, accountId: "a1" }],
});
const tx = (s, extra) => addTransaction(s, { description: "x", amount: 1000, date: "2026-11-05", type: "expense", accountId: "a1", confirmed: true, category: "Outros", ...extra });

test("calendário: dias, semanas de domingo a sábado e totais do mês sem transferência nem ignorados", () => {
  let s = base();
  s = tx(s, { amount: 5000, date: "2026-11-02", category: "Alimentação" });
  s = tx(s, { amount: 2500, date: "2026-11-02", category: "Transporte" });
  s = tx(s, { amount: 30000, date: "2026-11-03", type: "income", category: "Salário" });
  s = tx(s, { amount: 9000, date: "2026-11-04", ignored: true });
  s = addTransaction(s, { description: "t", amount: 7000, date: "2026-11-04", type: "transfer", accountId: "a1", destinationId: "a2", confirmed: true });
  const cal = monthCalendar(s, "2026-11", REF);
  assert.equal(cal.days.length, 30);
  assert.ok(cal.weeks.every((w) => w.length === 7));
  assert.equal(cal.weeks[0][0].day, 1); // 1/11/2026 é domingo
  assert.equal(cal.days[1].expense, 7500);
  assert.equal(cal.days[2].income, 30000);
  assert.equal(cal.days[3].expense, 0);
  assert.deepEqual([cal.income, cal.expense, cal.result], [30000, 7500, 22500]);
  assert.equal(cal.peakExpense, 7500);
});

test("calendário: mês que começa no meio da semana ganha vazios antes do dia 1", () => {
  const cal = monthCalendar(base(), "2026-10", REF);
  assert.equal(cal.weeks[0].filter((c) => c === null).length, 4); // 1/10/2026 é quinta
});

test("saldo realizado: o de hoje fecha com o saldo total e dias antes desfazem o que veio depois", () => {
  const s = tx(base(), { amount: 4000, date: "2026-11-08" });
  assert.equal(balanceAtEndOf(s, REF), totalBalance(s));
  assert.equal(balanceAtEndOf(s, "2026-11-07"), totalBalance(s) + 4000);
  const cal = monthCalendar(s, "2026-11", REF);
  assert.equal(cal.days[8].balance, totalBalance(s));
  assert.equal(cal.days[8].projected, false);
});

test("saldo previsto: pendente, recorrência e fatura reduzem o saldo nos dias seguintes", () => {
  let s = tx(base(), { amount: 20000, date: "2026-11-20", confirmed: false, description: "Aluguel" });
  s = tx(s, { amount: 15000, date: "2026-11-08", cardId: "c1", description: "Compra" });
  const cal = monthCalendar(s, "2026-11", REF);
  const d19 = cal.days[18];
  const d20 = cal.days[19];
  assert.equal(d19.projected, true);
  assert.ok(d20.plannedOut >= 20000);
  assert.equal(d20.hasInvoice, true);
  assert.ok(d20.balance < d19.balance);
  assert.equal(cal.endProjected, true);
  assert.equal(cal.endBalance, cal.days[29].balance);
  assert.ok(cal.minBalance <= cal.endBalance);
});

test("mês passado: tudo realizado, sem previsão", () => {
  const s = tx(base(), { date: "2026-10-10" });
  const cal = monthCalendar(s, "2026-10", REF);
  assert.ok(cal.days.every((d) => d.projected === false && d.balance !== null));
  assert.equal(cal.endProjected, false);
  assert.equal(cal.plannedOut, 0);
});

test("mês vazio é marcado como vazio; fora do horizonte de 24 meses não tem saldo", () => {
  assert.equal(monthCalendar(base(), "2026-11", REF).isEmpty, true);
  const far = monthCalendar(base(), "2029-05", REF);
  assert.equal(far.endBalance, null);
  assert.equal(far.minBalance, null);
});

test("intensidade do gasto em quatro níveis", () => {
  assert.deepEqual([intensity(0, 100), intensity(10, 100), intensity(50, 100), intensity(100, 100), intensity(5, 0)], [0, 1, 2, 3, 0]);
});

test("detalhe do dia: receita, despesa, itens e previstos", () => {
  let s = tx(base(), { amount: 3000, date: "2026-11-09", category: "Alimentação", subcategory: "Restaurante" });
  s = tx(s, { amount: 8000, date: "2026-11-09", type: "income", category: "Salário" });
  s = tx(s, { amount: 2000, date: "2026-11-09", confirmed: false, description: "Conta de luz" });
  const d = dayDetail(s, REF, REF);
  assert.deepEqual([d.income, d.expense, d.items.length], [8000, 3000, 3]);
  assert.equal(d.items.find((i) => i.subcategory === "Restaurante").category, "Alimentação");
  assert.equal(d.items.find((i) => !i.confirmed).description, "Conta de luz");
  assert.equal(d.planned.some((p) => p.description === "Conta de luz"), false); // já aparece como pendente
});

test("detalhe de dia futuro lista o previsto (pendente aparece uma vez)", () => {
  const s = tx(base(), { amount: 4000, date: "2026-11-25", confirmed: false, description: "Seguro" });
  const d = dayDetail(s, "2026-11-25", REF);
  assert.equal(d.items.length + d.planned.length, 1);
});

test("rosca: soma subcategorias na principal, ordena e as frações fecham em 1", () => {
  let s = base();
  s = tx(s, { amount: 6000, category: "Alimentação", subcategory: "Restaurante" });
  s = tx(s, { amount: 4000, category: "Alimentação", subcategory: "Supermercado" });
  s = tx(s, { amount: 3000, category: "Transporte" });
  s = tx(s, { amount: 1000, category: "Lazer", confirmed: false });
  s = tx(s, { amount: 500, category: "Moradia", ignored: true });
  const d = donutSlices(s, "2026-11");
  assert.deepEqual(d.slices.map((x) => [x.name, x.cents]), [["Alimentação", 10000], ["Transporte", 3000]]);
  assert.equal(d.total, 13000);
  assert.ok(Math.abs(d.slices.reduce((a, x) => a + x.fraction, 0) - 1) < 1e-9);
  assert.deepEqual(d.slices[0].subs.map((x) => [x.name, x.cents]), [["Restaurante", 6000], ["Supermercado", 4000]]);
  assert.equal(d.count, 2);
  assert.equal(d.isEmpty, false);
});

test("rosca: ocultos saem do gráfico mas ficam listados; estorno abate; receita é outra rosca", () => {
  let s = tx(base(), { amount: 5000, category: "Alimentação" });
  s = tx(s, { amount: 2000, category: "Alimentação", refund: true });
  s = tx(s, { amount: 4000, category: "Saúde" });
  s = tx(s, { amount: 90000, category: "Salário", type: "income" });
  const d = donutSlices(s, "2026-11", { hidden: ["Saúde"] });
  assert.deepEqual(d.slices.map((x) => [x.name, x.cents]), [["Alimentação", 3000]]);
  assert.deepEqual(d.hidden.map((x) => x.name), ["Saúde"]);
  assert.equal(d.total, 3000);
  const inc = donutSlices(s, "2026-11", { kind: "income" });
  assert.deepEqual(inc.slices.map((x) => x.name), ["Salário"]);
  assert.equal(donutSlices(s, "2026-11", { hidden: ["Alimentação", "Saúde"] }).allHidden, true);
});

test("rosca: sem gastos é estado vazio", () => {
  const d = donutSlices(base(), "2026-11");
  assert.deepEqual([d.isEmpty, d.total, d.count, d.slices.length], [true, 0, 0, 0]);
});

test("arcos: folga entre fatias, fatia única fecha o anel e caminho SVG válido", () => {
  const arcs = donutArcs([0.5, 0.3, 0.2], 0.06);
  assert.equal(arcs.length, 3);
  assert.ok(arcs[1].start - arcs[0].end >= 0.0599);
  assert.ok(arcs.every((a) => a.end > a.start));
  const one = donutArcs([1]);
  assert.ok(one[0].end - one[0].start > Math.PI * 2 - 0.001);
  assert.match(arcPath(100, 100, 50, 0, 1), /^M [\d.\-]+ [\d.\-]+ A 50 50 0 0 1 [\d.\-]+ [\d.\-]+$/);
  assert.match(arcPath(100, 100, 50, 0, 4), / 0 1 1 /);
  const tiny = donutArcs([0.999, 0.001], 0.06);
  assert.ok(tiny[1].end >= tiny[1].start);
});

test("legenda do centro: mês atual x outros, despesa x receita, singular", () => {
  const d = donutSlices(tx(base(), { amount: 100, category: "Alimentação" }), "2026-11");
  assert.equal(donutCaption(d, REF), "gasto até hoje · 1 categoria");
  assert.equal(donutCaption({ ...d, month: "2026-10", count: 3 }, REF), "gasto no mês · 3 categorias");
  assert.equal(donutCaption({ ...d, kind: "income", count: 2 }, REF), "recebido até hoje · 2 categorias");
});

test("valor curto da célula: reais, mil e mi, com sinal", () => {
  assert.deepEqual([0, 4999, 8500, 123456, 1_200_000, -23_000_00, 150_000_000].map(compactCents), ["0", "50", "85", "1,2 mil", "12 mil", "−23 mil", "1,5 mi"]);
});

test("calendário por origem: só conta, só cartão ou tudo", () => {
  let s = tx(base(), { amount: 4000, date: "2026-11-03" });
  s = tx(s, { amount: 6000, date: "2026-11-03", cardId: "c1" });
  const day = (src) => monthCalendar(s, "2026-11", REF, { source: src }).days[2].expense;
  assert.deepEqual([day("all"), day("account"), day("card")], [10000, 4000, 6000]);
});

test("rosca por fatura: compra no cartão conta no mês da fatura", () => {
  let s = tx(base(), { amount: 8000, date: "2026-10-12", cardId: "c1", category: "Lazer" }); // fecha dia 10 → fatura de novembro
  s = tx(s, { amount: 2000, date: "2026-11-03", category: "Alimentação" });
  const by = donutSlices(s, "2026-11", { byInvoice: true });
  assert.deepEqual(by.slices.map((x) => [x.name, x.cents]), [["Lazer", 8000], ["Alimentação", 2000]]);
  const plain = donutSlices(s, "2026-11");
  assert.deepEqual(plain.slices.map((x) => x.name), ["Alimentação"]);
});

test("lista de categorias: com valor primeiro, zeradas depois, busca sem acento, ordem e ocultas", () => {
  let s = tx(base(), { amount: 5000, category: "Alimentação" });
  s = tx(s, { amount: 3000, category: "Saúde" });
  const l = categoryList(s, "2026-11", {});
  assert.deepEqual(l.rows.slice(0, 2).map((r) => r.name), ["Alimentação", "Saúde"]);
  assert.ok(l.rows.length > 10 && l.rows.find((r) => r.name === "Moradia").cents === 0);
  assert.deepEqual(categoryList(s, "2026-11", { query: "saude" }).rows.map((r) => r.name), ["Saúde"]);
  assert.equal(categoryList(s, "2026-11", { sort: "name" }).rows[0].name, "Alimentação");
  const h = categoryList(s, "2026-11", { hidden: ["Saúde"] });
  assert.equal(h.rows.find((r) => r.name === "Saúde").hidden, true);
  assert.equal(h.rows.find((r) => r.name === "Alimentação").fraction, 1);
  assert.deepEqual(categoryList(s, "2026-11", { kind: "income" }).rows.some((r) => r.name === "Salário"), true);
});

test("total por tag no mês", () => {
  let s = { ...base(), tags: [{ id: "t1", name: "casa" }, { id: "t2", name: "viagem" }] };
  s = tx(s, { amount: 5000, tags: ["t1"] });
  s = tx(s, { amount: 2000, tags: ["t1", "t2"] });
  const r = tagTotals(s, "2026-11");
  assert.deepEqual(r.rows.map((x) => [x.name, x.cents]), [["casa", 7000], ["viagem", 2000]]);
  assert.equal(tagTotals(base(), "2026-11").noTags, true);
});
