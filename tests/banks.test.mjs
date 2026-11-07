import { test } from "node:test";
import assert from "node:assert/strict";
import { bankProfiles, bankProfile } from "../src/banks.mjs";
import {
  emptyState,
  addTransaction,
  balance,
  validateBackup,
} from "../src/finance.mjs";
test("quatro perfis PF/PJ têm identificadores distintos", () => {
  assert.deepEqual(
    bankProfiles.map((p) => p.label),
    ["Nubank PF", "Nubank PJ", "Inter PF", "Inter PJ"],
  );
  assert.equal(new Set(bankProfiles.map((p) => p.id)).size, 4);
  assert.equal(bankProfile("nubank-pj").holderType, "PJ");
  assert.equal(bankProfile("invalid"), null);
});
test("contas do mesmo banco preservam saldos e perfis independentes no backup", () => {
  let s = emptyState();
  s.accounts = bankProfiles.map((p) => ({
    id: p.id,
    name: p.label,
    institution: p.institution,
    profileId: p.id,
    holderType: p.holderType,
    initial: 10000,
  }));
  s = addTransaction(s, {
    type: "expense",
    description: "Compra PF",
    amount: 1500,
    date: "2026-11-06",
    accountId: "nubank-pf",
    confirmed: true,
  });
  assert.equal(balance(s, "nubank-pf"), 8500);
  assert.equal(balance(s, "nubank-pj"), 10000);
  const restored = validateBackup(JSON.parse(JSON.stringify(s)));
  assert.equal(
    restored.accounts.find((a) => a.id === "inter-pj").holderType,
    "PJ",
  );
  assert.equal(balance(restored, "nubank-pj"), 10000);
});
