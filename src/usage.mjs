// Contador de toques local: só no aparelho, sem rede, fora do backup e do banco financeiro.
// Conta quantas vezes cada tela ou aba foi aberta, para decidir o que esconder.
export const USAGE_KEY = "floco.usage.v1";

export const emptyUsage = (now = new Date()) => ({
  enabled: true,
  since: now.toISOString().slice(0, 10),
  counts: {},
});

const TAB_LABELS = { home: "Início", transactions: "Transações", analysis: "Análise", more: "Mais" };
const ROUTE_LABELS = {
  accounts: "Contas",
  cards: "Cartões de crédito",
  budgets: "Orçamento",
  goals: "Metas e caixinhas",
  settings: "Configurações",
  recurrences: "Recorrências",
  installments: "Parcelamentos",
  reports: "Relatórios",
  projections: "Projeções",
  rules: "Regras",
  reminders: "Lembretes",
  assistant: "Assistente",
  layout: "Personalizar",
  preferences: "Preferências",
  reconcile: "Conciliação",
  payables: "Entre pessoas › Eu devo",
  people: "Entre pessoas",
  debts: "Dívidas e contratos",
  dataTools: "Importar e exportar",
  imports: "Importar arquivo",
  receipt: "Foto ou comprovante",
  notifications: "Notificações bancárias",
  security: "Segurança",
  updates: "Atualizações",
  trash: "Lixeira",
  shopping: "Listas de compras",
  shoppingList: "Lista de compras",
  shoppingTrip: "Modo compra",
  scanProduct: "Escanear produto",
  scanNota: "Escanear nota",
  nfceConsulta: "Consulta da nota",
  purchases: "Histórico de compras",
  purchaseDetail: "Detalhe da compra",
  productDetail: "Detalhe do produto",
  usage: "Uso dos botões",
};
const FORM_LABELS = { transaction: "Lançar", card: "Despesa no cartão", account: "Nova conta" };

// Chave estável de uma aba ou rota. Não guarda dados do usuário (só nomes de tela).
export function usageKey(target) {
  if (!target) return "";
  if (typeof target === "string") return `tab:${target}`;
  const r = target;
  if (r.name === "form") return `form:${r.kind || ""}`;
  if (r.name === "contracts") return `contracts:${r.type || ""}`;
  if (r.name === "tool") return `tool:${r.id || ""}`;
  if (r.name === "report") return `report:${r.id || ""}`;
  return `route:${r.name}`;
}

export function usageLabel(key) {
  const [kind, rest = ""] = String(key).split(":");
  if (kind === "tab") return TAB_LABELS[rest] || rest;
  if (kind === "route") return ROUTE_LABELS[rest] || rest;
  if (kind === "form") return FORM_LABELS[rest] || `Formulário ${rest}`;
  if (kind === "contracts") return rest === "loan" ? "Empréstimos" : "Financiamentos";
  if (kind === "tool") return ({
    receivables: "Entre pessoas › Me devem",
    categories: "Categorias e tags",
    tags: "Categorias e tags",
    reports: "Relatório personalizado",
  })[rest] || "Ferramenta";
  if (kind === "report") return `Relatório ${rest}`;
  return key;
}

export function normalizeUsage(raw, now = new Date()) {
  const base = emptyUsage(now);
  if (!raw || typeof raw !== "object") return base;
  const counts = {};
  for (const [k, v] of Object.entries(raw.counts && typeof raw.counts === "object" ? raw.counts : {})) {
    if (typeof k === "string" && k.length <= 60 && Number.isFinite(v) && v > 0) counts[k] = Math.floor(v);
  }
  return {
    enabled: raw.enabled !== false,
    since: typeof raw.since === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.since) ? raw.since : base.since,
    counts,
  };
}

export function recordUse(usage, key) {
  if (!key || !usage.enabled) return usage;
  return { ...usage, counts: { ...usage.counts, [key]: (usage.counts[key] || 0) + 1 } };
}

export const resetUsage = (usage, now = new Date()) => ({ ...emptyUsage(now), enabled: usage.enabled });

export function rankedUsage(usage) {
  return Object.entries(usage.counts)
    .map(([key, count]) => ({ key, label: usageLabel(key), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
}

// Texto para o dono devolver o resultado (copiar ou compartilhar).
export function usageReport(usage) {
  const rows = rankedUsage(usage);
  const total = rows.reduce((s, r) => s + r.count, 0);
  return [
    `Uso dos botões desde ${usage.since} (${total} aberturas)`,
    ...rows.map((r) => `${r.count}\t${r.label}`),
  ].join("\n");
}
