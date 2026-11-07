import { addTransaction, parseMoney } from "./finance.mjs";
export function suggestNotification(row) {
  const content = row.title + " " + row.text;
  const values = [
    ...content.matchAll(/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2}))/g),
  ].map((m) => m[1]);
  const incoming = /recebid[oa]|recebeu|entrou/i.test(content);
  const outgoing = /compra|pagamento|enviad[oa]|transferiu|d[eé]bito/i.test(
    content,
  );
  const d = new Date(row.postedAt);
  const date = Number.isFinite(d.getTime())
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "";
  return {
    description: row.title || row.bank,
    amount: values.length === 1 ? values[0] : "",
    type: incoming && !outgoing ? "income" : "expense",
    date,
    ambiguous: values.length !== 1 || incoming === outgoing,
  };
}
export function importNotification(s, row, input) {
  if (s.transactions.some((t) => t.notificationId === row.id)) return s;
  const next = addTransaction(s, {
    ...input,
    amount: parseMoney(input.amount),
    confirmed: true,
  });
  const ids = new Set(s.transactions.map((t) => t.id));
  return {
    ...next,
    transactions: next.transactions.map((t) =>
      ids.has(t.id) ? t : { ...t, notificationId: row.id },
    ),
  };
}
