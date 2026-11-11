import { itemsOf } from "./shopping.mjs";
import { scorePair, tokens } from "./shoppingMatch.mjs";
import { lastKnownPrice, productKey, productsOf } from "./shoppingPurchases.mjs";

const validPrice = (price) => Number.isSafeInteger(price) && price > 0;
function addToIndex(index, key, candidate) {
  if (!index.has(key)) index.set(key, new Set());
  index.get(key).add(candidate);
}

function recentPrices(product) {
  const seen = new Set();
  return (product.prices ?? []).map((point, index) => ({ ...point, index }))
    .filter((point) => validPrice(point.priceCents))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.index - a.index)
    .filter(({ purchaseId }) => {
      if (!purchaseId) return true;
      if (seen.has(purchaseId)) return false;
      seen.add(purchaseId);
      return true;
    })
    .slice(0, 3)
    .map(({ priceCents }) => priceCents);
}

// Item com unidade (kg, g, l, ml) guarda o total da linha; o histórico guarda o preço por unidade.
// Então 0,5 kg a R$ 8,00/kg vira R$ 4,00. Sem unidade, o preço é por item e não muda.
function portionPrice(item, unitPriceCents) {
  if (!item.unit) return unitPriceCents;
  const qty = Number(item.qty);
  if (!Number.isFinite(qty) || qty <= 0) return unitPriceCents;
  return Math.max(1, Math.round(unitPriceCents * qty));
}

function indexHistory(state) {
  const exact = new Map();
  const bucketsByUnit = new Map();
  for (const product of productsOf(state)) {
    const unit = product.unit ?? "";
    const key = productKey(product.name, unit);
    const points = recentPrices(product);
    const record = { ...product, key };
    const known = lastKnownPrice({ shoppingProducts: [record] }, product.name, unit);
    const last = validPrice(known) ? known : points[0];
    if (!last) continue;
    const median = points.length === 3 ? [...points].sort((a, b) => a - b)[1] : null;
    const useMedian = median !== null && Math.abs(last - median) > median * 0.4;
    const candidate = {
      name: product.name, priceCents: useMedian ? median : last,
      source: useMedian ? "median" : "last", basedOn: useMedian ? 3 : 1,
    };
    if (!exact.has(key)) exact.set(key, candidate);
    if (!bucketsByUnit.has(unit)) bucketsByUnit.set(unit, { words: new Map(), starts: new Map() });
    const { words, starts } = bucketsByUnit.get(unit);
    for (const token of new Set(tokens(product.name))) {
      addToIndex(words, token, candidate);
      for (let length = 3; length <= token.length; length++) {
        addToIndex(starts, token.slice(0, length), candidate);
      }
    }
  }
  return { exact, bucketsByUnit };
}

function bestMatch(item, history) {
  const unit = item.unit ?? "";
  const direct = history.exact.get(productKey(item.name, unit));
  if (direct) return direct;
  const buckets = history.bucketsByUnit.get(unit);
  if (!buckets) return null;
  const listTokens = tokens(item.name);
  const required = Math.ceil(listTokens.length * 0.6);
  const options = new Map();
  for (const token of listTokens) {
    const matches = new Set(buckets.starts.get(token) ?? buckets.words.get(token));
    for (let length = 3; length < token.length; length++) {
      for (const candidate of buckets.words.get(token.slice(0, length)) ?? []) matches.add(candidate);
    }
    for (const candidate of matches) options.set(candidate, (options.get(candidate) ?? 0) + 1);
  }
  let best = null;
  let rank;
  for (const [candidate, matched] of options) {
    if (matched < required) continue;
    const next = scorePair(item.name, candidate.name);
    if (!next.score) continue;
    if (!rank || next.score > rank.score ||
        (next.score === rank.score && (next.pos < rank.pos ||
          (next.pos === rank.pos && next.extras < rank.extras)))) {
      best = candidate;
      rank = next;
    }
  }
  return best;
}

export function suggestPrices(state) {
  const unpriced = itemsOf(state).filter((item) => item.priceCents == null);
  if (!unpriced.length) return [];
  const history = indexHistory(state);
  const memo = new Map();
  return unpriced.flatMap((item) => {
    const key = productKey(item.name, item.unit ?? "");
    if (!memo.has(key)) memo.set(key, bestMatch(item, history));
    const match = memo.get(key);
    return match ? [{
      id: item.id, name: item.name, priceCents: portionPrice(item, match.priceCents),
      source: match.source, basedOn: match.basedOn,
    }] : [];
  });
}

export function applySuggestedPrices(state, ids) {
  const selected = ids === undefined ? null : new Set(ids);
  const prices = new Map(suggestPrices(state)
    .filter(({ id }) => selected === null || selected.has(id))
    .map(({ id, priceCents }) => [id, priceCents]));
  if (!prices.size) return state;
  return { ...state, shoppingItems: itemsOf(state).map((item) =>
    item.priceCents == null && prices.has(item.id) ? { ...item, priceCents: prices.get(item.id) } : item) };
}
