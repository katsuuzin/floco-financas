import { MAX_ITEMS, MAX_NAME } from "./shopping.mjs";
import { parsePastedList } from "./pasteList.mjs";

const MAX_AI_TEXT = 12_000;
const TIMEOUT_MS = 8_000;
const UNITS = new Set(["", "g", "kg", "ml", "l"]);

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
  if (!input || input.length > MAX_AI_TEXT || typeof interpret !== "function" || signal?.aborted) return local();

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
    const items = validateItems(result);
    return items ? { source: "ai", items } : local();
  } catch {
    return local();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
