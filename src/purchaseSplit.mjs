// Dividir uma compra em itens (Revisar pendência › ⋯ › Dividir em itens).
// Cada item vira um lançamento com a sua categoria; todos levam o mesmo `purchaseId`, o título e o total
// da compra, para o extrato mostrar uma linha só que se expande. O total e a conta não mudam.
import { addTransaction, parseMoney, uid } from "./finance.mjs";
import { categorize, normalizeText } from "./rules.mjs";
import { subsOf } from "./categories.mjs";

// Palavras do produto vêm antes das regras do usuário: "óleo 15w40 Ipiranga" não é combustível só por causa da marca.
const KEYWORDS = [
  [/\b(GASOLINA|ETANOL|ALCOOL|DIESEL|GNV|ABASTECIMENTO|COMBUSTIVEL)\b/, "Transporte", "Combustível"],
  [/\b(OLEO|FILTRO|PNEU|PNEUS|PASTILHA|BATERIA|ADITIVO|ARLA|VELA|CORREIA|PALHETA|LAMPADA|FLUIDO|LAVAGEM|LAVA JATO|ALINHAMENTO|BALANCEAMENTO)\b/, "Transporte", "Manutenção"],
  [/\b(ESTACIONAMENTO|PEDAGIO)\b/, "Transporte", "Estacionamento / Pedágio"],
  [/\b(AGUA|REFRIGERANTE|SUCO|CAFE|PAO|LANCHE|SALGADO|COXINHA|PASTEL|SORVETE|CHOCOLATE|BISCOITO|ENERGETICO)\b/, "Alimentação", "Restaurante"],
  [/\b(REMEDIO|DIPIRONA|PARACETAMOL|VITAMINA|CURATIVO)\b/, "Saúde", "Medicamentos"],
];

const known = (s, category, sub) => (sub && subsOf(s, category).includes(sub) ? sub : "");

// Categoria de um item pelo nome. Sem palavra conhecida nem regra, herda a da compra (`fallback`).
export function guessItemCategory(s, name, fallback = { category: "Outros", subcategory: "" }) {
  const text = normalizeText(name);
  if (!text) return { ...fallback, guessed: false };
  for (const [re, category, sub] of KEYWORDS) {
    if (re.test(text)) return { category, subcategory: known(s, category, sub), guessed: true };
  }
  const rule = categorize(s, name, "expense");
  if (rule) return { category: rule.category, subcategory: rule.subcategory || "", guessed: true };
  return { ...fallback, guessed: false };
}

export const itemCents = (item) => item.qty * item.unit;
export const sumItems = (items) => items.reduce((n, it) => n + itemCents(it), 0);

// Linha digitada → item em centavos. Lança Error com mensagem para a tela.
export function parseItem(input) {
  const name = String(input.name || "").trim().slice(0, 80);
  if (!name) throw Error("Dê um nome ao item.");
  const qty = input.qty === "" || input.qty == null ? 1 : Number(input.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > 999) throw Error("A quantidade deve ser de 1 a 999.");
  return { id: input.id || uid(), name, qty, unit: parseMoney(input.unit), category: input.category || "Outros", subcategory: input.subcategory || "" };
}

// Registra a compra como itens. `input` é o rascunho da pendência (já com conta, data e hora).
export function importNotificationAsItems(s, row, input, items) {
  if (s.transactions.some((t) => t.notificationId === row.id)) return s;
  if (!items.length) throw Error("Adicione ao menos um item.");
  const total = parseMoney(input.amount);
  const sum = sumItems(items);
  if (sum !== total) {
    const fmt = (c) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    throw Error(`Os itens somam ${fmt(sum)} e a compra é ${fmt(total)}.`);
  }
  const purchaseId = uid();
  const title = String(input.description || "Compra").trim() || "Compra";
  let next = s;
  for (const it of items) {
    const before = new Set(next.transactions.map((t) => t.id));
    next = addTransaction(next, {
      ...input,
      amount: itemCents(it),
      description: it.qty > 1 ? `${it.name} (${it.qty}×)` : it.name,
      category: it.category,
      subcategory: it.subcategory,
      installments: 1,
      confirmed: true,
    });
    next = {
      ...next,
      transactions: next.transactions.map((t) =>
        before.has(t.id) ? t : { ...t, notificationId: row.id, purchaseId, purchaseTitle: title, purchaseTotal: total },
      ),
    };
  }
  return next;
}

// Para o extrato: junta os itens de uma mesma compra numa linha. Itens soltos seguem como estão.
// Devolve [{ group: true, id, purchaseId, title, date, time, amount, items:[...] } | transação].
export function collapsePurchases(rows) {
  const out = [];
  const seen = new Map();
  for (const t of rows) {
    if (!t.purchaseId) { out.push(t); continue; }
    let g = seen.get(t.purchaseId);
    if (!g) {
      g = { group: true, id: "purchase:" + t.purchaseId, purchaseId: t.purchaseId, title: t.purchaseTitle || "Compra", date: t.date, time: t.time, amount: 0, type: t.type, items: [] };
      seen.set(t.purchaseId, g);
      out.push(g);
    }
    g.items.push(t);
    g.amount += t.amount;
  }
  return out;
}
