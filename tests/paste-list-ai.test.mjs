import test from "node:test";
import assert from "node:assert/strict";
import { interpretPastedList } from "../src/pasteListAi.mjs";

const local = { source: "local", items: [{ name: "Ovos", qty: 2, unit: "" }] };

test("IA recebe apenas o texto da lista e devolve candidatos para a prévia", async () => {
  const result = await interpretPastedList("  dois ovos  ", async (input, { signal }) => {
    assert.equal(input, "dois ovos");
    assert.equal(signal.aborted, false);
    return [{ name: " Ovos ", qty: 2, unit: "", price: 99 }];
  });
  assert.deepEqual(result, { source: "ai", items: local.items });
});

test("Volta ao parser local sem provedor, com erro ou com resultado inválido", async () => {
  const invalid = [
    null,
    [],
    [{ name: "Ovos", qty: "2", unit: "" }],
    [{ name: "Ovos", qty: 1.5, unit: "" }],
    [{ name: "Ovos", qty: 2, unit: "caixa" }],
    [{ name: " ", qty: 2, unit: "" }],
  ];
  assert.deepEqual(await interpretPastedList("2 ovos"), local);
  assert.deepEqual(await interpretPastedList("2 ovos", () => { throw Error("Sem rede"); }), local);
  for (const output of invalid) {
    assert.deepEqual(await interpretPastedList("2 ovos", async () => output), local);
  }
});

test("Entrada vazia ou muito longa não é enviada ao provedor", async () => {
  let calls = 0;
  const interpret = () => { calls++; return []; };
  assert.deepEqual(await interpretPastedList(" ", interpret), { source: "local", items: [] });
  const result = await interpretPastedList("2 ovos\n".repeat(2001), interpret);
  assert.equal(result.source, "local");
  assert.equal(calls, 0);
});

test("Após oito segundos, cancela a chamada e volta à prévia local", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let signal;
  const pending = interpretPastedList("2 ovos", (_, options) => {
    signal = options.signal;
    return new Promise(() => {});
  });
  t.mock.timers.tick(8_000);
  assert.deepEqual(await pending, local);
  assert.equal(signal.aborted, true);
});
