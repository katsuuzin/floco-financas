import test from "node:test";
import assert from "node:assert/strict";
import { emptyState, balance, totals } from "../src/finance.mjs";
import {
  schedule, saveContract, contractStatus, contractRows, changeMethod, payPart, addLateFee,
  extraAmortization, settleContract, removeContract,
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
