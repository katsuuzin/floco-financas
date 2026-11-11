import test from "node:test";
import assert from "node:assert/strict";
import { makeState, makePurchase } from "./helpers/shoppingFixtures.mjs";
import { migrateProductKeys } from "../src/shoppingKeyMigration.mjs";
import { applySuggestedPrices, suggestPrices } from "../src/shoppingSuggestPrice.mjs";
import { listToCsv } from "../src/shoppingExport.mjs";
import { duplicateOf, resolveScan } from "../src/scanProduct.mjs";
import { parseSession, resumeSession } from "../src/shoppingTripSession.mjs";

test("Carregamento sem catálogo e estado já migrado preservam a referência", () => {
  for (const state of [{}, makeState({ products: [{ name: "Leite 1,5L", key: "leite 1.5l|", id: "a" }] })])
    assert.equal(migrateProductKeys(state).state, state);
});
test("Carregamento migra chave antiga e reaponta compras sem duplicar histórico", () => {
  const products = [{ name: "Leite 1,5L", key: "leite 1 5l|", id: "a", buys: 1 },
    { name: "Leite 1.5L", key: "leite 1.5l|", id: "b", buys: 1 }];
  const purchase = makePurchase();
  purchase.items[0].productId = "b";
  const state = makeState({ purchases: [purchase], products });
  const first = migrateProductKeys(state);
  assert.deepEqual([first.rekeyed, first.merged], [1, 1]);
  assert.equal(first.state.shoppingProducts[0].key, "leite 1.5l|");
  assert.equal(first.state.shoppingPurchases[0].items[0].productId, "a");
  assert.equal(first.state.shoppingPurchases.length, 1);
  assert.equal(migrateProductKeys(first.state).state, first.state);
  assert.equal(state.shoppingPurchases[0].items[0].productId, "b");
});
test("Último preço sem pontos funciona em 2.000 itens e preço manual fica intacto", () => {
  const products = [{ id: "a", name: "Arroz", key: "arroz|", unit: "", lastPriceCents: 600, prices: [] }];
  const items = Array.from({ length: 2000 }, (_, i) => ({ id: String(i), name: "Arroz", qty: 1, priceCents: i ? null : 500 }));
  const state = makeState({ items, products });
  assert.equal(suggestPrices(state).length, 1999);
  const next = applySuggestedPrices(state);
  assert.equal(next.shoppingItems[0], state.shoppingItems[0]);
  assert.ok(next.shoppingItems.slice(1).every((item) => item.priceCents === 600));
});
test("Achado: preço sugerido por kg precisa virar preço da porção fracionada", () => {
  const items = [{ id: "a", name: "Tomate", unit: "kg", qty: 0.5, priceCents: null }];
  const products = [{ id: "p", name: "Tomate", key: "tomate|kg", unit: "kg", lastPriceCents: 800, prices: [] }];
  const state = makeState({ items, products });
  assert.deepEqual([suggestPrices(state)[0].priceCents, applySuggestedPrices(state).shoppingItems[0].priceCents], [400, 400]);
});
test("CSV protege fórmulas diretas e após NUL, BOM, bidi, tab e marcas invisíveis", () => {
  const names = ["=1+1", "+A1", "-A1", "@A1", "\tTexto", "\rTexto", "\0=1+1", "\uFEFF+A1", "\u202E-A1", "\u200B@A1", "\t=1+1"];
  const csv = listToCsv(makeState({ items: names.map((name) => ({ name, qty: 1 })) }));
  assert.equal(csv[0], "\uFEFF");
  for (const name of names) assert.ok(csv.includes("'" + name), JSON.stringify(name));
  assert.match(csv, /Item;Quantidade;/);
});
test("Scanner trata prazo, falha, código equivalente e nome inválido", async () => {
  const raw = "036000291452";
  const code = "0" + raw;
  let signal;
  const result = await resolveScan({ raw, timeoutMs: 5, lookup: (_, options) => {
    signal = options.signal;
    return new Promise(() => {});
  } });
  assert.deepEqual(result, { status: "offline", code });
  assert.equal(signal.aborted, true);
  assert.equal((await resolveScan({ raw, lookup: async () => { throw Error("Rede indisponível."); } })).status, "offline");
  assert.equal((await resolveScan({ raw, lookup: async () => ({ name: "<Leite>" }) })).status, "not_found");
  const state = makeState({ items: [{ id: "a", ean: code, name: "Outro nome" }] });
  assert.equal(duplicateOf(state, raw, "Nome não cadastrado").id, "a");
});
test("Sessão retoma até 179 min, reinicia a partir de 180 e ignora relógio retrocedido", () => {
  const min = 60_000;
  const now = 1000 * min;
  for (const gap of [179, 180, 181]) {
    const session = { startedAt: min, lastSeenAt: now - gap * min };
    assert.equal(resumeSession(session, now).startedAt, gap === 179 ? min : now);
  }
  assert.equal(parseSession('{"startedAt":', now), null);
  const saved = { startedAt: now - 60 * min, lastSeenAt: now };
  assert.equal(parseSession(JSON.stringify(saved), now - 60 * min), null);
  assert.deepEqual(resumeSession(saved, now - 60 * min), { startedAt: now - 60 * min, lastSeenAt: now - 60 * min });
});
