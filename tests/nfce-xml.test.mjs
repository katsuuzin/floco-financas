import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { parseNfceXml } from "../src/nfceXml.mjs";
import { makeNota } from "./helpers/shoppingFixtures.mjs";

const key = makeNota().chave;
const line = (fields = {}) => "<det nItem='1'><prod><cProd>01</cProd><xProd>CAFÉ &amp; LEITE</xProd><qCom>" +
  (fields.qty ?? "2.0000") + "</qCom><uCom>UN</uCom><vUnCom>" + (fields.price ?? "4.5000") +
  "</vUnCom>" + (fields.gross ?? "<vProd>9.00</vProd>") + (fields.discount ?? "") + "</prod></det>";
const doc = ({ items = line(), id = key, total = "<vNF>9.00</vNF>", date = "2026-01-01T12:00:00-03:00" } = {}) =>
  "<nfeProc xmlns='http://www.portalfiscal.inf.br/nfe'><NFe><infNFe Id='NFe" + id + "'><ide><mod>65</mod><dhEmi>" +
  date + "</dhEmi></ide><emit><xFant>Loja Açúcar &amp; Cia</xFant><CNPJ>" + "0".repeat(14) +
  "</CNPJ><enderEmit><xLgr>Rua de Teste</xLgr><nro>1</nro></enderEmit></emit>" + items +
  "<total><ICMSTot>" + total + "</ICMSTot></total><pag><detPag><tPag>17</tPag><vPag>9.00</vPag></detPag></pag></infNFe></NFe></nfeProc>";

test("XML sintético com BOM, cabeçalho, CRLF, acentos, entidade e pagamento", () => {
  const result = parseNfceXml("\uFEFF<?xml version='1.0'?>\r\n" + doc().replace(/></g, ">\r\n<"));
  assert.equal(result.chave, key);
  assert.equal(result.marketName, "Loja Açúcar & Cia");
  assert.equal(result.address, "Rua de Teste, 1");
  assert.equal(result.issuedDate, "2026-01-01");
  assert.equal(result.issuedTime, "12:00:00");
  assert.equal(result.payment, "Pix");
  assert.equal(result.totalCents, 900);
  assert.equal(result.itemsSumCents, 900);
  assert.equal(result.items[0].rawName, "CAFÉ & LEITE");
  assert.equal(result.items[0].unitPriceCents, 450);
  assert.equal(result.itemCount, 1);
});
test("Sem vProd calcula por quantidade e vDesc reduz o total da linha", () => {
  const { items, totalCents, totalMatchesItems } = parseNfceXml(doc({
    items: line({ qty: "3", price: "0.335", gross: "", discount: "<vDesc>0.20</vDesc>" }), total: "<vNF>0.81</vNF>",
  }));
  assert.equal(items[0].unitPriceCents, 34);
  assert.equal(items[0].totalCents, 81);
  assert.equal(totalCents, 81);
  assert.equal(totalMatchesItems, true);
});
test("Aceita NFe ou infNFe com prefixos e recusa chave ou data inválida", () => {
  const raw = doc().slice(doc().indexOf("<NFe>"), -"</nfeProc>".length);
  const inner = raw.slice(5, -6).replace(/<(\/?)([A-Za-z][A-Za-z0-9]*)/g, "<$1n:$2");
  assert.equal(parseNfceXml(inner).itemCount, 1);
  assert.equal(parseNfceXml(raw).itemCount, 1);
  assert.throws(() => parseNfceXml(doc({ id: key.slice(0,-1) + (Number(key.at(-1)) + 1) % 10 })), /chave/);
  assert.throws(() => parseNfceXml(doc({ date: "2026-02-30" })), /Data/);
});
test("Recusa valores negativos e limites de quantidade e itens", () => {
  for (const bad of [doc({ items: line({ qty: "100000" }) }), doc({ items: line({ price: "-1" }) }),
    doc({ total: "<vNF>-1</vNF>" }), doc({ items: line({ discount: "<vDesc>-1</vDesc>" }) }),
    doc({ items: line().repeat(501) })]) assert.throws(() => parseNfceXml(bad), /Quantidade|Valor|500/);
});
test("Entradas hostis são recusadas em até 500 ms por caso", () => {
  const samples = [
    '<!DOCTYPE x [<!ENTITY a "a"><!ENTITY b "&a;&a;&a;">]>' + doc(),
    "<?xml version='1.0'?><?outro x?>" + doc(),
    "<a>".repeat(41) + "</a>".repeat(41),
    "<a><![CDATA[" + "a".repeat(65537) + "]]></a>",
    '<a b="' + "x".repeat(200000) + '"/>',
    "<".repeat(200000),
    " ".repeat(1500001),
    doc().replace("&amp;", "&externa;"),
  ];
  for (const input of samples) {
    const start = performance.now();
    assert.throws(() => parseNfceXml(input), /XML|Entidade|CDATA|Atributo/);
    assert.ok(performance.now() - start < 500);
  }
});
