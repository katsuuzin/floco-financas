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
