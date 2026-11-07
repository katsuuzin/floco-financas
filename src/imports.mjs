import { isDate, parseMoney, addTransaction } from "./finance.mjs";
import { categorize } from "./rules.mjs";
const normalize = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const dateOf = (s) => {
  const t = String(s).trim();
  if (isDate(t)) return t;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  const d = m ? `${m[3]}-${m[2]}-${m[1]}` : "";
  if (!isDate(d)) throw Error("Data inválida: " + t);
  return d;
};
export function csvRows(text, separator = ";") {
  if (text.length > 10 * 1024 * 1024)
    throw Error("Limite de 10 MB por arquivo.");
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted || cell === "") quoted = !quoted;
      else throw Error("Aspas inválidas no CSV.");
    } else if (!quoted && (ch === separator || ch === "\n")) {
      row.push(cell.replace(/\r$/, ""));
      cell = "";
      if (ch === "\n") {
        if (row.some((x) => x.trim())) rows.push(row);
        row = [];
      }
    } else cell += ch;
    if (rows.length > 10000) throw Error("Importe até 10 mil linhas por vez.");
  }
  if (quoted) throw Error("Aspas não fechadas no CSV.");
  row.push(cell.replace(/\r$/, ""));
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
export function parseCSV(text, separator = ";") {
  const rows = csvRows(text.replace(/^\uFEFF/, ""), separator),
    headers = (rows.shift() || []).map(normalize);
  const find = (...names) => headers.findIndex((h) => names.includes(h));
  const cols = {
    date: find("data", "date"),
    description: find("descricao", "description", "historico"),
    amount: find("valor (r$)", "valor", "amount"),
    type: find("tipo", "type"),
    category: find("categoria", "category"),
  };
  if ([cols.date, cols.description, cols.amount].some((i) => i < 0))
    throw Error(
      "Use cabeçalhos Data;Descrição;Valor (R$);Tipo;Categoria. Tipo e Categoria são opcionais.",
    );
  return rows.map((r, i) => {
    try {
      const value = r[cols.amount]?.trim().replace(/^R\$\s*/, "") || "";
      const negative = value.startsWith("-");
      const amount = parseMoney(value.replace(/^[-+]/, ""));
      const kind = normalize(r[cols.type] || "");
      if (["transfer", "transferencia"].includes(kind))
        throw Error(
          "Transferências precisam ser registradas entre duas contas no Floco.",
        );
      const type = ["income", "receita", "entrada", "credito"].includes(kind)
        ? "income"
        : ["expense", "despesa", "saida", "debito"].includes(kind) || negative
          ? "expense"
          : kind
            ? (() => {
                throw Error("Tipo inválido");
              })()
            : "expense";
      return {
        sourceLine: i + 2,
        date: dateOf(r[cols.date]),
        description: r[cols.description]?.trim(),
        amount,
        type,
        category: r[cols.category]?.trim() || "Outros",
      };
    } catch (e) {
      return { sourceLine: i + 2, error: e.message };
    }
  });
}
const unescapeXML = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
export function parseOFX(text) {
  if (text.length > 10 * 1024 * 1024)
    throw Error("Limite de 10 MB por arquivo.");
  const records = [...text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];
  if (!records.length)
    throw Error("Nenhum lançamento STMTTRN encontrado no OFX.");
  if (records.length > 10000) throw Error("Importe até 10 mil linhas por vez.");
  return records.map((match, i) => {
    const read = (tag) =>
      unescapeXML(
        new RegExp("<" + tag + ">([^<\\r\\n]*)", "i")
          .exec(match[1])?.[1]
          ?.trim() || "",
      );
    try {
      const raw = read("TRNAMT");
      if (!/^-?\d+(?:\.\d{1,2})?$/.test(raw)) throw Error("Valor OFX inválido");
      const amount = parseMoney(raw.replace(/^-/, "").replace(".", ","));
      const d = read("DTPOSTED").slice(0, 8);
      const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      if (!isDate(date)) throw Error("Data OFX inválida");
      return {
        sourceLine: i + 1,
        date,
        description: read("MEMO") || read("NAME") || "Movimentação OFX",
        amount,
        type: raw.startsWith("-") ? "expense" : "income",
        category: "Outros",
        externalId: read("FITID"),
      };
    } catch (e) {
      return { sourceLine: i + 1, error: e.message };
    }
  });
}
export function importRows(state, rows, accountId) {
  if (!state.accounts.some((a) => a.id === accountId))
    throw Error("Escolha a conta de destino.");
  if (!rows.length || rows.some((r) => r.error))
    throw Error("Selecione apenas linhas válidas para importar.");
  let s = state;
  for (const row of rows) {
    const key = row.externalId ? `${accountId}:ofx:${row.externalId}` : null;
    if (key && s.transactions.some((t) => t.importKey === key)) continue;
    const old = new Set(s.transactions.map((t) => t.id));
    const rule = !row.category || row.category === "Outros" ? categorize(s, row.description, row.type) : null;
    s = addTransaction(s, { ...row, ...(rule ? { category: rule.category } : {}), accountId, confirmed: true });
    s = {
      ...s,
      transactions: s.transactions.map((t) =>
        old.has(t.id) ? t : { ...t, ...(key ? { importKey: key } : {}) },
      ),
    };
  }
  return s;
}
export function possibleDuplicate(state, row, accountId) {
  return state.transactions.some(
    (t) =>
      t.accountId === accountId &&
      t.date === row.date &&
      t.amount === row.amount &&
      t.type === row.type,
  );
}
