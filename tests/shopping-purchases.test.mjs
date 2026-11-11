import { test } from "node:test";
import assert from "node:assert/strict";
import { chaveDv } from "../src/nfce.mjs";
import { emptyState, validateBackup } from "../src/finance.mjs";
import { diffState, assembleState } from "../src/storage.mjs";
import { addShoppingItem, keepShoppingOnRestore } from "../src/shopping.mjs";
import {
  normalizeName,
  productKey,
  recordPurchase,
  removePurchase,
  lastKnownPrice,
  priceSummary,
  purchasesOf,
  productsOf,
} from "../src/shoppingPurchases.mjs";

const seq = () => {
  let n = 0;
  return () => `p${++n}`;
};
const opts = (id) => ({ id, now: 1, newId: seq() });
const CHAVE_BASE = "35" + "2" + "6".repeat(40); // 43 dígitos fictícios
const CHAVE = CHAVE_BASE + chaveDv(CHAVE_BASE); // 44 dígitos, DV válido
const compra = (extra = {}) => ({
  date: "2026-11-10",
  marketName: "Mercado Teste",
  cnpj: "11222333000181",
  source: "nfce",
  chave: CHAVE,
  items: [
    { name: "Leite integral", qty: 2, unitPriceCents: 650 },
    { name: "Tomate", qty: 1.5, unit: "kg", unitPriceCents: 800 },
    { name: "Pão francês", qty: 1, totalCents: 990 },
  ],
  ...extra,
});

test("normalizeName tira acento, pontuação e espaços repetidos", () => {
  assert.equal(normalizeName("  MOL.  TOM  Heinz SACHÊ 240G "), "mol tom heinz sache 240g");
  assert.equal(productKey("Tomate", "kg"), "tomate|kg");
  assert.notEqual(productKey("Tomate", "kg"), productKey("Tomate", ""));
});

test("registrar compra calcula totais e cria os produtos com histórico", () => {
  const s = recordPurchase(emptyState(), compra(), opts("c1"));
  const [c] = purchasesOf(s);
  assert.equal(c.items[0].totalCents, 1300); // 2 × 6,50
  assert.equal(c.items[1].totalCents, 1200); // 1,5 kg × 8,00
  assert.equal(c.items[2].unitPriceCents, 990); // preço unitário derivado do total
  assert.equal(c.totalCents, 1300 + 1200 + 990);
  assert.equal(productsOf(s).length, 3);
  assert.equal(c.items.every((i) => productsOf(s).some((p) => p.id === i.productId)), true);
  assert.equal(c.source, "nfce");
});

test("segunda compra do mesmo produto soma no histórico e guarda o último preço", () => {
  let s = recordPurchase(emptyState(), compra(), opts("c1"));
  s = recordPurchase(
    s,
    { date: "2026-11-20", source: "manual", items: [{ name: "LEITE  integral!", qty: 1, unitPriceCents: 700 }] },
    opts("c2"),
  );
  const leite = productsOf(s).find((p) => p.key === "leite integral|");
  assert.equal(productsOf(s).length, 3, "não duplica o produto");
  assert.equal(leite.buys, 2);
  assert.equal(leite.lastPriceCents, 700);
  assert.equal(leite.lastBoughtAt, "2026-11-20");
  assert.equal(lastKnownPrice(s, "Leite Integral"), 700);
  assert.deepEqual(priceSummary(leite), { last: 700, avg: 675, min: 650, max: 700, points: 2 });
});

test("compra mais antiga registrada depois não muda o último preço", () => {
  let s = recordPurchase(emptyState(), compra({ chave: "" }), opts("c1"));
  s = recordPurchase(s, { date: "2026-10-01", items: [{ name: "Leite integral", qty: 1, unitPriceCents: 500 }] }, opts("c0"));
  const leite = productsOf(s).find((p) => p.key === "leite integral|");
  assert.equal(leite.lastPriceCents, 650);
  assert.equal(leite.lastBoughtAt, "2026-11-10");
  assert.equal(leite.buys, 2);
});

test("código de barras junta produtos de nomes diferentes", () => {
  let s = recordPurchase(emptyState(), { date: "2026-11-01", items: [{ name: "Molho de tomate", ean: "7891234567895", qty: 1, unitPriceCents: 400 }] }, opts("a"));
  s = recordPurchase(s, { date: "2026-11-02", items: [{ name: "MOL TOM HEINZ", ean: "7891234567895", qty: 1, unitPriceCents: 450 }] }, opts("b"));
  assert.equal(productsOf(s).length, 1);
  assert.equal(productsOf(s)[0].buys, 2);
});

test("a mesma nota fiscal não entra duas vezes", () => {
  const s = recordPurchase(emptyState(), compra(), opts("c1"));
  assert.throws(() => recordPurchase(s, compra(), opts("c2")), /já foi registrada/);
});

test("entradas inválidas são recusadas sem alterar o estado", () => {
  const base = emptyState();
  assert.throws(() => recordPurchase(base, compra({ date: "10/11/2026" }), opts("x")), /data/);
  assert.throws(() => recordPurchase(base, compra({ items: [] }), opts("x")), /pelo menos um item/);
  assert.throws(() => recordPurchase(base, compra({ items: [{ name: "Leite", qty: 1 }] }), opts("x")), /Informe o preço/);
  assert.throws(() => recordPurchase(base, compra({ items: [{ name: "Leite", qty: 0, unitPriceCents: 100 }] }), opts("x")), /Quantidade/);
  assert.throws(() => recordPurchase(base, compra({ cnpj: "123" }), opts("x")), /CNPJ/);
  assert.throws(() => recordPurchase(base, compra({ chave: "123" }), opts("x")), /chave/);
  assert.deepEqual(purchasesOf(base), []);
  assert.deepEqual(productsOf(base), []);
});

test("remover compra desfaz o histórico e apaga produtos que só ela trouxe", () => {
  let s = recordPurchase(emptyState(), compra(), opts("c1"));
  s = recordPurchase(s, { date: "2026-11-20", items: [{ name: "Leite integral", qty: 1, unitPriceCents: 700 }] }, opts("c2"));
  s = removePurchase(s, "c2");
  let leite = productsOf(s).find((p) => p.key === "leite integral|");
  assert.equal(leite.buys, 1);
  assert.equal(leite.lastPriceCents, 650);
  assert.equal(leite.lastBoughtAt, "2026-11-10");
  s = removePurchase(s, "c1");
  assert.deepEqual(productsOf(s), []);
  assert.deepEqual(purchasesOf(s), []);
  assert.throws(() => removePurchase(s, "c1"), /não encontrada/);
});

test("lista de compras e compras convivem no mesmo estado", () => {
  let s = addShoppingItem(emptyState(), "2 leite", { id: "i1", now: 1 });
  s = recordPurchase(s, compra(), opts("c1"));
  assert.equal(s.shoppingItems.length, 1);
  assert.equal(purchasesOf(s).length, 1);
});

// ---- backup e armazenamento ----

test("backup novo: ida e volta preserva compras e produtos", () => {
  const s = recordPurchase(emptyState(), compra(), opts("c1"));
  const back = validateBackup(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.shoppingPurchases, s.shoppingPurchases);
  assert.deepEqual(back.shoppingProducts, s.shoppingProducts);
});

test("backup antigo (sem compras nem produtos) continua válido e não inventa nada", () => {
  const old = JSON.parse(JSON.stringify(emptyState()));
  delete old.shoppingPurchases;
  delete old.shoppingProducts;
  const v = validateBackup(old);
  assert.equal(v.shoppingPurchases, undefined);
  assert.equal(v.shoppingProducts, undefined);
});

test("restaurar backup antigo mantém as compras e os produtos atuais", () => {
  const atual = recordPurchase(emptyState(), compra(), opts("c1"));
  const old = JSON.parse(JSON.stringify(emptyState()));
  delete old.shoppingPurchases;
  delete old.shoppingProducts;
  const r = keepShoppingOnRestore(validateBackup(old), atual);
  assert.equal(r.shoppingPurchases.length, 1);
  assert.equal(r.shoppingProducts.length, 3);
});

test("restaurar backup com compras substitui as atuais; um que só tem a lista não mexe nelas", () => {
  const atual = recordPurchase(emptyState(), compra(), opts("c1"));
  const outro = recordPurchase(emptyState(), { date: "2026-01-02", items: [{ name: "Arroz", qty: 1, unitPriceCents: 2000 }] }, opts("z1"));
  const r = keepShoppingOnRestore(validateBackup(JSON.parse(JSON.stringify(outro))), atual);
  assert.deepEqual(r.shoppingPurchases.map((p) => p.id), ["z1"]);
  const soLista = JSON.parse(JSON.stringify(emptyState()));
  delete soLista.shoppingPurchases;
  delete soLista.shoppingProducts;
  soLista.shoppingItems = [];
  assert.equal(keepShoppingOnRestore(validateBackup(soLista), atual).shoppingPurchases.length, 1);
});

test("backup com compra ou produto inválido é recusado", () => {
  const s = recordPurchase(emptyState(), compra(), opts("c1"));
  const j = () => JSON.parse(JSON.stringify(s));
  let b = j();
  b.shoppingPurchases[0].totalCents = -5;
  assert.throws(() => validateBackup(b), /Compra inválida/);
  b = j();
  b.shoppingPurchases.push({ ...b.shoppingPurchases[0], id: "outra" });
  assert.throws(() => validateBackup(b), /mesma nota/);
  b = j();
  b.shoppingProducts[0].buys = -1;
  assert.throws(() => validateBackup(b), /Produto inválido/);
  b = j();
  b.shoppingProducts.push({ ...b.shoppingProducts[0], id: "dup" });
  assert.throws(() => validateBackup(b), /Produto repetido/);
});

test("SQLite: compras e produtos viram coleções e voltam na mesma ordem", () => {
  const s = recordPurchase(emptyState(), compra(), opts("c1"));
  const d = diffState(null, s);
  const rows = (col) =>
    d.upserts.filter((u) => u.collection === col).sort((a, b) => a.ord - b.ord).map((u) => ({ collection: u.collection, json: u.json }));
  const loaded = assembleState([...rows("shoppingPurchases"), ...rows("shoppingProducts")], [], emptyState());
  assert.deepEqual(loaded.shoppingPurchases, s.shoppingPurchases);
  assert.deepEqual(loaded.shoppingProducts, s.shoppingProducts);
  // Remover a compra apaga as linhas dela e dos produtos que só ela trouxe.
  const after = removePurchase(s, "c1");
  const d2 = diffState(s, after);
  assert.equal(d2.deletes.filter((x) => x.collection === "shoppingPurchases").length, 1);
  assert.equal(d2.deletes.filter((x) => x.collection === "shoppingProducts").length, 3);
});

test("banco da versão anterior (sem linhas dessas coleções) abre com listas vazias", () => {
  const loaded = assembleState([], [], emptyState());
  assert.deepEqual(loaded.shoppingPurchases, []);
  assert.deepEqual(loaded.shoppingProducts, []);
  assert.doesNotThrow(() => validateBackup(loaded));
});

test("produto em várias linhas da mesma nota conta como uma compra só", () => {
  const s = recordPurchase(emptyState(), { date: "2026-11-10", items: [
    { name: "LEITE INTEGRAL", qty: 1, unitPriceCents: 500 },
    { name: "Leite integral", qty: 2, unitPriceCents: 520 },
    { name: "LEITE INTEGRAL", qty: 1, unitPriceCents: 510 },
  ] }, opts("c1"));
  const leite = productsOf(s)[0];
  assert.equal(productsOf(s).length, 1);
  assert.equal(leite.buys, 1);
  assert.equal(leite.prices.length, 1, "um ponto de preço por compra");
  assert.equal(leite.prices[0].priceCents, Math.round((500 + 2 * 520 + 510) / 4), "média ponderada pela quantidade");
  assert.equal(leite.lastPriceCents, leite.prices[0].priceCents);
  const dois = recordPurchase(s, { date: "2026-11-20", items: [{ name: "Leite integral", qty: 1, unitPriceCents: 600 }] }, opts("c2"));
  assert.equal(productsOf(dois)[0].buys, 2);
  const volta = removePurchase(dois, "c2");
  assert.equal(productsOf(volta)[0].buys, 1);
  assert.equal(productsOf(volta)[0].lastPriceCents, Math.round((500 + 2 * 520 + 510) / 4));
  assert.deepEqual(productsOf(removePurchase(volta, "c1")), []);
});

test("remover compra tira o produto mesmo se o contador veio errado de dados antigos", () => {
  let s = recordPurchase(emptyState(), compra(), opts("c1"));
  s = { ...s, shoppingProducts: s.shoppingProducts.map((p) => ({ ...p, buys: 4 })) }; // contador antigo, inflado
  assert.deepEqual(productsOf(removePurchase(s, "c1")), []);
});
