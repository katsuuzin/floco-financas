import test from "node:test";
import assert from "node:assert/strict";
import { startSession, resumeSession, endSession, serialize, parse } from "../src/shoppingTripSession.mjs";
const min = 60_000;
const now = 1_800_000_000_000;

test("Começa com o instante fornecido e encerra com sessão vazia", () => {
  assert.deepEqual(startSession(now), { startedAt: now, lastSeenAt: now });
  assert.equal(startSession("123"), null);
  assert.equal(endSession(), null);
});
test("Retoma abaixo de três horas e atualiza a última atividade sem mutar", () => {
  const saved = startSession(now);
  assert.deepEqual(resumeSession(saved, now + 179 * min), { startedAt: now, lastSeenAt: now + 179 * min });
  assert.equal(saved.lastSeenAt, now);
});
test("No limite de inatividade inicia outra sessão", () => {
  assert.deepEqual(resumeSession(startSession(now), now + 180 * min), startSession(now + 180 * min));
});
test("Sessão de ontem é substituída", () => {
  assert.deepEqual(resumeSession(startSession(now - 24 * 60 * min), now), startSession(now));
});
test("Relógio voltando invalida a sessão guardada", () => {
  const saved = { startedAt: now - 2 * min, lastSeenAt: now + min };
  assert.deepEqual(resumeSession(saved, now), startSession(now));
  assert.equal(parse(serialize(saved), now), null);
});
test("Configuração de inatividade mais curta é respeitada", () => {
  assert.deepEqual(resumeSession(startSession(now - 5 * min), now, { maxIdleMinutes: 5 }), startSession(now));
});
test("JSON com campos extras conserva apenas os horários", () => {
  const saved = { ...startSession(now), extra: "ignorado" };
  assert.deepEqual(parse(JSON.stringify(saved), now), startSession(now));
  assert.deepEqual(JSON.parse(serialize(saved)), startSession(now));
});
test("Rejeita JSON corrompido, tipos errados e horários invertidos", () => {
  for (const input of ["{", "[]", null, "42", '{"startedAt":"1","lastSeenAt":1}', '{"startedAt":2,"lastSeenAt":1}']) {
    assert.equal(parse(input, now), null);
  }
  assert.equal(parse(serialize(endSession()), now), null);
});
