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
  dark: {
    bg: "#311E0D",
    surface: "#402A17",
    text: "#FFF5E8",
    muted: "#D8C0A8",
    line: "#735840",
    soft: "#553B25",
    primary: "#F0C998",
    onPrimary: "#311E0D",
    accent: "#EAC15B",
    heroText: "#311E0D",
    green: "#E8BD8F",
    red: "#FFADB3",
    amber: "#E3BE7F",
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
