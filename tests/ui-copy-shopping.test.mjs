import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const ts = createRequire(import.meta.url)("typescript");
const root = new URL("../src/", import.meta.url);
const screens = ["ShoppingScreen", "ShoppingTripScreen", "PurchasesScreens", "ScanNotaScreen",
  "NfceConsultaScreen", "ShoppingPastePanel"].map((name) => "screens/" + name + ".tsx");
const modules = readdirSync(root).filter((name) => /^(?:shopping|nfce).*\.mjs$/u.test(name));
const props = new Set(["title", "label", "body", "placeholder", "hint", "accessibilityLabel", "accessibilityHint"]);

function values(node) {
  if (!node) return [];
  if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) return [node.text];
  if (ts.isTemplateExpression(node)) return [node.head.text + node.templateSpans.map((part) => "\u0001" + part.literal.text).join("")];
  if (ts.isConditionalExpression(node)) return [...values(node.whenTrue), ...values(node.whenFalse)];
  if (ts.isParenthesizedExpression(node) || ts.isJsxExpression(node)) return values(node.expression);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken)
    return [(values(node.left)[0] ?? "\u0001") + (values(node.right)[0] ?? "\u0001")];
  return [];
}

function inventory(path) {
  const screen = path.endsWith(".tsx");
  const source = ts.createSourceFile(path, readFileSync(new URL(path, root), "utf8"),
    ts.ScriptTarget.Latest, true, screen ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  const records = [];
  function append(node, texts, kind) {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    for (const raw of texts) {
      const text = raw.replace(/\s+/gu, " ").trim();
      if (!/\p{L}/u.test(text)) continue;
      records.push({ text, kind, location: "src/" + path + ":" + line });
    }
  }
  function walk(node) {
    if (screen && ts.isJsxAttribute(node) && props.has(node.name.getText(source))) {
      const kind = node.name.getText(source) === "title" && node.parent.parent.tagName?.getText(source) === "Button" ? "button" : "label";
      append(node, values(node.initializer), kind);
    } else if (screen && (ts.isJsxText(node) || ts.isJsxExpression(node)) &&
        (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      append(node, values(node), "body");
    } else if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (["Error", "TypeError", "RangeError"].includes(name) ||
          screen && ["fail", "setError", "setNotice"].includes(name)) {
        const text = values(node.arguments?.[0]);
        // Marcador interno de timeout é consumido no catch; o rótulo exibido é outro.
        if (!(screen && path.endsWith("ScanNotaScreen.tsx") && text[0] === "tempo"))
          append(node, text, "error");
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
  return records;
}

const copy = [...screens, ...modules].flatMap(inventory);
const policy = [
  ["Inglês em rótulos ou mensagens", ({ text }) => /\b(?:offline|online|loading|retry|submit|failed|invalid|not found|unknown|success|cancelled|timeout|request rejected)\b/iu.test(text)],
  ["Reticências em três pontos", ({ text }) => text.includes("...")],
  ["Ponto final em botão", ({ kind, text }) => kind === "button" && /\.$/u.test(text)],
  ["Erro seco ou exclamação em erro", ({ kind, text }) => kind === "error" && (/^Erro\s*:/iu.test(text) || /!/u.test(text))],
  ["Maiúscula inicial em textos completos", ({ kind, text }) => kind !== "body" && /^\p{Ll}/u.test(text)],
  ["Termos da lista de compras", ({ text }) => /\bcesta\b/iu.test(text) ||
    /\bNF\b(?!-e\b)/iu.test(text) || /\b(?:carrinho de compras|lista do mercado)\b/iu.test(text)],
];

test("Inventário cobre as seis telas, rótulos de botões e erros dos módulos", () => {
  for (const path of screens) assert.ok(copy.some(({ location }) => location.startsWith("src/" + path + ":")));
  assert.ok(copy.some(({ kind }) => kind === "button"));
  assert.ok(copy.some(({ kind, location }) => kind === "error" && location.includes(".mjs")));
});

for (const [name, invalid] of policy) {
  const findings = copy.filter(invalid).map(({ text, location }) => location + " — " + text.replaceAll("\u0001", "{valor}"));
  test((findings.length ? "Achado: " : "") + name, () => assert.deepEqual(findings, []));
}
