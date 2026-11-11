import { parentPort, workerData } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { hrefMatchesKey, isAllowedUrl, MAX_HTML_CHARS, parseNfceHtml } from "../../src/nfceParse.mjs";

// Espelho de onMessage. true significa que a mensagem levaria à prévia, não que a origem foi autenticada.
export function acceptBridgeMessage(raw, { uf, chave }) {
  try {
    if (typeof raw !== "string" || raw.length > MAX_HTML_CHARS + 10_000) return false;
    const msg = JSON.parse(raw);
    if (!msg || !isAllowedUrl(msg.href, uf) || !hrefMatchesKey(msg.href, chave)) return false;
    if (msg.type !== "html" || typeof msg.html !== "string" || msg.html.length > MAX_HTML_CHARS) return false;
    const nota = parseNfceHtml(msg.html, { uf });
    return nota.chave === chave;
  } catch {
    return false;
  }
}

// Isola cada leitura para que uma regressão síncrona não impeça os demais testes.
if (parentPort && workerData?.kind === "parse-nfce") {
  const start = performance.now();
  let result;
  try {
    const nota = parseNfceHtml(workerData.html);
    result = { items: nota.items.length, totalCents: nota.totalCents };
  } catch (error) {
    result = { error: error.message };
  }
  parentPort.postMessage({ ...result, elapsed: performance.now() - start });
}
