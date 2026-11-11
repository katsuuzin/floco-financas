const maximum = BigInt(Number.MAX_SAFE_INTEGER);
const isCents = (n) => Number.isSafeInteger(n) && n >= 0;

function ratio(value) {
  const [mantissa, exponent = "0"] = value.toString().split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  const places = fraction.length - Number(exponent);
  const digits = BigInt(whole + fraction);
  return places < 0 ? [digits * 10n ** BigInt(-places), 1n] : [digits, 10n ** BigInt(places)];
}

const round = (numerator, denominator) => (2n * numerator + denominator) / (2n * denominator);

function totals(item, deal) {
  if (!isCents(item?.priceCents) || !Number.isFinite(item.qty) || item.qty <= 0)
    return { totalCents: null, savedCents: 0 };
  const [qty, divisor] = ratio(item.qty);
  const price = BigInt(item.priceCents);
  const original = item.unit ? price : round(price * qty, divisor);
  let total = original;
  let clipped = false;
  switch (deal?.type) {
    case "percent": {
      const [value, scale] = ratio(deal.value);
      total = round(original * (100n * scale - value), 100n * scale);
      break;
    }
    case "amountOff":
      total = original - BigInt(deal.cents);
      clipped = total < 0n;
      if (clipped) total = 0n;
      break;
    case "buyXPayY":
      if (!item.unit && Number.isSafeInteger(item.qty)) {
        const packs = qty / BigInt(deal.x);
        total = original - price * packs * BigInt(deal.x - deal.y);
      }
      break;
    case "unitPrice":
      total = round(BigInt(deal.cents) * qty, divisor);
      if (total > original) total = original; // promoção nunca aumenta a cobrança
      break;
  }
  if (total > maximum || original - total > maximum) throw RangeError("Valor da promoção grande demais.");
  return { totalCents: Number(total), savedCents: Number(original > total ? original - total : 0n), clipped };
}

export function validateDeal(deal, item) {
  let reason;
  switch (deal?.type) {
    case "percent":
      if (!Number.isFinite(deal.value) || deal.value < 0 || deal.value > 100)
        reason = "Informe um percentual de 0 a 100.";
      break;
    case "amountOff":
    case "unitPrice":
      if (!isCents(deal.cents)) reason = "Informe um valor inteiro em centavos, a partir de zero.";
      break;
    case "buyXPayY":
      if (!Number.isSafeInteger(deal.x) || deal.x < 1 || !isCents(deal.y) || deal.y > deal.x)
        reason = "Informe quantas unidades levar e pagar. A quantidade a pagar não pode superar a quantidade levada.";
      break;
    default:
      reason = "Tipo de promoção inválido.";
  }
  if (reason) return { ok: false, reason };
  if (deal.type === "amountOff" && item) {
    try {
      if (totals(item, deal).clipped)
        return { ok: true, warning: "O desconto supera o preço. O total do item será zero." };
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return { ok: false, reason: error.message };
    }
  }
  return { ok: true };
}

export function applyDeal(item, deal) {
  const { totalCents, savedCents } = totals(item, validateDeal(deal).ok ? deal : null);
  return { totalCents, savedCents };
}
