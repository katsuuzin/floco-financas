import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, balance, totals } from "../src/finance.mjs";
import {
  schedule, saveContract, contractStatus, contractRows, changeMethod, payPart, addLateFee,
  extraAmortization, settleContract, removeContract, previewOf,
} from "../src/contracts.mjs";

const base = () => ({ ...emptyState(), accounts: [{ id: "a", name: "Conta", initial: 10_000_000 }] });
const sum = (rows, k = "amount") => rows.reduce((n, r) => n + r[k], 0);

test("Price: R$ 10.000 a 1% em 12x dá parcela de R$ 888,49 e zera o saldo", () => {
  const rows = schedule({ method: "price", principal: 1_000_000, rate: 1, count: 12, date: "2026-12-10" });
  assert.equal(rows.length, 12);
  assert.equal(rows[0].amount, 88849);
  assert.equal(rows[0].interest, 10000);
  assert.equal(rows.at(-1).balanceAfter, 0);
  assert.equal(sum(rows, "amortization"), 1_000_000);
});

test("Price a partir da parcela deriva o saldo devedor", () => {
  const rows = schedule({ method: "price", installment: 88849, rate: 1, count: 12, date: "2026-12-10" });
  const principal = rows[0].amortization + rows[0].balanceAfter;
  assert.ok(Math.abs(principal - 1_000_000) <= 10);
});

test("SAC: amortização constante e parcela decrescente", () => {
  const rows = schedule({ method: "sac", principal: 1_200_000, rate: 1, count: 12, date: "2026-12-10" });
  assert.ok(rows.every((r) => r.amortization === 100000));
  assert.equal(rows[0].amount, 100000 + 12000);
  assert.ok(rows[0].amount > rows[11].amount);
  assert.equal(rows.at(-1).balanceAfter, 0);
});

test("Parcela fixa com seguro soma o seguro em cada parcela", () => {
  const rows = schedule({ method: "fixed", installment: 50000, insurance: 2500, count: 4, date: "2026-12-10" });
  assert.ok(rows.every((r) => r.amount === 52500));
  assert.equal(rows.at(-1).balanceAfter, 0);
});

test("SAC e Price exigem taxa; SAC exige saldo devedor", () => {
  assert.throws(() => schedule({ method: "sac", principal: 1000, rate: 0, count: 2, date: "2026-12-10" }), /taxa/);
  assert.throws(() => schedule({ method: "sac", principal: 0, rate: 1, count: 2, date: "2026-12-10" }), /saldo/);
  assert.throws(() => schedule({ method: "price", installment: 100, rate: 0, count: 2, date: "2026-12-10" }), /taxa/);
});

function contract(method = "price", extra = {}) {
  const s = saveContract(base(), {
    name: "Carro", type: "financing", method, principal: 1_000_000, rate: 1, count: 12, paid: 0,
    date: "2026-12-10", accountId: "a", category: "Transporte", ...extra,
  });
  return { s, id: s.financings[0].id };
}

test("contrato gera parcelas pendentes e status com saldo devedor", () => {
  const { s, id } = contract();
  const st = contractStatus(s, id);
  assert.equal(st.openCount, 12);
  assert.equal(st.debt, 1_000_000);
  assert.equal(balance(s, "a"), 10_000_000);
  assert.equal(totals(s, "2026-12").pay, 88849);
});

test("pagar uma parcela reduz o saldo devedor pela amortização", () => {
  let { s, id } = contract();
  const first = contractRows(s, id)[0];
  s = payPart(s, first.id, first.amount, "a", "2026-12-10");
  const st = contractStatus(s, id);
  assert.equal(st.paidCount, 1);
  assert.equal(st.debt, 1_000_000 - first.amortization);
  assert.equal(balance(s, "a"), 10_000_000 - first.amount);
});

test("pagamento parcial em duas vezes quita a parcela sem cobrar a mais", () => {
  let { s, id } = contract("fixed", { installment: 50000, method: "fixed", principal: 0 });
  const t = contractRows(s, id)[0];
  s = payPart(s, t.id, 20000, "a", "2026-12-05");
  assert.equal(contractStatus(s, id).openCount, 12);
  assert.equal(totals(s, "2026-12").pay, 30000);
  assert.equal(balance(s, "a"), 10_000_000 - 20000);
  s = payPart(s, t.id, 30000, "a", "2026-12-10");
  assert.equal(contractStatus(s, id).openCount, 11);
  assert.equal(balance(s, "a"), 10_000_000 - 50000);
  assert.throws(() => payPart(s, t.id, 1, "a"), /aberto/);
});

test("pagamento parcial abate juros antes do saldo devedor", () => {
  let { s, id } = contract();
  const t = contractRows(s, id)[0];
  s = payPart(s, t.id, 5000, "a", "2026-12-01");
  assert.equal(contractStatus(s, id).debt, 1_000_000);
  s = payPart(s, t.id, 20000, "a", "2026-12-02");
  assert.equal(contractStatus(s, id).debt, 1_000_000 - (25000 - t.interest));
});

test("juros por atraso aumentam a parcela em aberto", () => {
  let { s, id } = contract();
  const t = contractRows(s, id)[0];
  s = addLateFee(s, t.id, 1500);
  assert.equal(contractRows(s, id)[0].amount, t.amount + 1500);
});

test("trocar de Price para SAC mantém as pagas e refaz as abertas pelo saldo", () => {
  let { s, id } = contract();
  const first = contractRows(s, id)[0];
  s = payPart(s, first.id, first.amount, "a", "2026-12-10");
  const debt = contractStatus(s, id).debt;
  s = changeMethod(s, id, { method: "sac" });
  const rows = contractRows(s, id);
  assert.equal(rows.length, 12);
  assert.ok(rows[0].confirmed);
  assert.equal(sum(rows.filter((r) => !r.confirmed), "amortization"), debt);
  assert.equal(s.financings[0].method, "sac");
});

test("amortização extra reduzindo prazo diminui parcelas e mantém o valor", () => {
  let { s, id } = contract();
  const before = contractRows(s, id)[0].amount;
  s = extraAmortization(s, id, 300_000, "a", "2026-12-01", "term");
  const open = contractRows(s, id).filter((r) => !r.confirmed);
  assert.ok(open.length < 12);
  assert.ok(Math.abs(open[0].amount - before) <= 1);
  assert.equal(sum(open, "amortization"), 700_000);
  assert.equal(balance(s, "a"), 10_000_000 - 300_000);
});

test("amortização extra reduzindo parcela mantém o prazo", () => {
  let { s, id } = contract();
  const before = contractRows(s, id)[0].amount;
  s = extraAmortization(s, id, 300_000, "a", "2026-12-01", "payment");
  const open = contractRows(s, id).filter((r) => !r.confirmed);
  assert.equal(open.length, 12);
  assert.ok(open[0].amount < before);
});

test("quitar paga o saldo devedor e encerra o contrato", () => {
  let { s, id } = contract();
  s = settleContract(s, id, "a", "2026-12-01");
  const st = contractStatus(s, id);
  assert.ok(st.finished);
  assert.equal(balance(s, "a"), 10_000_000 - 1_000_000);
  assert.equal(totals(s, "2026-12").pay, 0);
});

test("excluir contrato sem pagamentos remove tudo; com pagamentos arquiva", () => {
  let { s, id } = contract();
  assert.equal(removeContract(s, id).transactions.length, 0);
  const t = contractRows(s, id)[0];
  s = payPart(s, t.id, t.amount, "a");
  const after = removeContract(s, id);
  assert.ok(after.financings[0].archived);
  assert.equal(after.transactions.length, s.transactions.length);
});

test("contratos antigos sem método são lidos como parcela fixa", () => {
  const s = { ...base(), financings: [{ id: "f", name: "Antigo", amount: 1000, count: 2, paid: 0, date: "2026-12-01", accountId: "a" }],
    transactions: [{ id: "t1", financingId: "f", type: "expense", amount: 1000, date: "2026-12-01", accountId: "a", confirmed: false, installment: 1, installments: 2, description: "x" }] };
  const st = contractStatus(s, "f");
  assert.equal(st.contract.method, "fixed");
  assert.equal(st.debt, 1000);
});

const car = () => {
  const s = saveContract(base(), { name: "Carro", type: "financing", method: "fixed", installment: 85000, count: 14, paid: 0, date: "2026-12-09", accountId: "a", category: "Transporte" });
  return { s, id: s.financings[0].id };
};

test("D1a abater sem movimentar conta (FGTS): reduz o contrato e não debita nenhuma conta", () => {
  const { s, id } = car();
  const before = contractStatus(s, id);
  const r = extraAmortization(s, id, 200000, null, "2026-11-09", "term", { offApp: true });
  assert.equal(balance(r, "a"), balance(s, "a"));
  assert.equal(totals(r, "2026-11").expense, totals(s, "2026-11").expense);
  assert.ok(!r.transactions.some((t) => t.extra));
  assert.equal(contractStatus(r, id).debt, before.debt - 200000);
  assert.ok(contractStatus(r, id).openCount < before.openCount);
  const h = r.financings[0].amortizations;
  assert.equal(h.length, 1);
  assert.deepEqual([h[0].offApp, h[0].amount, h[0].debtBefore, h[0].debtAfter, h[0].accountId], [true, 200000, before.debt, before.debt - 200000, undefined]);
});

test("D1a abater com conta debita a conta e guarda o histórico do abatimento", () => {
  const { s, id } = car();
  const before = contractStatus(s, id);
  const r = extraAmortization(s, id, 200000, "a", "2026-11-09", "payment");
  assert.equal(balance(r, "a"), balance(s, "a") - 200000);
  assert.equal(r.transactions.filter((t) => t.extra).length, 1);
  assert.equal(contractStatus(r, id).debt, before.debt - 200000);
  assert.equal(contractStatus(r, id).openCount, before.openCount);
  assert.equal(r.financings[0].amortizations[0].mode, "payment");
  const again = extraAmortization(r, id, 50000, "a", "2026-11-10");
  assert.equal(again.financings[0].amortizations.length, 2);
});

test("D1a saldo devedor informado pelo banco substitui o calculado", () => {
  const { s, id } = car();
  const debt = contractStatus(s, id).debt;
  const r = extraAmortization(s, id, 200000, null, "2026-11-09", "term", { offApp: true, newDebt: debt - 230000 });
  assert.equal(contractStatus(r, id).debt, debt - 230000);
  assert.equal(r.financings[0].amortizations[0].debtAfter, debt - 230000);
  // Pagou pouco, mas o banco abateu mais: com o saldo informado, o valor pago pode ser menor que o abatimento.
  const small = extraAmortization(s, id, 1000, "a", "2026-11-09", "term", { newDebt: debt - 100000 });
  assert.equal(contractStatus(small, id).debt, debt - 100000);
});

test("D1a recusa abatimento inválido", () => {
  const { s, id } = car();
  const debt = contractStatus(s, id).debt;
  assert.throws(() => extraAmortization(s, id, debt, "a"), /Quitar/);
  assert.throws(() => extraAmortization(s, id, 0, "a"), /valor pago/);
  assert.throws(() => extraAmortization(s, id, 1000, "x"), /conta/);
  assert.throws(() => extraAmortization(s, id, 1000, null, "2026-11-09", "term", { offApp: true, newDebt: debt }), /menor que o atual/);
  assert.throws(() => extraAmortization(s, id, 1000, null, "2026-11-09", "term", { offApp: true, newDebt: 0 }), /maior que zero/);
  assert.throws(() => extraAmortization(s, id, 1000, "a", "2026-13-01"), /data/);
  assert.equal(s.financings[0].amortizations, undefined);
});

test("D1a prévia mostra parcelas restantes, última data e quanto falta pagar", () => {
  const { s, id } = car();
  const before = previewOf(s, id);
  assert.equal(before.openCount, 14);
  assert.equal(before.lastDate, "2028-01-09");
  assert.equal(before.total, 14 * 85000);
  const r = extraAmortization(s, id, 255000, null, "2026-11-09", "term", { offApp: true });
  const after = previewOf(r, id);
  assert.equal(after.openCount, 11);
  assert.equal(after.total, 11 * 85000);
  assert.equal(after.debt, contractStatus(r, id).debt);
  assert.ok(after.lastDate < before.lastDate);
});

test("D1a histórico de abatimentos sobrevive à validação do backup", async () => {
  const { validateBackup } = await import("../src/finance.mjs");
  const { s, id } = car();
  const r = extraAmortization(s, id, 200000, null, "2026-11-09", "term", { offApp: true });
  const back = validateBackup(JSON.parse(JSON.stringify(r)));
  assert.equal(back.financings[0].amortizations.length, 1);
  assert.equal(back.financings[0].amortizations[0].id, r.financings[0].amortizations[0].id);
});

test("D1a abatimento com conta não conta como parcela paga, mas entra em 'já pago'", () => {
  const { s, id } = car();
  const r = extraAmortization(s, id, 200000, "a", "2026-11-09");
  assert.equal(contractStatus(r, id).paidCount, 0);
  assert.equal(contractStatus(r, id).paidTotal, 200000);
});
