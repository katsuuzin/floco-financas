// Conferência da nota com a lista de compras. Lógica pura: sem React, sem rede, sem gravar nada.
// Casa cada item da lista com no máximo uma linha da nota, pelo nome (a SEFAZ abrevia: FARIN, CR, BISC...).
import { normalizeName } from "./shoppingPurchases.mjs";
import { itemsOf } from "./shopping.mjs";

const STOP = new Set(["de", "da", "do", "das", "dos", "com", "sem", "e", "em", "para", "tp", "un", "und", "pct", "cx", "kg", "g", "ml", "l"]);

// Palavras úteis do nome: sem acento, sem preposições, sem unidades e sem números de embalagem ("500g", "1l").
export function tokens(name) {
  return normalizeName(name)
    .split(" ")
    .filter((t) => t && !STOP.has(t) && !/^\d+(g|kg|ml|l|un)?$/.test(t))
    .map(singular)
    .map((t) => (t === "cr" ? "creme" : t)); // "cr" é curto demais para casar por começo de palavra
}

// Plural simples: "tomates" → "tomate", "franceses" → "frances". Igual dos dois lados, então só precisa ser consistente.
function singular(t) {
  if (t.length > 5 && /[rszl]es$/.test(t)) return t.slice(0, -2); // franceses, flores, cartazes, papeis
  if (t.length > 3 && t.endsWith("s")) return t.slice(0, -1); // tomates, cebolas
  return t;
}

// Começos de nome que mudam o produto: "CR LEITE" é creme de leite, "MOL TOM" é molho de tomate.
// Uma linha assim só casa se o item da lista também citar essa palavra.
const MUDA_O_PRODUTO = new Set(["cr", "creme", "cond", "condensado", "mol", "molho", "extr", "extrato", "suco", "doce", "geleia", "sorv", "sorvete", "achoc", "achocolatado", "refr", "refri", "refrigerante", "bebida", "tempero"]);

// Duas palavras casam se são iguais ou se uma é o começo da outra (FARIN ~ farinha), com 3+ letras.
export function tokenMatch(a, b) {
  if (a === b) return true;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  return s.length >= 3 && l.startsWith(s);
}

// Pontua um item da lista contra uma linha da nota: fração das palavras da lista que aparecem na linha.
export function scorePair(listName, notaName) {
  const lt = [...new Set(tokens(listName))]; // palavra repetida conta uma vez
  const nt = tokens(notaName);
  if (!lt.length || !nt.length) return { score: 0, extras: nt.length, pos: 0 };
  const matched = lt.filter((t) => nt.some((n) => tokenMatch(t, n))).length;
  // Precisa de pelo menos 60% das palavras da lista (2 de 2, 2 de 3, 1 de 1).
  if (matched < Math.ceil(lt.length * 0.6)) return { score: 0, extras: nt.length, pos: 0 };
  // "CR LEITE" não atende "leite": a linha começa com uma palavra que muda o produto e a lista não a citou.
  if (MUDA_O_PRODUTO.has(nt[0]) && !lt.some((t) => tokenMatch(t, nt[0]))) return { score: 0, extras: nt.length, pos: 0 };
  // Posição da primeira palavra da lista na linha: "LEITE INTEGRAL" (0) antes de "... LEITE" (2).
  const pos = nt.findIndex((n) => lt.some((t) => tokenMatch(t, n)));
  return { score: matched / lt.length, extras: nt.length - matched, pos };
}

// Casa lista × nota. Cada item da lista e cada linha da nota entram em no máximo um par.
// Só considera itens ainda pendentes (fora do carrinho). `skip` = índices de linhas da nota já usadas.
// Devolve também o que sobrou de cada lado.
export function matchListToNota(state, notaItems, { skip = new Set() } = {}) {
  const pending = itemsOf(state).filter((i) => !i.inCart);
  const pairs = [];
  pending.forEach((li, a) => {
    notaItems.forEach((ni, b) => {
      if (skip.has(b)) return; // linha da nota já usada numa conferência anterior
      const { score, extras, pos } = scorePair(li.name, ni.name);
      if (score > 0) pairs.push({ a, b, score, extras, pos });
    });
  });
  // Melhor pontuação primeiro; empate: termo mais perto do começo da linha, depois menos palavras sobrando, depois a ordem.
  pairs.sort((x, y) => y.score - x.score || x.pos - y.pos || x.extras - y.extras || x.a - y.a || x.b - y.b);
  const usedA = new Set();
  const usedB = new Set();
  const matches = [];
  for (const p of pairs) {
    if (usedA.has(p.a) || usedB.has(p.b)) continue;
    usedA.add(p.a);
    usedB.add(p.b);
    const li = pending[p.a];
    const ni = notaItems[p.b];
    matches.push({
      listItemId: li.id,
      listName: li.name,
      notaIndex: p.b,
      notaName: ni.name,
      score: p.score,
      exact: p.score === 1 && p.extras === 0,
      // Sem unidade, compara as quantidades: "pedi 2, a nota trouxe 1".
      qtyShort: !li.unit && !ni.unit && ni.qty < li.qty,
    });
  }
  matches.sort((x, y) => pending.findIndex((i) => i.id === x.listItemId) - pending.findIndex((i) => i.id === y.listItemId));
  return {
    matches,
    notInNota: pending.filter((_, a) => !usedA.has(a)), // itens da lista que não vieram na nota
    notInList: notaItems.map((ni, b) => ({ ni, b })).filter(({ b }) => !usedB.has(b) && !skip.has(b)).map(({ ni }) => ni), // linhas da nota fora da lista
  };
}

// Aplica os pares escolhidos: põe os itens no carrinho e, se ainda não tinham preço, aprende o da nota.
// Preço sem unidade = por unidade; com unidade (kg, g...) = o da porção inteira (a regra da lista).
export function applyConferencia(state, picks, notaItems) {
  const byId = new Map(picks.map((p) => [p.listItemId, { ni: notaItems[p.notaIndex], listName: p.listName }]));
  return {
    ...state,
    shoppingItems: itemsOf(state).map((i) => {
      const hit = byId.get(i.id);
      if (!hit?.ni) return i;
      // Revalida: se o item foi renomeado depois de calcular os pares, a seleção antiga não vale.
      if (hit.listName !== undefined && hit.listName !== i.name) return i;
      const ni = hit.ni;
      const price = i.priceCents == null ? (i.unit ? ni.totalCents : ni.unitPriceCents) : i.priceCents;
      return { ...i, inCart: true, priceCents: price };
    }),
  };
}
