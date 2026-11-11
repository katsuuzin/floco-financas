import { test } from "node:test";
import assert from "node:assert/strict";
import { chaveDv, isChave, parseChave, parseNfceInput, formatCnpj, SUPPORTED_UFS, UF_CODES } from "../src/nfce.mjs";

// Chave de exemplo do manual da NF-e (dados fictícios publicados em documentação): DV 3.
const EXEMPLO_NFE = "35080599999090910270550010000000015180051273";
// Monta uma chave fictícia de NFC-e (modelo 65) com o verificador certo.
const chave = ({ uf = "35", aamm = "2610", cnpj = "11222333000181", mod = "65", serie = "001", num = "000000123", tp = "1", cnf = "12345678" } = {}) => {
  const base = uf + aamm + cnpj + mod + serie + num + tp + cnf;
  return base + chaveDv(base);
};
const qr = (c, v = "3", amb = "1", host = "https://www.nfce.fazenda.sp.gov.br/qrcode") => `${host}?p=${c}|${v}|${amb}`;

test("dígito verificador (módulo 11) bate com a chave de exemplo do manual", () => {
  assert.equal(chaveDv(EXEMPLO_NFE.slice(0, 43)), 3);
  assert.equal(isChave(EXEMPLO_NFE), true);
  assert.equal(isChave(EXEMPLO_NFE.slice(0, 43) + "4"), false);
  assert.throws(() => chaveDv("123"), /43 dígitos/);
});

test("resto 0 ou 1 vira dígito 0", () => {
  // Procura chaves fictícias cujo resto seja 0 ou 1 e confere que o verificador é 0.
  let achou = 0;
  for (let n = 0; n < 200 && achou < 2; n++) {
    const base = "3526101122233300018165001" + String(n).padStart(9, "0") + "1" + "12345678";
    let sum = 0, w = 2;
    for (let i = 42; i >= 0; i--) { sum += Number(base[i]) * w; w = w === 9 ? 2 : w + 1; }
    if (sum % 11 < 2) { assert.equal(chaveDv(base), 0); achou++; }
  }
  assert.ok(achou >= 1);
});

test("parseChave decompõe os campos", () => {
  const p = parseChave(chave());
  assert.equal(p.uf, "SP");
  assert.equal(p.ufCode, 35);
  assert.equal(p.issuedMonth, "2026-10");
  assert.equal(p.cnpj, "11222333000181");
  assert.equal(p.model, "65");
  assert.equal(p.series, "1");
  assert.equal(p.number, "123");
  assert.equal(formatCnpj(p.cnpj), "11.222.333/0001-81");
  assert.throws(() => parseChave("123"), /44 dígitos/);
});

test("QR versão 3 de SP: lê chave, versão e ambiente", () => {
  const c = chave();
  const r = parseNfceInput(qr(c));
  assert.equal(r.chave, c);
  assert.equal(r.uf, "SP");
  assert.equal(r.version, "3");
  assert.equal(r.tpAmb, "1");
  assert.equal(r.homolog, false);
  assert.equal(r.supported, true);
  assert.equal(r.source, "qr");
  assert.match(r.url, /^https:\/\/www\.nfce\.fazenda\.sp\.gov\.br\//);
});

test("QR versão 2 (com token e hash) também lê a chave", () => {
  const c = chave({ uf: "41" });
  const r = parseNfceInput(`https://www.fazenda.pr.gov.br/nfce/qrcode?p=${c}|2|1|1|ABCDEF0123456789ABCDEF0123456789ABCDEF01`);
  assert.equal(r.uf, "PR");
  assert.equal(r.version, "2");
});

test("estados da primeira versão: SP, PR, SC e RS; outros são lidos mas marcados como não suportados", () => {
  assert.deepEqual(SUPPORTED_UFS, ["SP", "PR", "SC", "RS"]);
  for (const [uf, code] of [["SP", "35"], ["PR", "41"], ["SC", "42"], ["RS", "43"]]) {
    const r = parseNfceInput(qr(chave({ uf: code }), "3", "1", "https://consulta.exemplo.gov.br/qrcode"));
    assert.equal(r.uf, uf);
    assert.equal(r.supported, true);
  }
  const mg = parseNfceInput(qr(chave({ uf: "31" }), "3", "1", "https://nfce.fazenda.mg.gov.br/portalnfce"));
  assert.equal(mg.uf, "MG");
  assert.equal(mg.supported, false);
  assert.equal(Object.keys(UF_CODES).length, 27);
});

test("chave digitada ou colada, com espaços e pontos, vale como entrada", () => {
  const c = chave({ uf: "43" });
  const formatada = c.replace(/(\d{4})/g, "$1 ").trim();
  const r = parseNfceInput(formatada);
  assert.equal(r.chave, c);
  assert.equal(r.source, "chave");
  assert.equal(r.url, "");
  assert.equal(r.uf, "RS");
  assert.equal(parseNfceInput(c.replace(/(\d{4})/g, "$1.")).chave, c);
});

test("formato antigo com chNFe, nVersao e tpAmb", () => {
  const c = chave();
  const r = parseNfceInput(`https://www.exemplo.sp.gov.br/consulta?chNFe=${c}&nVersao=100&tpAmb=1`);
  assert.equal(r.chave, c);
  assert.equal(r.version, "100");
});

test("ambiente de homologação é sinalizado", () => {
  assert.equal(parseNfceInput(qr(chave(), "3", "2")).homolog, true);
});

test("erros: vazio, texto qualquer, endereço fora do governo, chave curta ou com verificador errado", () => {
  assert.throws(() => parseNfceInput(""), /Nada para ler/);
  assert.throws(() => parseNfceInput("olá, mundo"), /não parece uma nota/);
  assert.throws(() => parseNfceInput(qr(chave(), "3", "1", "https://golpe.example.com/qrcode")), /fora do governo/);
  assert.throws(() => parseNfceInput("https://www.nfce.fazenda.sp.gov.br/qrcode?p=123|3|1"), /44 dígitos/);
  const c = chave();
  const ruim = c.slice(0, 43) + String((Number(c[43]) + 1) % 10);
  assert.throws(() => parseNfceInput(qr(ruim)), /não confere/);
  assert.throws(() => parseNfceInput("x".repeat(2001)), /grande demais/);
  assert.throws(() => parseNfceInput("https://"), /não é válido/);
});

test("NF-e (modelo 55) e modelos desconhecidos não passam por cupom", () => {
  assert.throws(() => parseNfceInput(EXEMPLO_NFE), /nota fiscal de uma compra de mercado/);
  assert.throws(() => parseNfceInput(chave({ mod: "59" })), /nota fiscal de uma compra de mercado/);
});

test("código de estado inexistente é recusado", () => {
  assert.throws(() => parseNfceInput(chave({ uf: "99" })), /estado/);
});
