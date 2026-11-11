import { itemsOf, lineTotal } from "./shopping.mjs";
import { productKey, productsOf } from "./shoppingPurchases.mjs";

const MAX_CENTS = Number.MAX_SAFE_INTEGER;
const cents = (value) => Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), MAX_CENTS) : 0;
const addCents = (a, b) => a > MAX_CENTS - b ? MAX_CENTS : a + b;

export function budgetStatus({ limitCents, cartCents, pendingEstimateCents } = {}) {
  const limit = cents(limitCents);
  const cart = cents(cartCents);
  const pending = cents(pendingEstimateCents);
  const projectedCents = addCents(cart, pending);
  if (!limit) return { level: "ok", remainingCents: null, projectedCents, message: "Sem orçamento definido." };

  // A classificação leva em conta a soma mesmo quando o valor exibível precisa ser limitado.
  const projected = BigInt(cart) + BigInt(pending);
  const threshold = BigInt(limit);
  const level = projected > threshold ? "over" : projected * 100n >= threshold * 85n ? "near" : "ok";
  const remaining = threshold - projected;
  return {
    level,
    remainingCents: Number(remaining < -BigInt(MAX_CENTS) ? -BigInt(MAX_CENTS) : remaining),
    projectedCents,
    message: level === "over" ? "A estimativa passou do limite." :
      level === "near" ? "A estimativa está perto do limite." : "A estimativa está dentro do limite.",
  };
}

export function suggestCuts(state, limitCents) {
  const limit = cents(limitCents);
  if (!limit) return [];

  const frequency = new Map(productsOf(state).map((product) => [
    product.key ?? productKey(product.name, product.unit ?? ""),
    Number.isSafeInteger(product.buys) && product.buys >= 0 ? product.buys : 0,
  ]));
  let over = -BigInt(limit);
  const candidates = [];
  for (const item of itemsOf(state)) {
    const savingsCents = cents(lineTotal(item));
    over += BigInt(savingsCents);
    if (!savingsCents || item.inCart || item.essential === true || item.isEssential === true) continue;
    const buys = frequency.get(productKey(item.name, item.unit ?? "")) ?? 0;
    candidates.push({ id: item.id, name: item.name, savingsCents, buys });
  }
  if (over <= 0n) return [];
  candidates.sort((a, b) => b.savingsCents - a.savingsCents || a.buys - b.buys || a.name.localeCompare(b.name, "pt-BR"));
  const cuts = [];
  for (const candidate of candidates) {
    cuts.push(candidate);
    over -= BigInt(candidate.savingsCents);
    if (cuts.length === 5 || over <= 0n) break;
  }
  return cuts;
}
