import { test } from "node:test";
import assert from "node:assert/strict";
import { addTransaction, contribute, withdrawGoal, emptyState, balance, reserved, totals, deleteTransaction, validateBackup } from "../src/finance.mjs";
import { archiveGoal, boxReport, isBox, setGoalProgress, registerYield, undoYield, yieldAccount, addGoalDeposit, removeGoalMove, completeGoal, goalForecast } from "../src/goals.mjs";

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
    { month: "2026-11", deposits: 1000, withdrawals: 5000, yields: 0 },
    { month: "2026-10", deposits: 20000, withdrawals: 0, yields: 0 },
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

const withBox = () => {
  let s = base();
  s.accounts = [{ id: "nu", name: "Nu", initial: 100000 }, { id: "it", name: "Itaú", initial: 50000 }];
  return contribute(s, "box", 40000, "nu", "2026-11-01");
};
const free = (s, id) => balance(s, id) - reserved(s, id);

test("P3a rendimento sobe caixinha e saldo total, mas o Disponível da conta fica igual", () => {
  const s0 = withBox();
  const s = registerYield(s0, "box", { amount: 1250, date: "2026-11-09" });
  assert.equal(s.goals[0].saved, 41250);
  assert.equal(balance(s, "nu"), balance(s0, "nu") + 1250);
  assert.equal(reserved(s, "nu"), 41250);
  assert.equal(free(s, "nu"), free(s0, "nu"));
  const t = s.transactions.at(-1);
  assert.equal(t.type, "income");
  assert.equal(t.boxYield, "box");
  assert.equal(totals(s, "2026-11").income, 1250);
  assert.equal(s.goals[0].history.at(-1).type, "yield");
});

test("P3a pelo saldo atual, o rendimento é a diferença para o guardado", () => {
  const s = registerYield(withBox(), "box", { newSaved: 41000, date: "2026-11-09" });
  assert.equal(s.goals[0].saved, 41000);
  assert.equal(s.transactions.at(-1).amount, 1000);
  assert.throws(() => registerYield(withBox(), "box", { newSaved: 40000 }), /maior que o valor guardado/);
  assert.throws(() => registerYield(withBox(), "box", { newSaved: 39000 }), /maior que o valor guardado/);
});

test("P3a recusa rendimento inválido, caixinha vazia, arquivada, meta e conta sem reserva", () => {
  const s0 = withBox();
  assert.throws(() => registerYield(s0, "box", { amount: 0 }), /maior que zero/);
  assert.throws(() => registerYield(s0, "box", { amount: 1.5 }), /maior que zero/);
  assert.throws(() => registerYield(s0, "box", { amount: 100, date: "2026-13-01" }), /data/);
  assert.throws(() => registerYield(s0, "box", { amount: 100, accountId: "it" }), /guardado/);
  assert.throws(() => registerYield(s0, "meta", { amount: 100 }), /caixinha/);
  assert.throws(() => registerYield(base(), "box", { amount: 100 }), /Guarde dinheiro/);
  const arq = withdrawGoal(s0, "box", 40000, "nu", "2026-11-02");
  assert.throws(() => registerYield(archiveGoal(arq, "box"), "box", { amount: 100 }), /arquivada/);
});

test("P3a o rendimento cai na conta que mais guarda, ou na escolhida", () => {
  let s = contribute(withBox(), "box", 5000, "it", "2026-11-02");
  assert.equal(yieldAccount(s.goals[0]), "nu");
  const a = registerYield(s, "box", { amount: 100 });
  assert.equal(a.transactions.at(-1).accountId, "nu");
  const b = registerYield(s, "box", { amount: 100, accountId: "it" });
  assert.equal(b.transactions.at(-1).accountId, "it");
  assert.equal(free(b, "it"), free(s, "it"));
});

test("P3a desfazer remove receita e reserva; recusa se o dinheiro já foi retirado", () => {
  const s0 = withBox();
  const s = registerYield(s0, "box", { amount: 1250, date: "2026-11-09" });
  const id = s.goals[0].history.at(-1).id;
  const back = undoYield(s, "box", id);
  assert.equal(back.goals[0].saved, 40000);
  assert.equal(balance(back, "nu"), balance(s0, "nu"));
  assert.equal(free(back, "nu"), free(s0, "nu"));
  assert.equal(back.transactions.length, s0.transactions.length);
  assert.ok(!back.goals[0].history.some((h) => h.type === "yield"));
  const drained = withdrawGoal(s, "box", 41250, "nu", "2026-11-10");
  assert.throws(() => undoYield(drained, "box", id), /já foi retirada/);
  assert.throws(() => undoYield(s, "box", "x"), /não encontrado/);
});

test("P3a não deixa excluir o lançamento do rendimento direto; relatório e backup aceitam", () => {
  const s = registerYield(withBox(), "box", { amount: 1250, date: "2026-11-09" });
  assert.throws(() => deleteTransaction(s, s.transactions.at(-1).id), /Desfaça este rendimento/);
  assert.deepEqual(boxReport(s.goals[0]).find((r) => r.month === "2026-11"), { month: "2026-11", deposits: 40000, withdrawals: 0, yields: 1250 });
  const back = validateBackup(JSON.parse(JSON.stringify(s)));
  assert.equal(back.goals[0].saved, 41250);
});

const notebook = () => {
  const s = base();
  s.goals[1] = { ...s.goals[1], id: "meta", name: "Notebook", target: 500000, saved: 0, deadline: "2027-02-20" };
  return s;
};
const meta = (s) => s.goals.find((g) => g.id === "meta");

test("P2a depósito na meta soma ao progresso, registra o histórico e não mexe em conta", () => {
  const s0 = notebook();
  const s = addGoalDeposit(s0, "meta", { amount: 80000, date: "2026-11-09", note: "freela" });
  assert.equal(meta(s).saved, 80000);
  assert.equal(meta(s).moves.length, 1);
  assert.deepEqual([meta(s).moves[0].type, meta(s).moves[0].amount, meta(s).moves[0].note], ["deposit", 80000, "freela"]);
  assert.deepEqual(s.accounts, s0.accounts);
  assert.equal(s.transactions.length, 0);
  assert.equal(meta(s).deposits.length, 0);
});

test("P2a recusa depósito inválido, em caixinha e em meta arquivada", () => {
  const s0 = notebook();
  assert.throws(() => addGoalDeposit(s0, "meta", { amount: 0 }), /maior que zero/);
  assert.throws(() => addGoalDeposit(s0, "meta", { amount: 1.5 }), /maior que zero/);
  assert.throws(() => addGoalDeposit(s0, "meta", { amount: 100, date: "2026-02-31" }), /data/);
  assert.throws(() => addGoalDeposit(s0, "box", { amount: 100 }), /sem conta/);
  assert.throws(() => addGoalDeposit(archiveGoal(s0, "meta"), "meta", { amount: 100 }), /arquivada/);
});

test("P2a remover depósito devolve o progresso; ajuste manual vira movimento com sinal", () => {
  let s = addGoalDeposit(notebook(), "meta", { amount: 80000, date: "2026-11-09" });
  s = setGoalProgress(s, "meta", "1.000,00");
  assert.equal(meta(s).saved, 100000);
  assert.deepEqual(meta(s).moves.map((m) => [m.type, m.amount]), [["deposit", 80000], ["adjust", 20000]]);
  s = setGoalProgress(s, "meta", "500,00");
  assert.equal(meta(s).moves.at(-1).amount, -50000);
  const depId = meta(s).moves[0].id;
  assert.throws(() => removeGoalMove(s, "meta", depId), /negativo/);
  const back = removeGoalMove(s, "meta", meta(s).moves[2].id);
  assert.equal(meta(back).saved, 100000);
  assert.throws(() => removeGoalMove(s, "meta", "x"), /não encontrado/);
  assert.equal(setGoalProgress(s, "meta", "500,00").goals[1].moves.length, 3);
});

test("P2a previsão: 800 de 5.000 com um depósito dá média 800 e 6 meses (4.200 ÷ 800 = 5,25 → 6)", () => {
  const s = addGoalDeposit(notebook(), "meta", { amount: 80000, date: "2026-11-09" });
  const f = goalForecast(meta(s), "2026-11-09");
  assert.equal(f.remaining, 420000);
  assert.equal(f.average, 80000);
  assert.equal(f.months, 6);
  assert.equal(f.date, "2027-05-09");
  assert.equal(f.noPrazo, false);
  assert.equal(f.neededMonthly, Math.ceil(420000 / 3));
});

test("P2a a média divide pelos meses desde o primeiro depósito e ignora ajustes", () => {
  let s = addGoalDeposit(notebook(), "meta", { amount: 60000, date: "2026-09-10" });
  s = addGoalDeposit(s, "meta", { amount: 60000, date: "2026-11-02" });
  s = setGoalProgress(s, "meta", "1.400,00");
  const f = goalForecast(meta(s), "2026-11-09");
  assert.equal(f.average, 40000);
  assert.equal(f.months, 9);
  assert.equal(f.date, "2027-08-09");
  assert.equal(f.noPrazo, false);
  // Com prazo folgado, o ritmo cabe no prazo.
  const roomy = { ...meta(s), deadline: "2027-12-31" };
  assert.equal(goalForecast(roomy, "2026-11-09").noPrazo, true);
});

test("P2a sem depósito não há previsão; meta atingida não tem faltante", () => {
  const f0 = goalForecast(meta(notebook()), "2026-11-09");
  assert.equal(f0.months, null);
  assert.equal(f0.average, 0);
  assert.equal(f0.neededMonthly, Math.ceil(500000 / 3));
  const full = addGoalDeposit(notebook(), "meta", { amount: 500000, date: "2026-11-09" });
  const f1 = goalForecast(meta(full), "2026-11-09");
  assert.deepEqual([f1.reached, f1.remaining, f1.months], [true, 0, null]);
});

test("P2a concluir marca mesmo sem atingir o valor e reabrir preserva os depósitos", () => {
  let s = addGoalDeposit(notebook(), "meta", { amount: 80000, date: "2026-11-09" });
  s = completeGoal(s, "meta", true, "2026-11-10");
  assert.equal(meta(s).completedAt, "2026-11-10");
  assert.equal(meta(s).saved, 80000);
  s = completeGoal(s, "meta", false);
  assert.equal(meta(s).completedAt, undefined);
  assert.equal(meta(s).moves.length, 1);
  assert.throws(() => completeGoal(s, "box", true), /sem conta/);
});

test("P2a histórico e conclusão sobrevivem à validação do backup", async () => {
  const { validateBackup } = await import("../src/finance.mjs");
  let s = addGoalDeposit(notebook(), "meta", { amount: 80000, date: "2026-11-09" });
  s = completeGoal(s, "meta", true, "2026-11-10");
  const back = validateBackup(JSON.parse(JSON.stringify(s)));
  assert.equal(meta(back).moves.length, 1);
  assert.equal(meta(back).completedAt, "2026-11-10");
  const bad = JSON.parse(JSON.stringify(s));
  bad.goals[1].moves[0].amount = -5;
  assert.throws(() => validateBackup(bad), /Meta inválida/);
});
