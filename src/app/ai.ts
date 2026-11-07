// Assistente opcional com a chave do próprio usuário. A chave fica no SecureStore;
// o pedido vai direto do aparelho ao provedor, com um resumo agregado (sem descrições).
import * as SecureStore from "expo-secure-store";

export type Provider = "gemini" | "openai" | "openrouter" | "anthropic";
export const PROVIDERS: Record<Provider, { label: string; model: string; hint: string }> = {
  gemini: { label: "Gemini (Google)", model: "gemini-2.5-flash", hint: "Tem nível gratuito. Crie a chave no Google AI Studio." },
  openai: { label: "OpenAI", model: "gpt-4.1-mini", hint: "Exige créditos ativos na conta OpenAI." },
  openrouter: { label: "OpenRouter", model: "openrouter/auto", hint: "Vários modelos com uma chave só." },
  anthropic: { label: "Anthropic (Claude)", model: "claude-haiku-5-5", hint: "Crie a chave no console da Anthropic." },
};
const KEY = "floco.ai.key";

export const getKey = () => SecureStore.getItemAsync(KEY);
export const setKey = (v: string) => (v ? SecureStore.setItemAsync(KEY, v) : SecureStore.deleteItemAsync(KEY));

const SYSTEM =
  "Você é o assistente financeiro do app Floco Finanças. Responda em português do Brasil, de forma curta, prática e sem jargão. " +
  "Use apenas os dados do resumo fornecido; se faltar informação, diga o que falta. Não recomende produtos de investimento específicos " +
  "nem dê aconselhamento financeiro profissional; ofereça orientações gerais de organização financeira.";

export async function ask(
  cfg: { provider: Provider; model?: string },
  context: string,
  messages: { role: "user" | "assistant"; text: string }[],
) {
  const key = await getKey();
  if (!key) throw Error("Configure uma chave de API primeiro.");
  const model = cfg.model?.trim() || PROVIDERS[cfg.provider].model;
  const system = SYSTEM + "\n\nResumo financeiro atual:\n" + context;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    let res: Response;
    if (cfg.provider === "gemini") {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] })),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw Error(j?.error?.message || `Erro ${res.status}`);
      return (j.candidates?.[0]?.content?.parts || []).map((p: any) => p.text).join("").trim();
    }
    if (cfg.provider === "anthropic") {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system,
          messages: messages.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw Error(j?.error?.message || `Erro ${res.status}`);
      return (j.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
    }
    const url = cfg.provider === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
    res = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.text }))],
      }),
    });
    const j = await res.json();
    if (!res.ok) throw Error(j?.error?.message || `Erro ${res.status}`);
    return String(j.choices?.[0]?.message?.content || "").trim();
  } catch (e: any) {
    if (e?.name === "AbortError") throw Error("O provedor demorou demais para responder. Tente de novo.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
