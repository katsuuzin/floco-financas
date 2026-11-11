import { test } from "node:test";
import assert from "node:assert/strict";
import { looksLikeSecret, cleanModel } from "../src/ai-model.mjs";

// Tudo aqui é inventado: nenhuma destas strings é uma chave real.
test("reconhece o começo de chaves comuns, inclusive parcial (o campo salva a cada letra)", () => {
  for (const v of ["AIzaSyFAKE", "AQ.Ab", "AQ.FAKEfakeFAKE123", "sk-abc", "sk-proj-FAKE", "gsk_FAKE", "Bearer abc", "xai-FAKE", "ghp_FAKE"])
    assert.equal(looksLikeSecret(v), true, v);
});

test("texto longo, sem espaço, com maiúsculas, minúsculas e números parece chave", () => {
  assert.equal(looksLikeSecret("Zk3fAkEkEyMiXeDcAsE1234567890abcdefGH"), true);
  assert.equal(looksLikeSecret("x".repeat(40)), false, "só minúsculas não é chave");
});

test("nomes de modelo de verdade não são chaves", () => {
  for (const v of ["gemini-3.5-flash-lite", "gemini-2.5-flash", "gpt-4.1-mini", "openrouter/auto", "anthropic/claude-3.5-sonnet:beta", "claude-haiku-5-5", ""])
    assert.equal(looksLikeSecret(v), false, v);
});

test("cleanModel devolve o nome válido ou vazio", () => {
  assert.equal(cleanModel("  gemini-3.5-flash-lite "), "gemini-3.5-flash-lite");
  assert.equal(cleanModel("openrouter/auto"), "openrouter/auto");
  assert.equal(cleanModel("AQ.FAKEfakeFAKE123"), "");
  assert.equal(cleanModel("tem espaço"), "");
  assert.equal(cleanModel("-comecaerrado"), "");
  assert.equal(cleanModel("a".repeat(81)), "");
  assert.equal(cleanModel(undefined), "");
  assert.equal(cleanModel(null), "");
  assert.equal(cleanModel(42), "42");
});

test("geminiModelId aceita só o id: sem models/, sem :método, sem barras", async () => {
  const { geminiModelId } = await import("../src/ai-model.mjs");
  assert.equal(geminiModelId("gemini-2.5-flash"), "gemini-2.5-flash");
  assert.equal(geminiModelId("models/gemini-2.5-flash"), "gemini-2.5-flash");
  assert.equal(geminiModelId("  models/gemini-2.5-flash:generateContent "), "gemini-2.5-flash");
  assert.equal(geminiModelId("gemini 2.5 flash"), "");
  assert.equal(geminiModelId("models/"), "");
  assert.equal(geminiModelId(""), "");
  assert.equal(geminiModelId("AIzaFICTICIA"), "");
});

test("O pedido ao Gemini nunca manda barra codificada no nome do modelo", async () => {
  const { requestAI } = await import("../src/ai-client.mjs");
  const defaults = { gemini: { model: "gemini-padrao" } };
  let url = "";
  const fetcher = async (u) => { url = u; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }) }; };
  await requestAI({ provider: "gemini", model: "models/gemini-2.5-flash" }, "c", [{ role: "user", text: "oi" }], "k", defaults, fetcher);
  assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
  await requestAI({ provider: "gemini", model: "" }, "c", [{ role: "user", text: "oi" }], "k", defaults, fetcher);
  assert.match(url, /models\/gemini-padrao:generateContent$/);
});

test("Erro de formato de modelo do Google vira orientação em português", async () => {
  const { requestAI } = await import("../src/ai-client.mjs");
  const defaults = { gemini: { model: "gemini-padrao" } };
  const fetcher = async () => ({ ok: false, status: 400, json: async () => ({ error: { message: "* GenerateContentRequest.model: unexpected model name format" } }) });
  await assert.rejects(() => requestAI({ provider: "gemini", model: "x" }, "c", [{ role: "user", text: "oi" }], "k", defaults, fetcher), /Apague o campo Modelo/);
});
