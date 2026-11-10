import { CALEN_COLORS, hasCalenIcon } from "./calenArt.mjs";

// O4/O5: ícone e cor de categorias (por nome, inclusive as padrão) e cor de tags.
// As escolhas ficam em `categoryLooks` ({ [nome]: { icon, color } }) e em `tag.color`.

// Cores legíveis nos temas claro e escuro (texto escuro ou claro por cima).
export const PALETTE = ["#FFCB45", "#FF8A8A", "#8FD9A0", "#7FB3FF", "#C9A0FF", "#FFB074", "#5FD4C8", "#F28DC0", "#B8C26A", "#A3A3A8"];

// Ícones Feather oferecidos na escolha.
export const ICONS = [
  "coffee", "shopping-cart", "truck", "home", "heart", "film", "repeat", "book", "briefcase", "tag",
  "gift", "smartphone", "zap", "droplet", "wifi", "music", "map-pin", "navigation", "umbrella", "tool",
  "scissors", "shopping-bag", "dollar-sign", "trending-up", "users", "award", "monitor", "feather", "sun", "anchor",
];

// Arte das categorias padrão, a mesma do Calen: [ícone desenhado do Calen, cor]. Veja
// src/calenArt.mjs (161 ícones de três tons). Cores do Calen, sem a família roxa.
export const CATEGORY_ART = {
  "Moradia": ["home", CALEN_COLORS.sapphire],
  "Alimentação": ["food", CALEN_COLORS.green],
  "Transporte": ["transport", CALEN_COLORS.blue],
  "Saúde": ["health", CALEN_COLORS.teal],
  "Educação": ["education", CALEN_COLORS.yellow],
  "Lazer": ["entertainment", CALEN_COLORS.rose],
  "Vestuário": ["clothes", CALEN_COLORS.cherry],
  "Cuidados Pessoais": ["personal_care", CALEN_COLORS.salmon],
  "Assinaturas": ["subscriptions", CALEN_COLORS.cyan],
  "Serviços": ["services", CALEN_COLORS.amber],
  "Filhos / Dependentes": ["family", CALEN_COLORS.orange],
  "Pets": ["pet", CALEN_COLORS.coral],
  "Impostos e Taxas": ["tax", CALEN_COLORS.red],
  "Seguros": ["insurance", CALEN_COLORS.sky],
  "Presentes e Doações": ["gift", CALEN_COLORS.terracotta],
  "Outros": ["other", CALEN_COLORS.red],
  "Salário": ["salary", CALEN_COLORS.green],
  "Freelance / Autônomo": ["freelance", CALEN_COLORS.forest],
  "Investimentos": ["investments", CALEN_COLORS.emerald],
  "Renda Extra": ["cashback", CALEN_COLORS.gold],
  "Aluguéis": ["rent", CALEN_COLORS.ocean],
  "Mercado": ["grocery", CALEN_COLORS.indigo],
};

// Escolha de ícone do Calen é guardada como "calen:nome" (os nomes do Feather ficam como antes).
export const CALEN_PREFIX = "calen:";
export const isCalenChoice = (v) => typeof v === "string" && v.startsWith(CALEN_PREFIX);

// Cores oferecidas ao escolher a cor de uma categoria (as do Calen).
export const CATEGORY_COLORS = Object.values(CALEN_COLORS);

// Cor do ícone sobre um fundo: escuro em fundos claros, branco nos demais.
export function onColor(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "#311E0D";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 165 ? "#311E0D" : "#FFFFFF";
}

const DEFAULT_ICONS = {
  Alimentação: "coffee",
  Mercado: "shopping-cart",
  Transporte: "truck",
  Moradia: "home",
  Saúde: "heart",
  Lazer: "film",
  Assinaturas: "repeat",
  Educação: "book",
  Salário: "briefcase",
  Outros: "tag",
  Vestuário: "shopping-bag",
  "Cuidados Pessoais": "scissors",
  Serviços: "wifi",
  "Filhos / Dependentes": "users",
  Pets: "heart",
  "Impostos e Taxas": "dollar-sign",
  Seguros: "umbrella",
  "Presentes e Doações": "gift",
  "Freelance / Autônomo": "monitor",
  Investimentos: "trending-up",
  "Renda Extra": "dollar-sign",
  Aluguéis: "home",
};

const DEFAULT_COLORS = {
  Alimentação: "#FFB074",
  Mercado: "#7FB3FF",
  Transporte: "#5FD4C8",
  Moradia: "#C9A0FF",
  Saúde: "#F28DC0",
  Lazer: "#FFCB45",
  Assinaturas: "#B8C26A",
  Educação: "#7FB3FF",
  Salário: "#8FD9A0",
  Outros: "#A3A3A8",
  Vestuário: "#5FD4C8",
  "Cuidados Pessoais": "#F28DC0",
  Serviços: "#C9A0FF",
  "Filhos / Dependentes": "#FFB074",
  Pets: "#B8C26A",
  "Impostos e Taxas": "#A3A3A8",
  Seguros: "#7FB3FF",
  "Presentes e Doações": "#F28DC0",
  "Freelance / Autônomo": "#5FD4C8",
  Investimentos: "#8FD9A0",
  "Renda Extra": "#FFCB45",
  Aluguéis: "#7FB3FF",
};

// Cor estável a partir do nome, para quem ainda não escolheu. O vermelho fica de fora
// (lembra despesa); continua disponível na escolha manual.
const AUTO = PALETTE.filter((p) => p !== "#FF8A8A");
export function colorFor(name) {
  if (DEFAULT_COLORS[name]) return DEFAULT_COLORS[name];
  let h = 0;
  for (const ch of String(name || "")) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return AUTO[h % AUTO.length];
}

export function lookOf(state, name) {
  const looks = state.categoryLooks || {};
  const own = looks[name] || {};
  const parent = (state.customCategories || []).find((c) => c.name === name)?.parent;
  const ownOrParent = own.icon || (parent && looks[parent]?.icon) || "";
  const chosen = isCalenChoice(ownOrParent) ? ownOrParent.slice(CALEN_PREFIX.length) : "";
  const art = CATEGORY_ART[name] || (parent ? CATEGORY_ART[parent] : undefined);
  return {
    icon: (!chosen && ownOrParent) || DEFAULT_ICONS[name] || DEFAULT_ICONS[parent] || "tag",
    color: own.color || CATEGORY_ART[name]?.[1] || (parent && looks[parent]?.color) || (parent && CATEGORY_ART[parent]?.[1]) || colorFor(name),
    // Ícone do Calen: o escolhido pela pessoa ou o da categoria padrão. Escolha antiga em
    // Feather mantém o Feather.
    image: chosen || (ownOrParent ? "" : art?.[0] || ""),
  };
}

export function setCategoryLook(state, name, look) {
  if (!name) throw Error("Categoria inválida.");
  if (look.icon && !ICONS.includes(look.icon) && !(isCalenChoice(look.icon) && hasCalenIcon(look.icon.slice(CALEN_PREFIX.length)))) throw Error("Ícone inválido.");
  if (look.color && !PALETTE.includes(look.color) && !CATEGORY_COLORS.includes(look.color)) throw Error("Cor inválida.");
  const prev = (state.categoryLooks || {})[name] || {};
  return { ...state, categoryLooks: { ...(state.categoryLooks || {}), [name]: { ...prev, ...look } } };
}

export function renameLook(state, from, to) {
  const looks = state.categoryLooks || {};
  if (!looks[from] || from === to) return state;
  const { [from]: moved, ...rest } = looks;
  return { ...state, categoryLooks: { ...rest, [to]: moved } };
}

export function setTagColor(state, id, color) {
  if (color && !PALETTE.includes(color)) throw Error("Cor inválida.");
  if (!(state.tags || []).some((t) => t.id === id)) throw Error("Tag não encontrada.");
  return { ...state, tags: state.tags.map((t) => (t.id === id ? { ...t, color } : t)) };
}

export const tagColor = (tag) => tag?.color || colorFor(tag?.name);
