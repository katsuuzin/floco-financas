import { assertFast } from "./helpers/timing.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { applyPotYieldChange, emptyState, migratePotState, reserved, validateBackup } from "../src/finance.mjs";
import { registerYield, undoYield } from "../src/goals.mjs";
import { migratePotsFromGoals, linkGoalToPot, depositToPot, withdrawFromPot, archivePot, potSummary } from "../src/goalPots.mjs";

test("Backup antigo migra reserva sem perder centavos e ignora lixo nas caixinhas", () => {
  const account = { id:"a", name:"Conta fictícia", initial:1000 };
  const old = { ...emptyState(), accounts:[account], goals:[{ id:"g", name:"Reserva", target:900, saved:200,
    deposits:[{ id:"d", accountId:"a", amount:200, date:"2026-01-01" }] }] };
  const migrated = migratePotState(validateBackup(old));
  assert.equal(reserved(migrated,"a"), 200);
  assert.equal(migrated.pots[0].saved,200);
  assert.equal(migrated.goals[0].potId,"g");
  assert.deepEqual(validateBackup(migrated), { ...migrated, pots:migrated.pots.map((pot) => ({ ...pot, archived:false })) });
  assert.equal(validateBackup({ ...emptyState(), pots:[{ id:"lixo", saved:"cem" }] }).pots.length,0);
});
test("Rendimento da caixinha migrada altera a reserva e é reversível sem mexer na meta vinculada", () => {
  const initial = migratePotState({ ...emptyState(), ...state() });
  const earned = applyPotYieldChange(initial, "p", (draft) =>
    registerYield(draft, "p", { date, amount: 30, accountId: "a" }));
  assert.equal(earned.pots[0].saved, 230);
  assert.equal(earned.transactions[0].boxYield, "p");
  assert.equal(earned.goals, initial.goals);
  const original = applyPotYieldChange(earned, "p", (draft) => undoYield(draft, "p", earned.pots[0].history[0].id));
  assert.deepEqual(original, initial);
});

const date = "2026-01-01";
const state = () => ({ accounts:[{ id:"a", initial:1000 }], transactions:[],
  goals:[{ id:"g", kind:"goal", target:900, saved:10 }, { id:"p", kind:"box", name:"Reserva", target:1000,
    saved:200, deposits:[{ id:"d", accountId:"a", date, amount:200 }], history:[] }] });
test("Migração conserva cada centavo, histórico e referência na segunda chamada", () => {
  const before = state();
  const next = migratePotsFromGoals(before);
  const totalBefore = before.goals.reduce((n,g) => n+g.saved,0);
  assert.equal(next.goals.reduce((n,g) => n+g.saved,0) + potSummary(next,date).totalCents, totalBefore);
  assert.equal(next.pots[0].deposits, before.goals[1].deposits);
  assert.equal(next.goals.find((g) => g.id === "p").potId, next.pots[0].id);
  assert.equal(migratePotsFromGoals(next), next);
  assert.deepEqual(migratePotsFromGoals(), {});
});
test("Meta ligada consulta a reserva sem duplicar dinheiro", () => {
  const migrated = migratePotsFromGoals(state());
  const linked = linkGoalToPot(migrated, "g", "p");
  assert.equal(potSummary(linked,date).goals[0].savedCents, 200);
  assert.equal(potSummary(linkGoalToPot(linked,"g",null),date).goals[0].savedCents, 10);
  assert.ok(linkGoalToPot(migrated, "g", "__proto__").error);
});
test("Depósito e retirada respeitam saldo, reserva e data", () => {
  const initial = migratePotsFromGoals(state());
  const next = depositToPot(initial,"p",{ amount:300, accountId:"a",date,id:"dep" });
  assert.equal(next.pots[0].saved,500);
  assert.ok(depositToPot(next,"p",{ amount:1,accountId:"a",date,id:"dep" }).error);
  assert.ok(depositToPot(next,"p",{ amount:501,accountId:"a",date }).error);
  assert.ok(withdrawFromPot(next,"p",{ amount:501,accountId:"a",date }).error);
  assert.ok(withdrawFromPot(next,"p",{ amount:1,accountId:"a",date:"2026-02-30" }).error);
  const left = withdrawFromPot(next,"p",{ amount:201, accountId:"a",date });
  assert.equal(left.pots[0].saved,299);
  assert.equal(left.pots[0].deposits.reduce((n,row) => n+row.amount,0),299);
});
test("Arquivar com saldo exige destino e transfere reserva sem perder valor", () => {
  const first = migratePotsFromGoals(state());
  assert.ok(archivePot(first,"p").error);
  const withTarget = { ...first,pots:[...first.pots,{ id:"b", saved:20 }] };
  const moved = archivePot(withTarget,"p",{ toPotId:"b",date });
  assert.deepEqual(moved.pots.map((p) => p.saved), [0,220]);
  assert.equal(moved.pots[0].archived,true);
  assert.equal(moved.pots[1].deposits[0].accountId,"a");
  const released = archivePot(first,"p",{ toAccountId:"a",date });
  assert.equal(released.pots[0].saved,0);
  assert.equal(released.accounts,first.accounts);
});
test("Migra cinco mil caixinhas em menos de 100 ms e conserva a soma", () => {
  const goals = Array.from({ length:5000 }, (_, i) => ({ id:"p"+i,saved:3 }));
  let next;
  assertFast(() => {
    next = migratePotsFromGoals({ goals });
  }, 100, "goal-pots");
  assert.equal(next.pots.reduce((n,p) => n+p.saved,0), 15000);
});

test("Destino em outra conta gera transferência confirmada e conserva o saldo total", () => {
  const initial = migratePotsFromGoals(state());
  const source = { ...initial, accounts:[...initial.accounts,{ id:"b", initial:50 }] };
  const result = archivePot(source,"p",{ toAccountId:"b",date });
  assert.equal(result.pots[0].saved,0);
  const [tx] = result.transactions;
  assert.deepEqual([tx.type,tx.amount,tx.accountId,tx.destinationId,tx.confirmed],["transfer",200,"a","b",true]);
  assert.deepEqual(source.transactions,[]);
  assert.equal(archivePot(result,"p",{ toAccountId:"b",date }),result);
});
