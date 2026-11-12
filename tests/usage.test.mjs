import test from "node:test";
import assert from "node:assert/strict";
import { emptyUsage, normalizeUsage, rankedUsage, recordUse, resetUsage, usageKey, usageLabel, usageReport } from "../src/usage.mjs";

const day = new Date("2026-11-12T12:00:00Z");

test("chave de aba e de rota não guarda dados do usuário", () => {
  assert.equal(usageKey("home"), "tab:home");
  assert.equal(usageKey({ name: "accounts" }), "route:accounts");
  assert.equal(usageKey({ name: "form", kind: "transaction", initial: { description: "segredo" } }), "form:transaction");
  assert.equal(usageKey({ name: "contracts", type: "loan" }), "contracts:loan");
  assert.equal(usageKey({ name: "purchaseDetail", id: "abc" }), "route:purchaseDetail");
  assert.equal(usageKey(null), "");
});

test("contar soma, respeita o interruptor e não altera o original", () => {
  const u = emptyUsage(day);
  const a = recordUse(recordUse(u, "tab:home"), "tab:home");
  assert.equal(a.counts["tab:home"], 2);
  assert.deepEqual(u.counts, {});
  const off = { ...u, enabled: false };
  assert.equal(recordUse(off, "tab:home"), off);
  assert.equal(recordUse(u, ""), u);
});

test("zerar limpa as contagens e mantém o interruptor", () => {
  const u = { ...recordUse(emptyUsage(day), "tab:more"), enabled: false };
  const z = resetUsage(u, day);
  assert.deepEqual(z.counts, {});
  assert.equal(z.enabled, false);
  assert.equal(z.since, "2026-11-12");
});

test("normalizar descarta lixo e mantém o que vale", () => {
  assert.deepEqual(normalizeUsage(null, day), emptyUsage(day));
  const n = normalizeUsage({ enabled: false, since: "ontem", counts: { "tab:home": 3.9, x: -1, y: "a", ["z".repeat(61)]: 4 } }, day);
  assert.equal(n.enabled, false);
  assert.equal(n.since, "2026-11-12");
  assert.deepEqual(n.counts, { "tab:home": 3 });
});

test("ranking ordena por contagem e o relatório em texto lista tudo", () => {
  let u = emptyUsage(day);
  for (const k of ["route:payables", "tab:home", "tab:home", "contracts:loan"]) u = recordUse(u, k);
  const r = rankedUsage(u);
  assert.equal(r[0].label, "Início");
  assert.equal(usageLabel("contracts:loan"), "Empréstimos");
  assert.equal(usageLabel("tool:receivables"), "Quem me deve");
  const text = usageReport(u);
  assert.match(text, /desde 2026-11-12 \(4 aberturas\)/);
  assert.match(text, /2\tInício/);
});
