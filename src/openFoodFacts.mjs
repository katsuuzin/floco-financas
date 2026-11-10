const ENDPOINT = "https://world.openfoodfacts.org/api/v2/product/";
const FIELDS = "product_name,brands,quantity";
const TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_CACHE = 128;
const caches = new WeakMap();

export function isValidEan(code) {
  if (typeof code !== "string" || !/^(?:\d{8}|\d{12,14})$/.test(code)) return false;
  let sum = 0;
  for (let i = code.length - 2, weight = 3; i >= 0; i--, weight = 4 - weight) {
    sum += Number(code[i]) * weight;
  }
  return (10 - sum % 10) % 10 === Number(code.at(-1));
}

const clean = (value) => typeof value === "string" ? value.trim() : "";

function fitsResponseLimit(text) {
  if (text.length > MAX_RESPONSE_BYTES) return false;
  let bytes = 0;
  for (const char of text) {
    const point = char.codePointAt(0);
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (bytes > MAX_RESPONSE_BYTES) return false;
  }
  return true;
}

async function readProductPayload(response) {
  const declaredBytes = Number(response.headers?.get?.("content-length"));
  if (declaredBytes > MAX_RESPONSE_BYTES) return null;

  if (typeof response.body?.getReader === "function" && typeof TextDecoder === "function") {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    let text = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return JSON.parse(text + decoder.decode());
        bytes += value.byteLength;
        if (bytes > MAX_RESPONSE_BYTES) {
          void reader.cancel().catch(() => {});
          return null;
        }
        text += decoder.decode(value, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }
  }

  // O fetch do React Native pode entregar o corpo já acumulado. Limite antes do parse.
  if (typeof response.text === "function") {
    const text = await response.text();
    return fitsResponseLimit(text) ? JSON.parse(text) : null;
  }
  // Compatibilidade com implementações injetadas que oferecem apenas json().
  const payload = await response.json();
  const text = JSON.stringify(payload);
  return typeof text === "string" && fitsResponseLimit(text) ? payload : null;
}

async function request(code, fetchImpl) {
  const controller = new AbortController();
  let timer;
  try {
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => {
        resolve(null);
        controller.abort();
      }, TIMEOUT_MS);
    });
    const query = async () => {
      const response = await fetchImpl(`${ENDPOINT}${code}.json?fields=${FIELDS}`, {
        signal: controller.signal,
        credentials: "omit",
        redirect: "error",
        headers: { "User-Agent": "FlocoFinancas/1.8.1" },
      });
      if (!response?.ok) return null;
      const payload = await readProductPayload(response);
      if (payload?.status !== 1 || !payload.product || typeof payload.product !== "object" || Array.isArray(payload.product)) return null;
      const { product_name, brands, quantity } = payload.product;
      const brand = clean(brands);
      const amount = clean(quantity);
      const label = clean(product_name) || [brand, amount].filter(Boolean).join(" ");
      const name = Array.from(label).slice(0, 80).join("").trimEnd();
      return name ? { name, brand, quantity: amount } : null;
    };
    return await Promise.race([query(), timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Aceita o código como string para preservar zeros à esquerda. Só sucessos ficam no cache.
export async function lookupEan(ean, fetchImpl = globalThis.fetch) {
  const code = typeof ean === "string" ? ean.trim() : "";
  if (!isValidEan(code) || typeof fetchImpl !== "function") return null;
  let cache = caches.get(fetchImpl);
  if (!cache) {
    cache = new Map();
    caches.set(fetchImpl, cache);
  }
  let pending = cache.get(code);
  if (pending) {
    cache.delete(code);
  } else {
    pending = request(code, fetchImpl);
  }
  cache.set(code, pending);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
  const result = await pending;
  if (!result && cache.get(code) === pending) cache.delete(code);
  return result ? { ...result } : null;
}
