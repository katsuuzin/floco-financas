import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, balance, validateBackup } from "../src/finance.mjs";
import { suggestNotification, importNotification, draftFromNotification, dedupeInbox } from "../src/notification-import.mjs";

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
