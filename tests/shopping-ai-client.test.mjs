import test from "node:test";
import assert from "node:assert/strict";
import { requestShoppingSuggestions } from "../src/shopping-ai-client.mjs";
import { interpretPastedList } from "../src/pasteListAi.mjs";

const defaults = {
  openai: { model: "modelo-de-teste" },
  anthropic: { model: "modelo-de-teste" },
  gemini: { model: "gemini-3.5-flash-lite" },
};
const items = [{ name: "Ovos", qty: 2, unit: "" }];
const reply = JSON.stringify({ items });

test("OpenAI recebe só a lista, com o modelo escolhido e sem armazenar a conclusão", async () => {
  const result = await interpretPastedList("dois ovos", (input, { signal }) =>
    requestShoppingSuggestions({ provider: "openai", model: "outro-modelo" }, input, "chave-ficticia", defaults, signal,
      async (url, options) => {
        assert.equal(url, "https://api.openai.com/v1/chat/completions");
        assert.equal(options.headers.Authorization, "Bearer chave-ficticia");
        const body = JSON.parse(options.body);
        assert.equal(body.model, "outro-modelo");
        assert.equal(body.store, false);
        assert.equal(body.messages.length, 2);
        assert.doesNotMatch(body.messages[0].content, /Resumo financeiro/);
        assert.deepEqual(body.messages[1], { role: "user", content: "dois ovos" });
        return { ok: true, json: async () => ({ choices: [{ message: { content: reply } }] }) };
      }));
  assert.deepEqual(result, { source: "ai", items });
});

test("Claude usa a chave do provedor e aceita JSON cercado por Markdown", async () => {
  const controller = new AbortController();
  const result = await requestShoppingSuggestions({ provider: "anthropic" }, "dois ovos", "chave-ficticia", defaults, controller.signal,
    async (url, options) => {
      assert.equal(url, "https://api.anthropic.com/v1/messages");
      assert.equal(options.headers["x-api-key"], "chave-ficticia");
      const body = JSON.parse(options.body);
      assert.doesNotMatch(body.system, /Resumo financeiro/);
      assert.deepEqual(body.messages, [{ role: "user", content: "dois ovos" }]);
      return { ok: true, json: async () => ({ content: [{ type: "text", text: "\x60\x60\x60json\n" + reply + "\n\x60\x60\x60" }] }) };
    });
  assert.deepEqual(result, items);
});

test("Resposta sem JSON volta à prévia offline", async () => {
  const result = await interpretPastedList("2 ovos", (input, { signal }) =>
    requestShoppingSuggestions({ provider: "openai" }, input, "chave-ficticia", defaults, signal,
      async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "Não há uma lista." } }] }) })));
  assert.deepEqual(result, { source: "local", items });
});

test("Gemini recebe a chave no cabeçalho e só o texto colado como conteúdo", async () => {
  const result = await interpretPastedList("dois ovos", (input, { signal }) =>
    requestShoppingSuggestions({ provider: "gemini" }, input, "chave-ficticia", defaults, signal,
      async (url, options) => {
        assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
        assert.equal(options.headers["x-goog-api-key"], "chave-ficticia");
        const body = JSON.parse(options.body);
        assert.doesNotMatch(body.systemInstruction.parts[0].text, /Resumo financeiro/);
        assert.deepEqual(body.contents, [{ role: "user", parts: [{ text: "dois ovos" }] }]);
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: reply }] } }] }) };
      }));
  assert.deepEqual(result, { source: "ai", items });
});
