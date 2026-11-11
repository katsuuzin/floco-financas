import test from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { chaveDv } from "../../src/nfce.mjs";
import { consultUrl, isAllowedUrl, MAX_HTML_CHARS } from "../../src/nfceParse.mjs";
import { acceptBridgeMessage } from "./nfce-hardening-helpers.mjs";

const host = "www.nfce.fazenda.sp.gov.br";
const base = "35" + "2611" + "00000000000000" + "65" + "001" + "000000001" + "1" + "12345678";
const chave = base + chaveDv(base);
const secondBase = base.slice(0, -1) + "9";
const otherKey = secondBase + chaveDv(secondBase);
const url = `https://${host}/qrcode?p=${chave}|3|1`;
const row = (name = "Produto de teste", id = 1) =>
  `<tr id="Item + ${id}"><td><span class="txtTit">${name}</span><span class="Rqtd">1</span><span class="valor">2,00</span></td></tr>`;
const rows = (count) => Array.from({ length: count }, (_, i) => row("Produto de teste", i + 1)).join("");
const page = (key) => row() + (key ? `<span class="chave">${key}</span>` : "");

async function parseMeasured(html) {
  const worker = new Worker(new URL("./nfce-hardening-helpers.mjs", import.meta.url), {
    workerData: { kind: "parse-nfce", html },
  });
  let timer;
  try {
    const result = await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(Error("O leitor não terminou em 5 s.")), 5000);
      worker.once("message", resolve);
      worker.once("error", reject);
      worker.once("exit", (code) => {
        if (code !== 0) reject(Error(`Worker encerrou com código ${code}.`));
      });
    });
    return result;
  } finally {
    clearTimeout(timer);
    await worker.terminate();
  }
}

const junk = (size) => "x".repeat(size);
for (const [name, html, error] of [
  ["40 mil linhas sem fechamento", '<tr id="Item + 1"><td>'.repeat(40_000), /Não achei os itens/],
  ["60 mil spans sem fechamento", '<span class="txtTit">'.repeat(60_000), /Não achei os itens/],
  ["900 KiB de espaços dentro de um item", row(" ".repeat(900 * 1024)), /item.*grande demais/i],
  ["60 mil divs aninhados", "<div>".repeat(60_000) + "</div>".repeat(60_000), /Não achei os itens/],
  ["total sem marcador e 900 KiB de lixo", row() + "Valor a pagar R$:" + junk(900 * 1024), null],
  ["dois mil itens seguidos de 1 MiB de lixo", rows(2000) + junk(1024 * 1024), /itens demais/i],
  ["300 mil entidades de espaço", "&nbsp;".repeat(300_000), /página.*grande demais/i],
  ["atributo de classe sem fechamento", row() + '<span class="' + junk(900 * 1024), null],
  ["aberturas frequentes sem nenhum fechamento", "<xx".repeat(300_000), /página.*malformada/i],
  ["teto de HTML ultrapassado em um caractere", junk(1_500_001), /página.*grande demais/i],
  ["501 itens", rows(501), /itens demais/i],
  ["uma linha de 30 mil caracteres", row("Produto" + " ".repeat(30_000 - row("Produto").length)), /item.*grande demais/i],
]) {
  test(`Leitor em até 500 ms: ${name}`, async () => {
    const result = await parseMeasured(html);
    if (error) assert.match(result.error ?? "", error);
    else {
      assert.equal(result.error, undefined);
      assert.equal(result.items, 1);
      assert.equal(result.totalCents, 200);
    }
  });
}

for (const [name, address] of [
  ["sufixo enganoso", "https://evil.gov.br.example.com/"],
  ["credenciais", `https://user:pass@${host}/`],
  ["porta não padrão", `https://${host}:8443/`],
  ["HTTP", `http://${host}/`],
  ["esquema JavaScript", "javascript:void(0)"],
  ["esquema intent", "intent://example.test/"],
  ["host oficial usado como usuário", `https://${host}@evil.com/`],
  ["ponto final", `https://${host}./`],
  ["punycode", "https://xn--bcher-kva.gov.br/"],
  ["outro órgão em SP", "https://www.fazenda.sp.gov.br/"],
  ["outro estado", "https://www.fazenda.pr.gov.br/"],
  ["string vazia", ""], ["null", null], ["undefined", undefined], ["número", 123],
]) {
  test(`isAllowedUrl recusa ${name}`, () => assert.equal(isAllowedUrl(address, "SP"), false));
}

test("isAllowedUrl aceita os dois hosts oficiais de SP", () => {
  assert.equal(isAllowedUrl(url, "SP"), true);
  assert.equal(isAllowedUrl("https://nfce.fazenda.sp.gov.br/x", "SP"), true);
});

for (const [name, input, ambient, wanted] of [
  ["outro órgão do governo", "https://www.fazenda.sp.gov.br/", "1", "1"],
  ["domínio alheio à SEFAZ", "https://evil.com/", "2", "2"],
  ["ambiente inválido", "https://evil.com/", "outro", "1"],
]) {
  test(`consultUrl ignora ${name}`, () => {
    assert.equal(consultUrl({ uf: "SP", chave, url: input, tpAmb: ambient }), `https://${host}/qrcode?p=${chave}|3|${wanted}`);
  });
}

for (const size of [43, 45]) {
  test(`consultUrl recusa chave de ${size} dígitos`, () => {
    assert.throws(() => consultUrl({ uf: "SP", chave: "0".repeat(size) }), /Chave de acesso inválida/);
  });
}

test("consultUrl recusa UF sem suporte", () => {
  assert.throws(() => consultUrl({ uf: "XX", chave }), /Ainda não consulto notas de XX\./);
});

const message = { type: "html", href: url, html: page(chave) };
const options = { uf: "SP", chave };

test("Espelho da ponte aceita HTML com URL e chave esperadas", () => {
  assert.equal(acceptBridgeMessage(JSON.stringify(message), options), true);
});

for (const [name, changes] of [
  ["tipo ausente", { type: undefined }],
  ["HTML não textual", { html: {} }],
  ["host estranho", { href: `https://example.test/?p=${chave}` }],
  ["URL sem a chave", { href: `https://${host}/qrcode` }],
  ["página com outra chave", { html: page(otherKey) }],
  ["HTML acima do teto", { html: junk(MAX_HTML_CHARS + 1) }],
  ["envelope acima do teto", { padding: junk(MAX_HTML_CHARS + 10_001) }],
]) {
  test(`Espelho da ponte recusa ${name}`, () => {
    assert.equal(acceptBridgeMessage(JSON.stringify({ ...message, ...changes }), options), false);
  });
}

test("Espelho da ponte recusa JSON inválido e entradas que não são texto", () => {
  assert.equal(acceptBridgeMessage("{", options), false);
  assert.equal(acceptBridgeMessage(message, options), false);
});

test("Campos especiais em JSON não fornecem tipo, URL ou HTML à ponte", () => {
  const text = JSON.stringify(message);
  const raw = `{"__proto__":${text},"constructor":{"prototype":${text}}}`;
  assert.equal(acceptBridgeMessage(raw, options), false);
  assert.equal(Object.hasOwn(Object.prototype, "href"), false);
});

test("Política da ponte exige chave presente na página", () => {
  assert.equal(acceptBridgeMessage(JSON.stringify({ ...message, html: page() }), options), false);
});

test("Política da ponte exige chave no parâmetro da consulta", () => {
  const href = `https://${host}/qrcode?p=${otherKey}|3|1&debug=${chave}`;
  assert.equal(acceptBridgeMessage(JSON.stringify({ ...message, href }), options), false);
});
