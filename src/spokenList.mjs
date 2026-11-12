// Texto falado vira texto de lista (1.12, passo 12). O reconhecimento devolve uma frase ("dois leites, pão e 3 maçãs");
// aqui ela vira uma linha por item, com números falados de um a vinte trocados por dígitos, para ir ao "Colar lista".
const NUMBERS = new Map(Object.entries({
  um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18,
  dezenove: 19, vinte: 20,
}));

function numberize(part) {
  const words = part.trim().split(/\s+/u);
  const first = words[0]?.toLowerCase();
  if (!NUMBERS.has(first) || words.length < 2) return part.trim();
  // "uma dúzia de ovos" e "um quilo de arroz" seguem para o leitor da lista, que entende essas unidades.
  return `${NUMBERS.get(first)} ${words.slice(1).join(" ")}`;
}

export function parseSpoken(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/\s+/gu, " ")
    .split(/\s*(?:[,;.]|\bmais\b|\be\b)\s*/iu)
    .map(numberize)
    .filter(Boolean)
    .join("\n");
}
