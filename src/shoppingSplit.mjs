import { categoryTree, LEGACY_ROOTS } from "./categories.mjs";
import { itemsOf, lineTotal } from "./shopping.mjs";

const market = LEGACY_ROOTS[0];
const mappings = new Map([
  ["Limpeza", ["Moradia", "Limpeza"]],
  ["Higiene", ["Cuidados Pessoais", "Higiene"]],
  ["Pet", ["Pets", "Ração"]],
]);

export function splitDraft(state, { mode = "single" } = {}) {
  const tree = categoryTree(state, "expense");
  const groups = new Map();
  const unpriced = [];
  for (const item of itemsOf(state)) {
    if (!item.inCart) continue;
    const total = lineTotal(item);
    if (total == null) {
      unpriced.push(item);
      continue;
    }
    if (!Number.isFinite(total) || total < 0 || total > Number.MAX_SAFE_INTEGER)
      throw RangeError("Valor do item inválido.");
    const [root = market, sub] = mode === "category" ? mappings.get(item.category) || [] : [];
    const custom = mode === "category" && item.category === "Limpeza" && tree.find((entry) => entry.name === "Limpeza");
    const category = custom ? custom.name : root;
    const subcategory = !custom && tree.find((entry) => entry.name === root)?.subs.includes(sub) ? sub : "";
    const key = JSON.stringify([category, subcategory]);
    if (!groups.has(key)) groups.set(key, { category, subcategory, whole: 0n, fraction: 0 });
    const group = groups.get(key);
    const whole = Math.floor(total);
    group.whole += BigInt(whole);
    group.fraction += total - whole;
  }
  const ordered = [...groups.values()].map((group) => {
    const whole = Math.floor(group.fraction);
    return { ...group, whole: group.whole + BigInt(whole), fraction: group.fraction - whole };
  }).sort((a, b) => a.whole === b.whole ? b.fraction - a.fraction : a.whole > b.whole ? -1 : 1);
  const whole = ordered.reduce((sum, group) => sum + group.whole, 0n);
  const fractions = ordered.reduce((sum, group) => sum + group.fraction, 0);
  const total = whole + BigInt(Math.round(fractions + 1e-9));
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw RangeError("Total da compra grande demais.");
  const amounts = ordered.map((group) => group.whole + BigInt(Math.round(group.fraction + 1e-9)));
  let remainder = total - amounts.reduce((sum, amount) => sum + amount, 0n);
  // A maior categoria absorve a diferença até o limite do seu saldo.
  for (let index = 0; index < amounts.length && remainder !== 0n; index++) {
    const adjustment = remainder < -amounts[index] ? -amounts[index] : remainder;
    amounts[index] += adjustment;
    remainder -= adjustment;
  }
  const expenses = ordered.flatMap(({ category, subcategory }, index) => amounts[index] > 0n ? [{
    type: "expense", category, ...(subcategory ? { subcategory } : {}),
    amountCents: Number(amounts[index]),
    description: mode === "category" ? `Compra de mercado · ${subcategory || category}` : "Compra de mercado",
  }] : []);
  return { totalCents: Number(total), expenses, unpriced };
}
