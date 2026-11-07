import { addTransaction, parseMoney } from "./finance.mjs";
import { categorize } from "./rules.mjs";

// Tipos lidos do texto do banco.
export const KIND_LABEL = {
  card: "Compra no cartão",
  pixOut: "Pix enviado",
  pixIn: "Pix recebido",
  transferOut: "Transferência enviada",
  transferIn: "Transferência recebida",
  bill: "Pagamento de conta",
  debit: "Compra no débito",
  income: "Entrada",
  expense: "Saída",
};

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
const cut = (s) => clean(s).replace(/[.,;!]+$/, "").slice(0, 80);

function classify(content) {
  const c = content.toLowerCase();
  if (/pix/.test(c) && /recebid|recebeu|te enviou|chegou/.test(c)) return "pixIn";
  if (/pix/.test(c) && /enviad|enviou|realizad|feito|pago|pagou|transfer/.test(c)) return "pixOut";
  if (/transfer[eê]ncia/.test(c) && /recebid|recebeu/.test(c)) return "transferIn";
  if (/transfer[eê]ncia/.test(c)) return "transferOut";
  if (/boleto|conta paga|pagamento de conta/.test(c)) return "bill";
  if (/d[eé]bito/.test(c) && /compra/.test(c)) return "debit";
  if (/compra|cart[aã]o|cr[eé]dito|aprovad/.test(c)) return "card";
  if (/recebid|recebeu|dep[oó]sito|entrou|cr[eé]ditad/.test(c)) return "income";
  return "expense";
}

// Comerciante ou pessoa, a partir dos padrões comuns dos bancos brasileiros.
function counterpart(content, kind) {
  const patterns =
    kind === "pixIn" || kind === "transferIn" || kind === "income"
      ? [/(?:de|por)\s+([A-ZÀ-Ú0-9][^.\n]{2,60}?)(?:\s+(?:no valor|via|com|em)\b|[.\n]|$)/i, /recebeu[^.]*?de\s+([^.\n]{3,60})/i]
      : [
          /\bem\s+([A-Z0-9*][^.\n]{2,60}?)(?:\s+(?:para o cart|no cart|com o cart|foi)|[.\n]|$)/,
          /para\s+([A-ZÀ-Ú0-9][^.\n]{2,60}?)(?:\s+(?:no valor|via|com|foi)\b|[.\n]|$)/i,
          /\bem\s+([^.\n]{3,60}?)(?:\s+(?:para o cart|no cart|com o cart)|[.\n]|$)/i,
        ];
  for (const p of patterns) {
    const m = p.exec(content);
    if (m) return cut(m[1]);
  }
  return "";
}

export function suggestNotification(row) {
  const content = clean(row.title + " " + row.text);
  const kind = classify(content);
  const values = [...content.matchAll(/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2}))/g)].map((m) => m[1]);
  // Com vários valores (ex.: compra + saldo/limite), o primeiro é o da operação.
  const amount = values[0] || "";
  const d = new Date(row.postedAt);
  const date = Number.isFinite(d.getTime())
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "";
  const time = Number.isFinite(d.getTime()) ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "";
  const lastFour = /final\s*(\d{4})/i.exec(content)?.[1] || "";
  const who = counterpart(content, kind);
  const income = ["pixIn", "transferIn", "income"].includes(kind);
  return {
    kind,
    kindLabel: KIND_LABEL[kind],
    description: who || cut(row.title) || row.bank,
    amount,
    type: income ? "income" : "expense",
    date,
    time,
    lastFour,
    notes: clean(row.text || row.title).slice(0, 500),
    ambiguous: !amount || values.length > 2,
  };
}

// Sugere conta e cartão pelo banco da notificação e pelo final do cartão.
export function guessTargets(s, row, suggestion) {
  const bank = String(row.bank || "").toLowerCase().replace(/^sms · /, "");
  const has = (x) => {
    const hay = `${x.name} ${x.institution || ""}`.toLowerCase();
    return bank && (hay.includes(bank) || bank.includes(x.name.toLowerCase()));
  };
  const cards = s.cards.filter((c) => !c.archived);
  const card =
    (suggestion.lastFour && cards.find((c) => c.lastFour === suggestion.lastFour)) || cards.find(has) || null;
  const accounts = s.accounts.filter((a) => !a.archived);
  const account = accounts.find((a) => has(a) && (a.holderType || "PF") === "PF") || accounts.find(has) || accounts[0] || null;
  return {
    cardId: suggestion.kind === "card" && card ? card.id : "",
    accountId: account?.id || "",
  };
}

// Sugestão completa para a tela de confirmação.
export function draftFromNotification(s, row) {
  const sug = suggestNotification(row);
  const targets = guessTargets(s, row, sug);
  const rule = categorize(s, sug.description, sug.type);
  return { ...sug, ...targets, category: rule?.category || (sug.type === "income" ? "Outros" : "Outros"), installments: "1", tags: [] };
}

export function importNotification(s, row, input) {
  if (s.transactions.some((t) => t.notificationId === row.id)) return s;
  const next = addTransaction(s, {
    ...input,
    amount: parseMoney(input.amount),
    installments: input.cardId ? Number(input.installments || 1) : 1,
    confirmed: true,
  });
  const ids = new Set(s.transactions.map((t) => t.id));
  return {
    ...next,
    transactions: next.transactions.map((t) => (ids.has(t.id) ? t : { ...t, notificationId: row.id })),
  };
}
