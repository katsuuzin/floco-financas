import { assertFast } from "./helpers/timing.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { monthGrid, dayDetail, monthTotals } from "../src/statementCalendar.mjs";

const row = (date, amount, type = "expense", fields = {}) => ({ date, amount, type, ...fields });
test("Fevereiro bissexto e semana começando domingo ou segunda", () => {
  const feb = monthGrid([], { year:2024,month:2 });
  assert.ok(feb.weeks.every((week) => week.length === 7));
  assert.equal(feb.weeks.flat().filter((cell) => cell.inMonth).length,29);
  assert.equal(monthGrid([], { year:2026,month:2 }).weeks[0][0].date,"2026-02-01");
  assert.equal(monthGrid([], { year:2026,month:2,weekStart:1 }).weeks[0][0].date,"2026-01-26");
  assert.equal(monthGrid([], { year:2026,month:6,weekStart:1 }).weeks[0][0].date,"2026-06-01");
});
test("Datas civis, transações inválidas e transferências", () => {
  const rows = [row("2026-02-01",100,"income"),row("2026-02-01",75),row("2026-02-01",200,"transfer"),
    row("2026-02-01",25,"expense",{refund:true}),row("2026-02-30",1),row("2026-02-01T00:00:00-03:00",1),{}];
  const day = dayDetail(rows,"2026-02-01");
  assert.deepEqual([day.incomeCents,day.expenseCents,day.count,day.skipped],[100,50,4,3]);
  assert.deepEqual(monthTotals(rows,"2026-02"),{month:"2026-02",incomeCents:100,expenseCents:50,count:4,skipped:3});
  assert.equal(dayDetail(rows,"__proto__").date,null);
});
test("Quantis mantêm empates e usam níveis de zero a quatro", () => {
  const rows = [10,20,30,40,40].map((amount,i) => row("2026-02-0"+(i+1),amount));
  const {weeks} = monthGrid(rows,{year:2026,month:2});
  assert.deepEqual(weeks[0].slice(0,6).map((cell) => cell.level),[1,2,3,4,4,0]);
  assert.deepEqual(monthGrid(undefined,{year:2026,month:13}).weeks,[]);
});
test("Cinco mil lançamentos em menos de 100 ms e soma sem estouro", () => {
  const rows = Array.from({length:5000},()=>row("2026-02-01",100));
  assertFast(() => {
    assert.equal(monthGrid(rows,{year:2026,month:2}).weeks[0][0].expenseCents,500000);
  }, 100, "statement-calendar");
  assert.equal(monthTotals([row("2026-02-01",Number.MAX_SAFE_INTEGER),row("2026-02-01",1)],"2026-02").expenseCents,null);
});
