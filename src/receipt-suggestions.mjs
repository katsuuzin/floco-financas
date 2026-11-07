import { parseMoney, isDate } from "./finance.mjs";
export function receiptAmounts(text) {
  return [
    ...new Set(
      [
        ...text.matchAll(/(?<![\d.,])(?:R\$\s*)?\d+(?:\.\d{3})*,\d{2}(?!\d)/g),
      ].map((m) => m[0].replace(/^R\$\s*/, "")),
    ),
  ]
    .filter((v) => {
      try {
        parseMoney(v);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 100);
}
export function receiptDates(text) {
  return [
    ...new Set(
      [...text.matchAll(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g)]
        .map((m) => `${m[3]}-${m[2]}-${m[1]}`)
        .filter(isDate),
    ),
  ];
}
