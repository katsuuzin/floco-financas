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
  if (!/nubank|nu pagamentos|nu financeira/i.test(text))
    throw Error(
      "Formato de extrato PDF não reconhecido. Use CSV ou OFX deste banco.",
    );
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
