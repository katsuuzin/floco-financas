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
    if (r && r.category !== t.category) out.push({ id: t.id, description: t.description, from: t.category, to: r.category });
  }
  return out;
}

export function applyRules(s, ids) {
  const want = new Map(previewRules(s).map((p) => [p.id, p.to]));
  const only = ids ? new Set(ids) : null;
  return {
    ...s,
    transactions: s.transactions.map((t) => (want.has(t.id) && (!only || only.has(t.id)) ? { ...t, category: want.get(t.id) } : t)),
  };
}

// Regras iniciais (categorias do Floco). Padrões de comerciantes comuns no Brasil.
export const DEFAULT_RULES = [
  ["UBER*|99*|99 POP*|CABIFY*", "Transporte"],
  ["SHELL*|IPIRANGA*|POSTO*|BR MANIA*|PETROBRAS*", "Transporte"],
  ["ESTAPAR*|SEM PARAR*|CONECTCAR*|VELOE*|PEDAGIO*", "Transporte"],
  ["METRO*|CPTM*|BILHETE UNICO*|TOP*SPTRANS*", "Transporte"],
  ["IFOOD*|IFD*|RAPPI*|ZE DELIVERY*|AIQFOME*", "Alimentação"],
  ["MCDONALDS*|BURGER KING*|BK *|SUBWAY*|OUTBACK*|STARBUCKS*", "Alimentação"],
  ["PADARIA*|PANIFICADORA*|RESTAURANTE*|LANCHONETE*", "Alimentação"],
  ["MERCADO*|SUPERMERCADO*|CARREFOUR*|ASSAI*|ATACADAO*|EXTRA*|PAO DE ACUCAR*|DIA *|SONDA*|GUANABARA*|ZAFFARI*|SAVEGNAGO*", "Mercado"],
  ["HORTIFRUTI*|SACOLAO*|ACOUGUE*|EMPORIO*", "Mercado"],
  ["NETFLIX*|SPOTIFY*|DISNEY*|HBO*|MAX*|PRIME VIDEO*|AMAZON PRIME*|GLOBOPLAY*|DEEZER*|YOUTUBE*|PARAMOUNT*|CRUNCHYROLL*", "Assinaturas"],
  ["GOOGLE*STORAGE|GOOGLE ONE*|ICLOUD*|APPLE.COM*|MICROSOFT*365*|DROPBOX*|CHATGPT*|OPENAI*", "Assinaturas"],
  ["DROGASIL*|DROGA RAIA*|RAIA*|DROGARIA*|FARMACIA*|PAGUE MENOS*|PANVEL*|PACHECO*", "Saúde"],
  ["UNIMED*|AMIL*|BRADESCO SAUDE*|SULAMERICA*|HAPVIDA*|LABORATORIO*|CLINICA*|ODONTO*", "Saúde"],
  ["SMART FIT*|BLUEFIT*|ACADEMIA*|GYMPASS*|WELLHUB*|TOTALPASS*", "Saúde"],
  ["ENEL*|LIGHT *|CEMIG*|COPEL*|CPFL*|ELETROPAULO*|EQUATORIAL*|ENERGISA*|CELESC*", "Moradia"],
  ["SABESP*|CEDAE*|COPASA*|SANEPAR*|EMBASA*|COMPESA*|CORSAN*", "Moradia"],
  ["COMGAS*|NATURGY*|ULTRAGAZ*|LIQUIGAS*|SUPERGASBRAS*", "Moradia"],
  ["VIVO*|CLARO*|TIM *|OI *|NET *|SKY *", "Moradia"],
  ["ALUGUEL*|CONDOMINIO*|IPTU*|QUINTOANDAR*", "Moradia"],
  ["CINEMA*|CINEMARK*|INGRESSO*|SYMPLA*|EVENTIM*|STEAM*|PLAYSTATION*|XBOX*|NINTENDO*", "Lazer"],
  ["BOOKING*|AIRBNB*|DECOLAR*|LATAM*|GOL *|AZUL *|HOTEL*", "Lazer"],
  ["ESCOLA*|COLEGIO*|FACULDADE*|UNIVERSIDADE*|CURSO*|UDEMY*|ALURA*|DUOLINGO*", "Educação"],
  ["SALARIO*|PAGTO SALARIO*|FOLHA*|PROVENTOS*", "Salário", "income"],
];

export function seedRules(s) {
  if ((s.rules || []).length) return s;
  return {
    ...s,
    rules: DEFAULT_RULES.map(([pattern, category, type]) => ({
      id: uid(),
      pattern,
      category,
      type: type || "expense",
      priority: 10,
      active: true,
      builtIn: true,
    })),
  };
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
