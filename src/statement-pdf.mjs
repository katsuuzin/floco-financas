import { isDate, parseMoney } from "./finance.mjs";
const months = {
  JAN: "01",
  FEV: "02",
  MAR: "03",
  ABR: "04",
  MAI: "05",
  JUN: "06",
  JUL: "07",
  AGO: "08",
  SET: "09",
  OUT: "10",
  NOV: "11",
  DEZ: "12",
};
const cents = (s) =>
  /^[-+]?0,00$/.test(s.replace(/\s/g, ""))
    ? 0
    : parseMoney(s.replace(/[+\s-]/g, "")) * (s.includes("-") ? -1 : 1);
export function parsePDFStatement(text) {
  if (text.length > 500000) throw Error("Documento muito extenso.");
  if (!/nubank|nu pagamentos|nu financeira/i.test(text)) return parseGenericPDF(text);
  const rows = [],
    daily = [];
  let date = "";
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim().replace(/\s+/g, " ");
    const d = /^(\d{2}) ([A-Z]{3}) (\d{4})\b/i.exec(line);
    if (d) {
      date = `${d[3]}-${months[d[2].toUpperCase()] || "00"}-${d[1]}`;
      if (!isDate(date)) throw Error("Data inválida no extrato.");
      line = line.slice(d[0].length).trim();
    }
    const total =
      /^Total de (entradas|sa[ií]das)\s+([+-]?\s*[\d.]+,\d{2})$/i.exec(line);
    if (total && date) {
      daily.push({
        date,
        type: /entrada/i.test(total[1]) ? "income" : "expense",
        amount: Math.abs(cents(total[2])),
      });
      continue;
    }
    if (
      !/^(compra no d[eé]bito|transfer[eê]ncia (?:enviada|recebida)|d[eé]bito em conta|pagamento\b|pix (?:enviado|recebido))/i.test(
        line,
      )
    )
      continue;
    const m = /^(.*?)\s+([+-]?\s*[\d.]+,\d{2})$/.exec(line);
    if (!m || !date)
      throw Error(
        "Movimentação incompleta no PDF. Importe o CSV ou OFX para evitar omissões.",
      );
    rows.push({
      sourceLine: rows.length + 1,
      date,
      description: m[1],
      amount: Math.abs(cents(m[2])),
      type: /recebida|recebido/i.test(m[1]) ? "income" : "expense",
      category: "Outros",
      sourceFormat: "pdf",
    });
  }
  if (!rows.length) throw Error("Nenhuma movimentação reconhecida no PDF.");
  for (const group of daily) {
    const sum = rows
      .filter((r) => r.date === group.date && r.type === group.type)
      .reduce((s, r) => s + r.amount, 0);
    if (sum !== group.amount)
      throw Error(
        "As movimentações reconhecidas não conferem com o total diário do PDF. Use CSV ou OFX.",
      );
  }
  const initial = /Saldo inicial\s+([+-]?\s*[\d.]+,\d{2})/i.exec(text);
  const final = /Saldo final do per[ií]odo\s+([+-]?\s*[\d.]+,\d{2})/i.exec(
    text,
  );
  const income = rows
      .filter((r) => r.type === "income")
      .reduce((s, r) => s + r.amount, 0),
    expense = rows
      .filter((r) => r.type === "expense")
      .reduce((s, r) => s + r.amount, 0);
  const openingBalance = initial ? cents(initial[1]) : null,
    closingBalance = final ? cents(final[1]) : null;
  if (openingBalance === null || closingBalance === null)
    throw Error("Não foi possível conferir os saldos do PDF. Use CSV ou OFX.");
  if (
    openingBalance !== null &&
    closingBalance !== null &&
    openingBalance + income - expense !== closingBalance
  )
    throw Error(
      "Saldo inicial, movimentações e saldo final do PDF não conferem. Use CSV ou OFX.",
    );
  return {
    rows,
    summary: {
      openingBalance,
      closingBalance,
      income,
      expense,
      verified: openingBalance !== null && closingBalance !== null,
    },
  };
}

// F1: extratos de outros bancos com uma linha por movimento: "DD/MM[/AAAA] descrição valor [D|C] [saldo]".
// Só aceita quando consegue conferir: saldo anterior + movimentos = saldo final, ou a coluna de saldo
// bate linha a linha. Sem conferência, pede CSV/OFX para não importar com omissões.
const MONEY = String.raw`[-+]?\s?(?:R\$\s?)?-?[\d.]+,\d{2}`;
const LINE = new RegExp(String.raw`^(\d{2})\/(\d{2})(?:\/(\d{2,4}))?\s+(.+?)\s+(${MONEY})\s?([DC])?(?:\s+(${MONEY})\s?([DC])?)?$`, "i");
const signed = (value, flag) => {
  const v = Math.abs(cents(value.replace(/R\$\s?/g, "")));
  if (/^C$/i.test(flag || "")) return v;
  if (/^D$/i.test(flag || "") || /-/.test(value)) return -v;
  if (/\+/.test(value)) return v;
  return null;
};
const OUT = /enviad|pagamento|pagto|compra|d[eé]bito|saque|tarifa|boleto pago|\bpix env/i;
const IN = /recebid|cr[eé]dito|dep[oó]sito|estorno|rendimento|sal[aá]rio|\bpix rec/i;

export function parseGenericPDF(text) {
  const fallbackYear = (/\b\d{2}\/\d{2}\/(\d{4})\b/.exec(text) || [])[1] || String(new Date().getFullYear());
  const rows = [];
  let opening = null;
  let closing = null;
  let running = null;
  let checks = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/\s+/g, " ");
    const m = LINE.exec(line);
    if (!m) {
      const saldo = new RegExp(String.raw`^saldo (anterior|inicial|final|atual|do dia|em \d{2}\/\d{2}(?:\/\d{2,4})?)\D*?(${MONEY})\s?([DC])?$`, "i").exec(line);
      if (saldo) {
        const v = signed(saldo[2], saldo[3]) ?? Math.abs(cents(saldo[2].replace(/R\$\s?/g, "")));
        if (/anterior|inicial/i.test(saldo[1]) && opening === null) opening = v;
        else closing = v;
        if (running === null && opening !== null) running = opening;
      }
      continue;
    }
    const [, dd, mm, yy, desc, value, flag, bal, balFlag] = m;
    if (/^saldo\b/i.test(desc)) {
      const v = signed(value, flag) ?? Math.abs(cents(value.replace(/R\$\s?/g, "")));
      if (opening === null && rows.length === 0) opening = running = v;
      else closing = v;
      continue;
    }
    let amount = signed(value, flag);
    if (amount === null) {
      if (OUT.test(desc)) amount = -Math.abs(cents(value));
      else if (IN.test(desc)) amount = Math.abs(cents(value));
      else throw Error(`Não deu para saber se "${desc}" é entrada ou saída. Use CSV ou OFX deste banco.`);
    }
    const year = !yy ? fallbackYear : yy.length === 2 ? "20" + yy : yy;
    const date = `${year}-${mm}-${dd}`;
    if (!isDate(date)) throw Error("Data inválida no extrato.");
    if (bal) {
      const b = signed(bal, balFlag) ?? Math.abs(cents(bal.replace(/R\$\s?/g, "")));
      if (running !== null) {
        if (running + amount !== b) throw Error("A coluna de saldo do PDF não confere com as movimentações. Use CSV ou OFX.");
        checks++;
      }
      running = b;
      closing = b;
    } else if (running !== null) running += amount;
    rows.push({
      sourceLine: rows.length + 1,
      date,
      description: desc,
      amount: Math.abs(amount),
      type: amount > 0 ? "income" : "expense",
      category: "Outros",
      sourceFormat: "pdf",
    });
  }
  if (!rows.length) throw Error("Formato de extrato PDF não reconhecido. Use CSV ou OFX deste banco.");
  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
  const balanced = opening !== null && closing !== null && opening + income - expense === closing;
  if (!balanced && checks < rows.length)
    throw Error("Não foi possível conferir os saldos do PDF. Use CSV ou OFX.");
  return {
    rows,
    summary: { openingBalance: opening, closingBalance: closing, income, expense, verified: true },
  };
}
