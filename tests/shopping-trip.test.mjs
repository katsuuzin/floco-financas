import test from "node:test";
import assert from "node:assert/strict";
import { tripSummary, formatElapsed, nextToGet, pendingByCategory } from "../src/shoppingTrip.mjs";

const item = (id, attrs = {}) => ({
  id, name: id, qty: 1, unit: "", category: "Mercearia", priceCents: null, inCart: false, ...attrs,
});
const state = (...shoppingItems) => ({ shoppingItems });
const priced = item("Arroz", { qty: 2, priceCents: 500 });
const cart = item("Maçã", { qty: 1.5, unit: "kg", priceCents: 800, inCart: true });

test("Resumo vazio retorna todos os campos zerados", () => {
  assert.deepEqual(tripSummary({}), {
    total: 0, inCartCount: 0, pendingCount: 0, progress: 0, cartCents: 0,
    cartUnpriced: 0, pendingEstimateCents: 0, pendingUnpriced: 0, grandEstimateCents: 0, elapsedMinutes: 0,
  });
});

test("Tudo no carrinho resulta em 100% e usa preço da porção", () => {
  const summary = tripSummary(state(cart));
  assert.equal(summary.progress, 1);
  assert.equal(summary.pendingCount, 0);
  assert.equal(summary.cartCents, 800);
});

test("Nada no carrinho resulta em 0% e usa preço por unidade", () => {
  const summary = tripSummary(state(priced));
  assert.equal(summary.progress, 0);
  assert.equal(summary.pendingEstimateCents, 1000);
});

test("Resumo separa preços ausentes e soma os totais em centavos", () => {
  assert.deepEqual(tripSummary(state(cart, priced, item("Sal"), item("Pão", { inCart: true }))), {
    total: 4, inCartCount: 2, pendingCount: 2, progress: 0.5, cartCents: 800,
    cartUnpriced: 1, pendingEstimateCents: 1000, pendingUnpriced: 1, grandEstimateCents: 1800, elapsedMinutes: 0,
  });
});

test("Progresso mantém a fração sem arredondar", () => {
  assert.equal(tripSummary(state(cart, priced, item("Sal"))).progress, 1 / 3);
});

for (const [name, startedAt, now, expected] of [
  ["instante inicial", 0, 0, 0], ["59 segundos", 0, 59_999, 0],
  ["60 segundos", 0, 60_000, 1], ["61 minutos", 1000, 3_661_000, 61],
  ["24 horas", 0, 86_400_000, 1440], ["relógio voltou", 200, 100, 0],
  ["início ausente", undefined, 60_000, 0], ["valor não numérico", 0, "60000", 0],
  ["infinito", -Infinity, 60_000, 0], ["NaN", 0, NaN, 0],
]) {
  test(`Tempo decorrido: ${name}`, () => {
    assert.equal(tripSummary(state(), { startedAt, now }).elapsedMinutes, expected);
  });
}

for (const [minutes, label] of [
  [0, "menos de 1 min"], [0.9, "menos de 1 min"], [5, "5 min"],
  [59.9, "59 min"], [60, "1 h 00 min"], [65, "1 h 05 min"],
  [120, "2 h 00 min"], [1440, "24 h 00 min"],
  [-1, "menos de 1 min"], [NaN, "menos de 1 min"], [Infinity, "menos de 1 min"],
]) {
  test(`Rótulo de tempo para ${minutes}`, () => assert.equal(formatElapsed(minutes), label));
}

const grouped = state(
  item("Arroz"), item("Abacate", { category: "Exótica" }),
  item("Banana", { category: "Hortifrúti" }),
  item("Água", { category: "Hortifrúti" }), cart,
);

test("Próximos ordena pela categoria e nome com acento, deixando desconhecida no fim", () => {
  assert.deepEqual(nextToGet(grouped).map(({ id }) => id), ["Água", "Banana", "Arroz", "Abacate"]);
});

test("Próximos devolve só os campos do contrato", () => {
  assert.deepEqual(nextToGet(state(priced)), [{
    id: "Arroz", name: "Arroz", qty: 2, unit: "", category: "Mercearia", priceCents: 500,
  }]);
});

test("Próximos aplica limite de cinco por padrão, zero e limite personalizado", () => {
  const data = state(...Array.from({ length: 8 }, (_, i) => item(`Item ${i}`)));
  assert.equal(nextToGet(data).length, 5);
  assert.equal(nextToGet(data, { limit: 2 }).length, 2);
  assert.deepEqual(nextToGet(data, { limit: 0 }), []);
  assert.deepEqual(nextToGet(data, { limit: -1 }), []);
});

test("Agrupa só as categorias com pendências, incluindo desconhecida no fim", () => {
  assert.deepEqual(pendingByCategory(grouped).map(({ category, count }) => [category, count]),
    [["Hortifrúti", 2], ["Mercearia", 1], ["Exótica", 1]]);
});

test("Itens dos grupos respeitam a ordem e o formato do contrato", () => {
  const [produce] = pendingByCategory(grouped);
  assert.deepEqual(produce.items, [
    { id: "Água", name: "Água", qty: 1, unit: "", priceCents: null },
    { id: "Banana", name: "Banana", qty: 1, unit: "", priceCents: null },
  ]);
});

test("Próximos e grupos ficam vazios se tudo já está no carrinho", () => {
  assert.deepEqual(nextToGet(state(cart)), []);
  assert.deepEqual(pendingByCategory(state(cart)), []);
});

test("Ordenar a próxima compra não altera a lista", () => {
  const before = grouped.shoppingItems.map(({ id }) => id);
  nextToGet(grouped);
  pendingByCategory(grouped);
  assert.deepEqual(grouped.shoppingItems.map(({ id }) => id), before);
});
