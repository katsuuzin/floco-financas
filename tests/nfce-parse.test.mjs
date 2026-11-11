import { assertFast } from "./helpers/timing.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState } from "../src/finance.mjs";
import { chaveDv, parseNfceInput } from "../src/nfce.mjs";
import { parseNfceHtml, nfceToPurchase, centsFromBr, consultUrl, isAllowedUrl, consultSupported, readableName } from "../src/nfceParse.mjs";
import { recordPurchase, purchasesOf, productsOf } from "../src/shoppingPurchases.mjs";

// HTML SINTÉTICO: reproduz só a estrutura da página pública de SP (classes e ordem). Nomes, valores,
// CNPJ e chave são inventados. Nada aqui vem de uma nota real.
const base = "35" + "2610" + "11222333000181" + "65" + "001" + "000000123" + "1" + "12345678";
const CHAVE = base + chaveDv(base);
const item = (n, nome, cod, qtd, un, unit, total) =>
  `<tr id="Item + ${n}"> <td valign="top"> <span class="txtTit">${nome}</span> <span class="RCod"> (Código: ${cod} ) </span> <br> <span class="Rqtd"> <strong>Qtde.:</strong>${qtd}</span> <span class="RUN"> <strong>UN: </strong>${un}</span> <span class="RvlUnit"> <strong>Vl. Unit.:</strong> &nbsp; ${unit}</span> </td> <td align="right" valign="top" class="txtTit noWrap"> Vl. Total <br><span class="valor">${total}</span></td> </tr>`;
const pagina = (rows, { total = "21,98", extra = "" } = {}) => `<html><head><title>Consulta Resumida NFC-e</title></head><body>
<div class="jqm-header">DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA</div>
<div id="u20" class="txtTopo">MERCADO EXEMPLO LTDA - 01</div>
<div class="text">CNPJ: 11.222.333/0001-81</div>
<div class="text">RUA DAS FLORES , 10 , , CENTRO , CIDADE , SP</div>
<table id="tabResult" class="filterable"><tbody>${rows.join("\n")}</tbody></table>
<div id="linhaTotal">Qtd. total de itens: <span class="totalNumb">${rows.length}</span></div>
<div id="linhaTotal" class="linhaShade">Valor a pagar R$: <span class="totalNumb txtMax">${total}</span></div>
<div id="linhaForma">Forma de pagamento: <span class="totalNumb txtTitR">Valor pago R$:</span></div>
<div id="linhaTotal"><label class="tx">Cartão de Débito</label> <span class="totalNumb">${total}</span></div>
<span class="chave">${CHAVE.replace(/(\d{4})/g, "$1 ").trim()}</span>
<ul><li><strong> Emissão: </strong>10/11/2026 12:36:51 - Via Consumidor</li></ul>${extra}</body></html>`;
const OK = pagina([
  item(1, "MOLHO TOMATE EXEMPLO SACHE 240G", "3772", "2", "UN", "2,69", "5,38"),
  item(2, "TOMATE ITALIANO", "10", "1,5", "KG", "8,00", "12,00"),
  item(3, "PAO FRANCES", "55", "1", "UN", "4,60", "4,60"),
]);

test("centsFromBr entende formatos brasileiros", () => {
  assert.equal(centsFromBr("2,69"), 269);
  assert.equal(centsFromBr("  1.234,56 "), 123456);
  assert.equal(centsFromBr("&nbsp; 8,00"), 800);
  assert.equal(centsFromBr("5"), 500);
  assert.equal(centsFromBr("NaN"), null);
});

test("lê emitente, itens, total, pagamento, emissão e chave", () => {
  const n = parseNfceHtml(OK);
  assert.equal(n.marketName, "MERCADO EXEMPLO LTDA - 01");
  assert.equal(n.cnpj, "11222333000181");
  assert.match(n.address, /RUA DAS FLORES/);
  assert.equal(n.items.length, 3);
  assert.equal(n.itemCount, 3);
  assert.equal(n.totalCents, 2198);
  assert.equal(n.itemsSumCents, 538 + 1200 + 460);
  assert.equal(n.totalMatchesItems, true);
  assert.equal(n.payment, "Cartão de Débito");
  assert.equal(n.issuedDate, "2026-11-10");
  assert.equal(n.issuedTime, "12:36:51");
  assert.equal(n.chave, CHAVE);
});

test("cada item traz nome, código, quantidade, unidade e preços", () => {
  const [a, b, c] = parseNfceHtml(OK).items;
  assert.equal(a.rawName, "MOLHO TOMATE EXEMPLO SACHE 240G", "o nome original da nota é guardado");
  assert.deepEqual({ ...a, rawName: undefined }, { rawName: undefined, name: "Molho tomate exemplo sache 240 g", code: "3772", qty: 2, unit: "", unitRaw: "UN", unitPriceCents: 269, totalCents: 538 });
  assert.equal(b.qty, 1.5);
  assert.equal(b.unit, "kg");
  assert.equal(b.unitPriceCents, 800);
  assert.equal(b.totalCents, 1200);
  assert.equal(c.name, "Pao frances");
});

test("HTML com entidades e espaços extras continua legível", () => {
  const h = pagina([item(1, "  CAF&Eacute; &amp; LEITE   1L  ", "9", "1", "UN", "&nbsp; 7,00", "7,00")], { total: "7,00" }).replace("&Eacute;", "É");
  const n = parseNfceHtml(h);
  assert.equal(n.items[0].name, "Café & leite 1 l");
  assert.equal(n.totalCents, 700);
});

test("total diferente da soma dos itens é sinalizado", () => {
  const n = parseNfceHtml(pagina([item(1, "ARROZ", "1", "1", "UN", "20,00", "20,00")], { total: "30,00" }));
  assert.equal(n.totalMatchesItems, false);
  assert.equal(n.totalCents, 3000);
});

test("sem a tabela de itens, ou rejeitada pelo firewall, dá erro claro", () => {
  assert.throws(() => parseNfceHtml("<html><body>Aguarde</body></html>"), /Não achei os itens/);
  assert.throws(() => parseNfceHtml("<html><head><title>Request Rejected</title></head><body>The requested URL was rejected.</body></html>"), /recusou/);
  assert.throws(() => parseNfceHtml(OK, { uf: "PR" }), /Ainda não leio/);
  assert.throws(() => parseNfceHtml(pagina([`<tr id="Item + 1"><td><span class="txtTit">X</span></td></tr>`])), /incompleto/);
});

test("nota lida vira entrada de compra e entra no histórico sem duplicar", () => {
  const entrada = nfceToPurchase(parseNfceHtml(OK), parseNfceInput(CHAVE));
  assert.equal(entrada.source, "nfce");
  assert.equal(entrada.date, "2026-11-10");
  assert.equal(entrada.chave, CHAVE);
  let s = recordPurchase(emptyState(), entrada, { id: "n1", now: 1 });
  assert.equal(purchasesOf(s).length, 1);
  assert.equal(purchasesOf(s)[0].totalCents, 2198);
  assert.equal(productsOf(s).length, 3);
  assert.throws(() => recordPurchase(s, entrada, { id: "n2", now: 2 }), /já foi registrada/);
});

test("URL de consulta: usa a do QR ou monta a de SP; outros estados ainda não", () => {
  const qr = parseNfceInput(`https://www.nfce.fazenda.sp.gov.br/qrcode?p=${CHAVE}|3|1`);
  assert.equal(consultUrl(qr), qr.url);
  const so = parseNfceInput(CHAVE);
  assert.equal(consultUrl(so), `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${CHAVE}|3|1`);
  const base41 = "41" + "2610" + "11222333000181" + "65" + "001" + "000000123" + "1" + "12345678";
  assert.throws(() => consultUrl(parseNfceInput(base41 + chaveDv(base41))), /Ainda não consulto notas de PR/);
  assert.equal(consultSupported("SP"), true);
  assert.equal(consultSupported("RS"), false);
});

test("a WebView só aceita https de endereços .gov.br", () => {
  assert.equal(isAllowedUrl("https://www.nfce.fazenda.sp.gov.br/qrcode?p=1"), true);
  assert.equal(isAllowedUrl("http://www.nfce.fazenda.sp.gov.br/qrcode"), false);
  assert.equal(isAllowedUrl("https://golpe.example.com/x"), false);
  assert.equal(isAllowedUrl("https://nfce.gov.br.golpe.com/x"), false);
  assert.equal(isAllowedUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedUrl("não é url"), false);
});

test("readableName: expande abreviações, passa CAIXA ALTA para frase e não mexe no que já é legível", () => {
  assert.equal(readableName("FARIN TRIGO MARCA 1KG"), "Farinha de trigo Marca 1 kg");
  assert.equal(readableName("Café torrado 500g"), "Café torrado 500 g");
  assert.equal(readableName("PAO FRANCES"), "Pao frances");
  assert.equal(readableName("  "), "");
  assert.equal(readableName(null), "");
  assert.equal(readableName(readableName("CR LEITE MARCA TP 200G")), readableName("CR LEITE MARCA TP 200G"), "idempotente");
});

test("a compra guarda o nome legível e o original", () => {
  const entrada = nfceToPurchase(parseNfceHtml(OK), parseNfceInput(CHAVE));
  assert.equal(entrada.items[0].name, "Molho tomate exemplo sache 240 g");
  assert.equal(entrada.items[0].rawName, "MOLHO TOMATE EXEMPLO SACHE 240G");
});

// ---- Endurecimento (relatório de segurança da WebView) ----

test("a URL de consulta ignora o host do QR e usa o oficial do estado", () => {
  const falso = parseNfceInput(`https://www.fazenda.sp.gov.br/qualquer?p=${CHAVE}|3|1`);
  assert.equal(consultUrl(falso), `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${CHAVE}|3|1`);
  const amb2 = parseNfceInput(`https://www.nfce.fazenda.sp.gov.br/qrcode?p=${CHAVE}|3|2`);
  assert.match(consultUrl(amb2), /\|3\|2$/);
  assert.throws(() => consultUrl({ uf: "SP", chave: "123" }), /inválida/);
});

test("isAllowedUrl: host exato do estado, https, porta padrão, sem credenciais", () => {
  const ok = "https://www.nfce.fazenda.sp.gov.br/qrcode?p=1";
  assert.equal(isAllowedUrl(ok, "SP"), true);
  assert.equal(isAllowedUrl("https://nfce.fazenda.sp.gov.br/x", "SP"), true);
  for (const ruim of [
    "https://www.fazenda.sp.gov.br/x", // outro órgão do mesmo domínio
    "https://evil.gov.br.example.com/",
    "https://user:senha@www.nfce.fazenda.sp.gov.br/",
    "https://www.nfce.fazenda.sp.gov.br:8443/",
    "http://www.nfce.fazenda.sp.gov.br/",
    "https://www.nfce.fazenda.sp.gov.br@evil.com/",
    "https://www.nfce.fazenda.sp.gov.br./x",
    "https://xn--nfce-fazenda-sp-gov-br.example/",
    "javascript:alert(1)",
    "intent://scan#Intent;end",
  ])
    assert.equal(isAllowedUrl(ruim, "SP"), false, ruim);
  assert.equal(isAllowedUrl(ok, "RS"), false, "host de SP não vale para outro estado");
  assert.equal(isAllowedUrl("HTTPS://WWW.NFCE.FAZENDA.SP.GOV.BR/x", "SP"), true, "maiúsculas são normalizadas pelo URL");
});

test("leitor recusa página grande demais, malformada, item enorme e itens demais", () => {
  assert.throws(() => parseNfceHtml("x".repeat(1_600_000)), /grande demais/);
  assert.throws(() => parseNfceHtml("<div".repeat(5000)), /malformada/);
  const enorme = `<tr id="Item + 1"><td><span class="txtTit">${"A".repeat(30_000)}</span></td></tr>`;
  assert.throws(() => parseNfceHtml(pagina([enorme])), /grande demais/);
  const muitos = Array.from({ length: 501 }, (_, i) => item(i + 1, "ITEM", "1", "1", "UN", "1,00", "1,00"));
  assert.throws(() => parseNfceHtml(pagina(muitos)), /itens demais/);
});

test("entradas hostis não travam (cada uma em menos de 500 ms)", () => {
  const casos = {
    "tr sem fechar": '<tr id="Item + 1"><td>'.repeat(40_000),
    "span sem fechar": '<span class="txtTit">'.repeat(60_000),
    "espaços": `<table id="tabResult"><tr id="Item + 1"><td>${" ".repeat(900_000)}`,
    "aninhado": "<div>".repeat(60_000),
    "total sem número": "Valor a pagar R$:" + " ".repeat(900_000),
  };
  for (const [nome, html] of Object.entries(casos)) {
    assertFast(() => {
      try { parseNfceHtml(html); } catch {}
    }, 500, nome);
  }
});

test("a nota normal continua lida depois do endurecimento", () => {
  const n = parseNfceHtml(OK);
  assert.equal(n.items.length, 3);
  assert.equal(n.totalCents, 2198);
  assert.equal(n.marketName, "MERCADO EXEMPLO LTDA - 01");
  assert.equal(n.issuedDate, "2026-11-10");
  assert.equal(n.chave, CHAVE);
});
