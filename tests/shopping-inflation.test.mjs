import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { basketInflation, priceChange } from "../src/shoppingInflation.mjs";
const line = (name, unitPriceCents, unit = "", qty = 1) => ({ name, unitPriceCents, unit, qty, totalCents: qty * unitPriceCents });
const history = (...days) => ({ shoppingPurchases: days.map((items, i) => ({ date: "2026-01-" + String(i + 1).padStart(2, "0"), items })) });
test("Mediana reduz influência de um pico e descreve a mudança", () => {
  const data = history(...[100, 100, 108, 999, 108].map((cents) => [line("Leite", cents)]));
  const result = priceChange(data, "leite|", { months: 3 });
  assert.equal(result.percent, 8);
  assert.equal(result.message, "Leite subiu 8% em 3 meses.");
  assert.equal(basketInflation(data, { now: "2026-01-05" }).percent, 8);
});
test("Ignora preço zero e embalagem com unidade diferente", () => {
  const data = history([line("Leite", 100)], [line("Leite", 0), line("Leite", 100, "l")], [line("Leite", 120)]);
  assert.equal(priceChange(data, "leite|"), null);
  assert.equal(basketInflation(data, { now: "2026-01-03" }), null);
});
test("Compras no mesmo dia não fabricam uma direção temporal", () => {
  const data = history([line("Leite", 100)], [line("Leite", 140)], [line("Leite", 160)]);
  data.shoppingPurchases.forEach((p) => { p.date = "2026-01-01"; });
  assert.equal(priceChange(data, "leite|"), null);
});
test("Pondera pelo gasto e inclui os produtos que caíram", () => {
  const data = history([line("Leite", 200, "", 3), line("Arroz", 100)],
    [line("Leite", 100, "", 3), line("Arroz", 200)],
    [line("Leite", 100, "", 3), line("Arroz", 200)]);
  const result = basketInflation(data, { now: "2026-01-03" });
  assert.equal(result.direction, "down");
  assert.equal(result.percent, -5.88);
  assert.equal(result.topIncreases[0].name, "Arroz");
  assert.equal(result.topDecreases[0].name, "Leite");
});
test("Ignora compras após hoje e limita a cinco por direção", () => {
  const items = (price) => Array.from({ length: 7 }, (_, i) => line("Produto " + i, price));
  const data = history(items(100), items(110), items(110), items(5000));
  const result = basketInflation(data, { now: "2026-01-03", months: 1 });
  assert.equal(result.percent, 10);
  assert.equal(result.topIncreases.length, 5);
});
test("Analisa cinco mil compras em menos de 200 ms", () => {
  const shoppingPurchases = Array.from({ length: 5000 }, (_, i) => ({
    date: "2026-01-" + String(1 + i % 28).padStart(2, "0"), items: [line("Leite", 100 + i % 28)],
  }));
  const start = performance.now();
  assert.ok(basketInflation({ shoppingPurchases }, { now: "2026-01-31" }));
  assert.ok(performance.now() - start < 200);
});
