// Categorização automática (F7) e conferência de fatura (F2).
import { uid, invoice } from "./finance.mjs";

export const normalizeText = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9*| ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Padrão: `*` é coringa e `|` separa alternativas. Sem `*`, casa por palavra contida.
// Acentos e pontuação são ignorados nos dois lados.
export function compilePattern(pattern) {
  const alts = String(pattern)
    .split("|")
    .map((p) => normalizeText(p.replace(/\|/g, "")))
    .filter(Boolean);
  if (!alts.length) throw Error("Informe um padrão.");
  const parts = alts.map((a) => {
    const body = a
      .split("*")
      .map((x) => x.trim().replace(/[.+?^${}()[\]\\]/g, "\\$&"))
      .join(".*");
    return a.includes("*") ? (a.startsWith("*") ? body : "\\b" + body) : "\\b" + body + "\\b";
  });
  return new RegExp(parts.join("|"));
}

export function matchRule(rule, description, type = "expense") {
  if (rule.active === false || (rule.type && rule.type !== type)) return false;
  try {
    return compilePattern(rule.pattern).test(normalizeText(description));
  } catch {
    return false;
  }
}

// Regra vencedora: maior prioridade; em empate, padrão mais longo (mais específico).
export function categorize(s, description, type = "expense") {
  const hits = (s.rules || []).filter((r) => matchRule(r, description, type));
  hits.sort((a, b) => (b.priority || 0) - (a.priority || 0) || b.pattern.length - a.pattern.length);
  return hits[0] || null;
}

export function saveRule(s, input) {
  const pattern = String(input.pattern || "").trim();
  if (!pattern || pattern.length > 200) throw Error("Informe um padrão de até 200 caracteres.");
  compilePattern(pattern);
  if (!input.category) throw Error("Escolha a categoria.");
  const priority = Number(input.priority ?? 10);
  if (!Number.isInteger(priority) || priority < 0 || priority > 100) throw Error("Prioridade de 0 a 100.");
  const row = {
    id: input.id || uid(),
    pattern,
    type: input.type === "income" ? "income" : "expense",
    category: input.category,
    ...(input.subcategory ? { subcategory: input.subcategory } : {}),
    priority,
    active: input.active !== false,
  };
  const rules = s.rules || [];
  return { ...s, rules: input.id ? rules.map((r) => (r.id === input.id ? row : r)) : [...rules, row] };
}

// Prévia: lançamentos antigos cuja categoria mudaria. Escopo: "all" ou "uncategorized" (Outros).
export function previewRules(s, scope = "all") {
  const out = [];
  for (const t of s.transactions) {
    if (t.type === "transfer" || t.invoicePayment || t.financingId || t.loanSettlement || t.categoryLocked) continue;
    if (scope === "uncategorized" && t.category !== "Outros") continue;
    const r = categorize(s, t.description, t.type);
    if (r && (r.category !== t.category || (r.subcategory || "") !== (t.subcategory || ""))) out.push({ id: t.id, description: t.description, from: t.category, to: r.category, toSub: r.subcategory || "" });
  }
  return out;
}

export function applyRules(s, ids) {
  const want = new Map(previewRules(s).map((p) => [p.id, { category: p.to, sub: p.toSub }]));
  const only = ids ? new Set(ids) : null;
  return {
    ...s,
    transactions: s.transactions.map((t) => (want.has(t.id) && (!only || only.has(t.id)) ? { ...t, category: want.get(t.id).category, ...(want.get(t.id).sub ? { subcategory: want.get(t.id).sub } : { subcategory: undefined }) } : t)),
  };
}

// Regras iniciais. [padrão, categoria, subcategoria, tipo]. Padrões de comerciantes comuns no Brasil.
export const DEFAULT_RULES = [
  ["UBER*|99*|99 POP*|CABIFY*", "Transporte", "Uber / 99"],
  ["SHELL*|IPIRANGA*|POSTO*|BR MANIA*|PETROBRAS*", "Transporte", "Combustível"],
  ["ESTAPAR*|SEM PARAR*|CONECTCAR*|VELOE*|PEDAGIO*", "Transporte", "Estacionamento / Pedágio"],
  ["METRO*|CPTM*|BILHETE UNICO*|TOP*SPTRANS*", "Transporte", "Transporte Público"],
  ["IFOOD*|IFD*|RAPPI*|ZE DELIVERY*|AIQFOME*", "Alimentação", "Delivery"],
  ["MCDONALDS*|BURGER KING*|BK *|SUBWAY*|OUTBACK*|STARBUCKS*", "Alimentação", "Restaurante"],
  ["PADARIA*|PANIFICADORA*|RESTAURANTE*|LANCHONETE*", "Alimentação", "Restaurante"],
  ["MERCADO*|SUPERMERCADO*|CARREFOUR*|ASSAI*|ATACADAO*|EXTRA*|PAO DE ACUCAR*|DIA *|SONDA*|GUANABARA*|ZAFFARI*|SAVEGNAGO*", "Alimentação", "Supermercado"],
  ["HORTIFRUTI*|SACOLAO*|ACOUGUE*|EMPORIO*", "Alimentação", "Supermercado"],
  ["NETFLIX*|SPOTIFY*|DISNEY*|HBO*|MAX*|PRIME VIDEO*|AMAZON PRIME*|GLOBOPLAY*|DEEZER*|YOUTUBE*|PARAMOUNT*|CRUNCHYROLL*", "Assinaturas", "Streaming"],
  ["GOOGLE*STORAGE|GOOGLE ONE*|ICLOUD*|APPLE.COM*|MICROSOFT*365*|DROPBOX*", "Assinaturas", "Apps / Softwares"],
  ["CHATGPT*|OPENAI*|CLAUDE*|ANTHROPIC*", "Assinaturas", "Assinaturas de IA"],
  ["DROGASIL*|DROGA RAIA*|RAIA*|DROGARIA*|FARMACIA*|PAGUE MENOS*|PANVEL*|PACHECO*", "Saúde", "Medicamentos"],
  ["UNIMED*|AMIL*|BRADESCO SAUDE*|SULAMERICA*|HAPVIDA*", "Saúde", "Plano de Saúde"],
  ["LABORATORIO*|CLINICA*|ODONTO*", "Saúde", "Consultas / Exames"],
  ["SMART FIT*|BLUEFIT*|ACADEMIA*|GYMPASS*|WELLHUB*|TOTALPASS*", "Saúde"],
  ["ENEL*|LIGHT *|CEMIG*|COPEL*|CPFL*|ELETROPAULO*|EQUATORIAL*|ENERGISA*|CELESC*", "Moradia", "Energia / Água / Gás"],
  ["SABESP*|CEDAE*|COPASA*|SANEPAR*|EMBASA*|COMPESA*|CORSAN*", "Moradia", "Energia / Água / Gás"],
  ["COMGAS*|NATURGY*|ULTRAGAZ*|LIQUIGAS*|SUPERGASBRAS*", "Moradia", "Energia / Água / Gás"],
  ["VIVO*|CLARO*|TIM *|OI *|NET *|SKY *", "Serviços", "Telefonia / TV"],
  ["ALUGUEL*|QUINTOANDAR*", "Moradia", "Aluguel"],
  ["CONDOMINIO*", "Moradia", "Condomínio"],
  ["IPTU*", "Impostos e Taxas", "IPTU"],
  ["CINEMA*|CINEMARK*|INGRESSO*|SYMPLA*|EVENTIM*", "Lazer", "Cinema / Eventos"],
  ["STEAM*|PLAYSTATION*|XBOX*|NINTENDO*", "Lazer", "Hobbies"],
  ["BOOKING*|AIRBNB*|DECOLAR*|LATAM*|GOL *|AZUL *|HOTEL*", "Lazer", "Viagens"],
  ["ESCOLA*|COLEGIO*|FACULDADE*|UNIVERSIDADE*", "Educação", "Escola / Faculdade"],
  ["CURSO*|UDEMY*|ALURA*|DUOLINGO*", "Educação", "Cursos Online"],
  ["SALARIO*|PAGTO SALARIO*|FOLHA*|PROVENTOS*", "Salário", "", "income"],
];

export function seedRules(s) {
  if ((s.rules || []).length) return s;
  return {
    ...s,
    rules: DEFAULT_RULES.map(([pattern, category, subcategory, type]) => ({
      id: uid(),
      pattern,
      category,
      ...(subcategory ? { subcategory } : {}),
      type: type || "expense",
      priority: 10,
      active: true,
      builtIn: true,
    })),
  };
}

// Regras sugeridas antigas (sem subcategoria) ganham a subcategoria nova, uma única vez e só
// se o usuário não mexeu na categoria. "Mercado" vira Alimentação › Supermercado; o
// provedor de telefonia que era "Moradia" vira Serviços › Telefonia / TV.
const OLD_CATEGORY_OF = { "Alimentação|Supermercado": "Mercado", "Serviços|Telefonia / TV": "Moradia" };
export function upgradeBuiltInRules(s) {
  let changed = false;
  const rules = (s.rules || []).map((r) => {
    if (!r.builtIn || r.subcategory) return r;
    const d = DEFAULT_RULES.find(([pattern]) => pattern === r.pattern);
    if (!d || !d[2]) return r;
    const old = OLD_CATEGORY_OF[d[1] + "|" + d[2]] || d[1];
    if (r.category !== old) return r;
    changed = true;
    return { ...r, category: d[1], subcategory: d[2] };
  });
  return changed ? { ...s, rules } : s;
}

// ---------- Conferência de fatura (F2) ----------
// rows: linhas lidas do arquivo do banco ({date, description, amount, type}).
// Casa cada linha com uma compra lançada no mesmo valor e com data próxima (±3 dias).
export function reconcileInvoice(s, cardId, month, rows) {
  const purchases = invoice(s, cardId, month).purchases.map((t) => ({ ...t }));
  const used = new Set();
  const matched = [],
    missing = [],
    divergent = [];
  const days = (a, b) => Math.abs((new Date(a + "T12:00:00") - new Date(b + "T12:00:00")) / 86400000);
  for (const r of rows.filter((x) => !x.error && x.type !== "income")) {
    const exact = purchases.find((t) => !used.has(t.id) && t.amount === r.amount && days(t.date, r.date) <= 3);
    if (exact) {
      used.add(exact.id);
      matched.push({ row: r, tx: exact });
      continue;
    }
    const near = purchases.find(
      (t) => !used.has(t.id) && days(t.date, r.date) <= 1 && normalizeText(t.description).split(" ")[0] === normalizeText(r.description).split(" ")[0],
    );
    if (near) {
      used.add(near.id);
      divergent.push({ row: r, tx: near, diff: r.amount - near.amount });
    } else missing.push(r);
  }
  const extra = purchases.filter((t) => !used.has(t.id));
  const fileTotal = rows.filter((x) => !x.error && x.type !== "income").reduce((n, x) => n + x.amount, 0);
  const appTotal = purchases.reduce((n, t) => n + t.amount, 0);
  return { matched, missing, divergent, extra, fileTotal, appTotal, diff: fileTotal - appTotal };
}
