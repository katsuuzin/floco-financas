import test from "node:test";
import assert from "node:assert/strict";
import { checkShoppingBackup } from "../src/shoppingBackupCheck.mjs";
import { describeBackupIssue, summarizeBackupIssues } from "../src/shoppingBackupMessages.mjs";
import { makeState } from "./helpers/shoppingFixtures.mjs";

test("Mostra números humanos nos caminhos de lista e caminhos aninhados", () => {
  const error = checkShoppingBackup(makeState({ items: [{ id: "i", name: "A", qty: -1 }] })).errors[0];
  assert.equal(describeBackupIssue(error), "Item 1 da lista: a quantidade é inválida.");
  assert.equal(describeBackupIssue({ path: "shoppingItems[3].qty", code: "campo" }), "Item 4 da lista: a quantidade é inválida.");
  assert.match(describeBackupIssue({ path: "shoppingPurchases[1].items[0].productId", code: "orfao" }), /^Compra 2, item 1: /);
});
test("Todos os códigos de checkShoppingBackup têm mensagem", () => {
  const cases = {
    tipo: "$", tipo_json: "$", estrutura_json: "$", campo_reservado: "$", tamanho: "$",
    campo: "shoppingItems[0].name", limite: "shoppingProducts[0].prices", id: "shoppingItems[0].id",
    duplicado: "shoppingProducts[0].key", data: "shoppingPurchases[0].date", orfao: "shoppingProducts[0].prices[0].purchaseId",
    chave_fiscal: "shoppingPurchases[0].chave",
  };
  for (const [code, path] of Object.entries(cases)) assert.notEqual(describeBackupIssue({ code, path }), describeBackupIssue());
});
test("Agrupa 200 erros de forma determinística e conta os que ficam fora", () => {
  const errors = Array.from({ length: 200 }, (_, i) => ({ path: "shoppingItems[" + i + "]." + (i < 12 ? "name" : "qty"), code: "campo" }));
  const result = summarizeBackupIssues(errors, { max: 1 });
  assert.match(result.lines[0], /^12 itens/);
  assert.equal(result.more, 188);
  assert.match(result.text, /Mais 188 problemas/);
  assert.deepEqual(summarizeBackupIssues(errors, { max: 1 }), result);
});
test("Vazio, caminhos desconhecidos e campos reservados não vazam detalhes", () => {
  assert.deepEqual(summarizeBackupIssues(), { lines: [], more: 0, text: "" });
  assert.equal(describeBackupIssue({ path: "__proto__", code: "toString", message: "interno" }), describeBackupIssue());
  assert.equal(describeBackupIssue({ path: "shoppingItems[0].constructor", code: "campo" }), describeBackupIssue());
});
