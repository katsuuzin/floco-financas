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
  const own = (state.categoryLooks || {})[name] || {};
  const parent = (state.customCategories || []).find((c) => c.name === name)?.parent;
  return {
    icon: own.icon || DEFAULT_ICONS[name] || (parent && (state.categoryLooks || {})[parent]?.icon) || DEFAULT_ICONS[parent] || "tag",
    color: own.color || colorFor(name),
  };
}

export function setCategoryLook(state, name, look) {
  if (!name) throw Error("Categoria inválida.");
  if (look.icon && !ICONS.includes(look.icon)) throw Error("Ícone inválido.");
  if (look.color && !PALETTE.includes(look.color)) throw Error("Cor inválida.");
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
