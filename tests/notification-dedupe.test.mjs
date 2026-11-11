import { assertFast } from "./helpers/timing.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { notificationFingerprint, isDuplicateNotification, rememberNotification } from "../src/notificationDedupe.mjs";

const time = 1_800_000_000_000;
const notification = (fields = {}) => ({ bank:"Banco Á", amountCents:1500, merchant:"Café 🍵", postedAt:time, ...fields });
test("Push, SMS e atualização convergem com acento, emoji e minuto arredondado", () => {
  const a = notification();
  const b = notification({ bank:"SMS · Banco A", merchant:"CAFE", postedAt:time+1000 });
  assert.equal(notificationFingerprint(a),notificationFingerprint(b));
  const seen = rememberNotification([],a,time);
  assert.equal(isDuplicateNotification(seen,b),true);
  assert.equal(isDuplicateNotification(seen,notification({ postedAt:time+90000 })),true);
  assert.equal(rememberNotification(seen,a,time+1000).length,1);
});
test("Lojas distintas e compras separadas por três minutos permanecem", () => {
  const seen = rememberNotification([],notification(),time);
  assert.equal(isDuplicateNotification(seen,notification({ merchant:"Chá" })),false);
  assert.equal(isDuplicateNotification(seen,notification({ postedAt:time+180000 })),false);
  assert.equal(isDuplicateNotification(seen,notification({ postedAt:time+180000 }),{ windowMs:180000 }),true);
});
test("Reusa extração de banco, operação e loja do texto realista", () => {
  const row = { bank:"Banco A", title:"Compra aprovada", text:"Compra de R$ 15,00 em CAFE no cartão.", postedAt:time };
  assert.ok(notificationFingerprint(row));
  assert.equal(isDuplicateNotification(rememberNotification([],row,time),notification()),true);
});
test("Vazio, malformado, data inválida e campos herdados são ignorados", () => {
  assert.equal(notificationFingerprint(),null);
  assert.equal(notificationFingerprint(notification({ postedAt:"2026-02-30T00:00:00Z" })),null);
  assert.equal(notificationFingerprint(Object.create(notification())),null);
  assert.equal(isDuplicateNotification([null,{},JSON.parse('{"__proto__":{"key":"x"}}')],notification()),false);
  assert.deepEqual(rememberNotification(undefined,{},time),[]);
});
test("Poda por tempo e conserva somente 500 entradas recentes", () => {
  const old = rememberNotification([],notification(),time-86400001);
  const rows = Array.from({ length:5000 },(_, i) => ({ key:"k"+i, postedAt:time-i, seenAt:time-i }));
  let kept;
  assertFast(() => {
    kept = rememberNotification([...old,...rows],notification({ merchant:"Outro" }),time);
  }, 100, "notification-dedupe");
  assert.equal(kept.length,500);
  assert.ok(kept.every((row) => row.seenAt >= time-499));
});
