const MAX_HTML_BYTES = 3 * 1024 * 1024;

// Contrato de referência para os testes. A origem deve vir de metadados confiáveis da ponte nativa.
export function acceptBridgeMessage(msg, { expectedHost, chave } = {}) {
  return Boolean(
    msg && msg.type === "html" &&
    typeof expectedHost === "string" && expectedHost &&
    msg.host === expectedHost &&
    typeof chave === "string" && /^\d{44}$/.test(chave) &&
    msg.chave === chave &&
    typeof msg.html === "string" && msg.html.length > 0 &&
    msg.html.length <= MAX_HTML_BYTES && Buffer.byteLength(msg.html, "utf8") <= MAX_HTML_BYTES
  );
}
