import test from "node:test";
import assert from "node:assert/strict";
import { pickAlerts, quietHours, runningLow } from "../src/shoppingRunOut.mjs";
const product = (id, days) => ({ id, name: id, prices: days.map((n) => ({ date: "2026-01-" + String(n).padStart(2, "0") })) });
const data = (...shoppingProducts) => ({ shoppingProducts });
test("Uma compra não permite previsão e compra muito recente fica de fora", () => {
  assert.deepEqual(runningLow(data(product("Arroz", [1]), product("Leite", [1, 3])), "2026-01-03"), []);
  assert.deepEqual(runningLow(data(product("Leite", [1, 11])), "2026-01-12", { days: 12 }), []);
});
test("Projeção usa ritmo e confiança em português", () => {
  const list = runningLow(data(product("Leite", [1, 11])), "2026-01-18");
  assert.equal(list[0].daysUntil, 3);
  assert.equal(list[0].confidence, "baixa");
  assert.match(list[0].reason, /3 dias/);
});
test("Intervalos irregulares reduzem a confiança", () => {
  const list = runningLow(data(product("Arroz", [1, 2, 5, 9, 20])), "2026-01-24");
  assert.equal(list[0].confidence, "média");
});
test("Mais de cinco ciclos e relógio anterior à última compra não geram alertas", () => {
  const state = data(product("Arroz", [1, 3]));
  assert.equal(runningLow(state, "2026-01-13").length, 1);
  assert.deepEqual(runningLow(state, "2026-01-14"), []);
  assert.deepEqual(runningLow(state, "2026-01-02"), []);
});
test("Horário silencioso atravessa meia-noite, com deslocamento local", () => {
  assert.equal(quietHours(Date.UTC(2026, 0, 1, 1), { offsetMinutes: -180 }), true);
  assert.equal(quietHours(Date.UTC(2026, 0, 1, 10), { offsetMinutes: -180 }), false);
});
test("Limita a três por dia e não emite no horário silencioso", () => {
  const list = [1, 2, 3, 4, 5];
  assert.deepEqual(pickAlerts(list, { max: 5, alreadySentToday: 1 }), [1, 2]);
  assert.deepEqual(pickAlerts(list, { alreadySentToday: 3 }), []);
  assert.deepEqual(pickAlerts(list, { now: Date.UTC(2026, 0, 1, 23) }), []);
  assert.deepEqual(pickAlerts(list, { now: Date.UTC(2026, 0, 1, 23), quiet: false }), [1, 2, 3]);
});
