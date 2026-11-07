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
    amber: "#94621C",
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
  },
};
export type Colors = typeof palette.light;

type Theme = { c: Colors; dark: boolean; fonts: boolean };
const ThemeContext = createContext<Theme>({ c: palette.light, dark: false, fonts: false });

export function ThemeProvider({
  dark,
  fonts,
  children,
}: {
  dark: boolean;
  fonts: boolean;
  children: React.ReactNode;
}) {
  const value = React.useMemo(
    () => ({ c: dark ? palette.dark : palette.light, dark, fonts }),
    [dark, fonts],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
