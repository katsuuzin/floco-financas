import test from "node:test";
import assert from "node:assert/strict";
import { parsePackSize, pricePerBase, comparePacks } from "../src/shoppingUnits.mjs";
import { makePurchase } from "./helpers/shoppingFixtures.mjs";

test("Converte tamanhos das embalagens para grama, mililitro, unidade e metro", () => {
  const samples = [["Arroz 5kg",5000,"g","5kg"],["Leite 1L",1000,"ml","1L"],["Suco 200 ml",200,"ml","200 ml"],
    ["Detergente 500ml",500,"ml","500ml"],["Ovos 12 un",12,"un","12 un"],["Papel higiênico 12x30m",360,"m","12x30m"],
    ["1,5 L",1500,"ml","1,5 L"],["1.5L",1500,"ml","1.5L"],["2 x 500 g",1000,"g","2 x 500 g"]];
  for (const [name, amount, unit, text] of samples) assert.deepEqual(parsePackSize(name), { amount, unit, text });
});
test("Último tamanho prevalece e formatos sem medida não passam", () => {
  assert.deepEqual(parsePackSize("Suco 200ml refil 1L"), { amount: 1000, unit: "ml", text: "1L" });
  for (const name of ["meio quilo", "Arroz 0 kg", "a".repeat(20000) + " 2kg", "500mLx", null])
    assert.equal(parsePackSize(name), null);
});
test("Preço por base arredonda meio centavo para cima", () => {
  const purchase = makePurchase();
  assert.equal(pricePerBase(purchase.totalCents, parsePackSize("Arroz 2kg")), 250);
  assert.equal(pricePerBase(1, parsePackSize("Leite 2L")), 1);
  assert.equal(pricePerBase(250, parsePackSize("Ovos 12 un")), 21);
  assert.equal(pricePerBase(-1, parsePackSize("Leite 1L")), null);
});
test("Compara embalagens por medida sem perder a diferença no arredondamento", () => {
  assert.deepEqual(comparePacks({ name:"A 1L", priceCents:200 }, { name:"B 2L", priceCents:300 }),
    { ok:true, winner:"b", percent:25, aCents:200, bCents:150 });
  assert.equal(comparePacks({ name:"A 2L", priceCents:1 }, { name:"B 3L", priceCents:2 }).winner, "a");
  assert.match(comparePacks({ name:"A 1L", priceCents:1 }, { name:"B 1kg", priceCents:1 }).reason, /incompatíveis/);
});
