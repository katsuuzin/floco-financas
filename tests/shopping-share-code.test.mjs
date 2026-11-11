import test from "node:test";
import assert from "node:assert/strict";
import { encodeShareCode, decodeShareCode } from "../src/shoppingShareCode.mjs";
import { makeState, seededRandom } from "./helpers/shoppingFixtures.mjs";

const item = (name, extra) => ({ name, qty: 1, unit: "", category: "Outros", inCart: false, ...extra });
test("Código é URL seguro e preserva campos públicos e emoji", () => {
  const rows = [item("Maçã 🍎", { qty: 0.5, unit: "kg", category: "Hortifrúti", inCart: true }), item("A".repeat(120))];
  const state = makeState({ items: rows.map((entry) => ({ ...entry, priceCents: 192837, id: "segredo-local" })) });
  const { code } = encodeShareCode(state, { now: 1 });
  assert.match(code, /^[A-Za-z0-9._-]+$/);
  assert.deepEqual(decodeShareCode(code), { ok: true, items: rows });
  const body = Buffer.from(code.split(".")[1], "base64url").toString("utf8");
  assert.doesNotMatch(body, /192837|segredo-local|priceCents/);
});
test("Duzentos itens compactos cabem e lista grande dá motivo", () => {
  const items = Array.from({ length: 200 }, (_, i) => item("Item " + i));
  const { code } = encodeShareCode(makeState({ items }));
  assert.ok(code.length < 4000);
  assert.equal(decodeShareCode(code).items.length, 200);
  const big = encodeShareCode(makeState({ items: items.map((row) => ({ ...row, name: "á".repeat(120) })) }));
  assert.equal(big.ok, false);
  assert.match(big.reason, /4.000/);
});
test("Recusa versão futura, alteração, truncamento e caracteres de controle", () => {
  const { code } = encodeShareCode(makeState({ items: [item("Arroz")] }));
  const changed = code.slice(0, 5) + (code[5] === "a" ? "b" : "a") + code.slice(6);
  for (const text of [changed, code.slice(0, -1), "2" + code.slice(1), code + "\n", null]) assert.equal(decodeShareCode(text).ok, false);
  assert.equal(encodeShareCode(makeState({ items: [item("A\u202eB")] })).ok, false);
});
test("Cem códigos determinísticos e objeto reservado nunca lançam", () => {
  const random = seededRandom(12);
  for (let i = 0; i < 100; i++) {
    const junk = Array.from({ length: 40 }, () => String.fromCharCode(Math.floor(random() * 65536))).join("");
    assert.equal(decodeShareCode(junk).ok, false);
  }
  const encoded = Buffer.from('[null,[{"__proto__":{"poluido":true}}]]').toString("base64url");
  const payload = "1." + encoded;
  let checksum = 2166136261;
  for (const char of payload) checksum = Math.imul(checksum ^ char.charCodeAt(0), 16777619);
  assert.equal(decodeShareCode(payload + "." + (checksum >>> 0).toString(16).padStart(8, "0")).ok, false);
  assert.equal(Object.prototype.poluido, undefined);
});
