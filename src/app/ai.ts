import { createAIKeyStore } from "../ai-credentials.mjs";
import { requestAI } from "../ai-client.mjs";
// Assistente opcional com a chave do próprio usuário. A chave fica no SecureStore;
// o pedido vai direto do aparelho ao provedor, com um resumo agregado (sem descrições).
import * as SecureStore from "expo-secure-store";
import { requestShoppingSuggestions } from "../shopping-ai-client.mjs";
import { cleanModel } from "../ai-model.mjs";

export type Provider = "gemini" | "openai" | "openrouter" | "anthropic";
export const PROVIDERS: Record<
  Provider,
  { label: string; model: string; hint: string }
> = {
  gemini: {
    label: "Gemini (Google)",
    model: "gemini-3.5-flash-lite",
    hint: "Crie sua chave de API no Google AI Studio.",
  },
  openai: {
    label: "OpenAI",
    model: "gpt-4.1-mini",
    hint: "Exige créditos ativos na conta OpenAI.",
  },
  openrouter: {
    label: "OpenRouter",
    model: "openrouter/auto",
    hint: "Vários modelos com uma chave só.",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    model: "claude-haiku-5-5",
    hint: "Crie a chave no console da Anthropic.",
  },
};

const keys = createAIKeyStore(SecureStore);
export const getKey = (provider: Provider = "gemini") => keys.getKey(provider);
export const setKey = (value: string, provider: Provider = "gemini") =>
  keys.setKey(value, provider);

export function shoppingAIConfig(config?: { provider?: unknown; model?: unknown }) {
  const provider = config?.provider ?? "gemini";
  if (typeof provider !== "string" || !Object.hasOwn(PROVIDERS, provider)) return null;
  return {
    provider: provider as Provider,
    model: cleanModel(config?.model),
  };
}

export async function interpretShoppingText(
  cfg: { provider: Provider; model: string },
  text: string,
  signal: AbortSignal,
) {
  const key = await getKey(cfg.provider);
  if (!key || signal.aborted) return null;
  return requestShoppingSuggestions(cfg, text, key, PROVIDERS, signal);
}
export async function ask(
  cfg: { provider: Provider; model?: string },
  context: string,
  messages: { role: "user" | "assistant"; text: string }[],
) {
  const answer = await requestAI(
    cfg,
    context,
    messages,
    await getKey(cfg.provider),
    PROVIDERS,
  );
  if (!answer)
    throw Error("O provedor retornou uma resposta vazia. Tente novamente.");
  return answer;
}
