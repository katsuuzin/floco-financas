import { assertFast } from "./helpers/timing.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { tripViewModel, parseLimitInput, finishPlan } from "../src/shoppingTripView.mjs";
import { makeState } from "./helpers/shoppingFixtures.mjs";

const row = (id, fields = {}) => ({ id, name: "Item " + id, unit: "", qty: 1, category: "Mercearia", priceCents: 150, inCart: false, ...fields });
test("Lista ausente, sessão nula e tempo anterior ao início", () => {
  const empty = tripViewModel({}, { session: null, now: 100 });
  assert.equal(empty.empty, true);
  assert.equal(empty.canFinish, false);
  assert.equal(empty.elapsed.minutes, 0);
  assert.deepEqual(empty.progress, { items: 0, total: 0, pending: 0, percent: 0 });
  assert.equal(tripViewModel(makeState(), { session: { startedAt: 1000 }, now: 0 }).elapsed.minutes, 0);
});
test("Ordem por corredor, totais, progresso e fala", () => {
  const items = [row("1", { inCart: true, qty: 2 }), row("2", { category: "Limpeza" }),
    row("3", { category: "Padaria", unit: "kg", qty: 0.5, priceCents: 400 })];
  const view = tripViewModel(makeState({ items }), { session: { startedAt: 0 }, now: 120_000, limitCents: 500 });
  assert.deepEqual(view.groups.map((g) => g.category), ["Padaria", "Limpeza"]);
  assert.equal(view.groups[0].items[0].totalCents, 400);
  assert.match(view.groups[0].items[0].spoken, /0,5 quilos/);
  assert.equal(view.cart.cents, 300);
  assert.equal(view.progress.percent, 33);
  assert.equal(view.elapsed.minutes, 2);
  assert.equal(view.budget.level, "over");
  assert.equal(view.budget.color, "over");
  assert.match(view.spoken.header, /1 de 3 itens/);
});
test("Tudo no carrinho sem preço permite registrar com valor em branco", () => {
  const state = makeState({ items: [row("1", { inCart: true, priceCents: null })] });
  const view = tripViewModel(state);
  assert.deepEqual(view.groups, []);
  assert.equal(view.progress.percent, 100);
  assert.equal(view.cart.unpriced, 1);
  assert.equal(view.canFinish, true);
  assert.equal(view.finish.expense.amount, "");
  assert.equal(view.finish.skipped[0].id, "1");
});
test("Plano mantém uma despesa e avisa de pendentes e valores ausentes", () => {
  const state = makeState({ items: [row("a", { inCart: true }), row("b", { inCart: true, priceCents: null }), row("c")] });
  const plan = finishPlan(state);
  assert.equal(plan.expense.amountCents, 150);
  assert.equal(plan.expense.description, "Compra de mercado");
  assert.match(plan.warning, /sem preço.*1 item pendente/);
  assert.match(finishPlan({}).warning, /vazio/);
});
test("Limite monetário aceita reais brasileiros e rejeita valores inválidos", () => {
  for (const [input, cents] of [["250",25000],["250,00",25000],["R$ 1.250,50",125050],["",0],["0",0],["0,00",0]])
    assert.deepEqual(parseLimitInput(input), { ok: true, cents });
  for (const input of ["-5","abc","1e3",undefined,"1.000.000.000,00"]) assert.equal(parseLimitInput(input).ok, false);
});
test("Valores ocultos também ficam ocultos na fala", () => {
  const state = makeState({ items: [row("1", { inCart: true })] });
  const view = tripViewModel({ ...state, settings: { hide: true } });
  assert.match(view.cart.text, /••••/);
  assert.match(view.inCart[0].spoken, /valor oculto/);
  assert.doesNotMatch(view.spoken.header, /reais?|centavos?/);
});
test("Dois mil itens em menos de 100 ms", () => {
  const state = makeState({ items: Array.from({ length: 2000 }, (_, i) => row(String(i), { inCart: i % 2 === 0, priceCents: i + 1 })) });
  assertFast(() => {
    assert.equal(tripViewModel(state).progress.total, 2000);
  }, 100, "shopping-trip-view");
});
