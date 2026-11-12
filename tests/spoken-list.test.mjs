import test from "node:test";
import assert from "node:assert/strict";
import { parseSpoken } from "../src/spokenList.mjs";
import { parsePastedList } from "../src/pasteList.mjs";

test("números falados viram dígitos e cada item vai para uma linha", () => {
  assert.equal(parseSpoken("dois leites, pão e três maçãs"), "2 leites\npão\n3 maçãs");
  assert.equal(parseSpoken("arroz mais feijão mais um quilo de açúcar"), "arroz\nfeijão\n1 quilo de açúcar");
  assert.equal(parseSpoken("vinte ovos"), "20 ovos");
});
test("sem número falado o texto fica como está e entrada inválida vira vazio", () => {
  assert.equal(parseSpoken("leite"), "leite");
  assert.equal(parseSpoken(""), "");
  assert.equal(parseSpoken(undefined), "");
  assert.equal(parseSpoken("um"), "um");
});
test("o resultado entra no leitor do Colar lista", () => {
  const items = parsePastedList(parseSpoken("dois leites e pão"));
  assert.deepEqual(items.map((i) => [i.name.toLowerCase(), i.qty]), [["leites", 2], ["pão", 1]]);
});
