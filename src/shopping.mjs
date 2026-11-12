// Lista de compras (módulo do Floco). Lógica pura: sem React, sem armazenamento.
// Estado: state.shoppingItems = [{ id, listId, name, qty, unit, priceCents, category, inCart, createdAt }]
// Valores em centavos inteiros. `listId` é fixo ("main") no MVP: permite várias listas depois sem migrar.
// Preço: sem unidade, o preço é por unidade e o total é preço × qty; com unidade (g, kg, l, ml),
// o preço é o da própria porção e o total é o próprio preço.
import { uid, parseMoney, money, today } from "./finance.mjs";
import { applyDeal, validateDeal } from "./shoppingDeals.mjs";
import { markStaple, staplesToRestock } from "./shoppingStaples.mjs";
import { productKey } from "./shoppingPurchases.mjs";
import { createList, flattenLists, fromTemplate, migrateToLists, renameList, visibleLayout } from "./shoppingLists.mjs";
import { MAIN_LIST, addCents, ITEM_STATUSES, MAX_DETAILS, MAX_ITEMS, MAX_NAME, SHOPPING_CATEGORIES, sanitizeShoppingItems, sanitizeItemDeal } from "./shoppingData.mjs";

export { ITEM_STATUSES, MAIN_LIST, MAX_ITEMS, MAX_NAME, SHOPPING_CATEGORIES, sanitizeShoppingItems };
// Títulos dos grupos especiais da lista (não são categorias).
export const LATER_GROUP = "Para outra compra";
export const CART_GROUP = "No carrinho";

// Palavra-chave → categoria (dicionário próprio do Floco).
// A ordem importa: a primeira que casar vence (ex.: "doce de leite" é doce, "papel higiênico" é higiene).
const KEYWORDS = [
  [/\b(fraldas?|len[cç]os? umedecidos?|papinhas?|mamadeiras?|chupetas?|pomada para assadura)\b/, "Bebê"],
  [/\b(rem[eé]dios?|dipirona|paracetamol|ibuprofeno|curativos?|band-?aid|vitaminas?|protetor solar|term[oô]metro|soro fisiol[oó]gico|[aá]lcool em gel)\b/, "Farmácia"],
  [/\b(doce de leite|leite condensado|chocolates?|biscoitos?|bolachas?|salgadinhos?|balas?|chicletes?|pipoca|amendoim|wafer|bombons?|gelatina)\b/, "Doces e lanches"],
  [/\b(caf[eé]|cereal|cereais|achocolatado|granola|aveia|ch[aá])\b/, "Matinais"],
  [/\b(cervejas?|vinhos?|cacha[cç]a|vodka|whisky|u[ií]sque|gin|espumante|licor)\b/, "Bebidas alcoólicas"],
  [/\b(farinha|fub[aá]|polvilho|amido de milho)\b/, "Mercearia"],
  [/\b(banana|ma[cç][aã]s?|laranjas?|lim[aã]o|lim[oõ]es|morangos?|mam[aã]o|abacate|uvas?|mangas?|melancia|mel[aã]o|abacaxi|peras?|kiwi|goiaba|maracuj[aá]|tangerina|mexerica)\b/, "Frutas"],
  [/\b(alface|tomates?|cebolas?|batatas?|cenouras?|alho|piment[aã]o|abobrinha|br[oó]colis|couve|cheiro-verde|pepino|beterraba|ab[oó]bora|mandioca|r[uú]cula|espinafre|chuchu|quiabo)\b/, "Hortifrúti"],
  [/\b(carne|frango|picanha|alcatra|ac[eé]m|lingui[cç]a|bacon|peixe|til[aá]pia|costela|patinho|moída|salm[aã]o|sardinha|camar[aã]o)\b/, "Carnes e peixes"],
  [/\b(leite|iogurte|manteiga|queijo|presunto|requeij[aã]o|creme de leite|mortadela|margarina|peito de peru)\b/, "Frios e laticínios"],
  [/\b(p[aã]o|p[aã]es|bolo|torrada|bisnaguinha)\b/, "Padaria"],
  [/\b(arroz|feij[aã]o|macarr[aã]o|farinha|a[cç][uú]car|sal|[oó]leo|azeite|molho|ovos?|tempero|milho|ervilha|atum|extrato de tomate)\b/, "Mercearia"],
  [/\b(refrigerante|suco|[aá]gua|energ[eé]tico|isot[oô]nico)\b/, "Bebidas"],
  [/\b(congelad[oa]s?|pizza|lasanha|nuggets|hamb[uú]rguer|sorvete|polpa)\b/, "Congelados"],
  [/\b(papel higi[eê]nico|sabonete|shampoo|xampu|condicionador|creme dental|pasta de dente|escova de dente|desodorante|fio dental|absorvente|cotonete|aparelho de barbear)\b/, "Higiene"],
  [/\b(l[aâ]mpadas?|pilhas?|velas?|papel alum[ií]nio|filme pl[aá]stico|sacos? de lixo|f[oó]sforos?|guardanapos?|copos? descart[aá]veis|pratos? descart[aá]veis|isqueiro)\b/, "Casa e utilidades"],
  [/\b(detergente|sab[aã]o em p[oó]|sab[aã]o l[ií]quido|amaciante|desinfetante|esponja|alvejante|[aá]gua sanit[aá]ria|multiuso|lustra-m[oó]veis|papel toalha)\b/, "Limpeza"],
  [/\b(ra[cç][aã]o|areia|petisco|sach[eê] para (gato|cachorro))\b/, "Pet"],
];

// `\b` do JavaScript não vê letra acentuada como letra ("café" nunca casava). Por isso texto e regras
// são comparados sem acento.
const plain = (value) => value.normalize("NFD").replace(/\p{M}/gu, "");
const PLAIN_KEYWORDS = KEYWORDS.map(([re, cat]) => [new RegExp(plain(re.source), re.flags), cat]);

/** @returns {string} */
export function categorize(name) {
  const text = plain(String(name || "").toLowerCase());
  for (const [re, cat] of PLAIN_KEYWORDS) if (/** @type {RegExp} */ (re).test(text)) return String(cat);
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

export const shoppingListsOf = (state) => state.shoppingLists?.length ? state.shoppingLists : [{ id: MAIN_LIST, name: "Minha lista", archived: false }];
export const activeShoppingList = (state) => shoppingListsOf(state).find((list) => list.id === state.shoppingListId && !list.archived)?.id ??
  shoppingListsOf(state).find((list) => !list.archived)?.id ?? MAIN_LIST;
const belongsTo = (item, listId) => (item.listId ?? MAIN_LIST) === listId;

export function migrateShoppingLists(state) {
  if (!state.shoppingLists?.length)
    return renameList(migrateToLists(flattenLists({ ...state, shoppingLists: [] })), MAIN_LIST, "Minha lista");
  if (state.shoppingListId !== undefined && activeShoppingList(state) !== state.shoppingListId)
    return { ...state, shoppingListId: activeShoppingList(state) };
  return state;
}

export function activeShoppingState(state) {
  if (!state.shoppingLists?.length) return state;
  const id = activeShoppingList(state);
  const items = itemsOf(state);
  const selected = items.filter((item) => belongsTo(item, id));
  return selected.length === items.length ? state : { ...state, shoppingItems: selected };
}

// Itens de várias listas juntos (Modo compra com mais de uma lista). Sem `listIds`, vale a lista ativa.
export function tripScopeState(state, listIds) {
  const ids = Array.isArray(listIds) ? listIds.filter((id) => typeof id === "string") : [];
  if (!ids.length) return activeShoppingState(state);
  const wanted = new Set(ids);
  return { ...state, shoppingItems: itemsOf(state).filter((item) => wanted.has(item.listId ?? MAIN_LIST)) };
}

// Foto do item: só o nome do arquivo (a imagem fica no aparelho e não entra no backup). null tira a foto.
export function setItemPhoto(state, id, name) {
  if (name !== null && !(typeof name === "string" && /^[A-Za-z0-9_-]{1,100}\.jpg$/u.test(name))) throw Error("Foto inválida.");
  return mapItem(state, id, ({ photo, ...item }) => name ? { ...item, photo: name } : item);
}

export function editActiveShoppingItems(state, change) {
  const scope = activeShoppingState(state);
  const id = activeShoppingList(state);
  const other = itemsOf(state).filter((item) => !belongsTo(item, id));
  const updated = itemsOf(change(scope));
  if (other.length + updated.length > MAX_ITEMS) throw Error("As listas chegaram ao limite de itens.");
  const ids = new Set(other.map((item) => item.id));
  const items = updated.map((item) => {
    let key = item.id;
    while (ids.has(key)) key = uid();
    ids.add(key);
    return item.listId === id && key === item.id ? item : { ...item, id: key, listId: id };
  });
  return { ...state, shoppingItems: [...other, ...items] };
}

export function createShoppingList(state, name, template) {
  if (shoppingListsOf(state).length >= 100) throw Error("As listas chegaram ao limite.");
  const id = uid();
  const next = createList(migrateShoppingLists(state), name, { id });
  if (!template) return { ...next, shoppingListId: id };
  const result = fromTemplate({ ...template, name }, Date.now(), { id });
  if (itemsOf(state).length + result.items.length > MAX_ITEMS) throw Error("As listas chegaram ao limite de itens.");
  return { ...next, shoppingListId: id, shoppingItems: [...itemsOf(state), ...result.items] };
}

// `category`: escolha manual na barra de adicionar; sem ela (ou inválida), a categoria é adivinhada pelo nome.
export function addShoppingItem(state, text, { id = uid(), now = Date.now(), category = /** @type {string | undefined} */ (undefined) } = {}) {
  const items = itemsOf(state);
  if (items.length >= MAX_ITEMS) throw Error("A lista chegou ao limite de itens.");
  const { qty, unit, name } = parseItemText(text);
  const item = {
    id,
    listId: activeShoppingList(state),
    name,
    qty,
    unit,
    priceCents: null,
    category: SHOPPING_CATEGORIES.includes(category) ? category : categorize(name),
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

// Entrar no carrinho grava `cartAt` (o mais recente fica no topo) e limpa Faltou/Depois.
export const toggleCart = (state, id, now = Date.now()) => mapItem(state, id, ({ status, cartAt, ...i }) =>
  i.inCart ? { ...i, inCart: false } : { ...i, inCart: true, cartAt: now });

// Estado do item: "missing" (faltou no mercado), "later" (fica para outra compra) ou null (normal).
// Com estado, o item sai do carrinho.
export function setItemStatus(state, id, status) {
  if (status !== null && !ITEM_STATUSES.includes(status)) throw Error("Estado de item inválido.");
  return mapItem(state, id, ({ status: old, cartAt, ...i }) => status ? { ...i, inCart: false, status } : { ...i });
}

// Itens que contam para a compra atual (os de "Depois" ficam de fora).
export const currentItemsOf = (state) => itemsOf(state).filter((i) => i.status !== "later");

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
export function clearCart(state, date = today()) {
  const items = itemsOf(state);
  const active = activeShoppingList(state);
  const boughtItems = items.filter((item) => item.inCart && (!state.shoppingLists?.length || belongsTo(item, active)));
  const boughtIds = new Set(boughtItems.map((item) => item.id));
  const next = { ...state, shoppingItems: items.filter((i) => !boughtIds.has(i.id)) };
  if (!state.shoppingStaples?.length) return next;
  const bought = new Set(boughtItems.map((item) => productKey(item.name, item.unit)));
  return { ...next, shoppingStaples: state.shoppingStaples.map((entry) =>
    belongsTo(entry, active) && bought.has(productKey(entry.name, entry.unit)) ? { ...entry, lastRestockedAt: date } : entry) };
}

export function restockStaples(state, date = today()) {
  const items = itemsOf(state);
  if (!state.shoppingStaples?.length) return state;
  const due = shoppingListsOf(state).filter((list) => !list.archived).flatMap((list) => staplesToRestock({ ...state,
    shoppingItems: items.filter((item) => belongsTo(item, list.id)),
    shoppingStaples: state.shoppingStaples.filter((item) => belongsTo(item, list.id)),
  }, date)).slice(0, MAX_ITEMS - items.length);
  if (!due.length) return state;
  return { ...state, shoppingItems: [...items, ...due.map(({ lastRestockedAt, deal, ...entry }) =>
    ({ ...entry, id: uid(), priceCents: null, createdAt: Date.now() }))] };
}

function withExtras(entry, { details, pricePer }) {
  const { details: oldDetails, pricePer: oldPer, ...base } = entry;
  const text = details === undefined ? oldDetails : typeof details === "string" ? details.trim() : "";
  if (text && text.length > MAX_DETAILS) throw Error(`Use até ${MAX_DETAILS} caracteres nos detalhes.`);
  const per = pricePer === undefined ? oldPer : pricePer;
  if (per != null && per !== "kg") throw Error("Forma de preço inválida.");
  if (per === "kg" && base.unit !== "g" && base.unit !== "kg") throw Error("Preço por quilo vale só para itens em g ou kg.");
  return { ...base, ...(text ? { details: text } : {}), ...(per === "kg" ? { pricePer: "kg" } : {}) };
}

// `details` e `pricePer` são opcionais: `undefined` mantém o que o item já tem.
export function configureShoppingItem(state, id, { text, price, category, everyDays, deal, details = /** @type {string | undefined} */ (undefined), pricePer = /** @type {"kg" | null | undefined} */ (undefined) }) {
  const old = itemsOf(state).find((item) => item.id === id);
  let next = setItemCategory(setItemPrice(renameItem(state, id, text), id, price), id, category);
  if (details !== undefined || pricePer !== undefined) next = mapItem(next, id, (entry) => withExtras(entry, { details, pricePer }));
  const item = itemsOf(next).find((entry) => entry.id === id);
  const promotion = deal ? sanitizeItemDeal(deal) : undefined;
  if (deal && !promotion) throw Error(validateDeal(deal).reason || "Confira a promoção.");
  if (promotion?.type === "buyXPayY" && (item.unit || !Number.isInteger(item.qty)))
    throw Error("Use a promoção por quantidade em itens vendidos por unidade.");
  if (old?.staple && productKey(old.name, old.unit) !== productKey(item.name, item.unit))
    next = { ...next, shoppingStaples: (next.shoppingStaples || []).filter((entry) => !belongsTo(entry, old.listId ?? MAIN_LIST) || productKey(entry.name, entry.unit) !== productKey(old.name, old.unit)) };
  next = mapItem(next, id, (entry) => {
    const { deal: previous, ...base } = entry;
    return promotion ? { ...base, deal: promotion } : base;
  });
  if (everyDays === null && !old?.staple) return next;
  const list = item.listId ?? MAIN_LIST;
  const entries = next.shoppingStaples || [];
  const own = entries.filter((entry) => belongsTo(entry, list));
  const record = own.find((entry) => productKey(entry.name, entry.unit) === productKey(item.name, item.unit));
  const result = markStaple({ ...next, shoppingStaples: own }, id, everyDays);
  const updated = { ...result, shoppingStaples: [...entries.filter((entry) => !belongsTo(entry, list)), ...result.shoppingStaples] };
  if (!record?.lastRestockedAt || everyDays === null) return updated;
  return { ...updated, shoppingStaples: updated.shoppingStaples.map((entry) => entry.id === id ?
    { ...entry, lastRestockedAt: record.lastRestockedAt } : entry) };
}

// Por quilo (`pricePer: "kg"`, só em g ou kg): total = preço do quilo × peso. Sem o campo, vale o de antes.
const kilos = (item) => item.unit === "g" ? item.qty / 1000 : item.qty;
export const lineTotal = (item) =>
  item.priceCents == null ? null : item.deal ? applyDeal(item, item.deal).totalCents :
    item.pricePer === "kg" && (item.unit === "g" || item.unit === "kg") ?
      Math.min(Number.MAX_SAFE_INTEGER, Math.round(item.priceCents * kilos(item))) :
    item.unit ? item.priceCents : Math.min(Number.MAX_SAFE_INTEGER, item.priceCents * item.qty);

// Resumo do bloco da Início: só os pendentes entram no total estimado.
export function shoppingSummary(state) {
  const all = itemsOf(activeShoppingState(state));
  const items = all.filter((i) => i.status !== "later");
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
    later: all.length - items.length,
    missing: pending.filter((i) => i.status === "missing").length,
    estimatedCents,
    unpriced,
    preview: pending.slice(0, 3),
  };
}

// Itens agrupados por categoria (pendentes primeiro, no carrinho no fim).
export function groupByCategory(state) {
  // Pendentes por categoria, depois "Para outra compra", depois "No carrinho" (o mais recente no topo).
  const rank = (c) => c === CART_GROUP ? 2 : c === LATER_GROUP ? 1 : 0;
  const order = (c) => SHOPPING_CATEGORIES.indexOf(c);
  const groups = new Map();
  for (const i of itemsOf(state)) {
    const key = i.inCart ? CART_GROUP : i.status === "later" ? LATER_GROUP : i.category;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  const cart = groups.get(CART_GROUP);
  if (cart) groups.set(CART_GROUP, cart.map((item, index) => ({ item, index }))
    .sort((a, b) => (b.item.cartAt || 0) - (a.item.cartAt || 0) || a.index - b.index).map(({ item }) => item));
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || order(a) - order(b))
    .map(([category, items]) => ({ category, items }));
}

const qtyLabel = (i) => (i.unit ? `${i.qty} ${i.unit} de ` : i.qty > 1 ? `${i.qty}x ` : "");

// Texto para compartilhar (só pendentes).
export function shareText(state) {
  const pending = groupByCategory(state).filter((g) => g.category !== CART_GROUP && g.category !== LATER_GROUP);
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
  if (backup.shoppingItems === undefined) {
    next.shoppingItems = itemsOf(current);
    if (backup.shoppingLists === undefined && current.shoppingLists !== undefined) next.shoppingLists = current.shoppingLists;
    if (backup.shoppingListId === undefined && current.shoppingListId !== undefined) next.shoppingListId = current.shoppingListId;
  }
  // Ordem e divisores só seguem a lista atual quando o backup não traz listas próprias.
  if (backup.shoppingLists === undefined && backup.shoppingListLayout === undefined && current.shoppingListLayout !== undefined &&
    next.shoppingLists === current.shoppingLists) next.shoppingListLayout = current.shoppingListLayout;
  if (backup.shoppingListTemplates === undefined && current.shoppingListTemplates !== undefined)
    next.shoppingListTemplates = current.shoppingListTemplates;
  if (backup.shoppingPurchases === undefined) next.shoppingPurchases = current.shoppingPurchases || [];
  if (backup.shoppingProducts === undefined) next.shoppingProducts = current.shoppingProducts || [];
  if (backup.shoppingStaples === undefined && current.shoppingStaples !== undefined) {
    const lists = shoppingListsOf(next);
    next.shoppingStaples = current.shoppingStaples.map((item) => lists.some((list) => list.id === item.listId) ? item :
      { ...item, listId: activeShoppingList(next) });
  }
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

// Visão geral (1.12): uma entrada por linha da tela, na ordem do layout. Cartões trazem o resumo de cada lista.
export function listOverview(state) {
  const lists = new Map(shoppingListsOf(state).map((list) => [list.id, list]));
  return visibleLayout(state).map((row) => {
    if (row.kind === "divider") return row;
    const list = lists.get(row.id);
    const sum = shoppingSummary({ ...state, shoppingLists: state.shoppingLists?.length ? state.shoppingLists : [list], shoppingListId: list.id });
    return { kind: "list", id: list.id, name: list.name, color: list.color ?? null,
      total: sum.total, pending: sum.pending, inCart: sum.inCart, later: sum.later, estimatedCents: sum.estimatedCents };
  });
}
