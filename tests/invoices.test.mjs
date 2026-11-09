import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, addTransaction, invoice, payInvoice, balance, validateBackup } from "../src/finance.mjs";
import { minimumPayment, setInvoiceTotal, invoiceBreakdown, chosenInvoiceMonth, invoiceShiftOf } from "../src/invoices.mjs";

const base = () => {
  let s = {
    ...emptyState(),
    accounts: [{ id: "a", name: "A", initial: 1000000 }],
    cards: [{ id: "c", name: "Cartão", limit: 500000, closingDay: 5, dueDay: 10 }],
    tags: [{ id: "t1", name: "viagem" }, { id: "t2", name: "lazer" }],
  };
  const buy = (extra) =>
    (s = addTransaction(s, { type: "expense", amount: 10000, date: "2026-11-09", description: "Compra", category: "Lazer", cardId: "c", ...extra }));
  buy({ amount: 10000, category: "Lazer", tags: ["t1", "t2"] });
  buy({ amount: 5000, category: "Mercado" });
  return s;
};
const M = "2026-12"; // compra de 9/nov com fechamento dia 5 cai na fatura de dezembro

test("O3a pagamento mínimo: 15% do total para cima, limitado ao que falta e zero sem saldo", () => {
  const s = base();
  const inv = invoice(s, "c", M);
  assert.equal(inv.total, 15000);
  assert.equal(minimumPayment(inv), 2250);
  const part = payInvoice(s, "c", M, "a", "2026-12-01", 14000);
  assert.equal(minimumPayment(invoice(part, "c", M)), 1000);
  const paid = payInvoice(s, "c", M, "a", "2026-12-01");
  assert.equal(minimumPayment(invoice(paid, "c", M)), 0);
  assert.equal(minimumPayment({ due: 100, total: 3 }), 1);
});

test("O3a ajustar o total troca a soma das compras e o restante a pagar", () => {
  const s0 = base();
  const s = setInvoiceTotal(s0, "c", M, 18250);
  const inv = invoice(s, "c", M);
  assert.deepEqual([inv.total, inv.due, inv.manual, inv.purchasesTotal, inv.adjustment], [18250, 18250, true, 15000, 3250]);
  assert.equal(invoice(s, "c", "2027-01").manual, false);
  assert.equal(minimumPayment(inv), Math.ceil(18250 * 0.15));
  const paid = payInvoice(s, "c", M, "a", "2026-12-01");
  assert.equal(invoice(paid, "c", M).due, 0);
  assert.equal(balance(paid, "a"), 1000000 - 18250);
  const cleared = setInvoiceTotal(s, "c", M, null);
  assert.equal(invoice(cleared, "c", M).total, 15000);
  assert.equal(cleared.cards[0].manualTotals, undefined);
});

test("O3a recusa total inválido ou menor que o já pago", () => {
  const s0 = base();
  assert.throws(() => setInvoiceTotal(s0, "c", M, 0), /maior que zero/);
  assert.throws(() => setInvoiceTotal(s0, "c", M, 10.5), /maior que zero/);
  assert.throws(() => setInvoiceTotal(s0, "x", M, 100), /Cartão/);
  assert.throws(() => setInvoiceTotal(s0, "c", "2026-13", 100), /mês/);
  const part = payInvoice(s0, "c", M, "a", "2026-12-01", 9000);
  assert.throws(() => setInvoiceTotal(part, "c", M, 8000), /já pago/);
  assert.equal(invoice(setInvoiceTotal(part, "c", M, 9000), "c", M).due, 0);
});

test("O3a total ajustado sobrevive ao backup", () => {
  const s = setInvoiceTotal(base(), "c", M, 18250);
  const back = validateBackup(JSON.parse(JSON.stringify(s)));
  assert.equal(invoice(back, "c", M).total, 18250);
  const bad = JSON.parse(JSON.stringify(s));
  bad.cards[0].manualTotals[M] = -1;
  assert.throws(() => validateBackup(bad), /Cartão inválido/);
});

test("O3a análise por categoria e por tag; ajuste manual fecha a conta", () => {
  const s = base();
  assert.deepEqual(invoiceBreakdown(s, "c", M).map((r) => [r.name, r.amount]), [["Lazer", 10000], ["Mercado", 5000]]);
  const byTag = invoiceBreakdown(s, "c", M, "tag");
  assert.deepEqual(byTag.map((r) => [r.name, r.amount]), [["#lazer", 10000], ["#viagem", 10000], ["Sem tag", 5000]]);
  const adj = invoiceBreakdown(setInvoiceTotal(s, "c", M, 18250), "c", M);
  assert.equal(adj.find((r) => r.name === "Ajuste manual").amount, 3250);
  assert.equal(adj.reduce((n, r) => n + r.amount, 0), 18250);
  assert.ok(adj.every((r) => r.share >= 0 && r.share <= 1));
});

test("O3a estorno no cartão abate a categoria na análise", () => {
  let s = base();
  s = addTransaction(s, { type: "expense", amount: 2000, date: "2026-11-09", description: "Devolução", category: "Lazer", cardId: "c", refund: true });
  assert.equal(invoiceBreakdown(s, "c", M).find((r) => r.name === "Lazer").amount, 8000);
});

test("O3a escolher a fatura da compra: anterior, próxima e parcelas acompanham", () => {
  const card = base().cards[0];
  assert.equal(chosenInvoiceMonth(card, "2026-11-09"), "2026-12");
  assert.equal(chosenInvoiceMonth(card, "2026-11-09", -1), "2026-11");
  assert.equal(chosenInvoiceMonth(card, "2026-11-09", 1), "2027-01");
  assert.equal(chosenInvoiceMonth(card, "2026-11-09x"), "");
  const s0 = base();
  const prev = addTransaction(s0, { type: "expense", amount: 9000, date: "2026-11-09", description: "Antiga", category: "Outros", cardId: "c", invoiceMonth: "2026-11", installments: 3 });
  const rows = prev.transactions.filter((t) => t.description === "Antiga");
  assert.deepEqual(rows.map((t) => t.invoiceMonth), ["2026-11", "2026-12", "2027-01"]);
  assert.equal(invoice(prev, "c", "2026-11").total, 3000);
  assert.equal(invoiceShiftOf(card, rows[0]), -1);
  assert.equal(invoiceShiftOf(card, s0.transactions[0]), 0);
  assert.throws(() => addTransaction(s0, { type: "expense", amount: 100, date: "2026-11-09", description: "x", category: "Outros", cardId: "c", invoiceMonth: "2026-13" }), /Fatura inválida/);
});
