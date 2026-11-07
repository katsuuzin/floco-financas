import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction } from "../src/finance.mjs";
import { widgetData } from "../src/widgets.mjs";

const base = () => ({ ...emptyState(), accounts: [{ id: "a", name: "Conta", initial: 100000 }] });

test("W1 mostra saldo e próximas contas", () => {
  const s = addTransaction(base(), { type: "expense", amount: 5000, date: "2026-11-09", description: "Luz", accountId: "a", confirmed: false });
  const w = widgetData(s, { now: "2026-11-07" });
  assert.match(w.balance, /1\.000,00/);
  assert.match(w.bills, /Luz/);
});

test("W1 esconde valores com ocultação ou app protegido", () => {
  const s = { ...base(), settings: { ...base().settings, hide: true } };
  assert.equal(widgetData(s, { now: "2026-11-07" }).balance, "R$ ••••");
  const p = widgetData(base(), { protectedApp: true, now: "2026-11-07" });
  assert.equal(p.balance, "R$ ••••");
  assert.equal(p.bills, "Abra o Floco para ver.");
});
