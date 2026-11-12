import { LIST_COLORS, MAIN_LIST, MAX_ITEMS } from "./shoppingData.mjs";
import { normalizeSearchText } from "./shoppingSearch.mjs";

const limit = 60;
const base = { id: MAIN_LIST, name: "Mercado", archived: false };

export function migrateToLists(state) {
  if (Array.isArray(state.shoppingLists) && state.shoppingLists.length) return state;
  return { ...state, shoppingLists: [{ ...base }] };
}

export function flattenLists(state) {
  if (!Object.hasOwn(state, "shoppingLists")) return state;
  const { shoppingLists, ...legacy } = state;
  if (Array.isArray(legacy.shoppingItems)) legacy.shoppingItems = legacy.shoppingItems.map((item) =>
    item.listId && item.listId !== MAIN_LIST ? { ...item, listId: MAIN_LIST } : item);
  return legacy;
}

function validateName(value, lists, except) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || name.length > limit) throw Error("Informe um nome de lista com até 60 caracteres.");
  if (lists.some((list) => list.id !== except && normalizeSearchText(list.name) === normalizeSearchText(name)))
    throw Error("Já existe uma lista com esse nome.");
  return name;
}

function find(state, id) {
  const list = state.shoppingLists.find((entry) => entry.id === id);
  if (!list) throw Error("Lista de compras não encontrada.");
  return list;
}

export function createList(state, value, { id } = {}) {
  const next = migrateToLists(state);
  const name = validateName(value, next.shoppingLists);
  const ids = new Set(next.shoppingLists.map((list) => list.id));
  let number = 1;
  while (id === undefined && ids.has("lista-" + number)) number++;
  const newId = id ?? "lista-" + number;
  if (typeof newId !== "string" || !newId.trim() || ids.has(newId)) throw Error("Identificador de lista inválido ou repetido.");
  return { ...next, shoppingLists: [...next.shoppingLists, { id: newId, name, archived: false }] };
}

export function renameList(state, id, value) {
  const next = migrateToLists(state);
  const list = find(next, id);
  const name = validateName(value, next.shoppingLists, id);
  if (name === list.name) return next;
  return { ...next, shoppingLists: next.shoppingLists.map((entry) => entry === list ? { ...list, name } : entry) };
}

export function archiveList(state, id) {
  const next = migrateToLists(state);
  const list = find(next, id);
  if (list.archived) return next;
  if (next.shoppingLists.filter((entry) => !entry.archived).length <= 1)
    throw Error("Mantenha pelo menos uma lista ativa.");
  return { ...next, shoppingLists: next.shoppingLists.map((entry) => entry === list ? { ...list, archived: true } : entry) };
}

export function moveItem(state, itemId, toListId) {
  const next = migrateToLists(state);
  if (find(next, toListId).archived) throw Error("A lista de destino está arquivada.");
  const items = next.shoppingItems ?? [];
  const item = items.find((entry) => entry.id === itemId);
  if (!item) throw Error("Item de compras não encontrado.");
  if ((item.listId ?? MAIN_LIST) === toListId) return next;
  return { ...next, shoppingItems: items.map((entry) => entry === item ? { ...item, listId: toListId } : entry) };
}

export function saveAsTemplate(state, listId) {
  const next = migrateToLists(state);
  const { name } = find(next, listId);
  const items = (next.shoppingItems ?? []).filter((item) => (item.listId ?? MAIN_LIST) === listId &&
    !Number.isFinite(item.deletedAt)).map(({ name, qty, unit, priceCents, category }) =>
    ({ name, qty, unit, priceCents, category }));
  return { name, items };
}

export function fromTemplate(template, now, { id } = {}) {
  if (!Number.isFinite(now)) throw Error("Informe a data de criação da lista.");
  const name = validateName(template?.name, []);
  if (!Array.isArray(template.items) || template.items.length > MAX_ITEMS)
    throw Error("Modelo de lista inválido ou grande demais.");
  const listId = id ?? "lista-" + now + "-" + encodeURIComponent(normalizeSearchText(name));
  if (typeof listId !== "string" || !listId.trim()) throw Error("Identificador de lista inválido.");
  return {
    list: { id: listId, name, archived: false },
    items: template.items.map(({ name, qty, unit, priceCents, category }, index) => ({
      id: listId + "-" + (index + 1), listId, name, qty, unit, priceCents, category, inCart: false, createdAt: now,
    })),
  };
}

// ---- Visão geral: ordem das listas, divisores (grupos) e cor (1.12) ----
// `shoppingListLayout` é opcional. Sem ele, vale a ordem de `shoppingLists`. Listas que não estão no layout
// entram no fim; entradas de listas que sumiram são ignoradas. Ler é idempotente e não grava nada.
export function listLayout(state) {
  const lists = migrateToLists(state).shoppingLists;
  const byId = new Map(lists.map((list) => [list.id, list]));
  const placed = new Set();
  const entries = [];
  for (const row of Array.isArray(state.shoppingListLayout) ? state.shoppingListLayout : []) {
    if (row?.kind === "list" && byId.has(row.id) && !placed.has(row.id)) {
      placed.add(row.id);
      entries.push({ kind: "list", id: row.id });
    } else if (row?.kind === "divider" && typeof row.name === "string" && row.name.trim() && !byId.has(row.id)) {
      entries.push({ kind: "divider", id: row.id, name: row.name.trim() });
    }
  }
  for (const list of lists) if (!placed.has(list.id)) entries.push({ kind: "list", id: list.id });
  return entries;
}

// Layout que aparece na tela: sem listas arquivadas.
export const visibleLayout = (state) => {
  const archived = new Set(migrateToLists(state).shoppingLists.filter((list) => list.archived).map((list) => list.id));
  return listLayout(state).filter((row) => row.kind === "divider" || !archived.has(row.id));
};

// Grava uma nova ordem (vinda do modo de edição). Aceita só as listas e divisores conhecidos.
export function setListLayout(state, entries) {
  const lists = migrateToLists(state).shoppingLists;
  const ids = new Set(lists.map((list) => list.id));
  const seen = new Set();
  const clean = (Array.isArray(entries) ? entries : []).flatMap((row) => {
    if (!row || typeof row.id !== "string" || seen.has(row.id)) return [];
    if (row.kind === "list" && ids.has(row.id)) { seen.add(row.id); return [{ kind: "list", id: row.id }]; }
    if (row.kind === "divider") {
      const name = dividerName(row.name);
      if (ids.has(row.id) || !/^[\p{L}\p{N}_-]{1,100}$/u.test(row.id)) throw Error("Identificador de grupo inválido.");
      seen.add(row.id);
      return [{ kind: "divider", id: row.id, name }];
    }
    return [];
  });
  // Listas que ficaram de fora (ex.: arquivadas, invisíveis no modo de edição) mantêm a posição relativa no fim.
  for (const row of listLayout(state)) if (row.kind === "list" && !seen.has(row.id)) clean.push(row);
  return { ...migrateToLists(state), shoppingListLayout: clean };
}

const DIVIDER_MAX = 40;
function dividerName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || name.length > DIVIDER_MAX) throw Error(`Informe um nome de grupo com até ${DIVIDER_MAX} caracteres.`);
  return name;
}

// Novo divisor na posição `index` do layout visível (0 = antes da primeira lista).
export function addDivider(state, index, name, { id } = {}) {
  const rows = visibleLayout(state);
  const taken = new Set(listLayout(state).map((row) => row.id));
  let n = 1;
  while (id === undefined && taken.has("grupo-" + n)) n++;
  const newId = id ?? "grupo-" + n;
  if (taken.has(newId)) throw Error("Identificador de grupo repetido.");
  const at = Math.min(Math.max(Number.isInteger(index) ? index : rows.length, 0), rows.length);
  return setListLayout(state, [...rows.slice(0, at), { kind: "divider", id: newId, name: dividerName(name) }, ...rows.slice(at)]);
}

// Renomear com nome vazio remove o divisor (mesmo comportamento do campo na tela).
export function renameDivider(state, id, name) {
  const rows = listLayout(state);
  if (!rows.some((row) => row.kind === "divider" && row.id === id)) throw Error("Grupo não encontrado.");
  const text = typeof name === "string" ? name.trim() : "";
  if (!text) return removeDivider(state, id);
  return setListLayout(state, rows.map((row) => row.id === id ? { ...row, name: dividerName(text) } : row));
}

export function removeDivider(state, id) {
  return setListLayout(state, listLayout(state).filter((row) => !(row.kind === "divider" && row.id === id)));
}

// Move uma entrada do layout visível de `from` para `to` (arrastar ou Subir/Descer).
export function moveLayoutEntry(state, from, to) {
  const rows = visibleLayout(state);
  if (!Number.isInteger(from) || from < 0 || from >= rows.length) throw Error("Posição inválida.");
  const target = Math.min(Math.max(Number.isInteger(to) ? to : from, 0), rows.length - 1);
  if (target === from) return state;
  const next = [...rows];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return setListLayout(state, next);
}

// Divisor que agrupa a lista (o último antes dela no layout), ou null.
export function groupOfList(state, listId) {
  let current = null;
  for (const row of listLayout(state)) {
    if (row.kind === "divider") current = row;
    else if (row.id === listId) return current ? { id: current.id, name: current.name } : null;
  }
  return null;
}

// Põe a lista logo depois do divisor `groupId` (no fim do grupo), ou no começo, sem grupo, com null.
export function setListGroup(state, listId, groupId) {
  if (!migrateToLists(state).shoppingLists.some((list) => list.id === listId)) throw Error("Lista de compras não encontrada.");
  if ((groupOfList(state, listId)?.id ?? null) === (groupId ?? null)) return state;
  const rows = listLayout(state).filter((row) => row.id !== listId);
  let at;
  if (groupId == null) {
    const first = rows.findIndex((row) => row.kind === "divider");
    at = first < 0 ? rows.length : first;
  } else {
    const start = rows.findIndex((row) => row.kind === "divider" && row.id === groupId);
    if (start < 0) throw Error("Grupo não encontrado.");
    at = start + 1;
    while (at < rows.length && rows[at].kind === "list") at++;
  }
  rows.splice(at, 0, { kind: "list", id: listId });
  return setListLayout(state, rows);
}

export function setListColor(state, id, color) {
  if (color != null && !LIST_COLORS.includes(color)) throw Error("Cor de lista inválida.");
  const next = migrateToLists(state);
  const list = find(next, id);
  if ((list.color ?? null) === (color ?? null)) return next;
  const { color: old, ...base } = list;
  return { ...next, shoppingLists: next.shoppingLists.map((entry) => entry === list ? (color ? { ...base, color } : base) : entry) };
}
