import test from "node:test";
import assert from "node:assert/strict";
import { createOpenFoodFactsLookup, duplicateOf, resolveScan, suggestItemName } from "../src/scanProduct.mjs";

const raw = "036000291452";
const code = "0036000291452";

test("Código inválido não chama a consulta", async () => {
  let calls = 0;
  const result = await resolveScan({ raw: "inválido", lookup: async () => { calls++; } });
  assert.equal(result.status, "invalid");
  assert.equal(calls, 0);
});
test("Consulta usa UPC normalizado e devolve os campos públicos", async () => {
  assert.deepEqual(await resolveScan({ raw, lookup: async (ean, { signal }) => {
    assert.equal(ean, code);
    assert.equal(signal.aborted, false);
    return { name: "  Leite integral ", brand: "Marca", quantity: "1 L" };
  } }), { status: "found", name: "Leite integral", brand: "Marca", quantityText: "1 L", code });
});
test("Consulta aceita produto sem marca ou quantidade", async () => {
  assert.deepEqual(await resolveScan({ raw, lookup: async () => ({ name: "Leite" }) }),
    { status: "found", name: "Leite", brand: "", quantityText: "", code });
});
test("Repete uma vez após erro transitório", async () => {
  let calls = 0;
  const result = await resolveScan({ raw, lookup: async () => {
    if (++calls === 1) throw Error("Sem rede");
    return { name: "Leite" };
  } });
  assert.equal(result.status, "found");
  assert.equal(calls, 2);
});
test("Duas falhas de rede devolvem offline", async () => {
  let calls = 0;
  const result = await resolveScan({ raw, lookup: async () => { calls++; throw Error("Sem rede"); } });
  assert.deepEqual(result, { status: "offline", code });
  assert.equal(calls, 2);
});
test("Timeout encerra a consulta pendente, sem repetir", async () => {
  let calls = 0;
  let signal;
  const result = await resolveScan({ raw, timeoutMs: 5, lookup: (_, options) => {
    calls++;
    signal = options.signal;
    return new Promise(() => {});
  } });
  assert.deepEqual(result, { status: "offline", code });
  assert.equal(signal.aborted, true);
  assert.equal(calls, 1);
});
for (const value of [null, undefined, [], {}, { name: " " }, { name: "x".repeat(201) }, { name: "<b>Leite</b>" }]) {
  test(`Ausência ou formato inválido não repete consulta: ${JSON.stringify(value)?.slice(0, 28)}`, async () => {
    let calls = 0;
    assert.deepEqual(await resolveScan({ raw, lookup: async () => { calls++; return value; } }), { status: "not_found", code });
    assert.equal(calls, 1);
  });
}
test("Descarta marca ou quantidade com marcação HTML", async () => {
  assert.deepEqual(await resolveScan({ raw, lookup: async () => ({ name: "Leite", brand: "<i>Marca</i>", quantity: "<b>1 L</b>" }) }),
    { status: "found", name: "Leite", brand: "", quantityText: "", code });
});
test("Adaptador do catálogo distingue 404 de falha temporária e permite repetir", async () => {
  let calls = 0;
  const lookup = createOpenFoodFactsLookup(async (url, { signal }) => {
    assert.match(url, new RegExp(code));
    assert.equal(signal.aborted, false);
    return ++calls === 1 ? new Response("", { status: 503 }) : new Response("", { status: 404 });
  });
  assert.deepEqual(await resolveScan({ raw, lookup }), { status: "not_found", code });
  assert.equal(calls, 2);
});
test("Monta nome, evita duplicar marca e quantidade", () => {
  assert.equal(suggestItemName({ name: "Leite integral", brand: "Marca", quantityText: "1 L" }), "Leite integral Marca 1 L");
  assert.equal(suggestItemName({ name: "Leite Itambé 1L", brand: "ITAMBE", quantityText: "1 L" }), "Leite Itambé 1L");
});
test("Limita o nome a 60 caracteres e nunca corta par Unicode", () => {
  assert.equal(suggestItemName({ name: "A".repeat(59) + "🥝", brand: "Marca" }), "A".repeat(59) + "🥝");
});
test("Sinaliza duplicata por código ou nome, mesmo no carrinho", () => {
  const item = { id: "a", name: "Café torrado", ean: raw, inCart: true };
  const data = { shoppingItems: [item] };
  assert.equal(duplicateOf(data, code, "Outro nome"), item);
  assert.equal(duplicateOf(data, "", "CAFE TORRADO"), item);
  assert.equal(duplicateOf(data, "", "Leite"), null);
});
