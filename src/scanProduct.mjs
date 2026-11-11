import { normalizeBarcode } from "./barcode.mjs";
import { lookupEan } from "./openFoodFacts.mjs";
import { itemsOf } from "./shopping.mjs";
import { normalizeName } from "./shoppingPurchases.mjs";

const clean = (value) => typeof value === "string" && !/[<>]/.test(value)
  ? value.replace(/\s+/g, " ").trim() : "";

// O cliente genérico retorna null tanto para ausência quanto para falha de rede.
// Este adaptador preserva a distinção para o fluxo de scanner.
export function createOpenFoodFactsLookup(fetchImpl) {
  return async (code, { signal } = {}) => {
    let failed = false;
    const product = await lookupEan(code, async (url, options) => {
      try {
        const response = await fetchImpl(url, signal ? { ...options, signal } : options);
        failed = response.status === 429 || response.status >= 500;
        return response;
      } catch (error) {
        failed = true;
        throw error;
      }
    });
    if (failed) throw Error("A consulta ao catálogo falhou.");
    return product;
  };
}

export async function resolveScan({ raw, lookup, timeoutMs = 8000 }) {
  const barcode = normalizeBarcode(raw);
  if (!barcode.ok) return { status: "invalid", reason: barcode.reason };
  const { code } = barcode;
  const offline = { status: "offline", code };
  if (typeof lookup !== "function") return offline;

  const controller = new AbortController();
  let timer;
  const read = async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const product = await lookup(code, { signal: controller.signal });
        const name = clean(product?.name);
        if (!name || name.length > 200) return { status: "not_found", code };
        return {
          status: "found", name, brand: clean(product.brand),
          quantityText: clean(product.quantity), code,
        };
      } catch {
        if (controller.signal.aborted) break;
      }
    }
    return offline;
  };
  try {
    const deadline = Number.isFinite(timeoutMs) && timeoutMs >= 0 ? timeoutMs : 8000;
    return await Promise.race([new Promise((resolve) => {
      timer = setTimeout(() => {
        resolve(offline);
        controller.abort();
      }, deadline);
    }), read()]);
  } finally {
    clearTimeout(timer);
  }
}

const normalizePart = (text) => normalizeName(text.replace(/(\d)\s+(kg|g|ml|l)\b/gi, "$1$2"));
const alreadyIn = (name, addition) => {
  const part = normalizePart(addition);
  return part && (" " + normalizePart(name) + " ").includes(" " + part + " ");
};

export function suggestItemName(product) {
  let name = clean(product?.name);
  if (!name) return "";
  for (const part of [clean(product.brand), clean(product.quantityText ?? product.quantity)]) {
    if (part && !alreadyIn(name, part)) name += " " + part;
  }
  return Array.from(name).slice(0, 60).join("").trimEnd();
}

// A lista antiga pode não ter código. O nome normalizado continua sendo suficiente.
export function duplicateOf(state, code, name) {
  const barcode = normalizeBarcode(code);
  const label = normalizeName(name);
  const items = itemsOf(state);
  if (barcode.ok) {
    const match = items.find((item) => normalizeBarcode(item.code ?? item.ean ?? item.barcode).code === barcode.code);
    if (match) return match;
  }
  return items.find((item) => label && normalizeName(item.name) === label) ?? null;
}
