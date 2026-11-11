const units = new Map([
  ["kg", ["g", 1000]], ["g", ["g", 1]], ["l", ["ml", 1000]], ["ml", ["ml", 1]],
  ["un", ["un", 1]], ["unid", ["un", 1]], ["unidade", ["un", 1]], ["unidades", ["un", 1]],
  ["m", ["m", 1]], ["cm", ["m", 0.01]],
]);
const measure = /(?<![\p{L}\p{N}.,])(?:(\d{1,6})\s*[x×]\s*)?(\d{1,9}(?:[.,]\d{1,6})?)\s*(unidades?|unid|ml|kg|cm|un|[glm])(?![\p{L}\p{N}])/giu;

export function parsePackSize(name) {
  if (typeof name !== "string" || name.length > 1024) return null;
  let last;
  for (const match of name.matchAll(measure)) last = match;
  if (!last) return null;
  const [text, count, raw, symbol] = last;
  const [unit, factor] = units.get(symbol.toLowerCase());
  const amount = Number((Number(raw.replace(",", ".")) * Number(count ?? 1) * factor).toPrecision(15));
  return amount > 0 && amount <= Number.MAX_SAFE_INTEGER ? { amount, unit, text } : null;
}

function fraction(n) {
  const [mantissa, power = "0"] = String(n).split("e");
  const [whole, decimal = ""] = mantissa.split(".");
  const scale = decimal.length - Number(power);
  const digits = BigInt(whole + decimal);
  return scale >= 0 ? [digits, 10n ** BigInt(scale)] : [digits * 10n ** BigInt(-scale), 1n];
}

function rate(priceCents, size) {
  if (!Number.isSafeInteger(priceCents) || priceCents < 0 || !["g", "ml", "un", "m"].includes(size?.unit) ||
      !Number.isFinite(size?.amount) || size.amount <= 0) return null;
  const [numerator, denominator] = fraction(size.amount);
  const base = size.unit === "g" || size.unit === "ml" ? 1000n : 1n;
  return [BigInt(priceCents) * base * denominator, numerator];
}

export function pricePerBase(priceCents, size) {
  const value = rate(priceCents, size);
  if (!value) return null;
  const [num, den] = value;
  const cents = Number((2n * num + den) / (2n * den));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function comparePacks(a, b) {
  const sizeA = a?.size ?? parsePackSize(a?.name);
  const sizeB = b?.size ?? parsePackSize(b?.name);
  if (!sizeA || !sizeB) return { ok: false, reason: "Informe o tamanho das duas embalagens." };
  if (sizeA.unit !== sizeB.unit) return { ok: false, reason: "As embalagens usam unidades incompatíveis." };
  const valueA = rate(a.priceCents, sizeA);
  const valueB = rate(b.priceCents, sizeB);
  const aCents = pricePerBase(a.priceCents, sizeA);
  const bCents = pricePerBase(b.priceCents, sizeB);
  if (!valueA || !valueB || aCents === null || bCents === null)
    return { ok: false, reason: "Informe preços e tamanhos válidos para comparar." };
  const left = valueA[0] * valueB[1];
  const right = valueB[0] * valueA[1];
  const winner = left === right ? "tie" : left < right ? "a" : "b";
  const high = left > right ? left : right;
  const low = left < right ? left : right;
  const percent = high === 0n ? 0 : Number(((high - low) * 20000n + high) / (2n * high)) / 100;
  return { ok: true, winner, percent, aCents, bCents };
}
