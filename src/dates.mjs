// Datas no formato brasileiro. O app guarda "AAAA-MM-DD" por dentro, mas mostra e recebe "DD/MM/AAAA".
import { isDate } from "./finance.mjs";

// "2026-11-12" -> "12/11/2026". Entrada vazia ou inválida volta como veio (vazia, ou o próprio texto).
export function brDate(iso) {
  if (typeof iso !== "string") return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/u.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}

// Mostra só dia e mês ("12/11") quando o ano é o de `ref`; senão a data completa.
export function brDateShort(iso, ref = new Date().toISOString().slice(0, 10)) {
  const full = brDate(iso);
  return typeof iso === "string" && iso.slice(0, 4) === ref.slice(0, 4) && full.length === 10 ? full.slice(0, 5) : full;
}

// Máscara enquanto se digita: só dígitos, com "/" depois do dia e do mês ("12112026" -> "12/11/2026").
export function maskBrDate(text) {
  const digits = String(text ?? "").replace(/\D/gu, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// "12/11/2026" (ou "12/11/26", ou já "2026-11-12") -> "2026-11-12". Data que não existe devolve "".
export function parseBrDate(text) {
  const value = String(text ?? "").trim();
  if (isDate(value)) return value;
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/u.exec(value);
  if (!match) return "";
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  const iso = `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return isDate(iso) ? iso : "";
}
