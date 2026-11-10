// Use chaves sem acento. Combinações específicas vêm antes dos prefixos simples.
export const ABBREVIATIONS = Object.freeze({
  "farin trigo": "farinha de trigo",
  "farin mand": "farinha de mandioca",
  "cr leite": "creme de leite",
  "cr dent": "creme dental",
  "bisc rech": "biscoito recheado",
  "bisc agua sal": "biscoito de água e sal",
  "mac ovos": "macarrão de ovos",
  "mol tom": "molho de tomate",
  "mol tom sach": "molho de tomate sachê",
  "det liq": "detergente líquido",
  "deterg liq": "detergente líquido",
  "deterg po": "detergente em pó",
  "sab po": "sabão em pó",
  "sab liq": "sabão líquido",
  "sab barra": "sabão em barra",
  "pap hig": "papel higiênico",
  "pap toal": "papel toalha",
  "leite l/vida": "leite longa vida",
  "leite cond": "leite condensado",
  "achoc po": "achocolatado em pó",
  "fgo cong": "frango congelado",
  "fgo desfi": "frango desfiado",
  "qj muss": "queijo muçarela",
  "qj parmes": "queijo parmesão",
  "acuc masc": "açúcar mascavo",
  "ol soja": "óleo de soja",
  "ol oliva": "óleo de oliva",
  "vin alc": "vinagre de álcool",
  "vin maca": "vinagre de maçã",
  "extr tom": "extrato de tomate",
  "ag min": "água mineral",
  "agua min": "água mineral",
  "bat palha": "batata palha",
  "bat cong": "batata congelada",
  "pao int": "pão integral",
  "pao form": "pão de forma",
  "milh verd": "milho verde",
  "erv cong": "ervilha congelada",
  "carn moida": "carne moída",
  "ling calab": "linguiça calabresa",
  "pres coz": "presunto cozido",
  "iog nat": "iogurte natural",
  "marg sal": "margarina com sal",
  "marg s/sal": "margarina sem sal",
  "amend torr": "amendoim torrado",
  "desinf lav": "desinfetante de lavanda",
  "amac conc": "amaciante concentrado",
  "limp mult": "limpador multiuso",
  "ag sanit": "água sanitária",
  "sab int": "sabonete íntimo",
  "rac gato": "ração para gato",
  "rac cao": "ração para cão",
  "leite desnat": "leite desnatado",
  "leite semidesn": "leite semidesnatado",
  farin: "farinha", cr: "creme", bisc: "biscoito", mac: "macarrão",
  mol: "molho", refrig: "refrigerante", det: "detergente", deterg: "detergente",
  sab: "sabão", sabon: "sabonete", desinf: "desinfetante", amac: "amaciante",
  salg: "salgadinho", choc: "chocolate", marg: "margarina", pres: "presunto",
  ling: "linguiça", fgo: "frango", qj: "queijo", req: "requeijão",
  achoc: "achocolatado", caf: "café", arr: "arroz", feij: "feijão",
  ol: "óleo", vin: "vinagre", maion: "maionese", ketch: "ketchup",
  iog: "iogurte", bisn: "bisnaguinha", acuc: "açúcar", gran: "granola",
  gelat: "gelatina", torr: "torrada", azeit: "azeitona",
  conserv: "conserva", cogum: "cogumelo", amend: "amendoim", cast: "castanha",
  condens: "condensado", ferm: "fermento", calab: "calabresa",
  mortad: "mortadela", hamb: "hambúrguer", empan: "empanado", cam: "camarão",
  tilap: "tilápia", pesc: "pescada", sard: "sardinha", salm: "salmão",
  espin: "espinafre", broc: "brócolis", mand: "mandioca", abobr: "abobrinha",
  berinj: "berinjela", cen: "cenoura", ceb: "cebola", bat: "batata",
  mist: "mistura", sorv: "sorvete", polp: "polpa", sucr: "sucrilhos",
  condic: "condicionador", desod: "desodorante", enxag: "enxaguante",
  absorv: "absorvente", escov: "escova", esponj: "esponja", alvej: "alvejante",
  limp: "limpador", deseng: "desengordurante", detergnt: "detergente",
  rac: "ração", petisc: "petisco", granul: "granulado",
  "l/vida": "longa vida", sach: "sachê",
  rech: "recheado", trad: "tradicional", temp: "temperado", int: "integral",
  desn: "desnatado", semi: "semidesnatado", trit: "trituradas", picant: "picante",
  coz: "cozido", pre: "pré", cond: "condensado", fatia: "fatia", fat: "fatiado",
  unid: "unidade", pct: "pacote", cx: "caixa",
});

const fold = (word) => word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);
const BRANDS = ["Marca", "Heinz", "Nestlé", "Camil", "Yoki", "Piracanjuba", "Renata",
  "Sadia", "Perdigão", "Seara", "Aurora", "Tirol", "Italac", "Itambé", "Qualy", "Liza",
  "Soya", "Omo", "Ypê", "Comfort", "Dove", "Colgate", "Coca-Cola", "Pepsi",
  "Guaraná Antarctica", "Brahma", "Skol", "Antarctica", "Bauducco", "Marilan",
  "Vitarella", "Fini", "Elma Chips", "Pringles", "Maggi", "Knorr", "Hellmann's",
  "Quero", "Predilecta", "Fugini", "Dona Benta", "Tio João", "Namorado", "Kicaldo",
  "União", "Caravelas", "Bom Princípio", "Lacta", "Garoto", "Hershey's", "Ninho",
  "Molico", "Danone", "Activia", "Vigor", "Batavo", "Parmalat", "Elegê"];
const knownBrands = new Map(BRANDS
  .map((name) => [fold(name), name]));
const SUFFIXES = new Set(["rech", "sach", "trad", "temp", "int", "desn", "semi",
  "trit", "picant", "coz", "pre", "cond", "fatia", "fat", "unid", "pct", "cx"]);
const FEMININE_PRODUCTS = /^(?:farofa|farinha|linguiça|carne|sardinha|mortadela|pizza|mistura|batata)\b/i;
const GENDERED = new Set(["rech", "temp", "desn", "semi", "coz", "cond", "fat"]);

function formatReceiptWords(text, product, recase) {
  const words = [...text.matchAll(/[\p{L}\p{M}]+(?:[-'’][\p{L}\p{M}]+)*/gu)];
  let result = "";
  let end = 0;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const original = word[0];
    const key = fold(original);
    const next = words[i + 1];
    const after = word.index + original.length;
    const pair = next && /^\s+$/.test(text.slice(after, next.index))
      ? knownBrands.get(key + " " + fold(next[0])) : undefined;
    let replacement = original;
    result += text.slice(end, word.index);
    end = after;
    if (pair && recase) {
      replacement = pair;
      end = next.index + next[0].length;
      i++;
    } else if (SUFFIXES.has(key) && (recase || original === original.toUpperCase())) {
      replacement = ABBREVIATIONS[key];
      if (GENDERED.has(key) && FEMININE_PRODUCTS.test(product)) replacement = replacement.replace(/o$/, "a");
    } else if (key === "ovos" && /^macarrão$/i.test(product) && (recase || original === "OVOS")) {
      replacement = "de ovos";
    } else if (recase && !["un", "und"].includes(key)) {
      replacement = knownBrands.get(key) ?? original.toLowerCase();
    }
    result += replacement;
  }
  return result + text.slice(end);
}

function formatMeasures(label) {
  return label
    .replace(/(^|[^\p{L}\p{N}_])(\d+(?:\s*[x×]\s*\d+)?(?:[.,]\d+)?)[ \t]*(kg|ml|unid|und|un|pct|cx|g|l)(?![\p{L}\p{N}_])/giu,
      (_, before, qty, unit) => {
        const normalized = unit.toLowerCase();
        return normalized === "un" || normalized === "und"
          ? before + qty
          : before + qty + " " + (["unid", "pct", "cx"].includes(normalized) ? ABBREVIATIONS[normalized] : normalized);
      })
    .replace(/\s+(?:UN|UND)\.?(?=$|\s)/g, "");
}

export function expandName(raw) {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const label = raw.trim();
  const words = [...label.matchAll(/[\p{L}\p{M}]+(?:\/[\p{L}\p{M}]+)?/gu)];
  let prefix = "";
  let end = 0;
  if (words[0]?.index === 0) {
    for (const word of words.slice(0, 3)) {
      if (end && !/^[.\s]+$/.test(label.slice(end, word.index))) break;
      end = word.index + word[0].length;
      prefix += (prefix ? " " : "") + fold(word[0]);
    }
  }
  let expansion;
  let count = 0;
  const parts = prefix.split(" ");
  for (let n = parts.length; n > 0; n--) {
    const key = parts.slice(0, n).join(" ");
    const boundary = words[n - 1] && label[words[n - 1].index + words[n - 1][0].length];
    if (key !== "cr" && key !== "l/vida" && !SUFFIXES.has(key) &&
        (!boundary || /[.\s,;:()]/.test(boundary)) && Object.hasOwn(ABBREVIATIONS, key)) {
      expansion = ABBREVIATIONS[key];
      count = n;
      break;
    }
  }

  const withoutMeasures = label.replace(/\d[ \t]*(?:kg|ml|g|l)\b/gi, "");
  const letters = [...withoutMeasures.matchAll(/\p{L}/gu)].map(([letter]) => letter);
  const uppercase = letters.filter((letter) => /\p{Lu}/u.test(letter)).length;
  const recase = letters.length > 0 && uppercase / letters.length >= 0.6;
  if (!expansion) {
    const first = label.split(/\s+/, 1)[0];
    if (/^CR$/i.test(first) || /\d/.test(first)) return formatMeasures(label);
    const formatted = formatReceiptWords(formatMeasures(label), first, recase);
    return recase ? capitalize(formatted) : formatted;
  }
  const last = words[count - 1];
  let tail = label.slice(last.index + last[0].length).replace(/^\.(?=\s|$)/, "");
  if (expansion === "creme de leite" || expansion.startsWith("leite ")) {
    tail = tail.replace(/\s+(?:TP|TETRA PAK)\.?(?=\s*\d|$)/gi, "");
  }
  tail = formatReceiptWords(formatMeasures(tail), expansion, recase);
  if (expansion === "biscoito recheado" || expansion === "macarrão de ovos") {
    tail = tail.replace(/^(\s+)(\d+(?:[.,]\d+)?\s*g)\s+(chocolate|espaguete)$/i, "$1$3 $2");
  }
  return capitalize(expansion) + formatMeasures(tail).replace(/[ \t]+/g, " ").trimEnd();
}
