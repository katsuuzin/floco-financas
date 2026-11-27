// Trocar a categoria de lançamentos (um a um ou em lote) a partir da aba Análise, com sugestão
// de regra para o próximo lançamento do mesmo comerciante. Funções puras, sem tela.
import { categorize, saveRule } from "./rules.mjs";

const stripDiacritics = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");

// Troca categoria e subcategoria dos lançamentos `ids`. Marca `categoryLocked`, para as regras
// automáticas não desfazerem a escolha. Devolve { state, changed } e não mexe no que já estava igual.
export function recategorize(state, ids, category, subcategory = "") {
  if (!category) throw Error("Escolha a categoria.");
  const want = new Set(ids);
  let changed = 0;
  const transactions = state.transactions.map((t) => {
    if (!want.has(t.id)) return t;
    if ((t.category || "Outros") === category && (t.subcategory || "") === (subcategory || "")) return t;
    changed++;
    const { subcategory: _old, ...rest } = t;
    return { ...rest, category, ...(subcategory ? { subcategory } : {}), categoryLocked: true };
  });
  return { state: changed ? { ...state, transactions } : state, changed };
}

// Padrão de regra para uma descrição: a primeira palavra com 3+ letras, em maiúsculas e com
// curinga ("Uber · Vila Madalena" vira "UBER*"). null quando não dá para sugerir com segurança.
export function suggestRulePattern(description) {
  const word = stripDiacritics(description)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .find((w) => w.length >= 3 && !/^\d+$/.test(w));
  return word ? `${word}*` : null;
}

// Depois de recategorizar `ids`, vale perguntar se quer criar uma regra? Só quando todos têm o
// mesmo comerciante (mesmo padrão) e as regras de hoje ainda não mandariam para essa categoria.
export function ruleSuggestion(state, ids, category, subcategory = "") {
  const rows = state.transactions.filter((t) => ids.includes(t.id));
  if (!rows.length) return null;
  const type = rows[0].type === "income" ? "income" : "expense";
  const patterns = new Set(rows.map((t) => suggestRulePattern(t.description)));
  if (patterns.size !== 1) return null;
  const [pattern] = [...patterns];
  if (!pattern) return null;
  const hit = categorize(state, rows[0].description, type);
  if (hit && hit.category === category && (hit.subcategory || "") === (subcategory || "")) return null;
  return { pattern, type, category, subcategory, samples: rows.length };
}

// Cria a regra sugerida (prioridade acima das iniciais, para valer sobre elas).
export function addSuggestedRule(state, suggestion) {
  return saveRule(state, { pattern: suggestion.pattern, type: suggestion.type, category: suggestion.category, subcategory: suggestion.subcategory, priority: 20 });
}

// Foto da categoria dos lançamentos `ids`, para desfazer o movimento depois.
export function snapshotCategories(state, ids) {
  const want = new Set(ids);
  return state.transactions.filter((t) => want.has(t.id)).map((t) => ({ id: t.id, category: t.category, subcategory: t.subcategory, categoryLocked: t.categoryLocked }));
}

// Volta categoria, subcategoria e a trava como estavam na foto.
export function revertCategories(state, snapshot) {
  const before = new Map(snapshot.map((x) => [x.id, x]));
  return {
    ...state,
    transactions: state.transactions.map((t) => {
      const old = before.get(t.id);
      if (!old) return t;
      const { category: _c, subcategory: _s, categoryLocked: _l, ...rest } = t;
      return {
        ...rest,
        ...(old.category !== undefined ? { category: old.category } : {}),
        ...(old.subcategory !== undefined ? { subcategory: old.subcategory } : {}),
        ...(old.categoryLocked !== undefined ? { categoryLocked: old.categoryLocked } : {}),
      };
    }),
  };
}
