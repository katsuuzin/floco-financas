import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, balance, validateBackup } from "../src/finance.mjs";
import { suggestNotification, importNotification, draftFromNotification, dedupeInbox, isDenied } from "../src/notification-import.mjs";
import { bankLook, notifySettings } from "../src/bankCatalog.mjs";

const at = new Date("2026-11-07T00:36:00").getTime();
const row = { id: "n1", bank: "Nubank", title: "Compra aprovada", text: "Compra de R$ 42,90 no Mercado.", postedAt: at };

test("compra no cartão Nubank: valor, comerciante, final do cartão e horário", () => {
  const s = suggestNotification({
    ...row,
    title: "Compra aprovada",
    text: "Compra de R$ 27,69 APROVADA em TIM*13982040146 para o cartão com final 5179.",
  });
  assert.equal(s.kind, "card");
  assert.equal(s.amount, "27,69");
  assert.equal(s.description, "TIM*13982040146");
  assert.equal(s.lastFour, "5179");
  assert.equal(s.time, "00:36");
  assert.equal(s.type, "expense");
});

test("notificação real do Nubank (título + texto)", () => {
  const s = suggestNotification({
    id: "real",
    bank: "Nubank",
    title: "Compra no crédito aprovada",
    text: "Compra de R$ 27,69 APROVADA em TIM*13982040146 para o cartão com final 5179.",
    postedAt: at,
  });
  assert.equal(s.kind, "card");
  assert.equal(s.kindLabel, "Compra no cartão");
  assert.equal(s.amount, "27,69");
  assert.equal(s.description, "TIM*13982040146");
  assert.equal(s.lastFour, "5179");
});

test("Pix enviado e recebido", () => {
  const out = suggestNotification({ ...row, title: "Pix enviado", text: "Você enviou um Pix de R$ 183,40 para JOAO DA SILVA." });
  assert.equal(out.kind, "pixOut");
  assert.equal(out.description, "JOAO DA SILVA");
  const inn = suggestNotification({ ...row, title: "Pix recebido", text: "Você recebeu um Pix de R$ 50,00 de Ademar da Silva Jardim." });
  assert.equal(inn.kind, "pixIn");
  assert.equal(inn.type, "income");
  assert.equal(inn.amount, "50,00");
  assert.equal(inn.description, "Ademar da Silva Jardim");
});

test("mesma compra pelo app e por SMS é marcada sem apagar pendências", () => {
  const app = { id: "a", bank: "Nubank", source: "app", title: "Compra no crédito aprovada", text: "Compra de R$ 27,69 APROVADA em TIM.", postedAt: at };
  const sms = { id: "b", bank: "SMS · NUBANK", source: "sms", title: "", text: "NUBANK: Compra de R$ 27,69 APROVADA em TIM.", postedAt: at + 60000 };
  const other = { id: "c", bank: "Nubank", source: "app", title: "Compra", text: "Compra de R$ 27,69 em TIM.", postedAt: at + 3 * 3600000 };
  const r = dedupeInbox([sms, app, other]);
  assert.deepEqual(r.unique.map((x) => x.id).sort(), ["a", "b", "c"]);
  assert.deepEqual(r.duplicates, ["b"]);
});

test("com saldo junto, usa o primeiro valor", () => {
  assert.equal(suggestNotification({ ...row, text: "Compra R$ 42,90. Limite disponível R$ 100,00" }).amount, "42,90");
});

test("rascunho escolhe o cartão pelo final e a conta pelo banco", () => {
  const s = {
    ...emptyState(),
    accounts: [{ id: "inter", name: "Inter", initial: 0 }, { id: "nu", name: "Nubank", institution: "Nubank", initial: 0 }],
    cards: [{ id: "c1", name: "Nubank", limit: 100000, closingDay: 1, dueDay: 8, lastFour: "5179" }],
  };
  const d = draftFromNotification(s, { ...row, text: "Compra de R$ 27,69 APROVADA em TIM*1398 para o cartão com final 5179." });
  assert.equal(d.cardId, "c1");
  assert.equal(d.accountId, "nu");
  const pix = draftFromNotification(s, { ...row, title: "Pix enviado", text: "Você enviou um Pix de R$ 10,00 para Ana." });
  assert.equal(pix.cardId, "");
});

test("registrar duas vezes não duplica e respeita a conta", () => {
  let s = { ...emptyState(), accounts: [{ id: "pf", name: "PF", initial: 10000 }, { id: "pj", name: "PJ", initial: 10000 }] };
  const input = { description: "Mercado", amount: "42,90", type: "expense", date: "2026-11-06", accountId: "pj" };
  s = importNotification(s, row, input);
  assert.equal(balance(s, "pj"), 5710);
  s = validateBackup(JSON.parse(JSON.stringify(s)));
  s = importNotification(s, row, input);
  assert.equal(s.transactions.length, 1);
  assert.throws(() => importNotification(s, { ...row, id: "n2" }, { ...input, accountId: "" }));
});

test("duas compras próximas com mesmo valor pelo app continuam disponíveis", () => {
  const a = { ...row, source: "app" };
  const b = { ...a, id: "n2", postedAt: at + 1000 };
  const r = dedupeInbox([a, b]);
  assert.equal(r.unique.length, 2);
  assert.deepEqual(r.duplicates, []);
});

test("dois SMS idênticos em poucos minutos marcam o segundo", () => {
  const a = { id: "s1", bank: "SMS · NUBANK", source: "sms", title: "NUBANK", text: "NUBANK: Compra de R$ 61,23 APROVADA em PADARIA.", postedAt: at };
  const b = { ...a, id: "s2", text: "NUBANK: Compra de R$ 61,23 APROVADA em PADARIA.\n2 mensagens novas", postedAt: at + 4000 };
  const later = { ...a, id: "s3", postedAt: at + 20 * 60000 };
  const other = { ...a, id: "s4", text: "NUBANK: Compra de R$ 61,23 APROVADA em MERCADO.", postedAt: at + 8000 };
  const r = dedupeInbox([b, later, a, other]);
  assert.equal(r.unique.length, 4);
  assert.deepEqual(r.duplicates, ["s2"]);
});

test("rendimento de ativo vira entrada com a descrição do ativo", () => {
  const s = suggestNotification({
    id: "y1", bank: "Inter", title: "Rendimentos",
    text: "Boas notícias, você recebeu R$ 0,41 de rendimentos do ativo GARE11",
    postedAt: at,
  });
  assert.equal(s.kind, "yield");
  assert.equal(s.kindLabel, "Rendimento recebido");
  assert.equal(s.type, "income");
  assert.equal(s.amount, "0,41");
  assert.equal(s.description, "Rendimentos do ativo GARE11");
});

test("dividendo, JCP e 'rendeu' são rendimentos; Pix recebido continua Pix", () => {
  const mk = (text) => suggestNotification({ id: "x", bank: "Nubank", title: "Aviso", text, postedAt: at });
  assert.equal(mk("Dividendos de PETR4: R$ 12,30 creditados na sua conta.").kind, "yield");
  assert.equal(mk("Seu dinheiro rendeu R$ 0,87 hoje.").kind, "yield");
  assert.equal(mk("Você recebeu um Pix de R$ 50,00 de MARIA SOUZA.").kind, "pixIn");
});

test("rendimento usa a categoria do usuário parecida com rendimentos", () => {
  const s = { ...emptyState(), customCategories: [{ id: "c1", name: "Rendimentos" }] };
  const d = draftFromNotification(s, { id: "y2", bank: "Inter", title: "Rendimentos", text: "Você recebeu R$ 0,41 de rendimentos do ativo GARE11", postedAt: at });
  assert.equal(d.category, "Rendimentos");
  assert.equal(draftFromNotification(emptyState(), { id: "y3", bank: "Inter", title: "Rendimentos", text: "Você recebeu R$ 0,41 de rendimentos do ativo GARE11", postedAt: at }).category, "Outros");
});

test("compra negada é reconhecida e não confunde com compra aprovada", () => {
  const mk = (text, title = "Compra") => ({ id: "d", bank: "Nubank", title, text, postedAt: at });
  for (const t of [
    "Compra de R$ 89,90 NEGADA em LOJA X para o cartão com final 5179.",
    "Sua compra de R$ 30,00 foi recusada.",
    "Compra não aprovada no valor de R$ 12,00.",
    "Transação de R$ 45,00 no cartão não foi autorizada.",
  ]) {
    assert.equal(suggestNotification(mk(t)).kind, "denied", t);
    assert.equal(isDenied(mk(t)), true, t);
  }
  assert.equal(isDenied(mk("Compra de R$ 27,69 APROVADA em TIM para o cartão com final 5179.", "Compra aprovada")), false);
  assert.equal(isDenied(mk("Você recebeu um Pix de R$ 10,00 de ANA.")), false);
});

test("ícone do banco: arquivo do Kontto para banco conhecido, selo de sigla ou neutro nos demais", () => {
  assert.equal(bankLook("Inter").logo, "inter");
  assert.equal(bankLook("SMS · NUBANK").logo, "nubank");
  assert.equal(bankLook("Minha conta", "Banco do Brasil").logo, "bb");
  assert.equal(bankLook("Itaú Personnalité").logo, "itaupersonnalite");
  assert.equal(bankLook("Itaú Empresas").logo, bankLook("Itau").logo);
  assert.equal(bankLook("Mercado Pago").logo, "mercadopago");
  assert.equal(bankLook("Minha pan").known, true); // sigla curta só por palavra inteira
  assert.equal(bankLook("Panificadora").known, false);
  assert.equal(bankLook("Coral").known, false);
  assert.equal(bankLook("Banco Cora").logo, "cora");
  assert.equal(bankLook("Next").logo, "");
  assert.equal(bankLook("Next").abbr, "Nx");
  assert.equal(bankLook("Tapete").known, false);
  assert.equal(bankLook("Carteira").known, false);
  assert.equal(bankLook("").abbr, "$");
});

test("todo ícone citado no catálogo existe em assets/banks e no mapa do app", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/bankCatalog.mjs", import.meta.url), "utf8");
  const map = readFileSync(new URL("../src/ui/bankLogos.ts", import.meta.url), "utf8");
  const keys = [...new Set([...src.split("const BANK_LOOKS")[0].split("const BANK_LOGOS")[1].matchAll(/"([a-z0-9]+)"\],/g)].map((m) => m[1]))];
  assert.ok(keys.length > 40);
  for (const k of keys) {
    assert.ok(existsSync(new URL(`../assets/banks/${k}.png`, import.meta.url)), `falta assets/banks/${k}.png`);
    assert.ok(map.includes(`assets/banks/${k}.png`), `falta ${k} em bankLogos.ts`);
  }
});

test("não registrar compras negadas vem ligado e o backup aceita a preferência", () => {
  assert.equal(notifySettings(emptyState()).ignoreDenied, true);
  const s = { ...emptyState(), settings: { ...emptyState().settings, notify: { banks: ["br.com.intermedium"], ignored: [], sms: false, ignoreDenied: false } } };
  assert.equal(notifySettings(s).ignoreDenied, false);
  validateBackup(JSON.parse(JSON.stringify(s)));
});
