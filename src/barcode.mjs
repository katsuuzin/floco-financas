import { isValidEan } from "./openFoodFacts.mjs";

export function isValidChecksum(code) {
  return typeof code === "string" && (code.length === 8 || code.length === 13) && isValidEan(code);
}

export function normalizeBarcode(raw) {
  if (typeof raw !== "string") return { ok: false, reason: "O código de barras deve ser texto." };
  if (raw.length > 256) return { ok: false, reason: "O código de barras é longo demais." };
  const digits = raw.replace(/[\s-]/g, "");
  if (!digits) return { ok: false, reason: "Informe um código de barras." };
  if (/\D/.test(digits)) return { ok: false, reason: "Use apenas números, espaços ou hífens." };
  if (![8, 12, 13].includes(digits.length)) {
    return { ok: false, reason: "O código precisa ter 8, 12 ou 13 dígitos." };
  }
  const format = digits.length === 12 ? "UPC-A" : digits.length === 8 ? "EAN-8" : "EAN-13";
  const code = format === "UPC-A" ? "0" + digits : digits;
  if (!isValidChecksum(code)) return { ok: false, reason: "O dígito verificador do código é inválido." };
  return { ok: true, code, format };
}
