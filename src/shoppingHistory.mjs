// Histórico de compras e produtos da Lista de compras. Lógica pura: só lê o estado, nunca grava.
import { normalizeName, productsOf, purchasesOf } from "./shoppingPurchases.mjs";

// Nomes da nota vêm em CAIXA ALTA ("FARIN TRIGO RENATA 1kg"): mostra com só a primeira letra maiúscula.
// Nomes que já têm minúsculas não mudam.
export function displayName(name) {
  const s = String(name ?? "").trim();
  if (!s) return s;
  // "1kg" e "500g" costumam vir em minúsculas no meio do nome em caixa alta: não contam como minúsculas.
  if (/[a-zà-ÿ]/.test(s.replace(/\d+[a-z]{1,2}\b/g, ""))) return s;
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// Compras da mais recente para a mais antiga (mesma data: a registrada por último primeiro).
export function purchasesByDate(state) {
  return purchasesOf(state)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
}

// Total gasto e número de compras num mês ("2026-11").
export function monthSummary(state, ym) {
  const list = purchasesOf(state).filter((p) => p.date.slice(0, 7) === ym);
  return { ym, count: list.length, totalCents: list.reduce((n, p) => n + p.totalCents, 0) };
}

// Produtos pela busca (nome normalizado contém todas as palavras digitadas). Vazio = todos.
// Ordem: comprado por último primeiro; empate pelo nome.
export function searchProducts(state, query = "") {
  const words = normalizeName(query).split(" ").filter(Boolean);
  return productsOf(state)
    .filter((p) => {
      const hay = normalizeName(p.name);
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => (a.lastBoughtAt < b.lastBoughtAt ? 1 : a.lastBoughtAt > b.lastBoughtAt ? -1 : a.name.localeCompare(b.name, "pt-BR")));
}

// Variação entre os dois últimos preços guardados. dir: "up" | "down" | "same" | "none".
export function priceTrend(prod) {
  const pts = (prod.prices || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (pts.length < 2) return { dir: "none", pct: 0, from: null, to: pts.length ? pts[pts.length - 1].priceCents : null };
  const from = pts[pts.length - 2].priceCents;
  const to = pts[pts.length - 1].priceCents;
  const pct = Math.round(((to - from) / from) * 1000) / 10;
  return { dir: to > from ? "up" : to < from ? "down" : "same", pct: Math.abs(pct), from, to };
}

// Pontos de preço de um produto, do mais recente ao mais antigo, com o mercado de cada compra.
export function pricePoints(state, prod) {
  const byId = new Map(purchasesOf(state).map((p) => [p.id, p]));
  return (prod.prices || [])
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .map((x) => ({ date: x.date, priceCents: x.priceCents, purchaseId: x.purchaseId, market: byId.get(x.purchaseId)?.marketName || "" }));
}

// Entrada do formulário de despesa a partir de uma compra (nada é gravado até o usuário confirmar).
export function expenseDraftFromPurchase(p) {
  return {
    type: "expense",
    amount: (p.totalCents / 100).toFixed(2).replace(".", ","),
    description: `Compra - ${p.marketName || "mercado"}`.slice(0, 80),
    date: p.date,
  };
}
