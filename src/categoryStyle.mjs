import { categoryLabel } from "./categories.mjs";
import { normalizeSearchText } from "./shoppingSearch.mjs";

export const ALLOWED_ICONS = Object.freeze(["tag", "shopping-cart", "shopping-bag", "credit-card", "dollar-sign",
  "trending-up", "briefcase", "grid", "bookmark", "clipboard", "target", "shuffle", "shield", "zap", "file-text", "check-circle"]);
export const ALLOWED_COLORS = Object.freeze(["#FBB202", "#FFCB45", "#311E0D", "#FFB074", "#7FB3FF", "#C9A0FF",
  "#F28DC0", "#5FD4C8", "#8FD9A0", "#B53846", "#2E2E33", "#FFFFFF"]);

const foreground = "#311E0D";
const white = "#FFFFFF";
const fallback = Object.freeze({ icon: "tag", color: "#FFCB45" });
const icons = new Set(ALLOWED_ICONS);
const colors = new Set(ALLOWED_COLORS);
const own = (object, key) => object && typeof object === "object" && Object.hasOwn(object, key) ? object[key] : undefined;
const colorOf = (color) => typeof color === "string" ? color.toUpperCase() : "";
const luminance = (color) => [1, 3, 5].map((start) => Number.parseInt(color.slice(start, start + 2), 16) / 255)
  .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const darkLuminance = luminance(foreground);

export function sanitizeStyle(raw) {
  const icon = own(raw, "icon");
  const color = colorOf(own(raw, "color"));
  return { icon: icons.has(icon) ? icon : fallback.icon, color: colors.has(color) ? color : fallback.color };
}

export function readableOn(color) {
  const normalized = colorOf(color);
  const background = luminance(colors.has(normalized) ? normalized : fallback.color);
  return ratio(darkLuminance, background) >= 4.5 ? foreground : white;
}

const suggestions = [
  [/\b(?:mercado|supermercado|alimentacao|comida|feira)\b/u, "shopping-cart", "#FBB202"],
  [/\b(?:transporte|combustivel|estacionamento)\b/u, "shuffle", "#7FB3FF"],
  [/\b(?:moradia|casa|aluguel)\b/u, "grid", "#FFB074"],
  [/\b(?:saude|medicamentos|farmacia)\b/u, "check-circle", "#F28DC0"],
  [/\b(?:educacao|escola|livros)\b/u, "bookmark", "#C9A0FF"],
  [/\b(?:salario|trabalho|freelance)\b/u, "briefcase", "#8FD9A0"],
  [/\b(?:investimentos|rendimento)\b/u, "trending-up", "#5FD4C8"],
  [/\b(?:assinaturas|cartao)\b/u, "credit-card", "#311E0D"],
  [/\b(?:seguros|protecao)\b/u, "shield", "#2E2E33"],
];

export function defaultStyleFor(name) {
  const key = normalizeSearchText(categoryLabel(typeof name === "string" ? name : ""));
  const match = suggestions.find(([pattern]) => pattern.test(key));
  return match ? { icon: match[1], color: match[2] } : { ...fallback };
}

export function withStyle(category, style) {
  const source = category && typeof category === "object" && !Array.isArray(category) ? category : {};
  return { ...source, style: style === undefined && !own(source, "style")
    ? defaultStyleFor(own(source, "name")) : sanitizeStyle(style ?? own(source, "style")) };
}
