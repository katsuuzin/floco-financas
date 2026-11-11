import { categorize, SHOPPING_CATEGORIES } from "./shopping.mjs";
import { normalizeName } from "./shoppingPurchases.mjs";

const rulesOf = (state) => state.shoppingCategoryRules ?? [];
const keyOf = (name) => typeof name === "string" && name.length <= 512 ? normalizeName(name) : "";

export function learnCategory(state, name, category) {
  if (!SHOPPING_CATEGORIES.includes(category)) throw Error("Categoria inválida.");
  const key = keyOf(name);
  if (!key) throw Error("Informe o nome do produto.");
  const rules = rulesOf(state);
  if (rules.find((rule) => rule.key === key)?.category === category) return state;
  return { ...state, shoppingCategoryRules: [...rules.filter((rule) => rule.key !== key), { key, category }].slice(-500) };
}

export function categorizeLearned(state, name) {
  const key = keyOf(name);
  if (!key) return "Outros";
  const rules = rulesOf(state);
  const exact = rules.find((rule) => rule.key === key);
  if (exact) return exact.category;
  const words = key.split(" ");
  for (let length = words.length; length > 0; length--) {
    const prefix = words.slice(0, length).join(" ") + " ";
    const examples = rules.filter((rule) => rule.key.startsWith(prefix));
    if (examples.length >= 3 && examples.every((rule) => rule.category === examples[0].category))
      return examples[0].category;
  }
  return categorize(name);
}

export function forgetCategory(state, name) {
  const key = keyOf(name);
  const rules = rulesOf(state);
  if (!rules.some((rule) => rule.key === key)) return state;
  return { ...state, shoppingCategoryRules: rules.filter((rule) => rule.key !== key) };
}
