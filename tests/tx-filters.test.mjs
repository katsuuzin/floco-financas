import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFilters, activeCount, centsOf, emptyFilters, toggle } from "../src/tx-filters.mjs";

const rows = [
  { id: "1", type: "expense", amount: 4290, date: "2026-11-02", accountId: "nu", category: "Mercado", tags: ["casa"] },
  { id: "2", type: "expense", amount: 12000, date: "2026-11-03", cardId: "itau", accountId: "", category: "Lazer", tags: [] },
  { id: "3", type: "income", amount: 500000, date: "2026-11-05", accountId: "inter", category: "Salário" },
  { id: "4", type: "transfer", amount: 10000, date: "2026-11-04", accountId: "inter", destinationId: "nu", category: "" },
];
const ids = (r) => r.map((t) => t.id);

test("L13 sem filtros mantém tudo, do mais recente ao mais antigo", () => {
  assert.deepEqual(ids(applyFilters(rows, emptyFilters())), ["3", "4", "2", "1"]);
  assert.equal(activeCount(emptyFilters()), 0);
});

test("L13 conta inclui transferências que entram nela; cartão separa da conta", () => {
  assert.deepEqual(ids(applyFilters(rows, { ...emptyFilters(), sources: ["a:nu"] })), ["4", "1"]);
  assert.deepEqual(ids(applyFilters(rows, { ...emptyFilters(), sources: ["c:itau"] })), ["2"]);
});

test("L13 categoria, tag e faixa de valor se combinam", () => {
  const f = { ...emptyFilters(), categories: ["Mercado", "Lazer"], min: "50", max: "200,00" };
  assert.deepEqual(ids(applyFilters(rows, f)), ["2"]);
  assert.deepEqual(ids(applyFilters(rows, { ...emptyFilters(), tags: ["casa"] })), ["1"]);
  assert.equal(activeCount(f), 2);
});

test("L13 ordenação por valor e valores inválidos não filtram", () => {
  assert.deepEqual(ids(applyFilters(rows, { ...emptyFilters(), sort: "amountDesc" })), ["3", "2", "4", "1"]);
  assert.deepEqual(ids(applyFilters(rows, { ...emptyFilters(), sort: "amountAsc" })), ["1", "4", "2", "3"]);
  assert.equal(centsOf("abc"), null);
  assert.equal(centsOf("1.234,5"), 123450);
  assert.equal(centsOf("R$ 10"), 1000);
  assert.deepEqual(toggle(["a"], "a"), []);
});

test("L12 calendário começa no dia da semana certo e soma o dia", async () => {
  const { calendarWeeks, dailyNet } = await import("../src/tx-filters.mjs");
  const w = calendarWeeks("2026-11");
  assert.equal(w[0][0], "2026-11-01"); // 1/11/2026 é domingo
  assert.equal(w.flat().filter(Boolean).length, 30);
  assert.equal(calendarWeeks("2026-02")[0].indexOf("2026-02-01"), 0);
  assert.equal(calendarWeeks("2026-12")[0].indexOf("2026-12-01"), 2);
  assert.deepEqual(dailyNet(rows), { "2026-11-02": -4290, "2026-11-03": -12000, "2026-11-05": 500000 });
});
