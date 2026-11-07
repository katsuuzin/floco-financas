import test from 'node:test';import assert from 'node:assert/strict';
import {answerLocal,localSummary,LOCAL_QUESTIONS} from '../src/insights.mjs';
import {emptyState,addTransaction,contribute} from '../src/finance.mjs';
test('assistente local responde aos atalhos sem rede e não modifica registros',()=>{
 let s={...emptyState(),accounts:[{id:'a',name:'Teste',initial:10000}],goals:[{id:'g',name:'Reserva de emergência',saved:0,target:10000,deposits:[]}]};
 for(const row of [{type:'income',amount:5000,date:'2026-11-01',confirmed:true},{type:'expense',amount:1000,date:'2026-11-02',confirmed:true},{type:'expense',amount:2000,date:'2026-10-01',confirmed:true},{type:'expense',amount:2000,date:'2026-11-08',confirmed:false},{type:'income',amount:999999,date:'2026-11-09',confirmed:false}])s=addTransaction(s,{description:'Exemplo',accountId:'a',category:'Mercado',...row});
 s=contribute(s,'g',1000,'a');const original=JSON.stringify(s);
 for(const q of LOCAL_QUESTIONS)assert(answerLocal(s,q,'2026-11-07').length>20);
 assert(answerLocal(s,'Gastei mais que no mês passado?','2026-11-07').includes('Redução'));
 assert(answerLocal(s,'Quanto ainda posso gastar?','2026-11-07').includes('90,00'));
 assert(localSummary(s,'2026-11-07').includes('40,00'));
 assert.equal(JSON.stringify(s),original);
});
test('sem dados o resumo explica a ausência de registros',()=>{assert.match(localSummary(emptyState(),'2026-11-07'),/Não há lançamentos/);});
