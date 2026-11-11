import test from "node:test";
import assert from "node:assert/strict";
import { PRESS_KINDS, motionConfig, shouldReduce } from "../src/motion.mjs";

test("Cada tipo de controle afunda pouco e nunca some", () => {
  for (const [kind, { scale, opacity }] of Object.entries(PRESS_KINDS)) {
    assert.ok(scale >= 0.96 && scale < 1, kind);
    assert.ok(opacity >= 0.8 && opacity <= 1, kind);
  }
});
test("Tipo desconhecido, __proto__ e vazio caem em botão", () => {
  for (const kind of ["x", "__proto__", "constructor", "", undefined, null, 5]) {
    assert.deepEqual(motionConfig(kind, { reduceMotion: false }), motionConfig("button", { reduceMotion: false }));
  }
});
test("Reduzir movimento remove escala e mola, só muda a opacidade", () => {
  const cfg = motionConfig("button", { reduceMotion: true });
  assert.equal(cfg.scale, 1);
  assert.equal(cfg.spring, null);
  assert.ok(cfg.opacity < 1);
});
test("Desabilitado não anima nada", () => {
  assert.deepEqual(motionConfig("icon", { disabled: true }),
    { scale: 1, opacity: 1, downMs: 0, spring: null, releaseMs: 0 });
});
test("Sem preferência conhecida, trata como reduzir movimento", () => {
  assert.equal(shouldReduce(null), true);
  assert.equal(shouldReduce(undefined), true);
  assert.equal(shouldReduce(true), true);
  assert.equal(shouldReduce(false), false);
});
test("Resposta ao toque é rápida", () => {
  const cfg = motionConfig("fab");
  assert.ok(cfg.downMs <= 120 && cfg.releaseMs <= 200);
});
