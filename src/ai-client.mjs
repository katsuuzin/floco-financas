const SYSTEM =
  "Você é o assistente financeiro do app Floco Finanças. Responda em português do Brasil, de forma curta, prática e sem jargão. " +
  "Use apenas os dados do resumo fornecido; se faltar informação, diga o que falta. Não recomende produtos de investimento específicos " +
  "nem dê aconselhamento financeiro profissional; ofereça orientações gerais de organização financeira.";
import { cleanModel, geminiModelId } from "./ai-model.mjs";

export async function requestAI(
  cfg,
  context,
  messages,
  key,
  defaults,
  fetcher = fetch,
  options = {},
) {
  if (!key) throw Error("Configure uma chave de API primeiro.");
  const typed = cfg.provider === "gemini" ? geminiModelId(cfg.model) : cleanModel(cfg.model);
  const model = typed || defaults[cfg.provider].model;
  const system = options.system ?? SYSTEM + "\n\nResumo financeiro atual:\n" + context;
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  const signal = options.signal;
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    let res;
    if (cfg.provider === "gemini") {
      res = await fetcher(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: messages.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.text }],
            })),
          }),
        },
      );
      const j = await res.json();
      if (!res.ok) {
        const message = j?.error?.message || `Erro ${res.status}`;
        if (/unexpected model name format/i.test(message))
          throw Error(
            `O Google não aceitou o nome do modelo "${model}". Apague o campo Modelo para usar o padrão (${defaults.gemini.model}) ou use só o nome, como gemini-2.5-flash.`,
          );
        throw Error(message);
      }
      return (j.candidates?.[0]?.content?.parts || [])
        .map((p) => p.text)
        .join("")
        .trim();
    }
    if (cfg.provider === "anthropic") {
      res = await fetcher("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system,
          messages: messages.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw Error(j?.error?.message || `Erro ${res.status}`);
      return (j.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
    }
    const url =
      cfg.provider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : "https://openrouter.ai/api/v1/chat/completions";
    res = await fetcher(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        ...(cfg.provider === "openai" && options.store === false ? { store: false } : {}),
        messages: [
          { role: "system", content: system },
          ...messages.map((m) => ({ role: m.role, content: m.text })),
        ],
      }),
    });
    const j = await res.json();
    if (!res.ok) throw Error(j?.error?.message || `Erro ${res.status}`);
    return String(j.choices?.[0]?.message?.content || "").trim();
  } catch (e) {
    if (e?.name === "AbortError")
      throw Error("O provedor demorou demais para responder. Tente de novo.");
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
