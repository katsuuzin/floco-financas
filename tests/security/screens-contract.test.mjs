import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const ts = createRequire(import.meta.url)("typescript");
const read = (path) => ts.createSourceFile(path, readFileSync(new URL("../../" + path, import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function nodes(source, matches) {
  const list = [];
  function walk(node) {
    if (matches(node)) list.push(node);
    ts.forEachChild(node, walk);
  }
  walk(source);
  return list;
}
const opening = (node) => ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node);
const tag = (node) => node.tagName.getText();
const prop = (node, name) => node.attributes.properties.find((attr) => ts.isJsxAttribute(attr) && attr.name.getText() === name)?.initializer;
function copy(node) {
  if (!node) return [];
  if (ts.isJsxExpression(node)) return copy(node.expression);
  if (ts.isConditionalExpression(node)) return [...copy(node.whenTrue), ...copy(node.whenFalse)];
  if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) return [node.text.trim()];
  if (ts.isTemplateExpression(node)) return [node.head.text + node.templateSpans.map((part) => "…" + part.literal.text).join("")];
  return [];
}
const named = (value) => !!value && (copy(value).some(Boolean) ||
  ts.isJsxExpression(value) && !!value.expression && copy(value).length === 0 &&
  !["null", "undefined", "false"].includes(value.expression.getText()));
const nameFromChildren = (node) => ts.isJsxElement(node.parent) &&
  node.parent.children.some((child) => copy(child).some(Boolean) ||
    ts.isJsxElement(child) && ["Text","T","Muted"].includes(tag(child.openingElement)) &&
    child.children.some((part) => copy(part).some(Boolean)));

const routes = { shoppingTrip: "ShoppingTripScreen", scanProduct: "ScanProductScreen", scanNota: "ScanNotaScreen", shopping: "ShoppingListsScreen", shoppingList: "ShoppingScreen" };
const app = read("App.tsx");
const nav = read("src/app/nav.tsx");
const keyboard = nodes(app, opening).filter((node) => tag(node) === "KeyboardAvoidingView");
const statement = read("src/screens/TransactionsScreen.tsx");
test("Extrato compartilha filtro e calendário e nomeia os controles", () => {
  for (const name of ["sanitizeFilter", "applyStatementFilter", "describeFilter", "activeFilterCount", "monthGrid", "dayDetail"])
    assert.ok(nodes(statement, ts.isCallExpression).some((node) => node.expression.getText() === name), name);
  for (const node of nodes(statement, opening).filter((node) => ["Button", "Pressable", "TextInput"].includes(tag(node))))
    assert.ok(named(prop(node, tag(node) === "Button" ? "title" : "accessibilityLabel")), tag(node));
});
const amountField = nodes(read("src/ui/kit.tsx"), ts.isFunctionDeclaration).find((node) => node.name?.text === "AmountField");
test("Campo de valor tem cálculo acessível e prévia anunciada", () => {
  assert.ok(amountField);
  for (const name of ["evaluateAmount", "isExpression"])
    assert.ok(nodes(amountField, ts.isCallExpression).some((node) => node.expression.getText() === name), name);
  assert.ok(nodes(amountField, opening).some((node) => copy(prop(node, "accessibilityLiveRegion")).includes("polite")));
  assert.match(amountField.getText(), /"Calcular"/);
});
const trash = read("src/screens/TrashScreen.tsx");
test("Lixeira confirma quantidade, valida restauração e rotula ações", () => {
  for (const name of ["emptyTrashPlan", "restoreFromTrash"])
    assert.ok(nodes(trash, ts.isCallExpression).some((node) => node.expression.getText() === name), name);
  for (const node of nodes(trash, opening).filter((node) => tag(node) === "IconButton"))
    assert.ok(named(prop(node, "label")));
});
const accountsScreen = read("src/screens/OrganizeScreens.tsx");
test("Contas expõe arquivamento, restauração e botões de ordem", () => {
  for (const name of ["archiveAccount", "unarchiveAccount", "moveAccount"])
    assert.ok(nodes(accountsScreen, ts.isCallExpression).some((node) => node.expression.getText() === name), name);
  const buttons = nodes(accountsScreen, opening).filter((node) => tag(node) === "Button");
  for (const label of ["Subir", "Descer"])
    assert.ok(buttons.some((node) => copy(prop(node, "title")).includes(label) && prop(node, "disabled")));
});
test("Metas e caixinhas usam abas, vínculo e operações próprias", () => {
  for (const name of ["linkGoalToPot", "archivePot", "potSummary"])
    assert.ok(nodes(accountsScreen, ts.isCallExpression).some((node) => node.expression.getText() === name), name);
  assert.ok(nodes(accountsScreen, opening).some((node) => tag(node) === "Segmented" && copy(prop(node, "label")).includes("Planejamento")));
});
test("Editor de estilos tem prévia legível e seleção anunciada", () => {
  const editor = read("src/PlanningPanel.tsx");
  assert.match(editor.text, /ALLOWED_ICONS\.map/);
  assert.match(editor.text, /ALLOWED_COLORS\.map/);
  assert.match(editor.text, /readableOn\(current\.color\)/);
  assert.ok(nodes(editor, opening).some((node) => tag(node) === "Pressable" &&
    copy(prop(node, "accessibilityRole")).includes("radio") && prop(node, "accessibilityState")));
});
test("Caixa de entrada permite revisar avisos agrupados", () => {
  const inbox = read("src/app/inbox.ts");
  const home = read("src/screens/HomeScreen.tsx");
  for (const name of ["isDuplicateNotification", "rememberNotification"])
    assert.ok(nodes(inbox, ts.isCallExpression).some((node) => node.expression.getText() === name), name);
  assert.match(home.text, /Ver duplicadas/u);
  assert.match(home.text, /hiddenRows/u);
});
test("Revisão de despesas permite salvar em lote e desfazer o lote", () => {
  const form = read("src/screens/FormScreen.tsx");
  for (const name of ["buildExpenseBatch", "validateBatch", "batchDuplicates", "buildExpenseBatchChange"])
    assert.ok(nodes(form, ts.isCallExpression).some((node) => node.expression.getText() === name), name);
  const labels = nodes(form, opening).flatMap((node) => copy(prop(node, "title")));
  assert.ok(labels.includes("Salvar tudo"));
  assert.ok(labels.includes("Desfazer registro das despesas"));
});
test("Lista expõe recorrentes, promoções, histórico de edição e avisos opcionais", () => {
  const shopping = read("src/screens/ShoppingScreen.tsx");
  const restock = read("src/screens/RestockList.tsx");
  const store = read("src/app/store.tsx");
  assert.ok(nodes(shopping, opening).some((node) => tag(node) === "Toggle" && copy(prop(node, "label")).includes("Sempre comprar")));
  assert.match(shopping.text, /configureShoppingItem\(/u);
  assert.match(store.text, /history\.past\.slice\(-20\)/u);
  assert.match(restock.text, /shoppingRunOutAlerts === true/u);
});
function directButtons(node) {
  if (opening(node)) return Number(tag(node) === "Button");
  if (ts.isJsxElement(node)) return Number(tag(node.openingElement) === "Button");
  if (ts.isJsxText(node)) return 0;
  return node.getChildren().reduce((count, child) => count + directButtons(child), 0);
}

for (const path of ["OrganizeScreens", "ShoppingScreen", "RestockList", "TransactionsScreen"]) {
  test(path + " separa grupos de botões", () => {
    const source = read("src/screens/" + path + ".tsx");
    const screens = path === "OrganizeScreens"
      ? nodes(source, ts.isFunctionDeclaration).filter((node) => ["AccountsScreen", "GoalsScreen"].includes(node.name?.text))
      : [source];
    for (const element of screens.flatMap((screen) => nodes(screen, ts.isJsxElement))) {
      if (element.children.reduce((count, child) => count + directButtons(child), 0) < 2) continue;
      const style = prop(element.openingElement, "style") ?? prop(element.openingElement, "contentContainerStyle");
      assert.match(style?.getText() ?? "", /\bgap\s*:/,
        source.fileName + ":" + (source.getLineAndCharacterOfPosition(element.getStart()).line + 1));
    }
  });
}

test("Calendário alinha cabeçalho, dias e espaços na mesma grade", () => {
  const calendar = nodes(statement, ts.isFunctionDeclaration).find((node) => node.name?.text === "MonthCalendar");
  const cells = nodes(calendar, opening);
  const blank = cells.find((node) => tag(node) === "View" && prop(node, "key")?.getText() === "{cell.date}");
  const day = cells.find((node) => tag(node) === "Pressable");
  assert.equal(prop(blank, "style").getText(), "{cellStyle}");
  assert.match(prop(day, "style").getText(), /^\{\[cellStyle,/);
  assert.match(calendar.getText(), /minWidth: Math.max\(48, 32 \* fontScale\)/);
});

test("Controles do kit e botão central usam movimento de toque", () => {
  const kit = read("src/ui/kit.tsx");
  for (const [name, kind] of Object.entries({ Button: "button", IconButton: "icon", Choice: "chip", Segmented: "chip", ListItem: "row" })) {
    const fn = nodes(kit, ts.isFunctionDeclaration).find((node) => node.name?.text === name);
    const controls = nodes(fn, opening);
    assert.ok(controls.some((node) => tag(node) === "MotionPressable" && copy(prop(node, "kind")).includes(kind)), name);
    assert.ok(controls.every((node) => tag(node) !== "Pressable"), name);
  }
  assert.ok(nodes(app, opening).some((node) => tag(node) === "MotionPressable" && copy(prop(node, "kind")).includes("fab")));
});

const statuses = /\b(?:loading|submit|retry|cancel|error|offline|not found|failed|save)\b/i;

for (const [route, screen] of Object.entries(routes)) {
  const source = read("src/screens/" + screen + ".tsx");
  const controls = nodes(source, opening);
  const where = (node) => source.fileName + ":" + (source.getLineAndCharacterOfPosition(node.getStart()).line + 1);
  test(screen + " nomeia controles e campos", () => {
    assert.ok(controls.some((node) => tag(node) === "Button"));
    const problems = [];
    for (const node of controls) {
      if (tag(node) === "Field" && !named(prop(node, "label"))) problems.push(where(node) + " Field sem label");
      if (tag(node) === "Button" && !named(prop(node, "title")) && !named(prop(node, "accessibilityLabel")))
        problems.push(where(node) + " Button sem nome");
      if (tag(node) === "Pressable" && !named(prop(node, "accessibilityLabel")) && !nameFromChildren(node))
        problems.push(where(node) + " Pressable sem nome");
    }
    assert.deepEqual(problems, []);
  });
  test(screen + " rota registrada no tipo, título, renderização e teclado", () => {
    const names = nodes(nav, ts.isPropertySignature).filter((node) => node.name.getText() === "name" &&
      node.type && ts.isLiteralTypeNode(node.type)).map((node) => node.type.literal.text);
    assert.ok(names.includes(route));
    assert.ok(nodes(app, ts.isPropertyAssignment).some((node) =>
      node.name.getText() === route && ts.isStringLiteral(node.initializer) && node.initializer.text.trim()));
    assert.ok(nodes(app, ts.isCaseClause).some((node) => ts.isStringLiteral(node.expression) && node.expression.text === route &&
      nodes(node, opening).some((element) => tag(element) === screen)));
    // As telas de Listas e da lista têm os campos no alto ou em folhas próprias; não precisam do ajuste de teclado da rota.
    if (!["shopping", "shoppingList"].includes(route) && controls.some((node) => ["Field", "TextInput"].includes(tag(node)))) {
      assert.ok(keyboard.some((node) => nodes(prop(node, "behavior"), ts.isBinaryExpression).some((condition) =>
        condition.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
        condition.left.getText() === "top?.name" && ts.isStringLiteral(condition.right) && condition.right.text === route)));
    }
  });
  test(screen + " restringe rede, logs e dados persistidos", () => {
    const assignments = new Map(nodes(source, ts.isVariableDeclaration).filter((node) =>
      ts.isIdentifier(node.name) && node.initializer && ts.isStringLiteral(node.initializer))
      .map((node) => [node.name.text, node.initializer.text]));
    const problems = [];
    for (const call of nodes(source, ts.isCallExpression)) {
      const method = call.expression.getText();
      if (/^(?:globalThis\.)?fetch$/u.test(method) && route !== "scanProduct") problems.push(where(call) + " fetch direto");
      if (/^console(?:\.|\[['"])(?:log|info|warn|error|debug)\b/u.test(method)) problems.push(where(call) + " log de tela");
      if (method === "AsyncStorage.setItem") {
        const [key, data] = call.arguments;
        const name = key && (ts.isStringLiteral(key) ? key.text : assignments.get(key.getText()));
        const content = data?.getText() ?? "";
        if (!(name === "floco.tripSession" && /^serializeSession\(/u.test(content)) &&
            !(name === "floco.tripBudgetCents" && content === "String(value)"))
          problems.push(where(call) + " gravação fora dos dados da sessão ou limite");
      }
    }
    assert.deepEqual(problems, []);
  });
  if (["scanNota", "scanProduct"].includes(route)) test(screen + " expõe o estado da lanterna e anuncia a leitura", () => {
    assert.ok(controls.some((node) => tag(node) === "Toggle" && copy(prop(node, "label")).includes("Lanterna") && prop(node, "value")));
    assert.ok(controls.some((node) => copy(prop(node, "accessibilityLiveRegion")).includes("polite") && node.parent.getText().includes("{status}")));
  });
  if (route === "shoppingList") test("Lista restaura foco e mantém o registro da despesa", () => {
    assert.match(source.getText(), /focusAccessibility\(pasteButton\.current\)/u);
    assert.match(source.getText(), /focusAccessibility\(editControls\.current\.get\(id\)\)/u);
    assert.match(source.getText(), /title="Registrar despesa"/u);
  });
  if (route === "shoppingTrip") test("Modo compra usa o modelo de tela e anuncia limite inválido", () => {
    for (const name of ["tripViewModel", "parseLimitInput", "finishPlan"])
      assert.ok(nodes(source, ts.isCallExpression).some((node) => node.expression.getText() === name), name);
    assert.ok(controls.some((node) => copy(prop(node, "accessibilityLiveRegion")).includes("polite") &&
      node.parent.getText().includes("limitError")));
    assert.ok(controls.some((node) => prop(node, "accessibilityLabel")?.getText().includes("estimate.text")));
  });
  test(screen + " mantém rótulos e mensagens em português", () => {
    const attr = nodes(source, ts.isJsxAttribute).filter((node) =>
      /^(?:title|label|placeholder|hint|body|accessibilityLabel|accessibilityHint)$/u.test(node.name.getText()));
    const visible = [...attr.flatMap((node) => copy(node.initializer)),
      ...nodes(source, ts.isJsxText).flatMap(copy),
      ...nodes(source, ts.isJsxExpression).filter((node) => ts.isJsxElement(node.parent)).flatMap(copy)];
    assert.deepEqual(visible.filter((text) => statuses.test(text) || text.includes("...")), []);
    if (route === "shoppingList") for (const text of ["Usar preços do histórico", "Exportar em CSV", "Escanear"])
      assert.ok(visible.some((value) => value.includes(text)), text);
  });
}
