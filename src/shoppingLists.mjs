import { MAIN_LIST, MAX_ITEMS } from "./shoppingData.mjs";
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
