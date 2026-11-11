import test from "node:test";
import assert from "node:assert/strict";
import { buildExpenseBatch, validateBatch, batchDuplicates, batchSummaryText } from "../src/multiExpenseDraft.mjs";
import { makeState } from "./helpers/shoppingFixtures.mjs";

const opts = { date:"2026-01-02",accountId:"a" };
const item = (category, priceCents, qty = 1) => ({ name:category,category,priceCents,qty,inCart:true });
test("Carrinho vazio e carrinho sem preço retornam aviso e lista de ignorados", () => {
  assert.equal(buildExpenseBatch().ok,false);
  const state = makeState({ items:[item("Mercearia",null)] });
  const batch = buildExpenseBatch(state,opts);
  assert.equal(batch.ok,false);
  assert.equal(batch.skipped.length,1);
  assert.equal(batchSummaryText(batch),"Nenhuma despesa no lote.");
});
test("Uma ou várias despesas fecham os centavos do carrinho", () => {
  const state = makeState({ items:[item("Mercearia",8000),item("Limpeza",1249),item("Higiene",null)] });
  const one = buildExpenseBatch(state,opts);
  assert.equal(one.expenses.length,1);
  const many = buildExpenseBatch(state,{...opts,split:true});
  assert.equal(many.ok,true);
  assert.equal(many.expenses.length,2);
  assert.equal(many.expenses.reduce((sum,row)=>sum+row.amountCents,0),9249);
  assert.equal(many.skipped[0].category,"Higiene");
  assert.ok(many.expenses.every((row)=>row.date===opts.date && row.accountId===opts.accountId));
  assert.match(batchSummaryText(many),/^2 despesas: Mercado R\$\s*80,00/);
});
test("Resíduo de arredondamento fica no maior grupo", () => {
  const batch = buildExpenseBatch(makeState({items:[item("Mercearia",801,.5),item("Higiene",101,.5)]}),{...opts,split:true});
  assert.equal(batch.totalCents,451);
  assert.deepEqual(batch.expenses.map((row)=>row.amountCents),[400,51]);
});
test("Valida data, conta, total e teto de 20 despesas", () => {
  const state = makeState({items:[item("Mercearia",200)]});
  const batch=buildExpenseBatch(state,opts);
  assert.equal(validateBatch(batch).ok,true);
  assert.match(validateBatch({ ...batch,totalCents:1 }).message,/total/);
  assert.match(validateBatch(Array(21).fill(batch.expenses[0])).message,/20/);
  assert.equal(buildExpenseBatch(state,{...opts,date:"2026-02-30"}).ok,false);
  assert.equal(buildExpenseBatch(state,{...opts,accountId:"__proto__"}).ok,false);
});
test("Aponta apenas despesas com candidata existente", () => {
  const state = { ...makeState({ items:[item("Mercearia",8000),item("Higiene",400)] }),
    transactions:[{ id:"x",date:opts.date,amount:8000,type:"expense",category:"Mercado",description:"Mercado" }] };
  const batch = buildExpenseBatch(state,{...opts,split:true});
  assert.deepEqual(batchDuplicates(state,batch).map((row)=>row.amountCents),[8000]);
});
