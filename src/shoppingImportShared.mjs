import { categorize, MAX_NAME, parseItemText, SHOPPING_CATEGORIES } from "./shopping.mjs";
import { normalizeName } from "./shoppingPurchases.mjs";

const maxChars = 20000;
const maxLines = 2000;
const checkbox = /^([-•*]\s+|\d+[.)]\s+)?(\[\s?\]|\[[xX✓]\]|[☐☑☒✅✔])\s*/u;
const marker = /^(?:[-•*]\s+|\d+[.)]\s+)/u;
const title = /^(?:lista(?: (?:de compras|do mercado|do supermercado|da semana|do mês))?(?: vazia)?|compras(?: (?:da semana|do mês|do mercado))?|mercado|supermercado)(?:\s*[-–—]\s*[\d/.\- ]+)?\s*[.!:]?$/iu;
const date = /^(?:\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?|\d{4}-\d{2}-\d{2})$/u;
const invisible = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u061C\u200B\u200C\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/gu;
const appQuantity = /^\d+(?:[.,]\d+)?(?:x\s+|\s+(?:kg|g|ml|l)\s+de\s+)/iu;
const suffix = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(un|kg|g|ml|l)$/iu;

function readItem(body, fromApp) {
  if (fromApp && !appQuantity.test(body)) {
    if (body.length > MAX_NAME) throw Error("O nome deve ter até 80 letras.");
    return { qty: 1, unit: "", name: body };
  }
  if (fromApp) return { ...parseItemText(body), name: body.replace(appQuantity, "") };
  const trailing = !fromApp && suffix.exec(body);
  if (trailing) {
    const [, name, qty, rawUnit] = trailing;
    const unit = rawUnit.toLowerCase() === "un" ? "" : rawUnit.toLowerCase();
    return parseItemText(qty + (unit ? " " + unit + " de " : "x ") + name);
  }
  return parseItemText(body.replace(/^(\d+)x(?=\p{L})/u, "$1x "));
}

export function parseShared(text) {
  const items = [];
  const ignoredLines = [];
  const warnings = [];
  if (typeof text !== "string") return { items, ignoredLines, warnings };
  const capped = text.length > maxChars;
  if (capped) warnings.push("O texto ultrapassa 20.000 caracteres e foi cortado.");
  const lines = text.slice(0, maxChars).split(/\r\n?|\n/u);
  if (capped && !/[\r\n]/u.test(text[maxChars])) lines.pop();
  if (lines.length > maxLines) warnings.push("Somente as primeiras 2.000 linhas foram lidas.");
  const selected = lines.slice(0, maxLines);
  const fromApp = selected[0]?.replace(invisible, "").trim() === "Lista de compras" &&
    selected.some((line) => SHOPPING_CATEGORIES.includes(line.trim()));
  const found = new Map();
  let category = "";
  for (const line of selected) {
    const cleaned = line.replace(invisible, "").trim();
    if (!cleaned) continue;
    const checked = checkbox.exec(cleaned);
    const marked = checked || marker.exec(cleaned);
    const body = cleaned.slice(marked?.[0].length || 0).trim();
    const heading = body.replace(/^[^\p{L}\p{N}]+/u, "").replace(/:$/u, "").trim();
    const section = SHOPPING_CATEGORIES.find((name) => name.toLowerCase() === heading.toLowerCase());
    if (!marked && section) {
      category = section;
      ignoredLines.push(line);
      continue;
    }
    if (!/[\p{L}\p{N}]/u.test(body) || (!marked &&
        (title.test(heading.replace(/[^\p{L}\p{N}]+$/u, "")) || title.test(heading) || date.test(body) || /^(?:estimativa|data|total)\s*:/iu.test(heading) ||
          /^(?:segunda|terça|quarta|quinta|sexta|sábado|domingo)(?:-feira)?[,\s]+\d/iu.test(heading)))) {
      ignoredLines.push(line);
      continue;
    }
    let item;
    try {
      item = readItem(body, fromApp && !!marked);
    } catch {
      ignoredLines.push(line);
      continue;
    }
    const inCart = !!checked && /[xX✓☑☒✅✔]/u.test(checked[2]);
    const itemCategory = category || categorize(item.name);
    const normalized = normalizeName(item.name) || item.name.toLowerCase();
    const key = JSON.stringify([normalized, item.unit, inCart, fromApp ? itemCategory : ""]);
    const previous = found.get(key);
    if (previous) {
      if (previous.qty + item.qty <= 9999) previous.qty = Math.round((previous.qty + item.qty) * 1e6) / 1e6;
      else {
        ignoredLines.push(line);
        warnings.push("A quantidade acumulada de um item ultrapassa 9.999.");
      }
    } else {
      const entry = { ...item, category: itemCategory, inCart };
      found.set(key, entry);
      items.push(entry);
    }
  }
  return { items, ignoredLines, warnings };
}
