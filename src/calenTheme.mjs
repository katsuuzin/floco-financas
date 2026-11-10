// Tokens de cor da aba Análise, no padrão do Calen (claro e escuro). Valores do app web do
// Calen; o roxo da marca foi trocado pelo amarelo Solar e seus tons.
// Sem imports de tela: testável em Node.
import { calenTones, mix } from "./calenArt.mjs";

export const CALEN = {
  light: {
    bg: "#FAFAFA",
    card: "#FFFFFF",
    text: "#18181B",
    muted: "#52525B",
    subtle: "#71717A",
    line: "#E4E4E7",
    lineStrong: "#D4D4D8",
    soft: "#F1F2F4",
    primary: "#FBB202", // Solar: botões, abas ativas, gráficos
    onPrimary: "#311E0D",
    primaryText: "#8A5A00", // amarelo legível como texto sobre fundo claro
    success: "#1A7F2B",
    successText: "#177026",
    danger: "#D12C32",
    dangerText: "#B8272C",
    info: "#2563EB",
    warning: "#FFA63D",
    warningText: "#9A4F00",
    track: "#E4E4E7",
  },
  dark: {
    bg: "#0B0D0A",
    card: "#111212",
    text: "#F4F6F2",
    muted: "#8E9690",
    subtle: "#5C6660",
    line: "#28282C",
    lineStrong: "#3A3A3F",
    soft: "#1A1A1D",
    primary: "#FFCB45",
    onPrimary: "#311E0D",
    primaryText: "#FFCB45",
    success: "#2FB22F",
    successText: "#2FB22F",
    danger: "#FF6166",
    dangerText: "#FF6166",
    info: "#5B8BFF",
    warning: "#FFA63D",
    warningText: "#FFA63D",
    track: "#28282C",
  },
};

export const calenTokens = (dark) => (dark ? CALEN.dark : CALEN.light);

// Fundo suave de uma cor (o "bloco" do ícone no Calen): claro = 84% de branco; escuro = cor
// acinzentada sobre quase preto. Serve para células do calendário, chips e selos.
export const tint = (color, dark) => calenTones(color, dark).box;

// Cor com transparência (#RRGGBBAA).
export const alpha = (hex, a) => (/^#[0-9a-f]{6}$/i.test(hex) ? hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0") : hex);

// Rampa de amarelos para gráficos (do mais claro ao mais forte), a partir do primário.
export function yellowRamp(dark, steps = 4) {
  const base = calenTokens(dark).primary;
  return Array.from({ length: steps }, (_, i) => mix(base, dark ? "#0B0D0A" : "#FFFFFF", (steps - 1 - i) * (dark ? 0.18 : 0.22)));
}

export { mix };
