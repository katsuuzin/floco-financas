import { createAIKeyStore } from "../ai-credentials.mjs";
import { requestAI } from "../ai-client.mjs";
// Assistente opcional com a chave do próprio usuário. A chave fica no SecureStore;
// o pedido vai direto do aparelho ao provedor, com um resumo agregado (sem descrições).
import * as SecureStore from "expo-secure-store";

export type Provider = "gemini" | "openai" | "openrouter" | "anthropic";
export const PROVIDERS: Record<
  Provider,
  { label: string; model: string; hint: string }
> = {
  gemini: {
    label: "Gemini (Google)",
    model: "gemini-2.5-flash",
    hint: "Tem nível gratuito. Crie a chave no Google AI Studio.",
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
