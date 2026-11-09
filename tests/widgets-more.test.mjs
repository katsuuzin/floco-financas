import { test } from "node:test";
import assert from "node:assert/strict";
import { demoState } from "../src/finance.mjs";
import { widgetData } from "../src/widgets.mjs";

test("W1 widgets de fatura e orçamentos têm texto e respeitam valores ocultos", () => {
  const s = demoState();
  const d = widgetData(s, { now: "2026-11-09" });
  assert.match(d.invoiceTitle, /^Faturas de /);
  assert.ok(d.invoices.includes("vence"));
  assert.ok(d.budgetsFull.length > 0);
  const hidden = widgetData({ ...s, settings: { ...s.settings, hide: true } }, { now: "2026-11-09" });
  assert.ok(!/\d+,\d{2}/.test(hidden.invoices));
  const locked = widgetData(s, { now: "2026-11-09", protectedApp: true });
  assert.equal(locked.invoices, "Abra o Floco para ver.");
  assert.equal(locked.budgetsFull, "Abra o Floco para ver.");
});
