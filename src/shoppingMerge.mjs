const rows = (value) => Array.isArray(value) ? value : value?.shoppingItems ?? [];
const compareText = (a, b) => a === b ? 0 : a < b ? -1 : 1;
const isDeleted = (item) => Number.isFinite(item.deletedAt);
const rawTime = (item) => isDeleted(item) ? item.deletedAt : item.updatedAt ?? item.createdAt;
const timeOf = (item, now) => Number.isFinite(rawTime(item)) ? Math.min(rawTime(item), now) : -Infinity;

function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function winner(previous, item, now) {
  const earlier = timeOf(previous, now);
  const later = timeOf(item, now);
  if (earlier !== later) return later > earlier ? item : previous;
  if (isDeleted(previous) !== isDeleted(item)) return isDeleted(item) ? item : previous;
  // Um desempate independente do lado é necessário em edições no mesmo milissegundo.
  return compareText(canonical(previous), canonical(item)) < 0 ? item : previous;
}

export function mergeShoppingLists(a, b, { now } = {}) {
  const end = Number.isFinite(now) ? now : Infinity;
  const merged = new Map();
  for (const source of [a, b]) {
    for (const item of rows(source)) {
      if (typeof item?.id !== "string" || !item.id) continue;
      const previous = merged.get(item.id);
      merged.set(item.id, previous ? winner(previous, item, end) : item);
    }
  }
  return [...merged.values()].sort((a, b) => compareText(a.id, b.id));
}

export function diffLists(a, b) {
  const alive = (source) => new Map(mergeShoppingLists(source, []).filter((item) => !isDeleted(item)).map((item) => [item.id, item]));
  const before = alive(a);
  const after = alive(b);
  const added = [];
  const removed = [];
  const changed = [];
  for (const [id, item] of after) {
    if (!before.has(id)) added.push(item);
    else if (canonical(before.get(id)) !== canonical(item)) changed.push({ before: before.get(id), after: item });
  }
  for (const [id, item] of before) if (!after.has(id)) removed.push(item);
  return { added, removed, changed };
}
