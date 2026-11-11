import { categorize, itemsOf, MAIN_LIST, MAX_ITEMS, MAX_NAME } from "./shopping.mjs";
import { productKey } from "./shoppingPurchases.mjs";

const fractionChars = new Map([["½", 0.5], ["¼", 0.25], ["¾", 0.75], ["⅓", 1 / 3], ["⅔", 2 / 3], ["⅛", 0.125]]);
const quantity = /^(\d{1,6}\s+\d{1,6}\/\d{1,6}|\d{1,6}\/\d{1,6}|\d{1,6}\s*[½¼¾⅓⅔⅛]|[½¼¾⅓⅔⅛]|\d{1,6}(?:[.,]\d{1,6})?)(?=\s|kg\b|g\b|ml\b|l\b)/iu;
const measurement = /^(kg|g|ml|l|un(?:idade)?s?|xícaras?|xicaras?|colher(?:es)?(?: de (?:sopa|chá|cha|sobremesa|café|cafe))?|pitadas?)\b\s*(?:de\s+)?/iu;
const heading = /^(?:ingredientes|modo de preparo|preparo|receita|rendimento|porções)\s*:?\s*$/iu;
const stop = /^(?:modo de preparo|preparo)\s*:/iu;
const clean = (value) => value.replace(/\t/gu, " ").replace(/[\p{Cc}\p{Cf}]/gu, "").replace(/\s+/gu, " ").trim();
const roundQty = (value) => Math.round(value * 1e9) / 1e9;

function numeric(text) {
  const symbol = text.at(-1);
  if (fractionChars.has(symbol)) return Number(text.slice(0, -1).trim() || 0) + fractionChars.get(symbol);
  const parts = text.trim().split(/\s+/u);
  const [numerator, denominator] = parts.at(-1).split("/").map(Number);
  if (parts.at(-1).includes("/")) return denominator > 0 ? (parts.length === 2 ? Number(parts[0]) : 0) + numerator / denominator : NaN;
  return Number(text.replace(",", "."));
}

function kitchenUnit(raw) {
  return raw.replace(/^x[ií]caras?$/iu, "xícara")
    .replace(/^colheres/iu, "colher").replace(/^pitadas$/iu, "pitada");
}

export function parseRecipe(text, { servings = 1, targetServings = servings } = {}) {
  const items = [];
  const notes = [];
  if (![servings, targetServings].every((n) => Number.isFinite(n) && n > 0) ||
      !Number.isFinite(targetServings / servings))
    return { items, notes: ["Informe porções maiores que zero."] };
  if (typeof text !== "string" || !text.trim()) return { items, notes };
  const clipped = text.slice(0, 60000).split(/\r\n?|\n/u);
  if (text.length > 60000) {
    notes.push("O texto foi cortado em 60.000 caracteres.");
    if (!/[\r\n]/u.test(text[60000])) clipped.pop();
  }
  if (clipped.length > 500) notes.push("Somente as primeiras 500 linhas foram lidas.");
  for (const raw of clipped.slice(0, 500)) {
    const line = clean(raw.replace(/^\s*(?:[-•*]|\d+[.)])\s+/u, ""));
    if (stop.test(line) || /^(?:modo de preparo|preparo)$/iu.test(line)) break;
    if (!line || heading.test(line) || !/[\p{L}]/u.test(line)) continue;
    const taste = /\s+a\s+gosto[.!]?$/iu.test(line);
    const body = taste ? line.replace(/\s+a\s+gosto[.!]?$/iu, "") : line;
    const match = quantity.exec(body);
    const qty = taste ? null : roundQty((match ? numeric(match[1]) : 1) * targetServings / servings);
    if (!taste && (!Number.isFinite(qty) || qty <= 0 || qty > 9999)) {
      notes.push("Uma linha tinha quantidade fora do limite.");
      continue;
    }
    const tail = body.slice(match?.[0].length ?? 0).trim();
    const measure = match ? measurement.exec(tail) : null;
    const rawUnit = measure?.[1].toLowerCase() ?? "";
    const unit = ["kg", "g", "ml", "l"].includes(rawUnit) ? rawUnit : "";
    const cooking = rawUnit && !unit && !/^un/iu.test(rawUnit);
    const name = tail.slice(measure?.[0].length ?? 0).trim();
    const display = cooking ? name + " (" + kitchenUnit(rawUnit) + ")" : name;
    if (!name || display.length > MAX_NAME) {
      notes.push("Uma linha foi ignorada por ter nome vazio ou longo demais.");
      continue;
    }
    items.push({ name: display, qty, unit, ...(taste ? { toTaste: true } : {}) });
  }
  return { items, notes };
}

export function recipeToItems(recipe, state) {
  const items = [...itemsOf(state)];
  const notes = [...(recipe?.notes ?? [])];
  const pantry = new Set(items.filter((item) => item.pantry).map((item) => productKey(item.name, item.unit)));
  const pending = new Map();
  items.forEach((item, i) => {
    const key = productKey(item.name, item.unit);
    if (!item.inCart && !item.pantry && !Number.isFinite(item.deletedAt) && !pending.has(key)) pending.set(key, i);
  });
  const used = new Set(items.map((item) => item.id));
  let next = 1;
  for (const item of recipe?.items ?? []) {
    if (item.toTaste) { notes.push(item.name + " a gosto ficou fora da lista."); continue; }
    const key = productKey(item.name, item.unit);
    if (pantry.has(key)) continue;
    const index = pending.get(key);
    if (index !== undefined) {
      const old = items[index];
      const qty = roundQty(old.qty + item.qty);
      if (qty > 9999) { notes.push("A quantidade de " + item.name + " ultrapassa 9.999."); continue; }
      items[index] = { ...old, qty, ...(old.unit ? { priceCents: null } : {}) };
      continue;
    }
    if (items.length >= MAX_ITEMS) { notes.push("A lista chegou ao limite de itens."); break; }
    while (used.has("receita-" + next)) next++;
    const id = "receita-" + next++;
    used.add(id);
    pending.set(key, items.length);
    items.push({ id, listId: MAIN_LIST, name: item.name, qty: item.qty, unit: item.unit,
      priceCents: null, category: categorize(item.name), inCart: false, createdAt: 0 });
  }
  return { state: { ...state, shoppingItems: items }, items, notes };
}
