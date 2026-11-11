import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { parseShared } from "../src/shoppingImportShared.mjs";
import { parsePastedList } from "../src/pasteList.mjs";
import { parseItemText } from "../src/shopping.mjs";
import { parseNfceHtml } from "../src/nfceParse.mjs";
import { parsePurchasesJson } from "../src/shoppingExport.mjs";
import { checkShoppingBackup } from "../src/shoppingBackupCheck.mjs";
import { decodeShareCode } from "../src/shoppingShareCode.mjs";
import { parseNfceXml } from "../src/nfceXml.mjs";
import { parseNfceInput } from "../src/nfce.mjs";
import { makeNota, makePurchase, makeState, seededRandom } from "./helpers/shoppingFixtures.mjs";

const trials = 500;
const key = makeNota().chave;
const fixed = [
  "", " \r\n ", "<", "🤝🏽 ½ １ \u202e leite", '{"__proto__":{"flocoFuzz":true}}',
  '{"schema":1,"purchases":[', "\ud800\uDC00\udfff\u0000", "1x leite\n2x arroz",
  "x".repeat(65_000), "<".repeat(200_000), " ".repeat(35_000) + "\n- leite", key,
  "https://nfce.fazenda.sp.gov.br/qrcode?p=" + key + "|3|1",
  JSON.stringify({ schema: 1, purchases: [makePurchase()] }),
  JSON.stringify(makeState()),
];
const chunks = ["a", " ", "\n", "💡", "抹茶", "\u202e", "½", "&amp;", "0,5", "<", ">", "[", "]", "{", "}", "\u0000", "9", "\ufeff", "-"];

function generate(seed) {
  const random = seededRandom(seed);
  return Array.from({ length: trials }, (_, i) => {
    if (i < fixed.length) return fixed[i];
    const length = Math.floor(random() * 90);
    if (i % 4 === 0) return Buffer.from(Array.from({ length }, () => Math.floor(random() * 256))).toString("utf8");
    if (i % 4 === 1) return JSON.stringify({ text: Array.from({ length }, () => chunks[Math.floor(random() * chunks.length)]).join("") }).slice(0, -1);
    if (i % 4 === 2) return Array.from({ length }, () => String.fromCharCode(Math.floor(random() * 65536))).join("");
    return Array.from({ length }, () => chunks[Math.floor(random() * chunks.length)]).join("");
  });
}

const asBackup = (text) => {
  try { return JSON.parse(text); } catch { return text; }
};
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const cases = [
  ["parseShared", parseShared, (result) => object(result) && Array.isArray(result.items)],
  ["parsePastedList", parsePastedList, Array.isArray],
  ["parseItemText", parseItemText, object, /Digite|nome|Quantidade/i],
  ["parseNfceHtml", parseNfceHtml, (result) => object(result) && Array.isArray(result.items), /nota|página|SEFAZ|HTML|Item|estrutura|tamanho/i],
  ["parsePurchasesJson", parsePurchasesJson, Array.isArray, /histórico|compras?|versão|JSON|fiscal|itens/i],
  ["checkShoppingBackup", (text) => checkShoppingBackup(asBackup(text)), (result) => object(result) && typeof result.ok === "boolean"],
  ["decodeShareCode", decodeShareCode, (result) => object(result) && typeof result.ok === "boolean"],
  ["parseNfceXml", parseNfceXml, object, /XML|nota|caractere|elemento|atributo/i],
  ["parseNfceInput", parseNfceInput, object, /QR|chave|nota|endereço|mês|estado|consulta/i],
];

for (const [name, parse, validate, allowedError] of cases) {
  const label = name === "parseItemText" ? "Achado: " + name : name;
  test(label + " aceita ou recusa 500 entradas determinísticas com retorno definido", () => {
    const slow = [];
    const before = Object.getOwnPropertyDescriptors(Object.prototype);
    for (const [index, input] of generate(74313).entries()) {
      const start = performance.now();
      let result;
      let failure;
      try { result = parse(input); } catch (error) { failure = error; }
      const elapsed = performance.now() - start;
      if (elapsed >= 200) slow.push("entrada " + index + " em " + elapsed.toFixed(1) + " ms");
      if (failure) {
        assert.ok(allowedError && failure.constructor === Error && allowedError.test(failure.message),
          name + " lançou erro inesperado na entrada " + index + ": " + failure.message);
      } else assert.ok(validate(result), name + " retornou valor inválido na entrada " + index);
      assert.deepEqual(Object.getOwnPropertyDescriptors(Object.prototype), before);
    }
    assert.deepEqual(slow, [], name + " excedeu 200 ms: " + slow.join(", "));
  });
}
