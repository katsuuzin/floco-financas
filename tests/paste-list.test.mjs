import test from "node:test";
import assert from "node:assert/strict";
import { parsePastedList } from "../src/pasteList.mjs";
import { MAX_ITEMS } from "../src/shopping.mjs";

const cases = [["pão\nleite",[{"name":"Pão","qty":1,"unit":""},{"name":"Leite","qty":1,"unit":""}]],
  ["\r\n • limão\r\n- maçã\r\n* mamão ",[{"name":"Limão","qty":1,"unit":""},{"name":"Maçã","qty":1,"unit":""},{"name":"Mamão","qty":1,"unit":""}]],
  ["1. pão\n2) leite",[{"name":"Pão","qty":1,"unit":""},{"name":"Leite","qty":1,"unit":""}]],
  ["— arroz\n– feijão",[{"name":"Arroz","qty":1,"unit":""},{"name":"Feijão","qty":1,"unit":""}]],
  ["- [ ] pão\n- [x] queijo",[{"name":"Pão","qty":1,"unit":""},{"name":"Queijo","qty":1,"unit":""}]],
  ["arroz, feijão e café",[{"name":"Arroz","qty":1,"unit":""},{"name":"Feijão","qty":1,"unit":""},{"name":"Café","qty":1,"unit":""}]],
  ["pão,2 ovos",[{"name":"Pão","qty":1,"unit":""},{"name":"Ovos","qty":2,"unit":""}]],
  ["Tomate; cebola; alho",[{"name":"Tomate","qty":1,"unit":""},{"name":"Cebola","qty":1,"unit":""},{"name":"Alho","qty":1,"unit":""}]],
  ["2 cebolas",[{"name":"Cebolas","qty":2,"unit":""}]],
  ["2x leite",[{"name":"Leite","qty":2,"unit":""}]],
  ["2xleite",[{"name":"Leite","qty":2,"unit":""}]],
  ["2 × leite",[{"name":"Leite","qty":2,"unit":""}]],
  ["500g de farinha",[{"name":"Farinha","qty":500,"unit":"g"}]],
  ["1,5 kg tomate, 2 cebolas",[{"name":"Tomate","qty":1.5,"unit":"kg"},{"name":"Cebolas","qty":2,"unit":""}]],
  ["1.5 kg tomate",[{"name":"Tomate","qty":1.5,"unit":"kg"}]],
  ["750 ML de água",[{"name":"Água","qty":750,"unit":"ml"}]],
  ["2 litros de água",[{"name":"Água","qty":2,"unit":"l"}]],
  ["2 un. de iogurte",[{"name":"Iogurte","qty":2,"unit":""}]],
  ["uma dúzia de ovos",[{"name":"Ovos","qty":12,"unit":""}]],
  ["meia dúzia de ovos e 3 tomates",[{"name":"Ovos","qty":6,"unit":""},{"name":"Tomates","qty":3,"unit":""}]],
  ["2 duzias de ovos",[{"name":"Ovos","qty":24,"unit":""}]],
  ["Farofa:\nIngredientes\nHortifrúti\n2 cebolas",[{"name":"Cebolas","qty":2,"unit":""}]],
  ["Ingredientes: 2 ovos e sal",[{"name":"Ovos","qty":2,"unit":""},{"name":"Sal","qty":1,"unit":""}]],
  ["*Lista de compras*\n- Café",[{"name":"Café","qty":1,"unit":""}]],
  ["biscoito de água e sal, 2 ovos",[{"name":"Biscoito de água e sal","qty":1,"unit":""},{"name":"Ovos","qty":2,"unit":""}]],
  ["2x biscoitos de água e sal e leite",[{"name":"Biscoitos de água e sal","qty":2,"unit":""},{"name":"Leite","qty":1,"unit":""}]],
  ["sal e pimenta",[{"name":"Sal","qty":1,"unit":""},{"name":"Pimenta","qty":1,"unit":""}]],
  ["tomate (lavado, sem pele) e sal",[{"name":"Tomate (lavado, sem pele)","qty":1,"unit":""},{"name":"Sal","qty":1,"unit":""}]],
  ["99999 ovos, pão",[{"name":"Pão","qty":1,"unit":""}]],
  ["123\n---\n,,,",[]],
  ["  ",[]],
  [null,[]],
  ["AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nbanana",[{"name":"Banana","qty":1,"unit":""}]]];

for (const [input, expected] of cases) {
  test(`Colar lista: ${JSON.stringify(input)?.slice(0, 80)}`, () => {
    assert.deepEqual(parsePastedList(input), expected);
  });
}

test("Colar lista: limita a quantidade de candidatos", () => {
  assert.equal(parsePastedList("Pão\n".repeat(MAX_ITEMS + 1)).length, MAX_ITEMS);
});

test("Colar receita: ignora as instruções de preparo em várias linhas", () => {
  assert.deepEqual(
    parsePastedList("## Ingredientes\n- 500g de farinha\n- meia dúzia de ovos\n**Modo de preparo:**\n1. Misture os ovos e a farinha.\n2. Leve ao forno."),
    [{ name: "Farinha", qty: 500, unit: "g" }, { name: "Ovos", qty: 6, unit: "" }],
  );
});

test("Colar receita: retoma após um novo bloco de ingredientes", () => {
  assert.deepEqual(
    parsePastedList("Modo de preparo: misture\nEspere esfriar.\n**Ingredientes:** 1,5 kg tomate"),
    [{ name: "Tomate", qty: 1.5, unit: "kg" }],
  );
});

test("Colar lista: uma quantidade de dúzias sem produto não vira item", () => {
  assert.deepEqual(parsePastedList("meia dúzia\n2 dúzias de"), []);
});
