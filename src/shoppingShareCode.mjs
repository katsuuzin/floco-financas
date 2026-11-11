import { itemsOf } from "./shopping.mjs";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const units = ["", "g", "kg", "ml", "l"];
// A ordem faz parte do formato v1 e permanece fixa quando o catálogo mudar.
const categories = ["Hortifrúti", "Carnes e peixes", "Frios e laticínios", "Padaria", "Mercearia",
  "Bebidas", "Congelados", "Limpeza", "Higiene", "Pet", "Outros"];
const defaultFlags = (categories.length - 1) * 10;
const limit = 4000;
const maxItems = 2000;
const failure = (reason) => ({ ok: false, reason });

function pack(text) {
  const source = encodeURIComponent(text);
  let code = "";
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < source.length; i++) {
    let byte = source.charCodeAt(i);
    if (source[i] === "%") { byte = Number.parseInt(source.slice(i + 1, i + 3), 16); i += 2; }
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      code += alphabet[(buffer >> bits) & 63];
    }
  }
  if (bits) code += alphabet[(buffer << (6 - bits)) & 63];
  return code;
}

function unpack(code) {
  if (code.length % 4 === 1) throw Error("Código de compartilhamento inválido.");
  let escaped = "";
  let buffer = 0;
  let bits = 0;
  for (const char of code) {
    buffer = (buffer << 6) | alphabet.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      escaped += "%" + ((buffer >> bits) & 255).toString(16).padStart(2, "0");
    }
  }
  if ((buffer & ((1 << bits) - 1)) !== 0) throw Error("Código de compartilhamento inválido.");
  return decodeURIComponent(escaped);
}

// Soma FNV-1a para detectar corrupção durante cópia. Não autentica remetente.
function checksum(code) {
  let value = 2166136261;
  for (let i = 0; i < code.length; i++) value = Math.imul(value ^ code.charCodeAt(i), 16777619);
  return (value >>> 0).toString(16).padStart(8, "0");
}

const validName = (name) => typeof name === "string" && name.length <= 120 && !!name.trim() &&
  !/[\p{Cc}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/u.test(name) && !/[\uD800-\uDFFF]/u.test(name);
const validQuantity = (qty) => Number.isFinite(qty) && qty > 0 && qty <= 9999;
const categoryOf = (value) => Number.isInteger(value) && value >= 0 && value < categories.length;

export function encodeShareCode(state, { now } = {}) {
  const items = itemsOf(state ?? {});
  if (!Array.isArray(items) || items.length > maxItems) return failure("A lista ultrapassa 2.000 itens.");
  if (now !== undefined && (!Number.isSafeInteger(now) || now < 0)) return failure("Data de compartilhamento inválida.");
  const data = [];
  let nameChars = 0;
  for (const item of items) {
    const name = item?.name;
    const qty = item?.qty;
    const unit = units.indexOf(item?.unit ?? "");
    const category = categories.indexOf(item?.category ?? "Outros");
    if (!validName(name) || !validQuantity(qty) || unit < 0 || category < 0 ||
        (item.inCart !== undefined && typeof item.inCart !== "boolean"))
      return failure("A lista contém um item inválido para compartilhar.");
    nameChars += name.length;
    if (nameChars > limit) return failure("O código ultrapassa 4.000 caracteres.");
    const flags = category * 10 + unit * 2 + Number(!!item.inCart);
    data.push(qty === 1 && flags === defaultFlags ? name : [name, qty, flags]);
  }
  const encoded = pack(JSON.stringify([now ?? null, data]));
  const payload = "1." + encoded;
  const code = payload + "." + checksum(payload);
  return code.length <= limit ? { ok: true, code } : failure("O código ultrapassa 4.000 caracteres.");
}

export function decodeShareCode(text) {
  if (typeof text !== "string" || text.length > limit) return failure("Código de compartilhamento inválido ou grande demais.");
  const match = /^(\d+)\.([A-Za-z0-9_-]+)\.([0-9a-f]{8})$/u.exec(text);
  if (!match || match[0] !== text) return failure("Código de compartilhamento inválido.");
  const [, version, code, sum] = match;
  if (version !== "1") return failure("Versão de compartilhamento incompatível.");
  if (checksum(version + "." + code) !== sum) return failure("O código foi alterado ou está incompleto.");
  try {
    const value = JSON.parse(unpack(code));
    if (!Array.isArray(value) || value.length !== 2 ||
        (value[0] !== null && (!Number.isSafeInteger(value[0]) || value[0] < 0)) ||
        !Array.isArray(value[1]) || value[1].length > maxItems)
      return failure("Dados da lista compartilhada inválidos.");
    const items = [];
    for (const row of value[1]) {
      const entry = typeof row === "string" ? [row, 1, defaultFlags] : row;
      if (!Array.isArray(entry) || entry.length !== 3) return failure("A lista compartilhada contém um item inválido.");
      const [name, qty, flags] = entry;
      const category = Math.floor(flags / 10);
      const unit = Math.floor((flags % 10) / 2);
      if (!validName(name) || !validQuantity(qty) || !Number.isInteger(flags) || !categoryOf(category) || unit >= units.length)
        return failure("A lista compartilhada contém um item inválido.");
      items.push({ name, qty, unit: units[unit], category: categories[category], inCart: flags % 2 === 1 });
    }
    return { ok: true, items };
  } catch {
    return failure("Dados da lista compartilhada inválidos.");
  }
}
