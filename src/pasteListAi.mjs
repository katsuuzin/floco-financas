import { MAX_ITEMS, MAX_NAME } from "./shopping.mjs";
import { parsePastedList } from "./pasteList.mjs";
import { normalizeName } from "./shoppingPurchases.mjs";

const MAX_AI_TEXT = 12_000;
const TIMEOUT_MS = 8_000;
const UNITS = new Set(["", "g", "kg", "ml", "l"]);

// Texto que fala com o modelo (e não é uma lista) não vai para a IA: fica só a leitura no aparelho.
const INSTRUCTION = /\b(?:ignore|ignora|desconsidere|esque[çc]a)\b[^\n]{0,60}\b(?:instru|regra|anterior|acima)|\b(?:retorne|responda|devolva|finja|system prompt|prompt do sistema)\b/iu;

function grounded(name, input) {
  const hay = normalizeName(input).split(" ").filter(Boolean);
  return normalizeName(name).split(" ").filter((w) => w.length >= 3)
    .some((w) => hay.some((h) => h.startsWith(w.slice(0, 4)) || w.startsWith(h.slice(0, 4))));
}

function validateItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > MAX_ITEMS) return null;
  const validated = [];
  for (const item of items) {
    if (!item || typeof item.name !== "string" || !UNITS.has(item.unit)) return null;
    const name = item.name.replace(/\s+/g, " ").trim();
    const { qty, unit } = item;
    if (!name || name.length > MAX_NAME || !/\p{L}/u.test(name)) return null;
    if (!Number.isFinite(qty) || qty <= 0 || qty > 9999 || (!unit && !Number.isInteger(qty))) return null;
    validated.push({ name, qty, unit });
  }
  return validated;
}

// A tela chama este caminho após a pessoa escolher interpretar com IA.
// O provedor devolve dados estruturados e recebe somente o texto selecionado.
export async function interpretPastedList(text, interpret, { signal } = {}) {
  const input = typeof text === "string" ? text.trim() : "";
  const local = () => ({ source: "local", items: parsePastedList(input) });
  // Texto grande demais para enviar: não envia nem lê a cauda; a tela avisa (tooLong).
  if (input.length > MAX_AI_TEXT) return { source: "local", items: [], tooLong: true };
  if (!input || typeof interpret !== "function" || signal?.aborted || INSTRUCTION.test(input)) return local();

  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  let timer;
  try {
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => {
        resolve(null);
        controller.abort();
      }, TIMEOUT_MS);
    });
    const result = await Promise.race([interpret(input, { signal: controller.signal }), timeout]);
    // Cancelado de fora (mesmo que o interpretador ignore o sinal): descarta a resposta tardia.
    if (signal?.aborted) return local();
    const items = validateItems(result);
    // Cada item devolvido precisa vir do texto colado: instrução escondida no texto não cria itens novos.
    return items && items.every((i) => grounded(i.name, input)) ? { source: "ai", items } : local();
  } catch {
    return local();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
