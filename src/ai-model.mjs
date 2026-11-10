// Proteção do campo "Modelo" do Assistente: o nome de um modelo é curto e sem espaços ("gemini-3.5-flash-lite",
// "gpt-4.1-mini", "openrouter/auto"). Uma chave de API colada ali iria para as configurações (e para o backup)
// e seria enviada ao provedor como nome de modelo. Funções puras, sem rede.

// Começos típicos de chaves: Google (AIza…, AQ.…), OpenAI/Anthropic/OpenRouter (sk-…), Groq (gsk_…), etc.
const KEY_PREFIX = /^(AIza|AQ\.|sk-|sk_|gsk_|xai-|ghp_|github_pat_|Bearer\s)/i;

// Parece uma chave? Começo conhecido, ou texto longo sem espaços misturando maiúsculas, minúsculas e números.
export function looksLikeSecret(value) {
  const v = String(value ?? "").trim();
  if (!v) return false;
  if (KEY_PREFIX.test(v)) return true;
  return v.length >= 30 && !/\s/.test(v) && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v);
}

// Nome de modelo válido ou "" (o chamador usa o modelo padrão do provedor).
export function cleanModel(value) {
  const v = String(value ?? "").trim();
  if (!v || looksLikeSecret(v)) return "";
  return /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,79}$/.test(v) ? v : "";
}
