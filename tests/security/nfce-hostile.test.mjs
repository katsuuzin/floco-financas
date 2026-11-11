import { assertFast } from "../helpers/timing.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { chaveDv, parseNfceInput } from "../../src/nfce.mjs";
import { consultUrl, isAllowedUrl, parseNfceHtml } from "../../src/nfceParse.mjs";
import { acceptBridgeMessage } from "./helpers.mjs";

const base = "35" + "2611" + "00000000000000" + "65" + "001" + "000000001" + "1" + "12345678";
const chave = base + chaveDv(base);
const host = "www.nfce.fazenda.sp.gov.br";
const url = `https://${host}/qrcode?p=${chave}|3|1`;
const bridge = { type: "html", host, chave, html: "<html>Exemplo</html>" };
const expected = { expectedHost: host, chave };

// Achado de navegação: o endereço oficial da nota sintética continua utilizável.
test("Aceita a URL oficial de SP e mantém a URL da consulta", () => {
  assert.equal(isAllowedUrl(url), true);
  assert.equal(consultUrl(parseNfceInput(url)), url);
});

// Achado de navegação: a política rejeita HTTP e um site comum fora da lista.
test("Recusa HTTP e um domínio comum fora da lista", () => {
  assert.equal(isAllowedUrl(`http://${host}/qrcode`), false);
  assert.equal(isAllowedUrl("https://example.test/"), false);
});

// Achado do parser: entrada vazia ou texto comum termina rápido e produz erro em português.
for (const input of ["", "Recibo sem tabela de itens"]) {
  test(`Leitor encerra rápido sem uma tabela: ${JSON.stringify(input)}`, () => {
    assertFast(() => {
      assert.throws(() => parseNfceHtml(input), /Não achei|não contém|vazi|não consegui/i);
    }, 300, "nfce-hostile");
  });
}

// Achado do parser: um lote de itens válidos tem orçamento de processamento explícito.
test("Lê um lote sintético de 200 itens válidos em até 300 ms", () => {
  const rows = Array.from({ length: 200 }, (_, i) =>
    `<tr id="Item${i}"><td><span class="txtTit">Produto ${i}</span><span class="Rqtd">1</span><span class="RUN">UN</span><span class="RvlUnit">2,00</span><span class="valor">2,00</span></td></tr>`);
  const html = `<html><table>${rows.join("")}</table><span class="chave">${chave}</span></html>`;
  assertFast(() => {
    assert.equal(parseNfceHtml(html).items.length, 200);
  }, 300, "nfce-hostile");
});

// Achado da ponte: uma mensagem válida precisa corresponder ao contrato de referência.
test("Contrato de exemplo aceita o HTML da nota e da origem esperadas", () => {
  assert.equal(acceptBridgeMessage(bridge, expected), true);
});

for (const [description, changes] of [
  ["sem tipo", { type: undefined }],
  ["com HTML não textual", { html: [] }],
  ["de outra origem", { host: "example.test" }],
  ["de outra nota", { chave: "0".repeat(44) }],
]) {
  // Achado da ponte: tipo, formato, origem e identidade são requisitos independentes.
  test(`Contrato de exemplo rejeita mensagem ${description}`, () => {
    assert.equal(acceptBridgeMessage({ ...bridge, ...changes }, expected), false);
  });
}

// Achado de tamanho: o validador de exemplo mede bytes antes de entregar ao parser.
test("Contrato de exemplo rejeita mensagem acima de 3 MiB em UTF-8", () => {
  const atLimit = "á".repeat((3 * 1024 * 1024) / 2);
  assert.equal(acceptBridgeMessage({ ...bridge, html: atLimit }, expected), true);
  assert.equal(acceptBridgeMessage({ ...bridge, html: atLimit + "a" }, expected), false);
});
