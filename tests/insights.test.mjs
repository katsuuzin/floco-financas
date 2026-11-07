import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction } from "../src/finance.mjs";
import { monthInsights, healthScore, actionPlan, aiContext } from "../src/insights.mjs";

const base = () => ({ ...emptyState(), accounts: [{ id: "a", name: "Conta Secreta", initial: 0 }] });
const add = (s, type, date, amount, category, description = "x") =>
  addTransaction(s, { type, date, amount, category, description, accountId: "a", confirmed: true });

test("F8 insights apontam alta de categoria contra a média de 3 meses", () => {
  let s = base();
  for (const m of ["08", "09", "10"]) s = add(s, "expense", `2026-${m}-05`, 20000, "Lazer");
  s = add(s, "expense", "2026-11-05", 40000, "Lazer");
  s = add(s, "expense", "2026-11-06", 9000, "Pets");
  const ins = monthInsights(s, "2026-11");
  assert.ok(ins.some((i) => i.kind === "up" && /Lazer/.test(i.text)));
  assert.ok(ins.some((i) => i.kind === "new" && /Pets/.test(i.text)));
});

test("F8 nota alta para quem poupa, tem reserva e não deve", () => {
  let s = base();
  s = add(s, "income", "2026-07-01", 3_000_000, "Salário");
  for (const m of ["08", "09", "10"]) {
    s = add(s, "income", `2026-${m}-01`, 500000, "Salário");
    s = add(s, "expense", `2026-${m}-05`, 300000, "Moradia");
  }
  const h = healthScore(s, "2026-11-07");
  assert.ok(h.score >= 80, `nota ${h.score}`);
  assert.equal(h.factors.length, 5);
  assert.equal(h.level, "Ótima");
});

test("F8 nota baixa quando gasta mais do que ganha e tem atrasos", () => {
  let s = base();
  for (const m of ["08", "09", "10"]) {
    s = add(s, "income", `2026-${m}-01`, 100000, "Salário");
    s = add(s, "expense", `2026-${m}-05`, 150000, "Moradia");
  }
  s = addTransaction(s, { type: "expense", amount: 1000, date: "2026-10-01", description: "Luz", accountId: "a", confirmed: false });
  const h = healthScore(s, "2026-11-07");
  assert.ok(h.score < 40, `nota ${h.score}`);
  assert.ok(actionPlan(s, "2026-11-07").length >= 3);
});

test("F8 contexto para IA não leva nomes de contas nem descrições", () => {
  let s = add(base(), "expense", "2026-11-05", 1000, "Lazer", "Presente para Fulano");
  const ctx = aiContext(s, "2026-11-07");
  assert.ok(!ctx.includes("Fulano"));
  assert.ok(!ctx.includes("Conta Secreta"));
  assert.match(ctx, /Lazer/);
});
