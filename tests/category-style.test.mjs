import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, validateBackup } from "../src/finance.mjs";
import { ALLOWED_ICONS, ALLOWED_COLORS, sanitizeStyle, readableOn, defaultStyleFor, withStyle } from "../src/categoryStyle.mjs";

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((v) => parseInt(v,16)/255);
  const [r,g,b] = channels.map((v) => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return .2126*r + .7152*g + .0722*b;
}
test("Backup aceita tags antigas e remove aparência inválida", () => {
  const old = { ...emptyState(), tags:[{ id:"t",name:"casa" }] };
  assert.deepEqual(validateBackup(old).tags,old.tags);
  const bad = { ...old, tags:[{ ...old.tags[0],icon:"constructor",color:"lixo" }],
    categoryLooks:{ Mercado:{ icon:"lixo",color:"lixo" } } };
  assert.deepEqual(validateBackup(bad).tags,old.tags);
  assert.deepEqual(validateBackup(bad).categoryLooks.Mercado,defaultStyleFor("Mercado"));
});
test("As doze cores têm texto AA de pelo menos 4,5:1", () => {
  assert.equal(new Set(ALLOWED_COLORS).size,12);
  for (const color of ALLOWED_COLORS) {
    const fg = readableOn(color);
    assert.ok(["#311E0D","#FFFFFF"].includes(fg));
    const values = [luminance(fg),luminance(color)].sort((a,b) => b-a);
    assert.ok((values[0]+.05)/(values[1]+.05) >= 4.5,color);
  }
  assert.ok(ALLOWED_COLORS.includes("#FBB202"));
});
test("Lista fechada recusa cor, ícone arbitrário e propriedades herdadas", () => {
  assert.deepEqual(sanitizeStyle({icon:"shopping-cart",color:"#fbb202"}),{icon:"shopping-cart",color:"#FBB202"});
  assert.deepEqual(sanitizeStyle({icon:"constructor",color:"#123456"}),sanitizeStyle());
  assert.deepEqual(sanitizeStyle(Object.create({icon:"shopping-cart",color:"#FBB202"})),sanitizeStyle());
  assert.ok(ALLOWED_ICONS.includes("tag"));
});
test("Categoria ou etiqueta antiga ganha padrão e mantém todos os outros campos", () => {
  const old = { id:"c", name:"Mercado", other:1 };
  assert.deepEqual(withStyle(old),{...old, style:defaultStyleFor("Mercado")});
  assert.equal(withStyle(old).style.icon,"shopping-cart");
  assert.equal(defaultStyleFor("Transporte").icon,"shuffle");
  assert.equal(old.style,undefined);
  assert.equal(withStyle(undefined,{}).style.icon,"tag");
});
