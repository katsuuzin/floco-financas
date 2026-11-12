import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const normalizeColor = require("@react-native/normalize-colors");
const root = new URL("../../", import.meta.url);
const read = (path) => ts.createSourceFile(path, readFileSync(new URL(path, root), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const exceptions = [
  {
    file: "src/ui/Sheet.tsx",
    reason: "Texto da ação destrutiva sobre o vermelho de c.red (contraste 4,5:1 nos dois temas).",
    colors: ["#311E0D", "#FFFFFF"],
    accepts: (node) => node.parent.getText().includes("dark ?"),
  },
  {
    file: "src/ui/SwipeRow.tsx",
    reason: "Ícone e texto sobre a faixa vermelha de apagar (contraste 4,5:1 nos dois temas).",
    colors: ["#311E0D", "#FFFFFF"],
    accepts: (node) => node.parent.getText().includes("dark ?"),
  },
  {
    file: "src/ui/ItemPhoto.tsx",
    reason: "Fundo preto do visor da câmera, que não muda com o tema.",
    colors: ["#000"],
    accepts: (node) => node.parent.getText().includes("backgroundColor"),
  },
  {
    file: "src/ui/ListsEditor.tsx",
    reason: "Sombra do cartão levantado ao arrastar: sombra é sempre preta.",
    colors: ["#000"],
    accepts: (node) => node.parent.getText().startsWith("shadowColor"),
  },
  {
    file: "src/screens/analysis/SpendTypeTab.tsx",
    reason: "Paleta do ícone ilustrado do cofre.",
    colors: ["#64748B"],
    accepts: (node) => node.parent.parent.getText().includes('image: "vault"'),
  },
  {
    file: "src/screens/FormScreen.tsx",
    reason: "Opções fechadas que o usuário grava na conta ou no cartão.",
    colors: ["#311E0D", "#820AD1", "#E67E22", "#335E9A", "#2E7D5B", "#B53846"],
    accepts(node, color) {
      const palette = node.parent.parent;
      return node.text === color && ts.isArrayLiteralExpression(palette) &&
        ts.isVariableDeclaration(palette.parent) && palette.parent.name.getText() === "COLORS";
    },
  },
  {
    file: "src/screens/ReportScreens.tsx",
    reason: "Cores da página branca do PDF gerado para impressão.",
    colors: ["#311E0D", "#E4D6C8"],
    accepts: (node, color) => node.text.includes(color === "#311E0D" ? "body{font-family:sans-serif;color:#311E0D" : "border-bottom:1px solid #E4D6C8"),
  },
];

test("Cores fixas nas telas, painéis e kit têm exceção justificada", () => {
  const paths = ["App.tsx", ...readdirSync(new URL("src/", root), { recursive: true })
    .filter((path) => path.endsWith(".tsx")).map((path) => "src/" + path.replaceAll("\\", "/"))];
  const unknown = [];
  const used = new Set();
  for (const path of paths.filter((path) => path !== "src/ui/theme.tsx")) {
    const source = read(path);
    function visit(node) {
      if (ts.isStringLiteralLike(node) || ts.isTemplateLiteralToken(node) || ts.isJsxText(node)) {
        const value = node.text.trim();
        const colors = value === "transparent" ? [] :
          normalizeColor(value) !== null ? [value] :
          value.match(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\b|\b(?:rgba?|hsla?|hwb)\([^)]*\)/gi) ?? [];
        for (const color of colors) {
          const exception = exceptions.find((entry) => entry.file === path && entry.colors.includes(color) && entry.accepts(node, color));
          if (exception) used.add(path + " " + color);
          else unknown.push(path + ":" + (source.getLineAndCharacterOfPosition(node.getStart()).line + 1) + " " + color);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(unknown, []);
  assert.deepEqual([...used].sort(), exceptions.flatMap(({ file, colors }) => colors.map((color) => file + " " + color)).sort());
});

function luminance(hex) {
  assert.match(hex, /^#[a-f0-9]{6}$/i);
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

function declaration(source, name) {
  return source.statements.filter(ts.isVariableStatement).flatMap((node) => [...node.declarationList.declarations])
    .find((node) => node.name.getText() === name).initializer;
}

test("Texto nos fundos do tema e em todas as cores de destaque tem contraste mínimo de 4,5:1", () => {
  const source = read("src/ui/theme.tsx");
  const entries = (node, getValue) => Object.fromEntries(node.properties.map((field) => [field.name.getText(), getValue(field.initializer)]));
  const palette = entries(declaration(source, "palette"), (node) => entries(node, (value) => value.text));
  const accents = declaration(source, "ACCENTS").elements.map((row) => row.elements[0].text);
  const failures = [];
  const check = (name, text, background) => {
    const a = luminance(text);
    const b = luminance(background);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < 4.5) failures.push(name + " " + ratio.toFixed(2) + ":1");
  };
  for (const [name, colors] of Object.entries(palette)) {
    for (const fg of ["text", "muted", "primary", "green", "red", "amber"])
      for (const bg of ["bg", "surface", "soft"])
        check(name + " " + fg + "/" + bg, colors[fg], colors[bg]);
    check(name + " onPrimary/primary", colors.onPrimary, colors.primary);
    for (const accent of accents) {
      check(name + " heroText/" + accent, colors.heroText, accent);
      if (name === "dark") {
        check(name + " onPrimary/" + accent, colors.onPrimary, accent);
        for (const bg of ["bg", "surface", "soft"]) check(name + " " + accent + "/" + bg, accent, colors[bg]);
      }
    }
  }
  assert.deepEqual(failures, []);
});
