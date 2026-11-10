import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction, validateBackup } from "../src/finance.mjs";
import { spendTypeConfig, typeOfCategory, typeOfTransaction, spendByType, savedInMonth, setCategoryType, setTypeGoal, applyModel, clearGoals, addCustomType, removeCustomType, SPEND_MODELS } from "../src/spendTypes.mjs";

const REF = "2026-11-09";
const base = () => ({ ...emptyState(), accounts: [{ id: "a1", name: "Conta", initial: 100000, includeInTotal: true }] });
const tx = (s, extra) => addTransaction(s, { description: "x", amount: 1000, date: "2026-11-05", type: "expense", accountId: "a1", confirmed: true, category: "Outros", ...extra });

test("tipos de base, categorias padrão e categoria desconhecida cai em Variável", () => {
  const cfg = spendTypeConfig(base());
  assert.deepEqual(cfg.types.map((t) => t.id), ["fixed", "cuttable", "variable", "saved"]);
  assert.equal(typeOfCategory(cfg, "Moradia"), "fixed");
  assert.equal(typeOfCategory(cfg, "Lazer"), "cuttable");
  assert.equal(typeOfCategory(cfg, "Alimentação"), "variable");
  assert.equal(typeOfCategory(cfg, "Qualquer coisa"), "variable");
});

test("resumo do mês por tipo: soma, fração, categorias dentro e ignorados fora", () => {
  let s = base();
  s = tx(s, { amount: 150000, category: "Moradia" });
  s = tx(s, { amount: 20000, category: "Lazer" });
  s = tx(s, { amount: 30000, category: "Alimentação" });
  s = tx(s, { amount: 5000, category: "Alimentação", ignored: true });
  s = tx(s, { amount: 7000, category: "Saúde", confirmed: false });
  s = tx(s, { type: "income", amount: 500000, category: "Salário" });
  const r = spendByType(s, "2026-11", { ref: REF });
  const by = Object.fromEntries(r.rows.map((x) => [x.id, x]));
  assert.deepEqual([by.fixed.cents, by.cuttable.cents, by.variable.cents, by.saved.cents], [150000, 20000, 30000, 0]);
  assert.equal(r.total, 200000);
  assert.equal(r.spent, 200000);
  assert.equal(by.fixed.fraction, 0.75);
  assert.deepEqual(by.variable.categories, [{ name: "Alimentação", cents: 30000 }]);
  assert.equal(r.income, 500000);
  assert.equal(r.rows[0].id, "fixed"); // ordem por valor
  assert.equal(r.isEmpty, false);
  assert.equal(spendByType(base(), "2026-11", { ref: REF }).isEmpty, true);
});

test("lançamento com tipo próprio vence o da categoria", () => {
  let s = tx(base(), { amount: 9000, category: "Moradia", spendType: "cuttable" });
  s = tx(s, { amount: 1000, category: "Moradia" });
  assert.equal(typeOfTransaction(spendTypeConfig(s), s.transactions[0]), "cuttable");
  const by = Object.fromEntries(spendByType(s, "2026-11", { ref: REF }).rows.map((x) => [x.id, x.cents]));
  assert.deepEqual([by.cuttable, by.fixed], [9000, 1000]);
  // tipo que não existe mais volta ao da categoria
  assert.equal(typeOfTransaction(spendTypeConfig(base()), { category: "Moradia", spendType: "t-que-sumiu" }), "fixed");
});

test("guardado: depósitos em metas e caixinhas no mês, menos resgates", () => {
  const s = {
    ...base(),
    goals: [
      { id: "g1", name: "Viagem", moves: [{ id: "m1", type: "deposit", date: "2026-11-02", amount: 30000 }, { id: "m2", type: "adjust", date: "2026-11-03", amount: 9999 }, { id: "m3", type: "deposit", date: "2026-10-02", amount: 7000 }] },
      { id: "g2", name: "Reserva", kind: "box", history: [{ id: "h1", type: "deposit", date: "2026-11-04", amount: 50000 }, { id: "h2", type: "withdraw", date: "2026-11-06", amount: 10000 }, { id: "h3", type: "yield", date: "2026-11-07", amount: 100 }] },
    ],
  };
  assert.equal(savedInMonth(s, "2026-11"), 70000);
  const r = spendByType(s, "2026-11", { ref: REF });
  assert.equal(r.rows.find((x) => x.id === "saved").cents, 70000);
  assert.equal(r.spent, 0); // guardado não é gasto
  assert.equal(r.total, 70000);
});

test("metas: por tipo em % da renda, modelos e limpar", () => {
  let s = tx(base(), { type: "income", amount: 400000, category: "Salário" });
  s = setTypeGoal(s, "cuttable", "30");
  s = setTypeGoal(s, "saved", "12,5");
  const r = spendByType(s, "2026-11", { ref: REF });
  const by = Object.fromEntries(r.rows.map((x) => [x.id, x]));
  assert.deepEqual([by.cuttable.goalPct, by.cuttable.goalCents, by.saved.goalCents, by.fixed.goalPct], [30, 120000, 50000, null]);
  assert.throws(() => setTypeGoal(s, "cuttable", "150"), /0% a 100%/);
  assert.throws(() => setTypeGoal(s, "nao-existe", "10"), /inválido/);
  s = applyModel(s, "50-30-20");
  assert.equal(spendTypeConfig(s).model, "50-30-20");
  assert.equal(Object.values(spendTypeConfig(s).goals).reduce((a, b) => a + b, 0), 100);
  assert.ok(SPEND_MODELS.every((m) => Object.values(m.goals).reduce((a, b) => a + b, 0) === 100));
  assert.equal(spendTypeConfig(setTypeGoal(s, "fixed", "")).goals.fixed, undefined);
  assert.deepEqual(spendTypeConfig(clearGoals(s)).goals, {});
});

test("categoria muda de tipo; tipo próprio entra, vale e sai levando as ligações", () => {
  let s = base();
  s = setCategoryType(s, "Moradia", "variable");
  assert.equal(typeOfCategory(spendTypeConfig(s), "Moradia"), "variable");
  assert.throws(() => setCategoryType(s, "Moradia", "saved"), /inválido/);
  s = addCustomType(s, { name: "Dívidas", color: "#E5484D" });
  const id = spendTypeConfig(s).types.find((t) => t.name === "Dívidas").id;
  assert.throws(() => addCustomType(s, { name: "dívidas" }), /já existe/);
  s = setCategoryType(s, "Impostos e Taxas", id);
  s = setTypeGoal(s, id, "5");
  s = tx(s, { amount: 1000, category: "Lazer", spendType: id });
  assert.equal(spendByType(s, "2026-11", { ref: REF }).rows.find((x) => x.id === id).cents, 1000);
  s = removeCustomType(s, id);
  assert.equal(typeOfCategory(spendTypeConfig(s), "Impostos e Taxas"), "fixed");
  assert.equal(spendTypeConfig(s).goals[id], undefined);
  assert.ok(!("spendType" in s.transactions[0]));
  assert.throws(() => removeCustomType(s, "fixed"), /criados por você/);
});

test("configuração segue no backup e ignora ids que não existem", () => {
  let s = setCategoryType(base(), "Moradia", "cuttable");
  s = setTypeGoal(s, "fixed", "35");
  const back = validateBackup(JSON.parse(JSON.stringify(s)));
  assert.equal(typeOfCategory(spendTypeConfig(back), "Moradia"), "cuttable");
  const junk = { ...s, settings: { ...s.settings, spendTypes: { byCategory: { Moradia: "xx" }, goals: { xx: 10, fixed: -5 } } } };
  const cfg = spendTypeConfig(junk);
  assert.equal(typeOfCategory(cfg, "Moradia"), "fixed");
  assert.deepEqual(cfg.goals, {});
});
