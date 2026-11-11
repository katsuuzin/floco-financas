import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { lineTotal } from "../src/shopping.mjs";
import { formatElapsed, nextToGet, pendingByCategory, tripSummary } from "../src/shoppingTrip.mjs";

const item = (id, data = {}) => ({ id, name: id, qty: 1, unit: "", category: "Mercearia", priceCents: 33, inCart: true, ...data });

test("Peso de 0,350 kg usa preço da porção e zero continua sendo preço", () => {
  const shoppingItems = [
    item("Uva", { qty: 0.350, unit: "kg", priceCents: 499 }),
    item("Brinde", { priceCents: 0 }),
    item("Cortesia pendente", { inCart: false, priceCents: 0 }),
    item("A granel", { inCart: false, unit: "kg", qty: 0.350, priceCents: 223 }),
  ];
  const summary = tripSummary({ shoppingItems });
  assert.equal(summary.cartCents, shoppingItems.filter((entry) => entry.inCart).reduce((sum, entry) => sum + lineTotal(entry), 0));
  assert.equal(summary.cartCents, 499);
  assert.equal(summary.pendingEstimateCents, 223);
  assert.equal(summary.grandEstimateCents, 722);
  assert.equal(summary.cartUnpriced + summary.pendingUnpriced, 0);
});
test("Quantidade grande preserva o total inteiro enquanto o valor é seguro", () => {
  const shoppingItems = [item("Lote", { qty: 1_000_000_000, priceCents: 33 })];
  assert.equal(tripSummary({ shoppingItems }).cartCents, 33_000_000_000);
});
test("Mil itens de R$ 0,33 somam 33 mil centavos", () => {
  const shoppingItems = Array.from({ length: 1000 }, (_, i) => item(String(i)));
  assert.equal(tripSummary({ shoppingItems }).cartCents, 33_000);
});
test("Nome vazio e duas categorias desconhecidas preservam os itens depois das categorias conhecidas", () => {
  const shoppingItems = [
    item("z", { name: "", category: "Corredor novo", inCart: false }),
    item("x", { category: "Outro corredor", inCart: false }),
    item("a", { category: "Hortifrúti", inCart: false }),
  ];
  assert.deepEqual(nextToGet({ shoppingItems }).map(({ id }) => id), ["a", "z", "x"]);
  assert.equal(pendingByCategory({ shoppingItems }).at(-1).category, "Outro corredor");
});
test("Cinco mil itens têm resumo e próximos produtos em menos de 100 ms", () => {
  const shoppingItems = Array.from({ length: 5000 }, (_, i) =>
    item(String(i), { inCart: i % 2 === 0, category: i % 3 === 0 ? "Limpeza" : "Hortifrúti" }));
  const start = performance.now();
  const summary = tripSummary({ shoppingItems });
  const next = nextToGet({ shoppingItems });
  const groups = pendingByCategory({ shoppingItems });
  assert.equal(summary.progress, 0.5);
  assert.equal(next.length, 5);
  assert.equal(groups.reduce((sum, group) => sum + group.count, 0), 2500);
  assert.ok(performance.now() - start < 100);
});
test("Sem itens, exibe tempo independentemente do progresso", () => {
  for (const [now, expected] of [[59_000, "menos de 1 min"], [60_000, "1 min"],
    [61 * 60_000, "1 h 01 min"], [25 * 3_600_000, "25 h 00 min"]]) {
    const summary = tripSummary({ shoppingItems: [] }, { startedAt: 0, now });
    assert.equal(summary.progress, 0);
    assert.equal(formatElapsed(summary.elapsedMinutes), expected);
  }
});
test("Data futura zera só o tempo e preserva carrinho e estimativa", () => {
  const summary = tripSummary({ shoppingItems: [item("Pão")] }, { startedAt: 120_000, now: 60_000 });
  assert.equal(summary.elapsedMinutes, 0);
  assert.equal(summary.cartCents, 33);
});
