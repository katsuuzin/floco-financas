import test from "node:test";
import assert from "node:assert/strict";
import { aisleOrder, learnAisleOrder, sortByAisles } from "../src/shoppingAisles.mjs";

const groups = (...categories) => categories.map((category) => ({ category, count: 1, items: [] }));
const names = (result) => result.map(({ category }) => category);
const session = (...categories) => categories.map((category, i) => ({ category, at: i * 1000 }));

test("Ordena os grupos no caminho padrão e deixa categorias novas no fim", () => {
  const input = groups("Congelados", "Mercearia", "Pet", "Frios e laticínios", "Carnes e peixes", "Padaria", "Hortifrúti");
  assert.deepEqual(names(sortByAisles(input)), ["Hortifrúti", "Padaria", "Carnes e peixes", "Frios e laticínios", "Mercearia", "Congelados", "Pet"]);
  assert.equal(input[0].category, "Congelados");
});
test("Aceita ordem personalizada parcial, categorias novas e aliases", () => {
  const input = groups("Hortifrúti", "Limpeza", "Carnes e peixes", "Pet", "Congelados");
  assert.deepEqual(names(sortByAisles(input, ["Pet", "Açougue", "Pet"])),
    ["Pet", "Carnes e peixes", "Hortifrúti", "Limpeza", "Congelados"]);
});
test("Sem três compras informativas, conserva a ordem padrão", () => {
  assert.deepEqual(learnAisleOrder([]), aisleOrder);
  assert.deepEqual(learnAisleOrder([session("Bebidas", "Padaria"), session("Bebidas", "Padaria"), session("Bebidas")]), aisleOrder);
  assert.deepEqual(sortByAisles(undefined), []);
});
test("Aprende a ordem pelo horário, ignora marcação repetida e inclui categoria nova", () => {
  const visit = session("Bebidas", "Congelados", "Padaria", "Bebidas").reverse();
  const learned = learnAisleOrder([visit, { marks: visit }, visit]);
  assert.deepEqual(learned.slice(0, 3), ["Bebidas", "Congelados", "Padaria"]);
  assert.equal(learned.filter((name) => name === "Bebidas").length, 1);
  assert.equal(visit[0].category, "Bebidas");
});
test("Empate segue a ordem padrão", () => {
  const visits = [session("Bebidas", "Padaria"), session("Padaria", "Bebidas"),
    session("Bebidas", "Padaria"), session("Padaria", "Bebidas")];
  assert.deepEqual(learnAisleOrder(visits).slice(0, 2), ["Padaria", "Bebidas"]);
});
test("Marcações com horário inválido não contam como visita informativa", () => {
  const visit = [{ category: "Limpeza", at: "0" }, { category: "Padaria", at: 0 }];
  assert.deepEqual(learnAisleOrder([visit, null, visit, visit]), aisleOrder);
});
