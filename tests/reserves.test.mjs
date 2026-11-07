import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  contribute,
  withdrawGoal,
  transferGoal,
  balance,
  reserved,
  validateBackup,
} from "../src/finance.mjs";
test("retirada libera somente a reserva da conta escolhida sem alterar saldo bancário", () => {
  let s = {
    ...emptyState(),
    accounts: [
      { id: "a", name: "A", initial: 10000 },
      { id: "b", name: "B", initial: 20000 },
    ],
    goals: [
      { id: "g", name: "Reserva", target: 20000, saved: 0, deposits: [] },
      { id: "h", name: "Viagem", target: 50000, saved: 0, deposits: [] },
    ],
  };
  s = contribute(s, "g", 4000, "a");
  s = contribute(s, "g", 6000, "b");
  s = withdrawGoal(s, "g", 1500, "a");
  assert.equal(reserved(s, "a"), 2500);
  assert.equal(reserved(s, "b"), 6000);
  assert.equal(balance(s, "a"), 10000);
  assert.throws(() => withdrawGoal(s, "g", 2501, "a"));
  s = transferGoal(s, "g", "h", 2000, "a");
  assert.equal(s.goals[1].saved, 2000);
  assert.equal(s.goals[0].saved, 6500);
  assert.equal(reserved(s, "a"), 2500);
  assert.doesNotThrow(() => validateBackup(JSON.parse(JSON.stringify(s))));
});
