import { addTransaction, parseMoney } from "./finance.mjs";
import { categorize } from "./rules.mjs";
import { categoryNames, CATALOG } from "./categories.mjs";

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
  yield: "Rendimento recebido",
  denied: "Compra negada",
};

// Texto do tipo na folha de confirmação (direção da operação).
export const KIND_DETAIL = {
  card: "Compra no cartão de crédito",
  debit: "Compra no débito",
  pixOut: "Pix enviado",
  pixIn: "Pix recebido",
  transferOut: "Transferência enviada",
  transferIn: "Entrada na conta",
  bill: "Pagamento de conta",
  income: "Entrada na conta",
  expense: "Saída da conta",
  yield: "Entrada na conta",
  denied: "Compra negada",
};

const INCOME_KINDS = ["pixIn", "transferIn", "income", "yield"];

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
const cut = (s) => clean(s).replace(/[.,;!]+$/, "").slice(0, 80);

// Compra recusada pelo banco ou pelo emissor: nada foi cobrado, não vira lançamento.
const DENIED = /negad|recusad|reprovad|declinad|n[aã]o\s+(?:foi\s+)?(?:aprovad|autorizad|conclu[ií]d|efetivad)|n[aã]o\s+p[oô]de\s+ser\s+(?:conclu|realiz|process)/;
const MOVEMENT = /compra|pagamento|transa[cç][aã]o|cart[aã]o|d[eé]bito|cr[eé]dito|pix|transfer/;
// Proventos de investimento: rendimento de fundo, dividendo, JCP, "rendeu".
const YIELD = /rendimentos?|rendeu|dividendos?|\bjcp\b|juros sobre capital|proventos?/;

function classify(content) {
  const c = content.toLowerCase();
  if (DENIED.test(c) && MOVEMENT.test(c)) return "denied";
  if (YIELD.test(c) && /receb|cr[eé]dit|pag|rendeu/.test(c) && !/pix\s+(?:recebid|enviad)/.test(c)) return "yield";
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
const upperFirst = (x) => x.charAt(0).toUpperCase() + x.slice(1);

function counterpart(content, kind) {
  if (kind === "yield") {
    const m = /(rendimentos?|dividendos?|proventos?|juros sobre capital pr[oó]prio|jcp)\s+(?:do|da|de|dos)\s+(?:ativo\s+|fundo\s+|a[cç][aã]o\s+)?([A-Za-zÀ-ú0-9][^.\n]*?)(?:\s+(?:foram|foi|na|no|em|com|para|via)\b|[.\n]|$)/i.exec(content);
    return m ? upperFirst(cut(`${m[1]} ${/ativo\s/i.test(m[0]) ? "do ativo " : "de "}${m[2]}`)) : "Rendimentos";
  }
  const patterns =
    INCOME_KINDS.includes(kind)
      ? [/\b(?:de|por)\s+(?!R\$)([A-ZÀ-Ú][^.\n]{2,60}?)(?:\s+(?:no valor|via|com|em)\b|[.\n]|$)/i, /recebeu[^.]*?de\s+([^.\n]{3,60})/i]
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
  const income = INCOME_KINDS.includes(kind);
  return {
    kind,
    kindLabel: KIND_LABEL[kind],
    description: who || (/R\$/.test(row.title || "") ? KIND_LABEL[kind] : cut(row.title)) || row.bank,
    amount,
    type: income ? "income" : "expense",
    date,
    time,
    lastFour,
    notes: clean(row.text || row.title).slice(0, 500),
    ambiguous: !amount || values.length > 2,
  };
}

export const isDenied = (row) => suggestNotification(row).kind === "denied";

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
  // Rendimento: categoria do usuário que se pareça com rendimentos; sem ela, Investimentos › Juros / Rendimentos
  // (ou Dividendos, quando o aviso fala em dividendo).
  let category = rule?.category || "Outros";
  let subcategory = rule?.subcategory || "";
  if (sug.kind === "yield" && !rule) {
    const own = categoryNames(s).find((n) => /rendiment|dividend/i.test(n) && !CATALOG.some((c) => c.name === n));
    if (own) category = own;
    else {
      category = "Investimentos";
      subcategory = /dividend|jcp|juros sobre capital/i.test(sug.notes) ? "Dividendos" : "Juros / Rendimentos";
    }
  }
  return { ...sug, ...targets, category, subcategory, suggested: !!rule, installments: "1", tags: [] };
}

// A mesma operação pode chegar pelo app do banco e por SMS (mesmo valor, tipo e
// banco, até 10 minutos) ou em dois SMS de texto idêntico (até 5 minutos).
// Marca para revisão, sem apagar: duas operações legítimas podem ser iguais.
// SMS em conversa trazem mensagens anteriores e um resumo; compara as linhas com valor.
const moneyLines = (r) => new Set(String(r.text || "").split("\n").map((l) => l.trim().toLowerCase().replace(/\s+/g, " ")).filter((l) => l.includes("r$")));
const shareLine = (a, b) => [...moneyLines(a)].some((l) => moneyLines(b).has(l));

export function dedupeInbox(rows) {
  const sorted = [...rows].sort((a, b) => (a.source === "sms") - (b.source === "sms") || a.postedAt - b.postedAt);
  const kept = [];
  const duplicates = [];
  const bankOf = (r) => String(r.bank || "").toLowerCase().replace(/^sms · /, "");
  for (const r of sorted) {
    const s = suggestNotification(r);
    const twin = kept.find((k) => {
      if (bankOf(k.r) !== bankOf(r) || !k.s.amount) return false;
      const gap = Math.abs(k.r.postedAt - r.postedAt);
      if (k.r.source === "sms" && r.source === "sms") return gap <= 5 * 60 * 1000 && k.s.kind === s.kind && k.s.description === s.description && k.s.amount === s.amount && shareLine(k.r, r);
      return (
        (k.r.source === "sms") !== (r.source === "sms") &&
        k.s.kind === s.kind && k.s.description === s.description &&
        k.s.amount === s.amount && k.s.type === s.type && gap <= 10 * 60 * 1000
      );
    });
    if (twin) duplicates.push(r.id);
    else kept.push({ r, s });
  }
  return { unique: [...rows].sort((a, b) => b.postedAt - a.postedAt), duplicates };
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
