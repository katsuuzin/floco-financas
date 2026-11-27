import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction } from "../src/finance.mjs";
import { donutSlices, categoryTransactions } from "../src/spending.mjs";
import { recategorize, suggestRulePattern, ruleSuggestion, addSuggestedRule, snapshotCategories, revertCategories } from "../src/recategorize.mjs";
import { categorize, previewRules, applyRules } from "../src/rules.mjs";

const base = () => ({
  ...emptyState(),
  accounts: [{ id: "a1", name: "Conta", initial: 500000, includeInTotal: true }],
  cards: [{ id: "c1", name: "Cartão", limit: 100000, closingDay: 10, dueDay: 20, accountId: "a1" }],
});
const tx = (s, extra) => addTransaction(s, { description: "x", amount: 1000, date: "2026-11-05", type: "expense", accountId: "a1", confirmed: true, category: "Outros", ...extra });
const ids = (s) => s.transactions.map((t) => t.id);

test("lançamentos da categoria somam o valor da rosca e respeitam ordem e busca", () => {
  let s = base();
  s = tx(s, { description: "Uber centro", amount: 4200, date: "2026-11-02" });
  s = tx(s, { description: "Padaria", amount: 1500, date: "2026-11-08" });
  s = tx(s, { description: "Mercado grande", amount: 9000, date: "2026-11-04", category: "Mercado" });
  s = tx(s, { description: "Antigo", amount: 7000, date: "2026-10-04" });
  s = tx(s, { description: "Pendente", amount: 7000, date: "2026-11-06", confirmed: false });
  const d = donutSlices(s, "2026-11");
  const outros = d.slices.find((x) => x.name === "Outros");
  const list = categoryTransactions(s, "2026-11", "Outros");
  assert.equal(list.total, outros.cents);
  assert.deepEqual(list.rows.map((r) => r.description), ["Uber centro", "Padaria"]);
  assert.deepEqual(categoryTransactions(s, "2026-11", "Outros", { sort: "date" }).rows.map((r) => r.description), ["Padaria", "Uber centro"]);
  assert.deepEqual(categoryTransactions(s, "2026-11", "Outros", { query: "UBÉR" }).rows.map((r) => r.description), ["Uber centro"]);
  assert.equal(categoryTransactions(s, "2026-11", "Lazer").rows.length, 0);
});

test("subcategoria filtra e vazia significa sem subcategoria", () => {
  let s = base();
  s = tx(s, { description: "A", amount: 100, category: "Alimentação", subcategory: "Restaurante" });
  s = tx(s, { description: "B", amount: 200, category: "Alimentação" });
  assert.deepEqual(categoryTransactions(s, "2026-11", "Alimentação", { sub: "Restaurante" }).rows.map((r) => r.description), ["A"]);
  assert.deepEqual(categoryTransactions(s, "2026-11", "Alimentação", { sub: "" }).rows.map((r) => r.description), ["B"]);
});

test("recategorizar move o valor entre categorias, em lote, e marca como travado", () => {
  let s = base();
  s = tx(s, { description: "Coca cola", amount: 1199 });
  s = tx(s, { description: "Biscoito", amount: 400 });
  s = tx(s, { description: "Outro", amount: 999, category: "Lazer" });
  const [a, b, c] = ids(s);
  const r = recategorize(s, [a, b], "Alimentação", "Mercado");
  assert.equal(r.changed, 2);
  const after = donutSlices(r.state, "2026-11");
  assert.equal(after.slices.find((x) => x.name === "Alimentação").cents, 1599);
  assert.equal(after.slices.find((x) => x.name === "Outros"), undefined);
  assert.equal(r.state.transactions.find((t) => t.id === a).subcategory, "Mercado");
  assert.equal(r.state.transactions.find((t) => t.id === a).categoryLocked, true);
  assert.equal(r.state.transactions.find((t) => t.id === c).category, "Lazer");
  assert.equal(s.transactions.find((t) => t.id === a).category, "Outros", "estado original intacto");
});

test("escolher a mesma categoria não muda nada; sem subcategoria remove a antiga", () => {
  let s = base();
  s = tx(s, { description: "A", category: "Alimentação", subcategory: "Restaurante" });
  const [a] = ids(s);
  const same = recategorize(s, [a], "Alimentação", "Restaurante");
  assert.equal(same.changed, 0);
  assert.equal(same.state, s);
  const out = recategorize(s, [a], "Alimentação", "");
  assert.equal(out.changed, 1);
  assert.equal("subcategory" in out.state.transactions[0], false);
  assert.throws(() => recategorize(s, [a], ""), /categoria/i);
});

test("regras automáticas não desfazem a escolha manual", () => {
  let s = base();
  s = { ...s, rules: [{ id: "r1", pattern: "COCA*", type: "expense", category: "Outros", priority: 10, active: true }] };
  s = tx(s, { description: "Coca cola 2l", category: "Mercado" });
  const [a] = ids(s);
  assert.equal(previewRules(s).length, 1, "sem trava a regra mudaria");
  assert.equal(recategorize(s, [a], "Mercado", "").changed, 0, "mesma categoria: nada a travar");
  const manual = recategorize(s, [a], "Alimentação", "Mercado").state;
  assert.equal(previewRules(manual).length, 0);
  assert.equal(applyRules(manual).transactions[0].category, "Alimentação");
});

test("padrão sugerido: primeira palavra útil, sem acento e com curinga", () => {
  assert.equal(suggestRulePattern("Uber · Vila Madalena"), "UBER*");
  assert.equal(suggestRulePattern("  Pão de Queijo Brasa"), "PAO*");
  assert.equal(suggestRulePattern("99 POP"), "POP*");
  assert.equal(suggestRulePattern("12 34"), null);
  assert.equal(suggestRulePattern(""), null);
});

test("sugestão de regra: só para mesmo comerciante e quando as regras ainda não cobrem", () => {
  let s = base();
  s = tx(s, { description: "Farmácia Central 1" });
  s = tx(s, { description: "Farmácia Central 2" });
  s = tx(s, { description: "Padaria Sol" });
  const [a, b, c] = ids(s);
  const sug = ruleSuggestion(s, [a, b], "Saúde", "Medicamentos");
  assert.deepEqual(sug, { pattern: "FARMACIA*", type: "expense", category: "Saúde", subcategory: "Medicamentos", samples: 2 });
  assert.equal(ruleSuggestion(s, [a, c], "Saúde", ""), null, "comerciantes diferentes");
  const withRule = addSuggestedRule(s, sug);
  assert.equal(categorize(withRule, "Farmácia Central 9").category, "Saúde");
  assert.equal(ruleSuggestion(withRule, [a, b], "Saúde", "Medicamentos"), null, "regra já cobre");
});

test("desfazer o movimento devolve categoria, subcategoria e trava", () => {
  let s = base();
  s = tx(s, { description: "A", category: "Alimentação", subcategory: "Restaurante" });
  s = tx(s, { description: "B" });
  const all = ids(s);
  const snap = snapshotCategories(s, all);
  const moved = recategorize(s, all, "Lazer", "Hobbies").state;
  assert.equal(moved.transactions[0].category, "Lazer");
  const back = revertCategories(moved, snap);
  assert.deepEqual(back.transactions, s.transactions);
  assert.equal("categoryLocked" in back.transactions[1], false);
});

test("receitas: a folha lista só receitas da categoria e mover mantém o total", () => {
  let s = base();
  s = tx(s, { description: "Salário", amount: 500000, type: "income", category: "Salário" });
  s = tx(s, { description: "Freela", amount: 120000, type: "income", category: "Outros" });
  s = tx(s, { description: "Padaria", amount: 1500, category: "Outros" });
  const inc = categoryTransactions(s, "2026-11", "Outros", { kind: "income" });
  assert.deepEqual(inc.rows.map((r) => r.description), ["Freela"]);
  assert.equal(inc.total, donutSlices(s, "2026-11", { kind: "income" }).slices.find((x) => x.name === "Outros").cents);
  assert.deepEqual(categoryTransactions(s, "2026-11", "Outros").rows.map((r) => r.description), ["Padaria"]);
  const moved = recategorize(s, [inc.rows[0].id], "Salário", "").state;
  assert.equal(donutSlices(moved, "2026-11", { kind: "income" }).total, 620000);
  assert.equal(categoryTransactions(moved, "2026-11", "Salário", { kind: "income" }).rows.length, 2);
});

test("mês futuro e mês sem lançamentos: listas vazias, sem erro", () => {
  let s = base();
  s = tx(s, { description: "Padaria", amount: 1500 });
  assert.deepEqual(categoryTransactions(s, "2027-03", "Outros").rows, []);
  assert.equal(categoryTransactions(s, "2027-03", "Outros").total, 0);
  assert.equal(categoryTransactions(s, "2027-03", "Outros", { kind: "income" }).rows.length, 0);
});
