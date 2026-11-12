// Tons próprios do Floco para o ícone de categoria em círculo e para os cartões de lista (1.12).
// Quentes e suaves, nos temas claro e escuro. Valores puros (sem React) para testar o contraste.
// Regras: ícone sobre o círculo ≥ 3:1; texto sobre o cartão ≥ 4,5:1 (texto secundário também).

export const CATEGORY_TONES = Object.freeze({
  light: {
    mel: { bg: "#FCE7B2", fg: "#6B4A00" },
    terracota: { bg: "#F6D5C8", fg: "#8A3A1E" },
    oliva: { bg: "#E1E6C4", fg: "#4C5A1A" },
    petroleo: { bg: "#CFE4E4", fg: "#1F5258" },
    ameixa: { bg: "#EAD5E3", fg: "#6B2E58" },
    areia: { bg: "#EDE3D3", fg: "#5E4B33" },
  },
  dark: {
    mel: { bg: "#3A2E12", fg: "#FFD27A" },
    terracota: { bg: "#3B231C", fg: "#F2A88C" },
    oliva: { bg: "#2C3119", fg: "#C9D58E" },
    petroleo: { bg: "#17302F", fg: "#8FD0CB" },
    ameixa: { bg: "#33202E", fg: "#E3A6D0" },
    areia: { bg: "#332B22", fg: "#E3CDAA" },
  },
});

// Cada categoria aponta para um tom fixo (3 categorias por tom). Grupos especiais usam areia.
export const CATEGORY_TONE_OF = Object.freeze({
  "Hortifrúti": "oliva",
  "Limpeza": "oliva",
  "Pet": "oliva",
  "Frutas": "terracota",
  "Carnes e peixes": "terracota",
  "Bebidas alcoólicas": "terracota",
  "Padaria": "mel",
  "Mercearia": "mel",
  "Matinais": "mel",
  "Frios e laticínios": "petroleo",
  "Bebidas": "petroleo",
  "Congelados": "petroleo",
  "Doces e lanches": "ameixa",
  "Higiene": "ameixa",
  "Farmácia": "ameixa",
  "Bebê": "areia",
  "Casa e utilidades": "areia",
  "Outros": "areia",
});

export function categoryTone(category, dark) {
  const tones = dark ? CATEGORY_TONES.dark : CATEGORY_TONES.light;
  return tones[Object.hasOwn(CATEGORY_TONE_OF, category) ? CATEGORY_TONE_OF[category] : "areia"];
}

// Cartões de lista: fundo, texto e texto secundário. Chaves iguais a LIST_COLORS (shoppingData.mjs).
export const LIST_TONES = Object.freeze({
  light: {
    amarelo: { bg: "#FFCB45", text: "#311E0D", sub: "#4A3418" },
    areia: { bg: "#EDE0CC", text: "#311E0D", sub: "#5A4632" },
    terracota: { bg: "#EBBBA5", text: "#311E0D", sub: "#4F3020" },
    oliva: { bg: "#CFD7A6", text: "#311E0D", sub: "#3E4320" },
    petroleo: { bg: "#B2D6D5", text: "#311E0D", sub: "#22434A" },
    ameixa: { bg: "#DDC0D4", text: "#311E0D", sub: "#4D2C44" },
    grafite: { bg: "#3A3A3F", text: "#F4F4F2", sub: "#CFCFD2" },
  },
  dark: {
    amarelo: { bg: "#FFCB45", text: "#311E0D", sub: "#4A3418" },
    areia: { bg: "#3A3226", text: "#F4F4F2", sub: "#D9CCB8" },
    terracota: { bg: "#4A2A20", text: "#F4F4F2", sub: "#E8C3B4" },
    oliva: { bg: "#343A1F", text: "#F4F4F2", sub: "#D3D9B4" },
    petroleo: { bg: "#1B3A39", text: "#F4F4F2", sub: "#B9DAD8" },
    ameixa: { bg: "#3E2537", text: "#F4F4F2", sub: "#E2C4D8" },
    grafite: { bg: "#2A2A2E", text: "#F4F4F2", sub: "#C4C4C8" },
  },
});
export const DEFAULT_LIST_COLOR = "amarelo";
export const LIST_COLOR_NAMES = Object.freeze({
  amarelo: "Amarelo Floco", areia: "Areia", terracota: "Terracota", oliva: "Oliva",
  petroleo: "Petróleo", ameixa: "Ameixa", grafite: "Grafite",
});

export function listTone(color, dark) {
  const tones = dark ? LIST_TONES.dark : LIST_TONES.light;
  return tones[Object.hasOwn(tones, color) ? color : DEFAULT_LIST_COLOR];
}

// Contraste WCAG entre duas cores #RRGGBB.
export function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
