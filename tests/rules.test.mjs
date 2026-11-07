import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction } from "../src/finance.mjs";
import { compilePattern, matchRule, categorize, saveRule, previewRules, applyRules, seedRules, reconcileInvoice, normalizeText } from "../src/rules.mjs";

const base = () => ({
  ...emptyState(),
  accounts: [{ id: "a", name: "Conta", initial: 0 }],
  cards: [{ id: "c", name: "Cartão", limit: 100000, closingDay: 10, dueDay: 20 }],
});

test("F7 padrões ignoram acento e pontuação, com coringa e alternativas", () => {
  assert.ok(compilePattern("UBER*").test(normalizeText("Uber *Trip São Paulo")));
  assert.ok(matchRule({ pattern: "IFOOD*|RAPPI*" }, "rappi - pedido 123"));
  assert.ok(matchRule({ pattern: "farmácia*" }, "FARMACIA DO POVO"));
  assert.ok(!matchRule({ pattern: "MAX*" }, "SUPERMAXI LTDA"));
  assert.ok(!matchRule({ pattern: "UBER*", type: "expense" }, "UBER reembolso", "income"));
});

test("F7 vence a maior prioridade e, no empate, o padrão mais específico", () => {
  let s = saveRule(base(), { pattern: "AMAZON*", category: "Lazer", priority: 10 });
  s = saveRule(s, { pattern: "AMAZON PRIME*", category: "Assinaturas", priority: 10 });
  assert.equal(categorize(s, "AMAZON PRIME BR").category, "Assinaturas");
  s = saveRule(s, { pattern: "AMAZON*", category: "Mercado", priority: 50 });
  assert.equal(categorize(s, "AMAZON PRIME BR").category, "Mercado");
});

test("F7 prévia e aplicação no histórico respeitam o escopo", () => {
  let s = addTransaction(base(), { type: "expense", amount: 100, date: "2026-11-01", description: "NETFLIX.COM", category: "Outros", accountId: "a", confirmed: true });
  s = addTransaction(s, { type: "expense", amount: 100, date: "2026-11-01", description: "SPOTIFY", category: "Lazer", accountId: "a", confirmed: true });
  s = seedRules(s);
  assert.ok(s.rules.length >= 20);
  assert.equal(previewRules(s, "uncategorized").length, 1);
  assert.equal(previewRules(s, "all").length, 2);
  const after = applyRules(s);
  assert.ok(after.transactions.every((t) => t.category === "Assinaturas"));
  assert.equal(seedRules(after).rules.length, s.rules.length);
});

test("F7 padrão inválido é recusado", () => {
  assert.throws(() => saveRule(base(), { pattern: "  ", category: "Lazer" }), /padrão/);
});

test("F2 conferência encontra faltantes, divergências e lançamentos a mais", () => {
  let s = base();
  const buy = (date, amount, description) => (s = addTransaction(s, { type: "expense", amount, date, description, category: "Outros", cardId: "c" }));
  buy("2026-11-01", 5000, "MERCADO BOM");
  buy("2026-11-02", 3000, "POSTO SHELL");
  buy("2026-11-03", 1000, "CAFE");
  const rows = [
    { date: "2026-11-01", amount: 5000, description: "MERCADO BOM LTDA", type: "expense" },
    { date: "2026-11-02", amount: 3200, description: "POSTO SHELL 22", type: "expense" },
    { date: "2026-11-04", amount: 7000, description: "LOJA NOVA", type: "expense" },
  ];
  const r = reconcileInvoice(s, "c", "2026-11", rows);
  assert.equal(r.matched.length, 1);
  assert.equal(r.divergent.length, 1);
  assert.equal(r.divergent[0].diff, 200);
  assert.equal(r.missing.length, 1);
  assert.equal(r.extra.length, 1);
  assert.equal(r.diff, 15200 - 9000);
});
