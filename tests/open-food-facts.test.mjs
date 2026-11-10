import test from "node:test";
import assert from "node:assert/strict";
import { isValidEan, lookupEan } from "../src/openFoodFacts.mjs";

const OK = { status: 1, product: { product_name: "  Produto fictício ", brands: " Marca ", quantity: " 200 g " } };
const expected = { name: "Produto fictício", brand: "Marca", quantity: "200 g" };
const response = (payload = OK) => ({ ok: true, json: async () => payload });
const ean = (body) => body + (10 - [...body].reverse().reduce((sum, n, i) => sum + Number(n) * (i % 2 ? 1 : 3), 0) % 10) % 10;
const code = ean("012345678901");

for (const body of ["0123456", "01234567890", "012345678901", "0123456789012"]) {
  test(`Open Food Facts: aceita GTIN de ${body.length + 1} dígitos`, async () => {
    const gtin = ean(body);
    const result = await lookupEan(" " + gtin + " ", async (url, options) => {
      assert.equal(url, `https://world.openfoodfacts.org/api/v2/product/${gtin}.json?fields=product_name,brands,quantity`);
      assert.equal(options.credentials, "omit");
      assert.equal(options.body, undefined);
      assert.equal(options.redirect, "error");
      return response();
    });
    assert.deepEqual(result, expected);
  });
}

test("Open Food Facts: rejeita caracteres, formatos e dígitos inválidos sem pedir à rede", async () => {
  let calls = 0;
  const mock = async () => { calls++; return response(); };
  for (const invalid of ["", "https://invalid.test", "0123456x", code.slice(0, -1) + (Number(code.at(-1)) + 1) % 10, "123-45678", Number(code), ean("0123456789")]) {
    assert.equal(await lookupEan(invalid, mock), null);
  }
  assert.equal(calls, 0);
});

test("Open Food Facts: aceita produto sem marca ou quantidade", async () => {
  assert.deepEqual(await lookupEan(code, async () => response({ status: 1, product: { product_name: "Produto" } })),
    { name: "Produto", brand: "", quantity: "" });
});

for (const [label, mock] of [
  ["404", async () => ({ ok: false, status: 404 })],
  ["rede indisponível", async () => { throw Error("Sem rede"); }],
  ["JSON quebrado", async () => ({ ok: true, json: async () => { throw SyntaxError("JSON inválido"); } })],
  ["produto inexistente", async () => response({ status: 0 })],
  ["produto inesperado", async () => response({ status: 1, product: [] })],
  ["produto sem nome válido", async () => response({ status: 1, product: { product_name: 42 } })],
]) {
  test(`Open Food Facts: ${label} retorna null`, async () => {
    assert.equal(await lookupEan(code, mock), null);
  });
}

test("Open Food Facts: agrupa chamadas simultâneas, usa cache e protege o valor de mutação", async () => {
  let calls = 0;
  const mock = async () => { calls++; return response(); };
  const [first, second] = await Promise.all([lookupEan(code, mock), lookupEan(code, mock)]);
  assert.deepEqual(first, expected);
  assert.deepEqual(second, expected);
  first.name = "Editado na prévia";
  assert.deepEqual(await lookupEan(code, mock), expected);
  assert.equal(calls, 1);
  assert.deepEqual(await lookupEan(code, async () => response({ status: 0 })), null);
});

test("Open Food Facts: falha transitória não bloqueia nova tentativa", async () => {
  let calls = 0;
  const mock = async () => { if (++calls === 1) throw Error("Sem rede"); return response(); };
  assert.equal(await lookupEan(code, mock), null);
  assert.deepEqual(await lookupEan(code, mock), expected);
});

test("Open Food Facts: aborta após 8 s, mesmo se a leitura de JSON não terminar", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let signal;
  const pending = lookupEan(code, async (_, options) => {
    signal = options.signal;
    return { ok: true, json: () => new Promise(() => {}) };
  });
  await Promise.resolve();
  t.mock.timers.tick(7_999);
  assert.equal(signal.aborted, false);
  t.mock.timers.tick(1);
  assert.equal(await pending, null);
  assert.equal(signal.aborted, true);
});

for (const [kind, valid, wrong] of [
  [8, "96385074", "96385075"],
  [12, "036000291452", "036000291453"],
  [13, "4006381333931", "4006381333932"],
  [14, "10012345000017", "10012345000018"],
]) {
  test(`Valida GTIN-${kind} e preserva zeros à esquerda`, () => {
    assert.equal(isValidEan(valid), true);
  });
  test(`Rejeita dígito verificador errado de GTIN-${kind}`, () => {
    assert.equal(isValidEan(wrong), false);
  });
}

test("O validador público exige apenas os dígitos do código em uma string", () => {
  for (const input of [" 96385074", "96385074 ", "9638507\n", "９６３８５０７４", 96385074, null]) {
    assert.equal(isValidEan(input), false);
  }
});

test("Usa marca e quantidade quando o nome está em branco", async () => {
  const result = await lookupEan(code, async () => new Response(JSON.stringify({
    status: 1, product: { product_name: " ", brands: "Marca", quantity: "200 g" },
  })));
  assert.deepEqual(result, { name: "Marca 200 g", brand: "Marca", quantity: "200 g" });
});

test("Limita o nome a 80 caracteres sem cortar um par Unicode", async () => {
  const result = await lookupEan(code, async () => response({
    status: 1, product: { product_name: "A".repeat(79) + "🥝" + "B".repeat(30) },
  }));
  assert.equal(result.name, "A".repeat(79) + "🥝");
});

test("Rejeita tamanho declarado acima do limite sem ler o corpo", async () => {
  let reads = 0;
  const result = await lookupEan(code, async () => ({
    ok: true, headers: new Headers({ "content-length": "65537" }),
    text: async () => { reads++; return JSON.stringify(OK); },
  }));
  assert.equal(result, null);
  assert.equal(reads, 0);
});

test("Rejeita corpo grande sem Content-Length e cancela a leitura da stream", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(65537)); },
    cancel() { cancelled = true; },
  });
  assert.equal(await lookupEan(code, async () => new Response(stream)), null);
  assert.equal(cancelled, true);
});

test("Também mede bytes em respostas sem stream, incluindo UTF-8", async () => {
  const payload = { ...OK, extra: "ç".repeat(33000) };
  const result = await lookupEan(code, async () => ({ ok: true, text: async () => JSON.stringify(payload) }));
  assert.equal(result, null);
});
