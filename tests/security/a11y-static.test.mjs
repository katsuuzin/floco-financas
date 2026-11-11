import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const ts = createRequire(import.meta.url)("typescript"); // Dependência de desenvolvimento já usada pelo tsc.
const paths = [
  "src/screens/ShoppingScreen.tsx", "src/screens/ScanNotaScreen.tsx",
  "src/screens/NfceConsultaScreen.tsx", "src/screens/PurchasesScreens.tsx",
  "src/screens/RestockList.tsx", "src/screens/ShoppingPastePanel.tsx",
  "src/ui/ShoppingIcons.tsx", "src/screens/ShoppingTripScreen.tsx", "src/screens/ScanProductScreen.tsx",
  "src/screens/TransactionsScreen.tsx", "src/screens/TrashScreen.tsx", "src/screens/OrganizeScreens.tsx",
  "src/screens/FormScreen.tsx",
];

const walk = (node, visit) => {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
};
const prop = (node, name) => node.attributes.properties.find((attr) =>
  ts.isJsxAttribute(attr) && attr.name.getText() === name);
const value = (node, name) => prop(node, name)?.initializer;
const hasLabel = (node, name) => {
  const label = value(node, name);
  return Boolean(label && (!ts.isStringLiteral(label) || label.text.trim()));
};
const at = (node, source) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
const target = /^(Pressable|IconButton|Button|TouchableOpacity|TouchableHighlight|TouchableWithoutFeedback)$/;
const visibleProp = /^(title|label|accessibilityLabel|accessibilityHint|placeholder|message|description|body|text)$/;
const namesThatMustWrap = new Set(["ShoppingScreen.tsx", "ShoppingTripScreen.tsx", "ScanProductScreen.tsx",
  "ScanNotaScreen.tsx", "NfceConsultaScreen.tsx", "PurchasesScreens.tsx", "ShoppingPastePanel.tsx", "RestockList.tsx"]);
const english = /^(?:Loading|Error|Submit|Cancel)(?:\b|$)/i;
const dynamicStatus = /^(?:Verificando a permissão|Lendo a foto|Interpretando…|Adicionando…|Restam\b|A soma dos itens\b|Consultando a nota|Nenhum item encontrado|Compra salva no histórico)/i;

function literals(node) {
  if (!node) return [];
  if (ts.isJsxExpression(node)) return literals(node.expression);
  if (ts.isConditionalExpression(node)) return [...literals(node.whenTrue), ...literals(node.whenFalse)];
  if (ts.isStringLiteralLike(node)) return [node.text.trim()];
  if (ts.isTemplateExpression(node)) return [node.head.text.trim()];
  return [];
}

function directCopy(opening) {
  return ts.isJsxElement(opening.parent) ? opening.parent.children.flatMap((child) =>
    ts.isJsxText(child) ? [child.getText().trim()] : literals(child)) : [];
}

function hasVisibleChildren(opening) {
  if (directCopy(opening).some(Boolean)) return true;
  if (!ts.isJsxElement(opening.parent)) return false;
  let found = false;
  for (const child of opening.parent.children) {
    walk(child, (node) => {
      if (ts.isJsxElement(node) && /^(T|Muted|Text)$/.test(node.openingElement.tagName.getText())) {
        found ||= node.children.some((part) => ts.isJsxExpression(part)
          ? Boolean(part.expression)
          : ts.isJsxText(part) && Boolean(part.getText().trim()));
      }
    });
  }
  return found;
}

function hasLiveRegion(opening) {
  for (let node = opening; node; node = node.parent) {
    const element = ts.isJsxElement(node) ? node.openingElement : node;
    if ((ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element)) &&
        literals(value(element, "accessibilityLiveRegion")).some((mode) => /^(polite|assertive)$/.test(mode))) {
      return true;
    }
  }
  return false;
}

for (const path of paths) {
  const text = readFileSync(new URL("../../" + path, import.meta.url), "utf8");
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  test(path + " | acessibilidade estática", (t) => {
    const failures = [];
    const report = (node, message) => failures.push(path + ":" + at(node, source) + " " + message);
    let svgFound = false;
    walk(source, (node) => {
      if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return;
      const tag = node.tagName.getText();
      if (namesThatMustWrap.has(path.split("/").at(-1)) && /^(T|Muted)$/.test(tag) && prop(node, "numberOfLines"))
        report(node, "Texto do conteúdo precisa quebrar em fontes ampliadas.");
      if (/^(Pressable|IconButton)$/.test(tag) &&
          !hasLabel(node, "accessibilityLabel") && !(tag === "IconButton" && hasLabel(node, "label")) &&
          !hasVisibleChildren(node)) {
        report(node, tag + " sem nome acessível ou texto filho.");
      }
      if (tag === "Pressable" && literals(value(node, "accessibilityRole")).some((role) => role === "checkbox" || role === "switch") &&
          !value(node, "accessibilityState")) {
        report(node, "Caixa de seleção sem accessibilityState.");
      }

      const style = value(node, "style")?.getText() ?? "";
      if (target.test(tag)) {
        for (const [, axis, size] of style.matchAll(/\b(width|height)\s*:\s*(\d+(?:\.\d+)?)(?=\s*[,}])/g)) {
          if (Number(size) >= 44) continue;
          const message = "Alvo fixo abaixo de 44 dp (" + axis + " " + size + ").";
          if (prop(node, "hitSlop")) t.diagnostic(path + ":" + at(node, source) + " " + message + " Confira o hitSlop.");
          else report(node, message);
        }
      }

      const copies = [...directCopy(node)];
      for (const attr of node.attributes.properties) {
        if (ts.isJsxAttribute(attr) && visibleProp.test(attr.name.getText())) copies.push(...literals(attr.initializer));
      }
      for (const copy of copies.filter((copy) => english.test(copy))) {
        report(node, "Texto de interface em inglês: " + copy);
      }

      const isErrorOrNotice = ts.isJsxElement(node.parent) &&
        node.parent.children.some((child) => ts.isJsxExpression(child) &&
          /^(?:error|notice)$/i.test(child.expression?.getText() ?? ""));
      const status = copies.find((copy) => dynamicStatus.test(copy));
      if ((status || isErrorOrNotice) && !hasLiveRegion(node)) {
        report(node, "Sem accessibilityLiveRegion: " + (status || "erro ou aviso"));
      }

      if (/\/Scan(?:Nota|Product)Screen\.tsx$/u.test(path) && literals(value(node, "label")).includes("Lanterna") &&
          (tag !== "Toggle" || !value(node, "value") || !value(node, "onChange")))
        report(node, "Lanterna sem alternância acessível.");

      if (path.endsWith("/ShoppingIcons.tsx") && tag === "Svg") {
        svgFound = true;
        if (!prop(node, "accessibilityElementsHidden") ||
            !literals(value(node, "importantForAccessibility")).includes("no-hide-descendants")) {
          report(node, "SVG decorativo exposto ao leitor de tela.");
        }
      }
    });
    if (path.endsWith("/ShoppingIcons.tsx") && !svgFound) failures.push(path + " SVG decorativo não encontrado.");
    assert.deepEqual(failures, []);
  });
}
