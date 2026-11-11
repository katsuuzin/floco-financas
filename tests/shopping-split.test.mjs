import test from "node:test";
import assert from "node:assert/strict";
import { splitDraft } from "../src/shoppingSplit.mjs";

const row = (category, priceCents, other = {}) => ({ name: category, category, priceCents, qty: 1, inCart: true, ...other });
const state = (...shoppingItems) => ({ shoppingItems });

test("Carrinho vazio e itens pendentes não geram despesas", () => {
  assert.deepEqual(splitDraft(state(row("Padaria", 300, { inCart: false }))), { totalCents: 0, expenses: [], unpriced: [] });
});
test("Itens sem preço ficam disponíveis para revisão", () => {
  const item = row("Outros", null);
  assert.deepEqual(splitDraft(state(item)), { totalCents: 0, expenses: [], unpriced: [item] });
});
test("Modo simples usa Mercado e respeita preço da porção", () => {
  assert.deepEqual(splitDraft(state(row("Padaria", 100, { qty: 2 }), row("Limpeza", 55, { qty: 0.5, unit: "kg" }))).expenses,
    [{ type: "expense", category: "Mercado", amountCents: 255, description: "Compra de mercado" }]);
});
test("Modo por categoria usa catálogo e Mercado para categoria desconhecida", () => {
  const result = splitDraft(state(row("Higiene", 500), row("Limpeza", 300), row("Alienígena", 50)), { mode: "category" });
  assert.deepEqual(result.expenses.map(({ category, subcategory, amountCents }) => [category, subcategory, amountCents]),
    [["Cuidados Pessoais", "Higiene", 500], ["Moradia", undefined, 300], ["Mercado", undefined, 50]]);
});
test("Diferença de um centavo em mil itens é aplicada ao maior grupo", () => {
  const items = [...Array.from({ length: 998 }, () => row("Mercearia", 100)), row("Mercearia", 1.5), row("Higiene", 1.5)];
  const result = splitDraft(state(...items), { mode: "category" });
  assert.equal(result.totalCents, 99803);
  assert.deepEqual(result.expenses.map((expense) => expense.amountCents), [99801, 2]);
  assert.equal(result.expenses.reduce((sum, expense) => sum + expense.amountCents, 0), result.totalCents);
});
test("Preço zero é conhecido e centavos fora do limite não são graváveis", () => {
  assert.deepEqual(splitDraft(state(row("Outros", 0))), { totalCents: 0, expenses: [], unpriced: [] });
  assert.throws(() => splitDraft(state(row("Outros", Number.MAX_SAFE_INTEGER), row("Outros", 1))), /grande demais/);
});
