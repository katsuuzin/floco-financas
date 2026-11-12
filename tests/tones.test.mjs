import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORY_TONES, CATEGORY_TONE_OF, LIST_COLOR_NAMES, LIST_TONES, categoryTone, contrast, listTone } from "../src/tones.mjs";
import { LIST_COLORS, SHOPPING_CATEGORIES } from "../src/shoppingData.mjs";
// Fundos da tela (src/ui/theme.tsx).
const palette = { light: { bg: "#FAF5EF" }, dark: { bg: "#0E0E10" } };

test("toda categoria tem tom e todo tom existe nos dois temas", () => {
  for (const category of SHOPPING_CATEGORIES) assert.ok(Object.hasOwn(CATEGORY_TONE_OF, category), category);
  for (const theme of ["light", "dark"]) for (const tone of Object.values(CATEGORY_TONE_OF))
    assert.ok(CATEGORY_TONES[theme][tone], `${theme} ${tone}`);
  assert.deepEqual(categoryTone("Inventada", false), CATEGORY_TONES.light.areia);
});

test("ícone sobre o círculo tem contraste de pelo menos 3:1", () => {
  for (const theme of ["light", "dark"]) for (const [name, tone] of Object.entries(CATEGORY_TONES[theme]))
    assert.ok(contrast(tone.fg, tone.bg) >= 3, `${theme} ${name}: ${contrast(tone.fg, tone.bg).toFixed(2)}`);
});

test("cartões de lista: texto e secundário com pelo menos 4,5:1; mesmas chaves das cores salvas", () => {
  for (const theme of ["light", "dark"]) {
    assert.deepEqual(Object.keys(LIST_TONES[theme]).sort(), [...LIST_COLORS].sort());
    for (const [name, tone] of Object.entries(LIST_TONES[theme])) {
      assert.ok(contrast(tone.text, tone.bg) >= 4.5, `${theme} ${name} texto: ${contrast(tone.text, tone.bg).toFixed(2)}`);
      assert.ok(contrast(tone.sub, tone.bg) >= 4.5, `${theme} ${name} secundário: ${contrast(tone.sub, tone.bg).toFixed(2)}`);
    }
  }
  assert.deepEqual(Object.keys(LIST_COLOR_NAMES).sort(), [...LIST_COLORS].sort());
  assert.deepEqual(listTone("nada", true), LIST_TONES.dark.amarelo);
});

test("cartão de lista se distingue do fundo da tela", () => {
  for (const theme of ["light", "dark"]) for (const [name, tone] of Object.entries(LIST_TONES[theme]))
    assert.ok(contrast(tone.bg, palette[theme].bg) >= 1.1, `${theme} ${name}`);
});
