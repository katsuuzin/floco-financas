import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction, validateBackup } from "../src/finance.mjs";
import { CATALOG, rootNames, categoryTree, subsOf, categoryNames, migrateSubcategories, inCategory, categoryLabel } from "../src/categories.mjs";
import { saveLabel, removeLabel } from "../src/planning.mjs";
import { budgetUsage, saveBudget } from "../src/analysis.mjs";
import { DEFAULT_RULES, seedRules, upgradeBuiltInRules, previewRules, applyRules, saveRule } from "../src/rules.mjs";
import { applyFilters, emptyFilters } from "../src/tx-filters.mjs";

const base = () => ({ ...emptyState(), accounts: [{ id: "a1", name: "Conta", initial: 0, includeInTotal: true }] });
const tx = (s, extra) => addTransaction(s, { description: "x", amount: 1000, date: "2026-11-05", type: "expense", accountId: "a1", confirmed: true, ...extra });

test("catálogo: 21 categorias, Outros junta despesa e receita, Assinaturas › Streaming", () => {
  assert.equal(CATALOG.length, 21);
  assert.ok(subsOf(base(), "Assinaturas").includes("Streaming"));
  const outros = CATALOG.find((c) => c.name === "Outros");
  assert.deepEqual(outros.types.sort(), ["expense", "income"]);
  assert.ok(outros.subs.includes("Diversos") && outros.subs.includes("Empréstimos Recebidos"));
  assert.ok(CATALOG.reduce((n, c) => n + c.subs.length, 0) >= 80);
});

test("seletor por tipo: receita não mostra Moradia; o que o usuário criou aparece sempre", () => {
  const s = { ...base(), customCategories: [{ id: "c", name: "Meu negócio", parent: "" }] };
  const inc = categoryTree(s, "income").map((c) => c.name);
  assert.ok(inc.includes("Salário") && inc.includes("Meu negócio") && inc.includes("Outros"));
  assert.ok(!inc.includes("Moradia"));
  const exp = categoryTree(s, "expense").map((c) => c.name);
  assert.ok(exp.includes("Moradia") && !exp.includes("Salário"));
});

test("Mercado (antigo) só aparece quando alguém usa", () => {
  assert.ok(!rootNames(base()).includes("Mercado"));
  assert.ok(rootNames(tx(base(), { category: "Mercado" })).includes("Mercado"));
});

test("lançamento guarda categoria e subcategoria; nada de campo vazio", () => {
  const s = tx(tx(base(), { category: "Assinaturas", subcategory: "Streaming" }), { category: "Lazer" });
  assert.equal(s.transactions[0].subcategory, "Streaming");
  assert.ok(!("subcategory" in s.transactions[1]));
  assert.equal(categoryLabel("Assinaturas", "Streaming"), "Assinaturas › Streaming");
});

test("subcategoria antiga (cadastro com parent) migra: categoria vira a principal", () => {
  const s0 = { ...tx(base(), { category: "Uber" }), customCategories: [{ id: "u", name: "Uber", parent: "Transporte" }] };
  const s = migrateSubcategories(s0);
  assert.deepEqual([s.transactions[0].category, s.transactions[0].subcategory], ["Transporte", "Uber"]);
  assert.equal(migrateSubcategories(s), s);
  const back = validateBackup(JSON.parse(JSON.stringify(s0)));
  assert.equal(back.transactions[0].subcategory, "Uber");
});

test("orçamento por subcategoria antiga continua somando depois da migração", () => {
  let s = { ...tx(base(), { category: "Uber" }), customCategories: [{ id: "u", name: "Uber", parent: "Transporte" }] };
  s = saveBudget(s, { amount: 50000, categories: ["Uber"], cycle: "monthly", startDay: 1 });
  s = migrateSubcategories(s);
  assert.equal(budgetUsage(s, s.budgets[0], "2026-11-10").used, 1000);
  const t = s.transactions[0];
  assert.ok(inCategory(t, "Transporte") && inCategory(t, "Uber") && !inCategory(t, "Lazer"));
});

test("orçamento aceita categorias do catálogo na validação do backup", () => {
  let s = saveBudget(base(), { amount: 50000, categories: ["Vestuário"], cycle: "monthly", startDay: 1 });
  validateBackup(JSON.parse(JSON.stringify(s)));
});

test("filtro do extrato por categoria também acha pela subcategoria", () => {
  const s = tx(base(), { category: "Transporte", subcategory: "Uber / 99" });
  const f = { ...emptyFilters(), categories: ["Uber / 99"] };
  assert.equal(applyFilters(s.transactions, f).length, 1);
});

test("criar subcategoria que já existe no catálogo é recusado; renomear acompanha lançamentos e regras", () => {
  assert.throws(() => saveLabel(base(), "customCategories", { name: "streaming", parent: "Assinaturas" }), /já existe/);
  let s = saveLabel(base(), "customCategories", { name: "Anime", parent: "Assinaturas" });
  const id = s.customCategories[0].id;
  s = tx(s, { category: "Assinaturas", subcategory: "Anime" });
  s = saveRule(s, { pattern: "CRUNCH*", category: "Assinaturas", subcategory: "Anime" });
  assert.throws(() => removeLabel(s, "customCategories", id), /em uso/);
  s = saveLabel(s, "customCategories", { id, name: "Animes", parent: "Assinaturas" });
  assert.equal(s.transactions[0].subcategory, "Animes");
  assert.equal(s.rules[0].subcategory, "Animes");
  assert.ok(categoryNames(s).includes("Animes"));
});

test("regras iniciais usam só categorias e subcategorias do catálogo", () => {
  for (const [, cat, sub] of DEFAULT_RULES) {
    const c = CATALOG.find((x) => x.name === cat);
    assert.ok(c, cat);
    if (sub) assert.ok(c.subs.includes(sub), `${cat} › ${sub}`);
  }
  const s = seedRules(base());
  assert.ok(s.rules.some((r) => r.category === "Assinaturas" && r.subcategory === "Streaming"));
});

test("aplicar regras muda a subcategoria também", () => {
  let s = seedRules(tx(base(), { description: "NETFLIX.COM", category: "Assinaturas", subcategory: "Apps / Softwares" }));
  assert.equal(previewRules(s).length, 1);
  s = applyRules(s);
  assert.equal(s.transactions[0].subcategory, "Streaming");
});

test("regras sugeridas antigas ganham subcategoria uma vez; as editadas ficam como estão", () => {
  const old = (pattern, category, extra = {}) => ({ id: pattern, pattern, category, type: "expense", priority: 10, active: true, builtIn: true, ...extra });
  const s = {
    ...base(),
    rules: [
      old("NETFLIX*|SPOTIFY*|DISNEY*|HBO*|MAX*|PRIME VIDEO*|AMAZON PRIME*|GLOBOPLAY*|DEEZER*|YOUTUBE*|PARAMOUNT*|CRUNCHYROLL*", "Assinaturas"),
      old("MERCADO*|SUPERMERCADO*|CARREFOUR*|ASSAI*|ATACADAO*|EXTRA*|PAO DE ACUCAR*|DIA *|SONDA*|GUANABARA*|ZAFFARI*|SAVEGNAGO*", "Mercado"),
      old("IFOOD*|IFD*|RAPPI*|ZE DELIVERY*|AIQFOME*", "Lazer"),
    ],
  };
  const up = upgradeBuiltInRules(s);
  assert.deepEqual([up.rules[0].category, up.rules[0].subcategory], ["Assinaturas", "Streaming"]);
  assert.deepEqual([up.rules[1].category, up.rules[1].subcategory], ["Alimentação", "Supermercado"]);
  assert.equal(up.rules[2].category, "Lazer");
  assert.equal(upgradeBuiltInRules(up), up);
});

test("arte das categorias: cada categoria do catálogo tem ícone e cor do Calen, e a escolha da pessoa vence", async () => {
  const { CATEGORY_ART, lookOf } = await import("../src/looks.mjs");
  const { hasCalenIcon, CALEN_COLORS } = await import("../src/calenArt.mjs");
  for (const c of CATALOG) {
    const art = CATEGORY_ART[c.name];
    assert.ok(art, `sem arte: ${c.name}`);
    assert.ok(hasCalenIcon(art[0]), art[0]);
    assert.ok(Object.values(CALEN_COLORS).includes(art[1]), art[1]);
  }
  assert.deepEqual([lookOf({}, "Moradia").image, lookOf({}, "Moradia").color], ["home", CALEN_COLORS.sapphire]);
  const sub = lookOf({ customCategories: [{ name: "Uber", parent: "Transporte" }] }, "Uber");
  assert.deepEqual([sub.image, sub.color], ["transport", CALEN_COLORS.blue]);
  assert.equal(lookOf({ categoryLooks: { Moradia: { icon: "tag" } } }, "Moradia").image, "");
  assert.equal(lookOf({}, "Mercado").image, "grocery");
});
