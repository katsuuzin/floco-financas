import { lineTotal, shoppingSummary } from "./shopping.mjs";

const count = (n, singular, plural) => n + " " + (n === 1 ? singular : plural);
const validCount = (n) => Number.isSafeInteger(n) && n >= 0 ? n : 0;
const units = { kg: ["quilo", "quilos"], g: ["grama", "gramas"], l: ["litro", "litros"], ml: ["mililitro", "mililitros"] };
const clean = (value) => typeof value === "string" ? value.replace(/[^\p{L}\p{M}\p{N}\s-]/gu, " ")
  .replace(/[\uFE0E\uFE0F\u20E3]/gu, "").replace(/\s+/gu, " ").trim() : "";
const bounded = (name, detail) => {
  let end = 120 - detail.length - 2;
  if (end <= 0) return detail.slice(0, 120);
  if (/[\uD800-\uDBFF]/u.test(name[end - 1] ?? "")) end--;
  return name.slice(0, end).trimEnd() + ", " + detail;
};

export function describeMoney(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) return "sem preço";
  const value = BigInt(cents);
  const reais = Number(value / 100n);
  const change = Number(value % 100n);
  const main = count(reais, "real", "reais");
  const fraction = count(change, "centavo", "centavos");
  if (!change) return main;
  return reais ? main + " e " + fraction : fraction;
}

export function describeItem(item) {
  const name = clean(item?.name) || "Item sem nome";
  const quantity = Number.isFinite(item?.qty) && item.qty > 0 ? item.qty : 1;
  const unit = Object.hasOwn(units, item?.unit) ? units[item.unit] : ["unidade", "unidades"];
  const price = item?.priceCents == null ? null : lineTotal({ ...item, qty: quantity });
  const money = item?.priceCents == null ? "sem preço" : describeMoney(price);
  const label = String(quantity).replace(".", ",") + " " + (quantity === 1 ? unit[0] : unit[1]);
  return bounded(name, label + ", " + (item?.inCart ? "no carrinho" : "pendente") + ", " + money);
}

export function describeSummary(state) {
  const { total, inCart, estimatedCents, unpriced } = shoppingSummary(state ?? {});
  const missing = unpriced ? ", " + count(unpriced, "item", "itens") + " sem preço" : "";
  return count(total, "item", "itens") + ", " + inCart + " no carrinho" +
    (estimatedCents > 0 ? ", estimativa de " + describeMoney(estimatedCents) : "") + missing;
}

export function describeProgress(sum) {
  const total = validCount(sum?.total);
  const marked = Math.min(total, validCount(sum?.inCartCount ?? sum?.inCart));
  const percent = total ? Math.round(marked / total * 100) : 0;
  const totalLabel = marked + " de " + count(total, "item", "itens") + " no carrinho, " + percent + " por cento";
  const suffix = Number.isSafeInteger(sum?.cartCents) ? ", " + describeMoney(sum.cartCents) : "";
  return (totalLabel + suffix).length <= 120 ? totalLabel + suffix : totalLabel;
}
