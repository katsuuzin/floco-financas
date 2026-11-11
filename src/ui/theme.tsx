import React, { createContext, useContext } from "react";

// Solar marrom — identidade do Floco (DESIGN.md).
export const palette = {
  light: {
    bg: "#FAF5EF",
    surface: "#FFFFFF",
    text: "#311E0D",
    muted: "#705C4B",
    line: "#E4D6C8",
    soft: "#F0E3D4",
    primary: "#311E0D",
    onPrimary: "#FFFFFF",
    accent: "#FFCB45",
    heroText: "#311E0D",
    green: "#704723",
    red: "#B53846",
    amber: "#88591B",
    scrim: "rgba(0,0,0,0.45)",
  },
  // Escuro: preto e cinza grafite em camadas; ação no amarelo Solar.
  // Contrastes: texto #F4F4F2 sobre #1D1D20 ≈ 15:1; secundário #A3A3A8 ≈ 6,9:1;
  // marrom #311E0D sobre amarelo #FFCB45 ≈ 10:1.
  dark: {
    bg: "#0E0E10",
    surface: "#1D1D20",
    text: "#F4F4F2",
    muted: "#A3A3A8",
    line: "#2E2E33",
    soft: "#2A2A2E",
    primary: "#FFCB45",
    onPrimary: "#311E0D",
    accent: "#FFCB45",
    heroText: "#311E0D",
    green: "#8FD9A0",
    red: "#FF8A8A",
    amber: "#FFCB45",
    scrim: "rgba(0,0,0,0.45)",
  },
};
export type Colors = typeof palette.light;

export function entityColors(color: unknown, c: Colors) {
  if (typeof color !== "string" || !/^#[\da-f]{6}$/i.test(color))
    return { backgroundColor: c.primary, color: c.onPrimary };
  const channels = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return { backgroundColor: color, color: luminance > 0.179 ? "#000000" : "#FFFFFF" };
}

// S1: cores de destaque. Todas claras o bastante para o texto marrom #311E0D por cima (≥ 8:1).
export const ACCENTS: [string, string][] = [
  ["#FFCB45", "Solar"],
  ["#FFB074", "Laranja"],
  ["#7FB3FF", "Céu"],
  ["#C9A0FF", "Lilás"],
  ["#F28DC0", "Rosa"],
  ["#5FD4C8", "Turquesa"],
];
export const accentOf = (v?: string) => (ACCENTS.some(([hex]) => hex === v) ? (v as string) : ACCENTS[0][0]);

function withAccent(base: Colors, dark: boolean, accent: string): Colors {
  if (accent === ACCENTS[0][0]) return base;
  // No escuro o destaque é a cor de ação; no claro ele colore o cartão de saldo.
  return dark ? { ...base, primary: accent, accent, amber: accent } : { ...base, accent };
}

type Theme = { c: Colors; dark: boolean; fonts: boolean };
const ThemeContext = createContext<Theme>({ c: palette.light, dark: false, fonts: false });

export function ThemeProvider({
  dark,
  fonts,
  accent,
  children,
}: {
  dark: boolean;
  fonts: boolean;
  accent?: string;
  children: React.ReactNode;
}) {
  const value = React.useMemo(
    () => ({ c: withAccent(dark ? palette.dark : palette.light, dark, accentOf(accent)), dark, fonts }),
    [dark, fonts, accent],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
