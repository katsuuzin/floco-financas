import { MAX_ITEMS, parseItemText } from "./shopping.mjs";

const marker = /^\s*(?:(?:[-–—](?!\d)|[•*▪◦]|\d+[.)](?!\d))\s*|\[[ xX]\]\s*)+/;
const heading = /^(?:lista de compras|ingredientes?(?: da receita)?|compras|hortifr[uú]ti|carnes e peixes|frios e latic[ií]nios|padaria|mercearia|bebidas|congelados|limpeza|higiene|pet|outros)$/i;
const preparationHeading = /^(?:modo de preparo|preparo|instruções)(?:\s*:.*)?$/i;
const shoppingHeading = /^(?:lista de compras|ingredientes?(?: da receita)?|compras)$/i;
// Evita quebrar nomes compostos frequentes. Sem contexto, os demais "e" separam itens.
const compound = /^(?:(?:p[aã]es?|biscoitos?|bolachas?|cookies?|salgadinhos?)\s+(?:de\s+)?[\p{L}]+|queijo|presunto|macarr[aã]o)\s+e\s+(?:sal|ervas(?:\s+finas)?|queijo|presunto|tomate|cebola|chocolate)(?=$|\s|[,;])/iu;
const units = { quilo: "kg", quilos: "kg", quilograma: "kg", quilogramas: "kg", grama: "g", gramas: "g", litro: "l", litros: "l", mililitro: "ml", mililitros: "ml" };

function normalizeQuantity(text) {
  return text
    .replace(/^(uma|um|meia|\d+)\s+d[uú]zias?\s+(?:de\s+)?(?=\S)/i, (_, count) =>
      (count.toLowerCase() === "meia" ? 6 : /^um/i.test(count) ? 12 : Number(count) * 12) + " ")
    .replace(/^(\d+(?:[,.]\d+)?)\s*(quilogramas?|quilos?|gramas?|litros?|mililitros?)\b/i,
      (_, n, unit) => n + " " + units[unit.toLowerCase()])
    .replace(/^(\d+)\s*[x×]\s*(?=\p{L})/iu, "$1x ")
    .replace(/^(\d+)\s+(?:(?:un\.?|unid\.?|unidades?)\s+)(?:de\s+)?(?=\S)/i, "$1 ");
}

function splitItems(line) {
  // Vírgula entre dígitos é decimal. Parênteses preservam observações do item.
  const parts = [];
  let start = 0;
  let depth = 0;
  let compoundUntil = 0;
  for (let i = 0; i < line.length; i++) {
    if (i === start) {
      const rest = line.slice(start);
      const content = rest.replace(/^\s*(?:\d+\s*(?:[x×]\s*)?)?/i, "");
      const match = content.match(compound);
      compoundUntil = match ? start + rest.length - content.length + match[0].length : start;
    }
    const ch = line[i];
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth) continue;
    const decimal = ch === "," && /\d/.test(line[i - 1] ?? "") && /\d/.test(line[i + 1] ?? "");
    const conjunction = i >= compoundUntil && /[eE]/.test(ch) &&
      /\s/.test(line[i - 1] ?? "") && /\s/.test(line[i + 1] ?? "");
    if (ch === ";" || (ch === "," && !decimal) || conjunction) {
      parts.push(line.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(line.slice(start));
  return parts;
}

// Produz candidatos para prévia; linhas inválidas não impedem o restante da importação.
export function parsePastedList(text) {
  if (typeof text !== "string") return [];
  const items = [];
  let inPreparation = false;
  for (const raw of text.split(/\r\n?|\n/)) {
    let line = raw.replace(marker, "").trim().replace(/^#{1,6}\s+/, "");
    const colon = line.indexOf(":");
    const label = (colon < 0 ? line : line.slice(0, colon)).replace(/^\*+|\*+$/g, "").trim();
    if (preparationHeading.test(label)) {
      inPreparation = true;
      continue;
    }
    if (shoppingHeading.test(label)) inPreparation = false;
    if (inPreparation) continue;
    if (heading.test(label)) {
      if (colon < 0) continue;
      line = line.slice(colon + 1);
    }
    line = line.replace(/^\*+|\*+$/g, "").trim();
    if (!line || line.endsWith(":")) continue;
    for (const part of splitItems(line)) {
      const item = part.replace(marker, "").trim();
      if (!/\p{L}/u.test(item) || /^[-–—]\d|^0(?:[,.]0+)?\s/i.test(item)) continue;
      if (/^(?:uma|um|meia|\d+)\s+d[uú]zias?(?:\s+de)?$/i.test(item)) continue;
      try {
        const { name, qty, unit } = parseItemText(normalizeQuantity(item));
        items.push({ name, qty, unit });
        if (items.length >= MAX_ITEMS) return items;
      } catch {
        // O parser base já aplica os limites de nome e quantidade.
      }
    }
  }
  return items;
}
