import test from "node:test";
import assert from "node:assert/strict";
import { emptyState } from "../src/finance.mjs";
import { purchaseRhythm, restockCandidates } from "../src/shoppingRhythm.mjs";

const product = (dates, fields = {}) => ({
  id: "p1", name: "Arroz", unit: "", lastPriceCents: 500, lastBoughtAt: "",
  prices: dates.map((date, i) => ({ date, priceCents: 500, purchaseId: `c${i}` })),
  ...fields,
});
const state = (products, items = []) => ({
  ...emptyState(), shoppingProducts: products, shoppingItems: items,
});
const p10 = product(["2026-10-01", "2026-10-11"]);
const p100 = product(["2026-01-01", "2026-04-11"]);

const rhythmCases = [
  ["sem compras", [], 0, null, "", null, "none"],
  ["uma compra", ["2026-10-05"], 1, null, "2026-10-05", null, "none"],
  ["duas compras", ["2026-10-01", "2026-10-11"], 2, 10, "2026-10-11", "2026-10-21", "low"],
  ["três compras e mediana par arredondada", ["2026-10-01", "2026-10-04", "2026-10-10"], 3, 5, "2026-10-10", "2026-10-15", "medium"],
  ["quatro compras e mediana ímpar", ["2026-10-01", "2026-10-03", "2026-10-10", "2026-10-20"], 4, 7, "2026-10-20", "2026-10-27", "medium"],
  ["cinco compras no limite da regularidade", ["2026-10-01", "2026-10-03", "2026-10-06", "2026-10-10", "2026-10-14"], 5, 4, "2026-10-14", "2026-10-18", "high"],
  ["cinco compras irregulares", ["2026-10-01", "2026-10-03", "2026-10-05", "2026-10-08", "2026-10-30"], 5, 3, "2026-10-30", "2026-11-02", "medium"],
  ["repetidas, fora de ordem, intervalo mínimo e virada de ano", ["2026-12-31", "2026-12-30", "2026-12-31"], 2, 1, "2026-12-31", "2027-01-01", "low"],
  ["fevereiro bissexto", ["2024-02-27", "2024-02-28"], 2, 1, "2024-02-28", "2024-02-29", "low"],
  ["datas impossíveis não contam", ["2026-02-30", "2026-03-05", "05/03/2026"], 1, null, "2026-03-05", null, "none"],
];

for (const [label, dates, purchases, avgDays, lastBoughtAt, nextExpectedAt, confidence] of rhythmCases) {
  test(`Ritmo: ${label}`, () => {
    assert.deepEqual(purchaseRhythm(product(dates, { buys: 24 })), {
      purchases, avgDays, lastBoughtAt, nextExpectedAt, confidence,
    });
  });
}

test("Sem pontos, devolve a última data armazenada sem inferir ritmo", () => {
  assert.deepEqual(purchaseRhythm({ lastBoughtAt: "2026-09-01" }), {
    purchases: 0, avgDays: null, lastBoughtAt: "2026-09-01", nextExpectedAt: null, confidence: "none",
  });
});

for (const [label, today, expected] of [
  ["4 dias antes", "2026-07-06", undefined],
  ["3 dias antes", "2026-07-07", "soon"],
  ["89% do ritmo", "2026-07-09", "soon"],
  ["90% do ritmo", "2026-07-10", "due"],
]) {
  test(`Reposição: ${label}`, () => {
    assert.equal(restockCandidates(state([p100]), today)[0]?.status, expected);
  });
}

test("Ritmo de sete dias só vira due no sétimo dia", () => {
  const data = state([product(["2026-10-01", "2026-10-08"])]);
  assert.equal(restockCandidates(data, "2026-10-14")[0].status, "soon");
  assert.equal(restockCandidates(data, "2026-10-15")[0].status, "due");
});

test("Retorna exatamente os campos do contrato", () => {
  const data = state([{ ...p10, unit: "kg" }]);
  assert.deepEqual(restockCandidates(data, "2026-10-20"), [{
    productId: "p1", name: "Arroz", unit: "kg", avgDays: 10, daysSinceLast: 9,
    daysLate: -1, nextExpectedAt: "2026-10-21", lastPriceCents: 500, status: "due",
  }]);
});

for (const [label, name, item, visible] of [
  ["nome normalizado igual", "Café moído", { name: "cafe moido", inCart: false }, false],
  ["abreviação e 2 de 3 palavras", "FARIN TRIGO", { name: "Farinha de trigo orgânica", inCart: false }, false],
  ["abaixo de 60%", "Arroz branco", { name: "Arroz integral", inCart: false }, true],
  ["produto transformado", "CREME DE LEITE", { name: "Leite", inCart: false }, true],
  ["item no carrinho", "Arroz", { name: "Arroz", inCart: true }, true],
  ["item sem estado explícito", "Arroz", { name: "Arroz" }, true],
]) {
  test(`Reposição e lista: ${label}`, () => {
    assert.equal(restockCandidates(state([{ ...p10, name }], [item]), "2026-10-21").length, Number(visible));
  });
}

test("O limite de seis ritmos é inclusivo", () => {
  const data = state([p10]);
  assert.equal(restockCandidates(data, "2026-12-10").length, 1);
  assert.deepEqual(restockCandidates(data, "2026-12-11"), []);
});

test("O limite de 365 dias é inclusivo", () => {
  const data = state([p100]);
  assert.equal(restockCandidates(data, "2027-04-11").length, 1);
  assert.deepEqual(restockCandidates(data, "2027-04-12"), []);
});

test("Ritmo abaixo de cinco dias exige mais de duas compras", () => {
  const short = product(["2026-10-01", "2026-10-05"]);
  const confirmed = product(["2026-09-27", "2026-10-01", "2026-10-05"]);
  const five = product(["2026-09-30", "2026-10-05"]);
  assert.deepEqual(restockCandidates(state([short]), "2026-10-09"), []);
  assert.equal(restockCandidates(state([confirmed]), "2026-10-09").length, 1);
  assert.equal(restockCandidates(state([five]), "2026-10-10").length, 1);
});

test("Ordena por atraso e usa o nome em pt-BR no empate antes de aplicar limit", () => {
  const products = [
    { ...p10, id: "z", name: "Banana" },
    { ...p10, id: "a", name: "Água" },
    product(["2026-10-01", "2026-10-08"], { id: "first", name: "Tomate" }),
  ];
  const data = state(products);
  const ids = (limit) => restockCandidates(data, "2026-10-21", { limit }).map((p) => p.productId);
  assert.deepEqual(ids(), ["first", "a", "z"]);
  assert.deepEqual(ids(2), ["first", "a"]);
  assert.deepEqual(ids(0), []);
});

test("Aplica o limite padrão de dez produtos", () => {
  const products = Array.from({ length: 12 }, (_, i) => ({ ...p10, id: String(i) }));
  assert.equal(restockCandidates(state(products), "2026-10-21").length, 10);
});

test("Aceita estado sem catálogo ou sem lista", () => {
  assert.deepEqual(restockCandidates({ shoppingItems: [] }, "2026-10-21"), []);
  assert.equal(restockCandidates({ shoppingProducts: [p10] }, "2026-10-21").length, 1);
});

for (const today of ["2026-02-30", "2026-10-10", "21/10/2026", "2026-10-21T00:00:00Z", undefined]) {
  test(`Descarta hoje inválido ou anterior à última compra: ${today}`, () => {
    assert.deepEqual(restockCandidates(state([p10]), today), []);
  });
}
