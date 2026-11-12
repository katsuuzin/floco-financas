import test from "node:test";
import assert from "node:assert/strict";
import { applyDarkDefault, emptyState, validateBackup } from "../src/finance.mjs";

test("instalação nova começa no tema escuro", () => {
  const s = emptyState();
  assert.equal(s.settings.dark, true);
  assert.equal(applyDarkDefault(s), s);
});

test("dados antigos no claro passam para o escuro uma única vez", () => {
  const old = { ...emptyState(), settings: { dark: false, biometric: false, hide: true } };
  const once = applyDarkDefault(old);
  assert.equal(once.settings.dark, true);
  assert.equal(once.settings.hide, true);
  assert.equal(once.settings.darkDefault, 1);
  assert.equal(applyDarkDefault(once), once);
});

test("depois da migração, a escolha manual do claro é respeitada", () => {
  const migrated = applyDarkDefault({ ...emptyState(), settings: { dark: false } });
  const manual = { ...migrated, settings: { ...migrated.settings, dark: false } };
  assert.equal(applyDarkDefault(manual).settings.dark, false);
});

test("backup preserva a escolha e a marca", () => {
  const back = validateBackup({ ...emptyState(), settings: { dark: false, darkDefault: 1 } });
  assert.equal(back.settings.dark, false);
  assert.equal(applyDarkDefault(back).settings.dark, false);
});

test("backup sem o campo dark abre escuro; só false explícito vira claro", () => {
  const { dark, ...rest } = emptyState().settings;
  assert.equal(validateBackup({ ...emptyState(), settings: rest }).settings.dark, true);
  assert.equal(validateBackup({ ...emptyState(), settings: { ...rest, dark: false } }).settings.dark, false);
});

test("estado sem settings não quebra", () => {
  assert.equal(applyDarkDefault({}).settings.dark, true);
});
