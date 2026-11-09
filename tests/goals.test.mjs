import { test } from "node:test";
import assert from "node:assert/strict";
import { addTransaction, contribute, withdrawGoal, emptyState } from "../src/finance.mjs";
import { archiveGoal, boxReport, isBox, setGoalProgress } from "../src/goals.mjs";

const base = () => {
  let s = { ...emptyState(), accounts: [{ id: "nu", name: "Nu", initial: 100000 }] };
  s.goals = [
    { id: "box", name: "Viagem", target: 50000, saved: 0, deposits: [] },
    { id: "meta", kind: "goal", name: "Carro", target: 4000000, saved: 0, deposits: [] },
  ];
  return s;
};

test("P2 meta sem conta não reserva e aceita progresso manual", () => {
  let s = base();
  assert.equal(isBox(s.goals[1]), false);
  assert.throws(() => contribute(s, "meta", 1000, "nu", "2026-11-01"), /não reserva/);
  s = setGoalProgress(s, "meta", "1.500,00");
  assert.equal(s.goals[1].saved, 150000);
  assert.equal(setGoalProgress(s, "meta", "0").goals[1].saved, 0);
  assert.throws(() => setGoalProgress(s, "box", "10"));
});

test("P3 caixinha só arquiva vazia; arquivada não recebe depósito", () => {
  let s = base();
  s = contribute(s, "box", 20000, "nu", "2026-10-03");
  assert.throws(() => archiveGoal(s, "box"), /Retire/);
  s = withdrawGoal(s, "box", 5000, "nu", "2026-11-02");
  s = withdrawGoal(s, "box", 15000, "nu", "2026-11-04");
  s = archiveGoal(s, "box");
  assert.equal(s.goals[0].archived, true);
  assert.throws(() => contribute(s, "box", 100, "nu"), /arquivada/);
  assert.equal(archiveGoal(s, "box", false).goals[0].archived, false);
});

test("P3 relatório da caixinha soma depósitos e retiradas por mês", () => {
  let s = base();
  s = contribute(s, "box", 20000, "nu", "2026-10-03");
  s = withdrawGoal(s, "box", 5000, "nu", "2026-11-02");
  s = contribute(s, "box", 1000, "nu", "2026-11-09");
  assert.deepEqual(boxReport(s.goals[0]), [
    { month: "2026-11", deposits: 1000, withdrawals: 5000 },
    { month: "2026-10", deposits: 20000, withdrawals: 0 },
  ]);
});

test("P2 meta com progresso manual sobrevive à validação ao reabrir", async () => {
  const { validateBackup } = await import("../src/finance.mjs");
  let s = setGoalProgress(base(), "meta", "5.000,00");
  s = archiveGoal(s, "meta");
  const back = validateBackup(JSON.parse(JSON.stringify(s)));
  assert.equal(back.goals[1].saved, 500000);
  const bad = JSON.parse(JSON.stringify(s));
  bad.goals[0].saved = 1;
  assert.throws(() => validateBackup(bad), /Meta inválida/);
});

test("Preferências sobrevivem à validação; bloqueio biométrico não vem do backup", async () => {
  const { validateBackup, emptyState } = await import("../src/finance.mjs");
  const s = validateBackup({ ...emptyState(), settings: { dark: true, biometric: true, onboarded: true, layout: { tab4: "goals" }, reminders: { enabled: true }, accent: "#7FB3FF" } });
  assert.equal(s.settings.biometric, false);
  assert.equal(s.settings.onboarded, true);
  assert.deepEqual(s.settings.layout, { tab4: "goals" });
  assert.equal(s.settings.reminders.enabled, true);
  assert.equal(s.settings.accent, "#7FB3FF");
});
