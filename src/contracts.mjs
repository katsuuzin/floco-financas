// Financiamentos e empréstimos (D1/D2). Valores em centavos; taxa em % ao mês.
//
// Cada contrato gera parcelas como lançamentos pendentes com `financingId`.
// Pagar uma parcela é confirmar o lançamento. Os campos `interest`,
// `amortization` e `balanceAfter` permitem mostrar o saldo devedor.
//
// Métodos:
//  - fixed: todas as parcelas iguais; não pede taxa; saldo = soma das parcelas em aberto.
//  - price: parcela constante; separa juros e amortização. Pede taxa e a parcela
//           (o saldo devedor é derivado) ou o saldo devedor (a parcela é derivada).
//  - sac:   amortização constante, parcela decrescente. Pede taxa e saldo devedor.
// `insurance` é um valor mensal fixo (seguros/tarifas) somado a cada parcela.
import { uid, today, isDate, addMonths } from "./finance.mjs";

const fail = (m) => {
  throw Error(m);
};
const cents = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 99999999999;
const METHODS = ["fixed", "price", "sac"];

export const methodLabel = { fixed: "Parcela fixa", price: "Price", sac: "SAC" };

// Valor presente de uma série de `n` pagamentos `pmt` à taxa `i`.
const pv = (pmt, i, n) => (i ? Math.round((pmt * (1 - Math.pow(1 + i, -n))) / i) : pmt * n);
const pmtOf = (principal, i, n) =>
  i ? Math.round((principal * i) / (1 - Math.pow(1 + i, -n))) : Math.ceil(principal / n);

// Cronograma das `n` parcelas restantes a partir do número `first`.
export function schedule({ method = "fixed", installment = 0, principal = 0, rate = 0, insurance = 0, count, first = 1, date }) {
  if (!METHODS.includes(method)) fail("Cálculo desconhecido.");
  const n = count - first + 1;
  if (!Number.isInteger(n) || n < 1 || n > 420) fail("Confira o número de parcelas.");
  if (!isDate(date)) fail("Confira a data da próxima parcela.");
  if (!Number.isFinite(rate) || rate < 0 || rate > 30) fail("A taxa deve estar entre 0% e 30% ao mês.");
  if (!cents(insurance)) fail("Confira o valor dos seguros.");
  const i = rate / 100;
  const rows = [];
  if (method === "fixed") {
    if (!cents(installment) || !installment) fail("Informe o valor da parcela.");
    let left = installment * n;
    for (let k = 0; k < n; k++) {
      left -= installment;
      rows.push({ number: first + k, date: addMonths(date, k), amount: installment + insurance, interest: 0, amortization: installment, insurance, balanceAfter: left });
    }
    return rows;
  }
  if (method === "price") {
    if (!i) fail("O cálculo Price pede a taxa do contrato.");
    let balance = principal || pv(installment, i, n);
    const pmt = principal ? pmtOf(principal, i, n) : installment;
    if (!cents(balance) || !balance || !pmt) fail("Informe a parcela ou o saldo devedor.");
    for (let k = 0; k < n; k++) {
      const interest = Math.round(balance * i);
      const amortization = k === n - 1 ? balance : Math.min(balance, pmt - interest);
      if (amortization <= 0) fail("A parcela não cobre os juros. Confira a taxa e o valor.");
      balance -= amortization;
      rows.push({ number: first + k, date: addMonths(date, k), amount: amortization + interest + insurance, interest, amortization, insurance, balanceAfter: balance });
    }
    return rows;
  }
  // SAC
  if (!i) fail("O cálculo SAC pede a taxa do contrato.");
  if (!cents(principal) || !principal) fail("O cálculo SAC pede o saldo devedor.");
  let balance = principal;
  const base = Math.floor(principal / n);
  const extra = principal % n;
  for (let k = 0; k < n; k++) {
    const interest = Math.round(balance * i);
    const amortization = base + (k < extra ? 1 : 0);
    balance -= amortization;
    rows.push({ number: first + k, date: addMonths(date, k), amount: amortization + interest + insurance, interest, amortization, insurance, balanceAfter: balance });
  }
  return rows;
}

const installmentTx = (contract, r) => ({
  id: uid(),
  financingId: contract.id,
  type: "expense",
  amount: r.amount,
  description: `${contract.name} · ${r.number}/${contract.count}`,
  date: r.date,
  accountId: contract.accountId,
  category: contract.category,
  confirmed: false,
  installment: r.number,
  installments: contract.count,
  interest: r.interest,
  amortization: r.amortization,
  balanceAfter: r.balanceAfter,
});

function validate(s, input) {
  const count = Number(input.count);
  const paid = Number(input.paid || 0);
  if (!input.name?.trim()) fail("Dê um nome ao contrato.");
  if (!Number.isInteger(count) || count < 1 || count > 420) fail("O contrato deve ter de 1 a 420 parcelas.");
  if (!Number.isInteger(paid) || paid < 0 || paid >= count) fail("Parcelas já pagas devem ser menos que o total.");
  if (!isDate(input.date)) fail("Informe a data da próxima parcela.");
  if (!s.accounts.some((a) => a.id === input.accountId)) fail("Selecione a conta de pagamento.");
  return { count, paid };
}

export function saveContract(s, input) {
  const { count, paid } = validate(s, input);
  const contract = {
    id: uid(),
    name: input.name.trim(),
    institution: input.institution?.trim() || "",
    type: input.type === "loan" ? "loan" : "financing",
    method: METHODS.includes(input.method) ? input.method : "fixed",
    amount: input.installment || 0,
    principal: input.principal || 0,
    rate: Number(input.rate) || 0,
    insurance: input.insurance || 0,
    count,
    paid,
    date: input.date,
    accountId: input.accountId,
    category: input.category || "Outros",
    createdAt: today(),
  };
  const rows = schedule({ ...contract, installment: contract.amount, first: paid + 1 });
  contract.amount = rows[0].amount - contract.insurance;
  if (!contract.principal) contract.principal = rows[0].balanceAfter + rows[0].amortization;
  return {
    ...s,
    financings: [...(s.financings || []), contract],
    transactions: [...s.transactions, ...rows.map((r) => installmentTx(contract, r))],
  };
}

export const contractRows = (s, id) =>
  s.transactions
    .filter((t) => t.financingId === id && !t.partOf)
    .sort((a, b) => a.installment - b.installment || a.date.localeCompare(b.date));

export function contractStatus(s, id) {
  const c = (s.financings || []).find((f) => f.id === id);
  if (!c) fail("Contrato não encontrado.");
  const rows = contractRows(s, id);
  const open = rows.filter((t) => !t.confirmed);
  const done = rows.filter((t) => t.confirmed);
  const parts = s.transactions.filter((t) => t.financingId === id && t.partOf && t.confirmed);
  const lastPaid = done[done.length - 1];
  // Saldo devedor: amortização ainda não paga (ou soma das parcelas, no fixo).
  // Pagamento parcial quita primeiro juros e seguro da parcela; só o excedente amortiza.
  const debt = open.reduce(
    (n, t) => n + (t.amortization ?? t.amount) - Math.max(0, (t.paidPart || 0) - (t.interest || 0) - (t.insurance || 0)),
    0,
  );
  return {
    contract: { method: "fixed", rate: 0, insurance: 0, ...c },
    // Abatimento e quitação são pagamentos extras: contam em "já pago", não como parcela paga.
    paidCount: (c.paid || 0) + done.filter((t) => !t.extra && !t.settlement).length,
    openCount: open.length,
    debt: Math.max(0, debt),
    paidTotal: done.reduce((n, t) => n + t.amount, 0) + parts.reduce((n, t) => n + t.amount, 0),
    interestPaid: done.reduce((n, t) => n + (t.interest || 0), 0),
    next: open[0] || null,
    lastPaid: lastPaid || null,
    finished: open.length === 0,
  };
}

// Troca o método (ou a taxa/saldo) refazendo só as parcelas em aberto.
export function changeMethod(s, id, input) {
  const c = (s.financings || []).find((f) => f.id === id);
  if (!c) fail("Contrato não encontrado.");
  const open = contractRows(s, id).filter((t) => !t.confirmed);
  if (!open.length) fail("Este contrato já está quitado.");
  if (open.some((t) => t.paidPart)) fail("Há parcela com pagamento parcial. Conclua ou estorne antes de trocar o cálculo.");
  const status = contractStatus(s, id);
  const method = METHODS.includes(input.method) ? input.method : c.method || "fixed";
  const next = {
    ...c,
    method,
    rate: input.rate ?? c.rate ?? 0,
    insurance: input.insurance ?? c.insurance ?? 0,
  };
  const rows = schedule({
    method,
    installment: method === "fixed" ? input.installment || open[0].amount - (c.insurance || 0) : method === "price" && !input.principal ? input.installment || 0 : 0,
    principal: method === "fixed" ? 0 : input.principal || (method === "sac" ? status.debt : 0),
    rate: next.rate,
    insurance: next.insurance,
    count: c.count,
    first: open[0].installment,
    date: open[0].date,
  });
  const drop = new Set(open.map((t) => t.id));
  next.amount = rows[0].amount - next.insurance;
  return {
    ...s,
    financings: s.financings.map((f) => (f.id === id ? next : f)),
    transactions: [...s.transactions.filter((t) => !drop.has(t.id)), ...rows.map((r) => installmentTx(next, r))],
  };
}

// Pagamento parcial de uma parcela (empréstimos): cria um lançamento confirmado e
// reduz o valor pendente da parcela. Quando a soma atinge a parcela, ela é quitada.
export function payPart(s, txId, amount, accountId, date = today()) {
  const t = s.transactions.find((x) => x.id === txId);
  if (!t?.financingId || t.confirmed) fail("Escolha uma parcela em aberto.");
  const remaining = t.amount - (t.paidPart || 0);
  if (!cents(amount) || !amount || amount > remaining) fail("O valor deve ficar entre um centavo e o que falta da parcela.");
  if (!isDate(date)) fail("Confira a data do pagamento.");
  if (!s.accounts.some((a) => a.id === accountId)) fail("Selecione a conta.");
  if (amount === remaining && !t.paidPart)
    return { ...s, transactions: s.transactions.map((x) => (x.id === txId ? { ...x, confirmed: true, date, accountId } : x)) };
  const part = {
    id: uid(),
    financingId: t.financingId,
    partOf: t.id,
    type: "expense",
    amount,
    description: `${t.description} · pagamento parcial`,
    date,
    accountId,
    category: t.category,
    confirmed: true,
  };
  const paidPart = (t.paidPart || 0) + amount;
  // Ao completar, a parcela vira só o que faltava (o resto já saiu em partes).
  const updated =
    paidPart === t.amount
      ? { ...t, amount: amount, paidPart: 0, confirmed: true, date, accountId, settledByParts: true }
      : { ...t, paidPart };
  const transactions = s.transactions.map((x) => (x.id === txId ? updated : x));
  return { ...s, transactions: paidPart === t.amount ? transactions : [...transactions, part] };
}

// Juros/multa por atraso somados a uma parcela em aberto.
export function addLateFee(s, txId, amount) {
  const t = s.transactions.find((x) => x.id === txId);
  if (!t?.financingId || t.confirmed) fail("Escolha uma parcela em aberto.");
  if (!cents(amount) || !amount) fail("Informe o valor dos juros por atraso.");
  return {
    ...s,
    transactions: s.transactions.map((x) =>
      x.id === txId ? { ...x, amount: x.amount + amount, lateFee: (x.lateFee || 0) + amount, interest: (x.interest || 0) + amount } : x,
    ),
  };
}

// Amortização extraordinária: abate o saldo devedor com o valor pago (`amount`).
// mode "term": mantém a parcela e elimina as últimas; "payment": mantém o prazo e reduz a parcela.
// opts.offApp: o dinheiro veio de fora (FGTS etc.): vale para o contrato, mas nenhuma conta é debitada.
// opts.newDebt: saldo devedor informado pelo banco; sem ele, vale saldo atual − valor pago.
// Cada abatimento fica em `contract.amortizations`, para o histórico do contrato.
/** @param {any} [opts] */
export function extraAmortization(s, id, amount, accountId, date = today(), mode = "term", opts = {}) {
  const st = contractStatus(s, id);
  const c = st.contract;
  const offApp = !!opts.offApp;
  const informed = opts.newDebt !== undefined && opts.newDebt !== null;
  if (!cents(amount) || !amount) fail("Informe o valor pago no abatimento.");
  if (!isDate(date)) fail("Confira a data do abatimento.");
  if (informed) {
    if (!cents(opts.newDebt) || !opts.newDebt || opts.newDebt >= st.debt)
      fail("O novo saldo devedor precisa ser maior que zero e menor que o atual. Para zerar, use Quitar contrato.");
  } else if (amount >= st.debt) fail("Para pagar todo o saldo, use Quitar contrato.");
  if (!offApp && !s.accounts.some((a) => a.id === accountId)) fail("Selecione a conta.");
  const open = contractRows(s, id).filter((t) => !t.confirmed);
  if (open.some((t) => t.paidPart)) fail("Conclua o pagamento parcial em aberto antes.");
  const entry = {
    id: uid(),
    date,
    amount,
    mode,
    offApp,
    ...(offApp ? {} : { accountId }),
    debtBefore: st.debt,
    debtAfter: informed ? opts.newDebt : st.debt - amount,
    ...(opts.note?.trim() ? { note: opts.note.trim().slice(0, 200) } : {}),
  };
  const payment = {
    id: uid(),
    financingId: id,
    extra: true,
    type: "expense",
    amount,
    description: `${c.name} · amortização extraordinária`,
    date,
    accountId,
    category: c.category,
    confirmed: true,
  };
  const remainingDebt = entry.debtAfter;
  const tail = offApp ? [] : [payment];
  const withHistory = (fs, count) =>
    fs.map((f) => (f.id === id ? { ...f, ...(count ? { count } : {}), amortizations: [...(f.amortizations || []), entry] } : f));
  let rows;
  if (c.method === "fixed") {
    // Sem taxa: abate parcelas inteiras do fim (prazo) ou divide o restante (parcela).
    const per = open[0].amount - (c.insurance || 0);
    if (mode === "term") {
      const keep = Math.ceil(remainingDebt / per);
      rows = open.slice(0, keep).map((t, k) => ({
        ...t,
        amount: (k === keep - 1 ? remainingDebt - per * (keep - 1) : per) + (c.insurance || 0),
        amortization: k === keep - 1 ? remainingDebt - per * (keep - 1) : per,
      }));
      const drop = new Set(open.map((t) => t.id));
      return { ...s, financings: withHistory(s.financings), transactions: [...s.transactions.filter((t) => !drop.has(t.id)), ...rows, ...tail] };
    }
    const n = open.length;
    const base = Math.floor(remainingDebt / n), extra = remainingDebt % n;
    rows = open.map((t, k) => ({ ...t, amount: base + (k < extra ? 1 : 0) + (c.insurance || 0), amortization: base + (k < extra ? 1 : 0) }));
    const drop = new Set(open.map((t) => t.id));
    return { ...s, financings: withHistory(s.financings), transactions: [...s.transactions.filter((t) => !drop.has(t.id)), ...rows, ...tail] };
  }
  const i = c.rate / 100;
  const pmt = open[0].amount - (c.insurance || 0);
  let n = open.length;
  if (mode === "term" && c.method === "price") {
    // Número de parcelas necessário para pagar o novo saldo com a mesma parcela.
    n = Math.max(1, Math.ceil(-Math.log(1 - (remainingDebt * i) / pmt) / Math.log(1 + i)));
  } else if (mode === "term" && c.method === "sac") {
    const amort = open[0].amortization;
    n = Math.max(1, Math.ceil(remainingDebt / amort));
  }
  const first = open[0].installment;
  if (mode === "term" && c.method === "price") {
    // Mesma parcela; a última fica menor para fechar o saldo exato.
    const sched = [];
    let balance = remainingDebt;
    for (let k = 0; balance > 0 && k < 420; k++) {
      const interest = Math.round(balance * i);
      const amortization = Math.min(balance, pmt - interest);
      balance -= amortization;
      sched.push({ number: first + k, date: addMonths(open[0].date, k), amount: amortization + interest + (c.insurance || 0), interest, amortization, insurance: c.insurance || 0, balanceAfter: balance });
    }
    const next = { ...c, count: first - 1 + sched.length };
    const drop = new Set(open.map((t) => t.id));
    return {
      ...s,
      financings: withHistory(s.financings, next.count),
      transactions: [...s.transactions.filter((t) => !drop.has(t.id)), ...sched.map((r) => installmentTx(next, r)), ...tail],
    };
  }
  const sched = schedule({
    method: c.method,
    principal: remainingDebt,
    rate: c.rate,
    insurance: c.insurance || 0,
    count: first + n - 1,
    first,
    date: open[0].date,
  });
  const next = { ...c, count: first - 1 + n };
  const drop = new Set(open.map((t) => t.id));
  return {
    ...s,
    financings: withHistory(s.financings, next.count),
    transactions: [...s.transactions.filter((t) => !drop.has(t.id)), ...sched.map((r) => installmentTx(next, r)), ...tail],
  };
}

// Prévia "vai ficar assim" de uma alteração já aplicada a uma cópia do estado: quantas parcelas
// restam, quando é a última e quanto falta pagar.
export function previewOf(s, id) {
  const open = contractRows(s, id).filter((t) => !t.confirmed);
  return {
    openCount: open.length,
    lastDate: open.at(-1)?.date || "",
    total: open.reduce((n, t) => n + t.amount - (t.paidPart || 0), 0),
    next: open[0] ? open[0].amount - (open[0].paidPart || 0) : 0,
    debt: contractStatus(s, id).debt,
  };
}

// Quitação: um pagamento único do saldo devedor e as parcelas em aberto somem.
export function settleContract(s, id, accountId, date = today(), amount) {
  const st = contractStatus(s, id);
  if (st.finished) fail("Este contrato já está quitado.");
  if (!s.accounts.some((a) => a.id === accountId)) fail("Selecione a conta.");
  const value = amount ?? st.debt;
  if (!cents(value) || !value) fail("Informe o valor da quitação.");
  const open = contractRows(s, id).filter((t) => !t.confirmed);
  const drop = new Set(open.map((t) => t.id));
  return {
    ...s,
    financings: s.financings.map((f) => (f.id === id ? { ...f, settledAt: date } : f)),
    transactions: [
      ...s.transactions.filter((t) => !drop.has(t.id) && !(t.partOf && drop.has(t.partOf))),
      {
        id: uid(),
        financingId: id,
        settlement: true,
        type: "expense",
        amount: value,
        description: `${st.contract.name} · quitação`,
        date,
        accountId,
        category: st.contract.category,
        confirmed: true,
      },
    ],
  };
}

// Exclui um contrato sem pagamentos; com histórico, só arquiva.
export function removeContract(s, id) {
  const has = s.transactions.some((t) => t.financingId === id && t.confirmed);
  if (has)
    return { ...s, financings: s.financings.map((f) => (f.id === id ? { ...f, archived: true } : f)) };
  return {
    ...s,
    financings: s.financings.filter((f) => f.id !== id),
    transactions: s.transactions.filter((t) => t.financingId !== id),
  };
}
