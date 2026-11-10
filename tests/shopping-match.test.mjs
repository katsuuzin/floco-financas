import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState } from "../src/finance.mjs";
import { addShoppingItem, toggleCart, setItemPrice } from "../src/shopping.mjs";
import { tokens, tokenMatch, scorePair, matchListToNota, applyConferencia } from "../src/shoppingMatch.mjs";

// Linhas de nota FICTÍCIAS, no estilo abreviado da SEFAZ.
const nota = [
  { name: "FARIN TRIGO MARCA 1KG", qty: 1, unit: "", unitPriceCents: 789, totalCents: 789 },
  { name: "CR LEITE MARCA TP 200G", qty: 2, unit: "", unitPriceCents: 298, totalCents: 596 },
  { name: "LEITE INTEGRAL MARCA 1L", qty: 1, unit: "", unitPriceCents: 520, totalCents: 520 },
  { name: "TOMATE ITALIANO", qty: 1.5, unit: "kg", unitPriceCents: 800, totalCents: 1200 },
  { name: "BISC RECH 140G CHOCOLATE", qty: 1, unit: "", unitPriceCents: 499, totalCents: 499 },
  { name: "DETERG LIQ MARCA 500ML", qty: 1, unit: "", unitPriceCents: 249, totalCents: 249 },
];
const lista = (...textos) => textos.reduce((s, t, i) => addShoppingItem(s, t, { id: `i${i + 1}`, now: i }), emptyState());

test("tokens: sem acento, preposição, unidade nem número de embalagem; plural vira singular", () => {
  assert.deepEqual(tokens("Farinha de Mandioca 500g"), ["farinha", "mandioca"]);
  assert.deepEqual(tokens("CR LEITE MARCA TP 200G"), ["creme", "leite", "marca"]);
  assert.deepEqual(tokens("Franceses"), ["frances"]);
  assert.deepEqual(tokens("Tomates"), tokens("tomate"));
  assert.deepEqual(tokens("CEBOLAS"), tokens("cebola"));
});

test("tokenMatch: igual ou começo da outra palavra (3+ letras)", () => {
  assert.equal(tokenMatch("farinha", "farin"), true);
  assert.equal(tokenMatch("biscoito", "bisc"), true);
  assert.equal(tokenMatch("leite", "leite"), true);
  assert.equal(tokenMatch("arroz", "ar"), false);
  assert.equal(tokenMatch("sal", "sabao"), false);
});

test("scorePair exige 60% das palavras da lista", () => {
  assert.equal(scorePair("Farinha de trigo", "FARIN TRIGO MARCA 1KG").score, 1);
  assert.equal(scorePair("Farinha de mandioca", "FARIN TRIGO MARCA 1KG").score, 0, "mandioca não está na linha");
  assert.equal(scorePair("Leite", "LEITE INTEGRAL MARCA 1L").score, 1);
  assert.equal(scorePair("Leite", "CR LEITE MARCA TP 200G").score, 0, "creme de leite não é leite");
  assert.equal(scorePair("Creme de leite", "CR LEITE MARCA TP 200G").score, 1);
  assert.equal(scorePair("Arroz", "FARIN TRIGO MARCA 1KG").score, 0);
});

test("casa os itens da lista com as linhas da nota, abreviadas ou não", () => {
  const s = lista("farinha de trigo", "biscoito recheado", "2 tomate italiano", "arroz");
  const r = matchListToNota(s, nota);
  assert.deepEqual(r.matches.map((m) => [m.listName, m.notaName]), [
    ["Farinha de trigo", "FARIN TRIGO MARCA 1KG"],
    ["Biscoito recheado", "BISC RECH 140G CHOCOLATE"],
    ["Tomate italiano", "TOMATE ITALIANO"],
  ]);
  assert.deepEqual(r.notInNota.map((i) => i.name), ["Arroz"]);
  assert.equal(r.notInList.length, 3); // creme de leite, leite integral e detergente
});

test("'leite' escolhe a linha mais específica e não leva o creme de leite junto", () => {
  const s = lista("leite");
  const r = matchListToNota(s, nota);
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].notaName, "LEITE INTEGRAL MARCA 1L");
  assert.ok(r.notInList.some((n) => n.name.startsWith("CR LEITE")));
});

test("linha que muda o produto (CR, MOL...) só casa se a lista também citar", () => {
  const soCreme = [{ name: "CR LEITE MARCA TP 200G", qty: 1, unit: "", unitPriceCents: 298, totalCents: 298 }];
  assert.equal(matchListToNota(lista("leite"), soCreme).matches.length, 0, "leite não é creme de leite");
  assert.equal(matchListToNota(lista("creme de leite"), soCreme).matches.length, 1);
  const molho = [{ name: "MOL TOM HEINZ SACH 240G", qty: 1, unit: "", unitPriceCents: 269, totalCents: 269 }];
  assert.equal(matchListToNota(lista("tomate"), molho).matches.length, 0, "tomate não é molho de tomate");
  assert.equal(matchListToNota(lista("molho de tomate"), molho).matches.length, 1);
});

test("cada linha da nota atende só um item da lista", () => {
  const s = lista("leite", "leite integral");
  const r = matchListToNota(s, nota);
  const usadas = r.matches.map((m) => m.notaIndex);
  assert.equal(new Set(usadas).size, usadas.length);
  assert.ok(r.matches.length <= 2);
});

test("itens que já estão no carrinho não entram na conferência", () => {
  let s = lista("farinha de trigo", "tomate");
  s = toggleCart(s, "i1");
  const r = matchListToNota(s, nota);
  assert.deepEqual(r.matches.map((m) => m.listName), ["Tomate"]);
});

test("sinaliza quando a nota trouxe menos do que a lista pedia", () => {
  const s = lista("3 farinha de trigo");
  const [m] = matchListToNota(s, nota).matches;
  assert.equal(m.qtyShort, true);
  const ok = matchListToNota(lista("1 farinha de trigo"), nota).matches[0];
  assert.equal(ok.qtyShort, false);
});

test("aplicar põe no carrinho e aprende o preço só de quem não tinha", () => {
  let s = lista("farinha de trigo", "500g tomate", "biscoito recheado");
  s = setItemPrice(s, "i3", "5,50"); // já tinha preço próprio
  const r = matchListToNota(s, nota);
  const out = applyConferencia(s, r.matches, nota);
  const por = Object.fromEntries(out.shoppingItems.map((i) => [i.id, i]));
  assert.equal(por.i1.inCart, true);
  assert.equal(por.i1.priceCents, 789); // sem unidade: preço unitário
  assert.equal(por.i2.inCart, true);
  assert.equal(por.i2.priceCents, 1200); // com unidade: valor da porção/linha
  assert.equal(por.i3.priceCents, 550, "preço que o usuário já tinha não é trocado");
  assert.equal(s.shoppingItems.every((i) => !i.inCart), true, "o estado original não muda");
});

test("aplicar só os pares escolhidos", () => {
  const s = lista("farinha de trigo", "tomate");
  const r = matchListToNota(s, nota);
  const out = applyConferencia(s, [r.matches[0]], nota);
  assert.equal(out.shoppingItems.filter((i) => i.inCart).length, 1);
});

test("lista vazia ou nota vazia não quebra", () => {
  assert.deepEqual(matchListToNota(emptyState(), nota).matches, []);
  const r = matchListToNota(lista("arroz"), []);
  assert.equal(r.matches.length, 0);
  assert.equal(r.notInNota.length, 1);
});

test("linhas da nota já usadas ficam de fora da conferência seguinte (itens duplicados na lista)", () => {
  const s = lista("farinha de trigo", "farinha de trigo");
  const r1 = matchListToNota(s, nota);
  assert.equal(r1.matches.length, 1, "só há uma linha de farinha na nota");
  const usadas = new Set(r1.matches.map((m) => m.notaIndex));
  const marcado = applyConferencia(s, r1.matches, nota);
  const r2 = matchListToNota(marcado, nota, { skip: usadas });
  assert.equal(r2.matches.length, 0, "a mesma linha não atende o segundo item");
  assert.equal(r2.notInList.some((n) => n.name.startsWith("FARIN")), false);
  assert.equal(r2.notInNota.length, 1);
});
