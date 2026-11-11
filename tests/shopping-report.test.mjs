import test from "node:test";
import assert from "node:assert/strict";
import { monthlyReport } from "../src/shoppingReport.mjs";
import { makeState, makePurchase } from "./helpers/shoppingFixtures.mjs";

test("Mês sem compras retorna zero e não inventa ticket ou comparação", () => {
  const result = monthlyReport(makeState(), { now: "2026-01-01" });
  assert.deepEqual(result, { month: "2026-01", totalCents: 0, trips: 0, averageCents: null,
    mostFrequentWeekday: null, topCategory: null, comparison: null, savedCents: 0, unpriced: 0 });
});
test("Primeiro mês, frequência, ticket e categoria", () => {
  const state = makeState({ purchases: [makePurchase({ date: "2026-01-05" }),
    makePurchase({ id: "b", date: "2026-01-12", totalCents: 300 })] });
  const report = monthlyReport(state, { month: "2026-01" });
  assert.equal(report.mostFrequentWeekday, "segunda-feira");
  assert.equal(report.averageCents, 400);
  assert.equal(report.topCategory.category, "Mercearia");
  assert.equal(report.comparison, null);
});
test("Comparação de janeiro com dezembro e mensagem neutra", () => {
  const state = makeState({ purchases: [makePurchase({ date: "2025-12-01", totalCents: 1000 }),
    makePurchase({ id: "b", date: "2026-01-01", totalCents: 880 })] });
  assert.deepEqual(monthlyReport(state, { month: "2026-01" }).comparison,
    { month: "2025-12", totalCents: 1000, percent: -12, message: "Você gastou 12% menos que em dezembro." });
});
test("Primeiro e último segundo do mês UTC, com offset explícito", () => {
  const state = makeState({ purchases: [
    makePurchase({ date: "2025-12-31T21:00:00-03:00" }),
    makePurchase({ date: "2026-01-31T23:59:59Z" }),
    makePurchase({ date: "2026-02-01T00:00:00Z" }),
  ] });
  assert.equal(monthlyReport(state, { month: "2026-01" }).trips, 2);
});
test("Promoções reaproveitam regra de desconto e preço desconhecido é contado", () => {
  const state = makeState({ items: [{ name: "Café", qty: 1, priceCents: null }], purchases: [
    makePurchase({ items: [{ name: "Arroz", qty: 3, unit: "", priceCents: 100, totalCents: 200,
      deal: { type: "buyXPayY", x: 3, y: 2 } }] }),
  ] });
  const report = monthlyReport(state, { month: "2026-01" });
  assert.equal(report.savedCents, 100);
  assert.equal(report.unpriced, 1);
});
test("Valores não representáveis em centavos ficam indisponíveis", () => {
  const state = makeState({ purchases: [makePurchase({ totalCents: Number.MAX_SAFE_INTEGER }), makePurchase({ totalCents: 1 })] });
  const report = monthlyReport(state, { month: "2026-01" });
  assert.equal(report.trips, 2);
  assert.equal(report.totalCents, null);
  assert.equal(report.averageCents, null);
});
