// Lista de compras (módulo do Floco). Lógica pura: sem React, sem armazenamento.
// Estado: state.shoppingItems = [{ id, listId, name, qty, unit, priceCents, category, inCart, createdAt }]
// Valores em centavos inteiros. `listId` é fixo ("main") no MVP: permite várias listas depois sem migrar.
// Preço: sem unidade, o preço é por unidade e o total é preço × qty; com unidade (g, kg, l, ml),
// o preço é o da própria porção e o total é o próprio preço.
import { uid, parseMoney, money } from "./finance.mjs";
import { MAIN_LIST, addCents, MAX_ITEMS, MAX_NAME, SHOPPING_CATEGORIES, sanitizeShoppingItems } from "./shoppingData.mjs";

export { MAIN_LIST, MAX_ITEMS, MAX_NAME, SHOPPING_CATEGORIES, sanitizeShoppingItems };

// Palavra-chave → categoria (dicionário próprio do Floco).
const KEYWORDS = [
  [/\b(alface|tomates?|cebolas?|batatas?|cenouras?|alho|piment[aã]o|abobrinha|br[oó]colis|couve|banana|ma[cç][aã]s?|laranjas?|lim[aã]o|morango|mam[aã]o|abacate|cheiro-verde)\b/, "Hortifrúti"],
  [/\b(carne|frango|picanha|alcatra|ac[eé]m|lingui[cç]a|bacon|peixe|til[aá]pia|costela|patinho|moída)\b/, "Carnes e peixes"],
  [/\b(leite|iogurte|manteiga|queijo|presunto|requeij[aã]o|creme de leite|mortadela)\b/, "Frios e laticínios"],
  [/\b(p[aã]o|p[aã]es|bolo|torrada|bisnaguinha)\b/, "Padaria"],
  [/\b(arroz|feij[aã]o|macarr[aã]o|farinha|a[cç][uú]car|sal|caf[eé]|[oó]leo|azeite|molho|ovos?|aveia|tempero)\b/, "Mercearia"],
  [/\b(cerveja|vinho|refrigerante|suco|[aá]gua|ch[aá])\b/, "Bebidas"],
  [/\b(congelad[oa]s?|pizza|lasanha|nuggets|hamb[uú]rguer|sorvete|polpa)\b/, "Congelados"],
  [/\b(detergente|sab[aã]o em p[oó]|amaciante|desinfetante|esponja|alvejante|[aá]gua sanit[aá]ria)\b/, "Limpeza"],
  [/\b(papel higi[eê]nico|sabonete|shampoo|condicionador|creme dental|escova de dente|desodorante|fio dental|absorvente)\b/, "Higiene"],
  [/\b(ra[cç][aã]o|areia|petisco)\b/, "Pet"],
];

export function categorize(name) {
  const text = String(name || "").toLowerCase();
  for (const [re, cat] of KEYWORDS) if (re.test(text)) return cat;
  return "Outros";
}

// "2 leite", "2x leite", "500g farinha", "1,5 kg tomate", "pão" → { qty, unit, name }
export function parseItemText(text) {
  const raw = String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(/(\d)? ?([½¼¾])/g, (_, d, f) => (d || "0") + { "½": ",5", "¼": ",25", "¾": ",75" }[f])
    .trim();
  if (!raw) throw Error("Digite o nome do item.");
  const m = raw.match(/^(\d+(?:[.,]\d+)?)\s*(?:x\s+|(kg|g|ml|l)\b\s*(?:de\s+)?|\s)(.+)$/i);
  let qty = 1;
  let unit = "";
  let name = raw;
  if (m) {
    const n = Number(m[1].replace(",", "."));
    const u = (m[2] || "").toLowerCase();
    if (Number.isFinite(n) && n > 0) {
      qty = n;
      unit = u;
      name = m[3].trim();
    }
  }
  // Sem unidade, a quantidade é um número inteiro de unidades.
  if (!unit && !Number.isInteger(qty)) {
    name = raw;
    qty = 1;
  }
  if (!name) throw Error("Digite o nome do item.");
  if (name.length > MAX_NAME) throw Error(`O nome deve ter até ${MAX_NAME} letras.`);
  if (qty > 9999) throw Error("Quantidade grande demais.");
  name = name.charAt(0).toUpperCase() + name.slice(1);
  return { qty, unit, name };
}

export const itemsOf = (state) => state.shoppingItems || [];

export function addShoppingItem(state, text, { id = uid(), now = Date.now() } = {}) {
  const items = itemsOf(state);
  if (items.length >= MAX_ITEMS) throw Error("A lista chegou ao limite de itens.");
  const { qty, unit, name } = parseItemText(text);
  const item = {
    id,
    listId: MAIN_LIST,
    name,
    qty,
    unit,
    priceCents: null,
    category: categorize(name),
    inCart: false,
    createdAt: now,
  };
  return { ...state, shoppingItems: [...items, item] };
}

const mapItem = (state, id, fn) => {
  const items = itemsOf(state);
  if (!items.some((i) => i.id === id)) throw Error("Item não encontrado.");
  return { ...state, shoppingItems: items.map((i) => (i.id === id ? fn(i) : i)) };
};

export const toggleCart = (state, id) => mapItem(state, id, (i) => ({ ...i, inCart: !i.inCart }));

// text vazio limpa o preço; senão usa o mesmo formato de valores do Floco ("12,90").
export function setItemPrice(state, id, text) {
  const blank = String(text ?? "").trim() === "";
  const cents = blank ? null : parseMoney(text);
  return mapItem(state, id, (i) => ({ ...i, priceCents: cents }));
}

export function renameItem(state, id, text) {
  const { qty, unit, name } = parseItemText(text);
  return mapItem(state, id, (i) => ({ ...i, name, qty, unit, category: categorize(name) }));
}

export function setItemCategory(state, id, category) {
  if (!SHOPPING_CATEGORIES.includes(category)) throw Error("Categoria inválida.");
  return mapItem(state, id, (i) => ({ ...i, category }));
}

// Remove e devolve o item e a posição, para o "Desfazer".
export function removeItem(state, id) {
  const items = itemsOf(state);
  const index = items.findIndex((i) => i.id === id);
  if (index < 0) throw Error("Item não encontrado.");
  return {
    state: { ...state, shoppingItems: items.filter((i) => i.id !== id) },
    removed: items[index],
    index,
  };
}

export function restoreItem(state, removed, index) {
  const items = itemsOf(state);
  if (items.some((i) => i.id === removed.id)) return state;
  const at = Math.min(Math.max(index, 0), items.length);
  return { ...state, shoppingItems: [...items.slice(0, at), removed, ...items.slice(at)] };
}

// Itens no carrinho saem da lista (fim da compra).
export function clearCart(state) {
  return { ...state, shoppingItems: itemsOf(state).filter((i) => !i.inCart) };
}

export const lineTotal = (item) =>
  item.priceCents == null ? null : item.unit ? item.priceCents : Math.min(Number.MAX_SAFE_INTEGER, item.priceCents * item.qty);

// Resumo do bloco da Início: só os pendentes entram no total estimado.
export function shoppingSummary(state) {
  const items = itemsOf(state);
  const pending = items.filter((i) => !i.inCart);
  let estimatedCents = 0;
  let unpriced = 0;
  for (const i of pending) {
    const t = lineTotal(i);
    if (t == null) unpriced += 1;
    else estimatedCents = addCents(estimatedCents, t);
  }
  return {
    total: items.length,
    pending: pending.length,
    inCart: items.length - pending.length,
    estimatedCents,
    unpriced,
    preview: pending.slice(0, 3),
  };
}

// Itens agrupados por categoria (pendentes primeiro, no carrinho no fim).
export function groupByCategory(state) {
  const order = (c) => SHOPPING_CATEGORIES.indexOf(c);
  const groups = new Map();
  for (const i of itemsOf(state)) {
    const key = i.inCart ? "No carrinho" : i.category;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "No carrinho") - (b === "No carrinho") || order(a) - order(b))
    .map(([category, items]) => ({ category, items }));
}

const qtyLabel = (i) => (i.unit ? `${i.qty} ${i.unit} de ` : i.qty > 1 ? `${i.qty}x ` : "");

// Texto para compartilhar (só pendentes).
export function shareText(state) {
  const pending = groupByCategory(state).filter((g) => g.category !== "No carrinho");
  if (!pending.length) return "Lista de compras vazia.";
  const lines = ["Lista de compras"];
  for (const g of pending) {
    lines.push("", g.category);
    for (const i of g.items) lines.push(`- ${qtyLabel(i)}${i.name}`);
  }
  const { estimatedCents, unpriced } = shoppingSummary(state);
  if (estimatedCents > 0)
    lines.push("", `Estimativa: ${money(estimatedCents)}${unpriced ? ` (${unpriced} sem preço)` : ""}`);
  return lines.join("\n");
}

// Restaurar backup: o que o arquivo não traz (backup antigo) mantém o que o aparelho já tem.
// Vale para a lista, as compras e os produtos, cada um por conta própria.
export function keepShoppingOnRestore(backup, current) {
  const next = { ...backup };
  if (backup.shoppingItems === undefined) next.shoppingItems = itemsOf(current);
  if (backup.shoppingPurchases === undefined) next.shoppingPurchases = current.shoppingPurchases || [];
  if (backup.shoppingProducts === undefined) next.shoppingProducts = current.shoppingProducts || [];
  // Referências do histórico: toda compra aponta para um produto que existe no catálogo restaurado.
  const ids = new Set((next.shoppingProducts || []).map((p) => p.id));
  for (const p of next.shoppingPurchases || []) {
    for (const i of p.items || []) {
      if (i.productId && !ids.has(i.productId)) throw Error("Backup inconsistente: uma compra aponta para um produto que não está no catálogo.");
    }
  }
  return next;
}

// Etapa 6: rascunho da despesa a partir do carrinho. Só entram itens no carrinho que têm preço;
// os sem preço são contados à parte. Nada é gravado aqui: o formulário normal do Floco confirma.
export function purchaseDraft(state) {
  const inCart = itemsOf(state).filter((i) => i.inCart);
  let totalCents = 0;
  let priced = 0;
  for (const i of inCart) {
    const t = lineTotal(i);
    if (t != null) {
      totalCents = addCents(totalCents, t);
      priced += 1;
    }
  }
  return {
    items: inCart.length,
    priced,
    unpriced: inCart.length - priced,
    totalCents,
    // Texto no formato de valores do formulário ("12,34"); vazio quando nada tem preço.
    amountText: totalCents > 0 ? (totalCents / 100).toFixed(2).replace(".", ",") : "",
    description: "Compra de mercado",
  };
}
