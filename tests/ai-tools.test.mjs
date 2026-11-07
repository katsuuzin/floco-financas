import test from "node:test";
import assert from "node:assert/strict";
import { requestAI } from "../src/ai-client.mjs";
import { createAIKeyStore } from "../src/ai-credentials.mjs";
const defaults = Object.fromEntries(
  ["openai", "anthropic", "gemini", "openrouter"].map((p) => [
    p,
    { model: "modelo-de-teste" },
  ]),
);
test("clientes enviam formatos corretos e recebem texto dos quatro provedores", async () => {
  for (const provider of Object.keys(defaults)) {
    let sent;
    const result = await requestAI(
      { provider },
      "resumo fictício",
      [{ role: "user", text: "teste" }],
      "chave-ficticia",
      defaults,
      async (url, options) => {
        sent = { url, options };
        return {
          ok: true,
          json: async () =>
            provider === "gemini"
              ? { candidates: [{ content: { parts: [{ text: "ok" }] } }] }
              : provider === "anthropic"
                ? { content: [{ type: "text", text: "ok" }] }
                : { choices: [{ message: { content: "ok" } }] },
        };
      },
    );
    assert.equal(result, "ok");
    assert(!sent.url.includes("chave-ficticia"));
    assert.equal(
      JSON.parse(sent.options.body).model ?? "modelo-de-teste",
      "modelo-de-teste",
    );
  }
});
test("erro de credencial e timeout não viram resposta de sucesso", async () => {
  await assert.rejects(
    () =>
      requestAI(
        { provider: "openai" },
        "teste",
        [{ role: "user", text: "teste" }],
        "",
        defaults,
      ),
    /token|chave/i,
  );
  await assert.rejects(
    () =>
      requestAI(
        { provider: "openai" },
        "teste",
        [{ role: "user", text: "teste" }],
        "ficticia",
        defaults,
        async () => ({
          ok: false,
          status: 401,
          json: async () => ({ error: { message: "Credencial inválida" } }),
        }),
      ),
    /Credencial/,
  );
  await assert.rejects(
    () =>
      requestAI(
        { provider: "openai" },
        "teste",
        [{ role: "user", text: "teste" }],
        "ficticia",
        defaults,
        async () => {
          throw { name: "AbortError" };
        },
      ),
    /demorou/,
  );
});
test("trocar provedor nunca reutiliza a chave do anterior, inclusive na migração concorrente", async () => {
  const values = new Map([["floco.ai.key", "legada-ficticia"]]);
  const storage = {
    getItemAsync: async (k) => values.get(k) || null,
    setItemAsync: async (k, v) => {
      values.set(k, v);
    },
    deleteItemAsync: async (k) => {
      values.delete(k);
    },
  };
  const keys = createAIKeyStore(storage);
  const [gemini, openai] = await Promise.all([
    keys.getKey("gemini"),
    keys.getKey("openai"),
  ]);
  assert.equal(gemini, "legada-ficticia");
  assert.equal(openai, null);
  assert(!values.has("floco.ai.key"));
  await keys.setKey("openai-ficticia", "openai");
  assert.equal(await keys.getKey("gemini"), "legada-ficticia");
  assert.equal(await keys.getKey("openai"), "openai-ficticia");
});
