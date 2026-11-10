import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, validateBackup } from "../src/finance.mjs";
import { saveLabel } from "../src/planning.mjs";
import { PALETTE, colorFor, lookOf, setCategoryLook, setTagColor, tagColor } from "../src/looks.mjs";

test("O4 categorias padrão têm ícone; cor estável sem escolha", () => {
  const s = emptyState();
  assert.equal(lookOf(s, "Mercado").icon, "shopping-cart");
  assert.deepEqual([lookOf(s, "Mercado").image, lookOf(s, "Mercado").color], ["grocery", "#6366F1"]);
  assert.equal(lookOf(s, "Qualquer").image, "");
  assert.equal(lookOf(s, "Qualquer").color, colorFor("Qualquer"));
  assert.ok(PALETTE.includes(colorFor("Qualquer")));
});

test("O4 escolha de ícone e cor vale, valida e acompanha renomear", () => {
  let s = { ...emptyState(), customCategories: [{ id: "p", name: "Pets", parent: "" }] };
  s = setCategoryLook(s, "Pets", { icon: "heart", color: PALETTE[3] });
  assert.deepEqual(lookOf(s, "Pets"), { icon: "heart", color: PALETTE[3], image: "" });
  assert.throws(() => setCategoryLook(s, "Pets", { icon: "nao-existe" }));
  assert.throws(() => setCategoryLook(s, "Pets", { color: "#000000" }));
  s = saveLabel(s, "customCategories", { id: "p", name: "Bichos" });
  assert.equal(lookOf(s, "Bichos").icon, "heart");
  assert.equal(s.categoryLooks.Pets, undefined);
  const back = validateBackup(JSON.parse(JSON.stringify(s)));
  assert.equal(back.categoryLooks.Bichos.color, PALETTE[3]);
});

test("O4 escolha de ícone do Calen: vale, valida e vence o padrão", () => {
  let s = emptyState();
  s = setCategoryLook(s, "Moradia", { icon: "calen:wedding" });
  assert.equal(lookOf(s, "Moradia").image, "wedding");
  assert.throws(() => setCategoryLook(s, "Moradia", { icon: "calen:nao-existe" }));
  assert.equal(lookOf(setCategoryLook(emptyState(), "Moradia", { color: "#14B8A6" }), "Moradia").color, "#14B8A6");
});

test("O4 subcategoria herda o ícone da principal", () => {
  const s = { ...emptyState(), customCategories: [{ id: "u", name: "Uber", parent: "Transporte" }] };
  assert.equal(lookOf(s, "Uber").icon, "truck");
  assert.equal(lookOf(s, "Uber").image, "transport");
});

test("O5 cor de tag", () => {
  let s = { ...emptyState(), tags: [{ id: "t", name: "casa" }] };
  assert.equal(tagColor(s.tags[0]), colorFor("casa"));
  s = setTagColor(s, "t", PALETTE[1]);
  assert.equal(tagColor(s.tags[0]), PALETTE[1]);
  assert.throws(() => setTagColor(s, "x", PALETTE[1]));
});
