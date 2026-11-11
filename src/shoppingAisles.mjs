import { normalizeName } from "./shoppingPurchases.mjs";

// Usa os rótulos da lista para hortifrúti, açougue e laticínios.
export const aisleOrder = Object.freeze([
  "Hortifrúti", "Padaria", "Carnes e peixes", "Frios e laticínios", "Mercearia",
  "Bebidas", "Limpeza", "Higiene", "Outros",
]);

const aliases = new Map([
  ["acougue", "carnes e peixes"],
  ["laticinios", "frios e laticinios"],
]);
const keyOf = (label) => {
  const key = normalizeName(label);
  return aliases.get(key) ?? key;
};

export function sortByAisles(groups, customOrder) {
  const ordered = [...(Array.isArray(customOrder) ? customOrder : []), ...aisleOrder];
  const ranks = new Map();
  for (const category of ordered) {
    const key = keyOf(category);
    if (key && !ranks.has(key)) ranks.set(key, ranks.size);
  }
  const rank = (category) => ranks.get(keyOf(category)) ?? ranks.size;
  return [...(groups ?? [])].sort((a, b) => rank(a.category) - rank(b.category));
}

export function learnAisleOrder(sessions) {
  const paths = [];
  for (const session of sessions ?? []) {
    const marks = Array.isArray(session) ? session : session?.marks;
    if (!Array.isArray(marks)) continue;
    const valid = marks.flatMap((mark) => {
      const time = mark?.at ?? mark?.markedAt;
      const key = keyOf(mark?.category);
      return key && Number.isFinite(time) ? [{ key, label: mark.category, time }] : [];
    }).sort((a, b) => a.time - b.time);
    const unique = new Map();
    for (const { key, label } of valid) if (!unique.has(key)) unique.set(key, label);
    if (unique.size >= 2) paths.push(unique);
  }
  if (paths.length < 3) return [...aisleOrder];

  const standard = new Map(aisleOrder.map((label, index) => [keyOf(label), { label, index }]));
  const observed = new Map();
  for (const path of paths) {
    let index = 0;
    for (const [key, label] of path) {
      if (!observed.has(key)) observed.set(key, { key, label: standard.get(key)?.label ?? label, total: 0, count: 0 });
      const record = observed.get(key);
      record.total += index++ / (path.size - 1);
      record.count++;
    }
  }
  const fallbackRank = (key) => standard.get(key)?.index ?? standard.size;
  const ranked = [...observed.values()].sort((a, b) =>
    a.total / a.count - b.total / b.count ||
    fallbackRank(a.key) - fallbackRank(b.key) || a.label.localeCompare(b.label, "pt-BR"));
  return [...ranked.map(({ label }) => label), ...aisleOrder.filter((label) => !observed.has(keyOf(label)))];
}
