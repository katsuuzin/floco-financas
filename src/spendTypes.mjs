// Tipo de gasto (equivale a "Tipo de Gasto" do Calen): cada categoria entra em um tipo (Fixo,
// Cortável, Variável) e o que foi guardado em metas e caixinhas vira o tipo Guardado. A
// configuração fica em `settings.spendTypes`; o lançamento pode ter um tipo próprio
// (`spendType`). Valores em centavos. Sem imports de tela.
import { monthKey, analysisAmount, today, totalBalance } from "./finance.mjs";
import { monthCalendar } from "./spending.mjs";

const real = (t) => t.type !== "transfer" && !t.invoicePayment && !t.loanSettlement && !t.ignored;

export const BASE_TYPES = [
  { id: "fixed", name: "Fixo", color: "#7B93C0", icon: "pin" },
  { id: "cuttable", name: "Cortável", color: "#3B82F6", icon: "haircut" },
  { id: "variable", name: "Variável", color: "#FBB202", icon: "credit_card" },
  { id: "saved", name: "Guardado", color: "#2FB22F", icon: "emergency_fund", saved: true },
];

// Em qual tipo cada categoria entra, até a pessoa mudar.
export const DEFAULT_CATEGORY_TYPE = {
  Moradia: "fixed",
  Educação: "fixed",
  Serviços: "fixed",
  "Filhos / Dependentes": "fixed",
  "Impostos e Taxas": "fixed",
  Seguros: "fixed",
  Lazer: "cuttable",
  Vestuário: "cuttable",
  "Cuidados Pessoais": "cuttable",
  Assinaturas: "cuttable",
  "Presentes e Doações": "cuttable",
  Alimentação: "variable",
  Transporte: "variable",
  Saúde: "variable",
  Pets: "variable",
  Mercado: "variable",
  Outros: "variable",
};

// Modelos de meta: % da renda do mês para cada tipo (somam 100).
export const SPEND_MODELS = [
  { id: "50-30-20", name: "50 · 30 · 20", note: "50% necessidades, 30% desejos, 20% guardar", goals: { fixed: 30, variable: 20, cuttable: 30, saved: 20 } },
  { id: "60-20-20", name: "60 · 20 · 20", note: "60% necessidades, 20% desejos, 20% guardar", goals: { fixed: 35, variable: 25, cuttable: 20, saved: 20 } },
  { id: "70-20-10", name: "70 · 20 · 10", note: "70% necessidades, 20% desejos, 10% guardar", goals: { fixed: 40, variable: 30, cuttable: 20, saved: 10 } },
];

const DEFAULT_ID = "variable";

// Configuração final: tipos (os quatro de base e os da pessoa), categoria → tipo, metas.
export function spendTypeConfig(state) {
  const saved = state.settings?.spendTypes || {};
  const custom = (saved.custom || []).filter((t) => t && t.id && t.name);
  const types = [...BASE_TYPES, ...custom.map((t) => ({ id: t.id, name: t.name, color: t.color || "#94A3B8", icon: t.icon || "other", custom: true }))];
  const ids = new Set(types.map((t) => t.id));
  const byCategory = { ...DEFAULT_CATEGORY_TYPE };
  for (const [name, id] of Object.entries(saved.byCategory || {})) if (ids.has(id)) byCategory[name] = id;
  const goals = {};
  for (const [id, pct] of Object.entries(saved.goals || {})) if (ids.has(id) && Number.isFinite(pct) && pct >= 0) goals[id] = pct;
  return { types, byCategory, goals, model: saved.model || "" };
}

export const typeOfCategory = (cfg, category) => cfg.byCategory[category] || DEFAULT_ID;

// Tipo de um lançamento: o próprio, se tiver e ainda existir; senão o da categoria.
export function typeOfTransaction(cfg, t) {
  if (t.spendType && cfg.types.some((x) => x.id === t.spendType)) return t.spendType;
  return typeOfCategory(cfg, t.category || "Outros");
}

const move = (g, m) => (m.type === "deposit" ? m.amount : 0);
// Quanto foi guardado no mês: depósitos em metas e caixinhas, menos resgates das caixinhas.
export function savedInMonth(state, month) {
  let total = 0;
  for (const g of state.goals || []) {
    for (const m of g.moves || []) if (monthKey(m.date) === month) total += move(g, m);
    for (const h of g.history || []) {
      if (monthKey(h.date) !== month) continue;
      if (h.type === "deposit") total += h.amount;
      else if (h.type === "withdraw") total -= h.amount;
    }
  }
  return Math.max(0, total);
}

// Resumo do mês por tipo. `byInvoice`: compra no cartão conta no mês da fatura.
export function spendByType(state, month, { byInvoice = false, ref = today(), sort = "value" } = {}) {
  const cfg = spendTypeConfig(state);
  const income = state.transactions.filter((t) => t.confirmed && real(t) && t.type === "income" && monthKey(t.date) === month).reduce((a, t) => a + analysisAmount(t), 0);
  const byType = new Map(cfg.types.map((t) => [t.id, { id: t.id, name: t.name, color: t.color, icon: t.icon, custom: !!t.custom, saved: !!t.saved, cents: 0, cats: new Map() }]));
  for (const t of state.transactions) {
    if (!t.confirmed || t.type !== "expense" || !real(t)) continue;
    const inMonth = byInvoice && t.cardId ? t.invoiceMonth === month : monthKey(t.date) === month;
    if (!inMonth) continue;
    const row = byType.get(typeOfTransaction(cfg, t)) || byType.get(DEFAULT_ID);
    const v = analysisAmount(t);
    row.cents += v;
    const name = t.category || "Outros";
    row.cats.set(name, (row.cats.get(name) || 0) + v);
  }
  const saved = savedInMonth(state, month);
  byType.get("saved").cents = saved;
  const rows = [...byType.values()].map((r) => ({
    ...r,
    categories: [...r.cats.entries()].filter(([, v]) => v > 0).map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name, "pt-BR")),
    goalPct: Number.isFinite(cfg.goals[r.id]) ? cfg.goals[r.id] : null,
    goalCents: Number.isFinite(cfg.goals[r.id]) ? Math.round((income * cfg.goals[r.id]) / 100) : null,
  }));
  const spent = rows.filter((r) => !r.saved).reduce((a, r) => a + Math.max(0, r.cents), 0);
  const total = rows.reduce((a, r) => a + Math.max(0, r.cents), 0);
  for (const r of rows) {
    r.fraction = total > 0 ? Math.max(0, r.cents) / total : 0;
    delete r.cats;
  }
  const order = { value: (a, b) => b.cents - a.cents, name: (a, b) => a.name.localeCompare(b.name, "pt-BR"), low: (a, b) => a.cents - b.cents }[sort];
  if (order) rows.sort((a, b) => order(a, b) || cfg.types.findIndex((t) => t.id === a.id) - cfg.types.findIndex((t) => t.id === b.id));
  const cal = monthCalendar(state, month, ref);
  return {
    month,
    income,
    spent,
    total,
    rows,
    goalsSet: Object.keys(cfg.goals).length > 0,
    goalSum: Object.values(cfg.goals).reduce((a, b) => a + b, 0),
    balance: totalBalance(state),
    forecast: cal.endBalance,
    isEmpty: total === 0,
  };
}

// ---------- Edição ----------

const patch = (state, f) => ({ ...state, settings: { ...state.settings, spendTypes: f(state.settings?.spendTypes || {}) } });

export function setCategoryType(state, category, typeId) {
  if (!category) throw Error("Escolha a categoria.");
  const cfg = spendTypeConfig(state);
  if (!cfg.types.some((t) => t.id === typeId && !t.saved)) throw Error("Tipo inválido.");
  return patch(state, (c) => ({ ...c, byCategory: { ...(c.byCategory || {}), [category]: typeId } }));
}

// Meta por tipo em % da renda (0 a 100). Vazio tira a meta daquele tipo.
export function setTypeGoal(state, typeId, percent) {
  const cfg = spendTypeConfig(state);
  if (!cfg.types.some((t) => t.id === typeId)) throw Error("Tipo inválido.");
  const goals = { ...(state.settings?.spendTypes?.goals || {}) };
  if (percent === "" || percent === null || percent === undefined) delete goals[typeId];
  else {
    const n = Number(String(percent).replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 100) throw Error("A meta vai de 0% a 100% da renda.");
    goals[typeId] = Math.round(n * 10) / 10;
  }
  return patch(state, (c) => ({ ...c, goals, model: "" }));
}

export function applyModel(state, modelId) {
  const m = SPEND_MODELS.find((x) => x.id === modelId);
  if (!m) throw Error("Modelo não encontrado.");
  return patch(state, (c) => ({ ...c, goals: { ...m.goals }, model: m.id }));
}

export function clearGoals(state) {
  return patch(state, (c) => ({ ...c, goals: {}, model: "" }));
}

export function addCustomType(state, { name, color = "#94A3B8" } = {}) {
  const n = String(name || "").trim();
  if (!n || n.length > 30) throw Error("Dê um nome de até 30 caracteres.");
  const cfg = spendTypeConfig(state);
  if (cfg.types.some((t) => t.name.toLocaleLowerCase("pt-BR") === n.toLocaleLowerCase("pt-BR"))) throw Error("Esse tipo já existe.");
  if (cfg.types.length >= 8) throw Error("Use até 8 tipos.");
  const id = "t" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  return patch(state, (c) => ({ ...c, custom: [...(c.custom || []), { id, name: n, color, icon: "other" }] }));
}

// Remove um tipo da pessoa; as categorias e lançamentos dele voltam ao tipo padrão.
export function removeCustomType(state, typeId) {
  const cfg = spendTypeConfig(state);
  if (!cfg.types.some((t) => t.id === typeId && t.custom)) throw Error("Só tipos criados por você podem ser removidos.");
  const next = patch(state, (c) => ({
    ...c,
    custom: (c.custom || []).filter((t) => t.id !== typeId),
    byCategory: Object.fromEntries(Object.entries(c.byCategory || {}).filter(([, id]) => id !== typeId)),
    goals: Object.fromEntries(Object.entries(c.goals || {}).filter(([id]) => id !== typeId)),
  }));
  return { ...next, transactions: next.transactions.map((t) => (t.spendType === typeId ? (({ spendType, ...rest }) => rest)(t) : t)) };
}
