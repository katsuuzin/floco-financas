import { assertFast } from "./helpers/timing.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { emptyState, validateBackup } from "../src/finance.mjs";
import { applyStatementFilter, describeFilter, activeFilterCount, sanitizeFilter } from "../src/statementFilter.mjs";

const row = (id, fields = {}) => ({ id, accountId: "a", type: "expense", amount: 200, tags: ["t"], date: "2026-01-02", description: "Café", ...fields });
test("Preferência do extrato aceita backup antigo e descarta filtro inválido ao ler", () => {
  const old = emptyState();
  assert.equal(activeFilterCount(sanitizeFilter(validateBackup(old).settings.display?.statementFilter)), 0);
  const dirty = { ...old, settings: { ...old.settings, display: { statementFilter: { types: ["constructor"], minCents: "texto" } } } };
  assert.equal(activeFilterCount(sanitizeFilter(validateBackup(dirty).settings.display.statementFilter)), 0);
});
test("Vazio mantém a lista e armazenamento malformado perde lixo", () => {
  const rows = [row("a")];
  assert.equal(applyStatementFilter(rows), rows);
  assert.deepEqual(applyStatementFilter(), []);
  const filter = sanitizeFilter(JSON.parse('{"__proto__":{"text":"fantasma"},"minCents":500,"maxCents":100,"accountIds":["x","x",4,"constructor"],"types":["income","lixo"]}'));
  assert.deepEqual(filter, { accountIds: ["x"], tagIds: [], minCents: 100, maxCents: 500, types: ["income"], text: "" });
});
test("Combina campos e usa módulo, origem e destino de transferência", () => {
  const rows = [row("a", { type: "transfer", destinationId: "b", amount: -200 }),
    row("b", { accountId: "b", cardId: "c" }), row("c", { tags: ["outra"] }),
    row("d", { accountId: "b", description: "Chá" })];
  const result = applyStatementFilter(rows, { accountIds: ["b"], tagIds: ["t","outra"], minCents: 200, maxCents: 200,
    text: "cafe", types: ["transfer", "expense"] });
  assert.deepEqual(result.map((entry) => entry.id), ["a", "b"]);
  assert.equal(result[0].amount, -200);
  assert.equal(applyStatementFilter(rows, { accountIds: ["a"], types: ["transfer"] })[0], rows[0]);
});
test("Contagem por campo e resumo com rótulos cadastrados", () => {
  const filter = { accountIds: ["a"], tagIds: ["t"], minCents: 100, maxCents: 200, types: ["expense"], text: "café" };
  assert.equal(activeFilterCount(filter), 5);
  assert.match(describeFilter(filter, { accounts: [{ id: "a", name: "Conta de teste" }], tags: [{ id: "t", name: "Casa" }] }),
    /Conta de teste.*Casa.*1,00.*2,00.*Despesas.*café/);
  assert.equal(describeFilter(), "");
});
test("Cinco mil linhas em menos de 100 ms", () => {
  const rows = Array.from({ length: 5000 }, (_, i) => row(String(i)));
  assertFast(() => {
    assert.equal(applyStatementFilter(rows, { accountIds: ["a"], text: "cafe" }).length, 5000);
  }, 100, "statement-filter");
});
