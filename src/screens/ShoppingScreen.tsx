import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Pressable, Share, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import { Box, Button, Choice, Empty, Field, I, IconButton, Muted, Section, Segmented, T, Toggle, focusAccessibility, type ViewControl, space, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { SheetModal } from "../ui/pickers";
import CategoryIcon from "../ui/ShoppingIcons";
import { useStore } from "../app/store";
import { reviewExpenses, useNav } from "../app/nav";
import { wouldDuplicate } from "../shoppingReconcile.mjs";
import ShoppingPastePanel from "./ShoppingPastePanel";
import RestockList from "./RestockList";
import { archiveList, renameList, saveAsTemplate } from "../shoppingLists.mjs";
import { uid, today } from "../finance.mjs";
import {
  SHOPPING_CATEGORIES,
  activeShoppingList,
  activeShoppingState,
  createShoppingList,
  editActiveShoppingItems,
  migrateShoppingLists,
  shoppingListsOf,
  addShoppingItem,
  clearCart,
  groupByCategory,
  itemsOf,
  lineTotal,
  purchaseDraft,
  removeItem,
  configureShoppingItem,
  restockStaples,
  shareText,
  shoppingSummary,
  toggleCart,
} from "../shopping.mjs";
import { applySuggestedPrices, suggestPrices } from "../shoppingSuggestPrice.mjs";
import { listToCsv } from "../shoppingExport.mjs";
import { searchItems } from "../shoppingSearch.mjs";
import { suggestNames, completeQuantity } from "../shoppingAutocomplete.mjs";
import { encodeShareCode } from "../shoppingShareCode.mjs";

const priceText = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2).replace(".", ","));
const qtyText = (i: any) => (i.unit ? `${String(i.qty).replace(".", ",")} ${i.unit}` : i.qty > 1 ? `${i.qty}x` : "");

// Lista de compras: adicionar, marcar no carrinho, editar, excluir com Desfazer e compartilhar.
export default function ShoppingScreen() {
  const { c } = useTheme();
  const { state, perform, confirm, show, undoLabel, redoLabel, rewindShopping } = useStore();
  const nav = useNav();
  const [showPaste, setShowPaste] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const pasteButton = useRef<ViewControl>(null);
  const editControls = useRef(new Map<string, ViewControl>());
  const cartControls = useRef(new Map<string, ViewControl>());
  const [cartFocus, setCartFocus] = useState("");
  const [cartStatus, setCartStatus] = useState("");
  const [manage, setManage] = useState(false);
  const [editor, setEditor] = useState<{ rename?: boolean; template?: any } | null>(null);
  const [listName, setListName] = useState("");
  const lists = shoppingListsOf(state);
  const selectedId = activeShoppingList(state);
  const selected = lists.find((list: any) => list.id === selectedId);
  const saveList = async () => {
    if (!editor) return;
    const changed = await perform((s: any) => editor.rename ? renameList(s, selectedId, listName) :
      createShoppingList(s, listName, editor.template), editor.rename ? "lista renomeada" : "lista criada");
    if (changed) { setEditor(null); setQuery(""); setShowPaste(false); }
  };

  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    const restock = () => {
      if (restockStaples(latest.current) !== latest.current)
        void perform((current: any) => restockStaples(current), "Itens recorrentes adicionados");
    };
    restock();
    const subscription = AppState.addEventListener("change", (status) => { if (status === "active") restock(); });
    return () => subscription.remove();
  }, [perform]);

  const selectedState = activeShoppingState(state);
  const items: any[] = itemsOf(selectedState);
  const sum = shoppingSummary(selectedState);
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const found: any[] = useMemo(() => (searching ? searchItems(selectedState, query) : []), [state.shoppingItems, selectedId, query, searching]);
  const groups = groupByCategory(searching ? { ...selectedState, shoppingItems: found } : selectedState);
  const draft = purchaseDraft(selectedState);
  // Preço sugerido do histórico: só para itens sem preço digitado; a pessoa confirma antes de aplicar.
  const suggestions = useMemo(() => suggestPrices(selectedState), [state.shoppingItems, state.shoppingProducts, selectedId]);
  const applySuggestions = () =>
    void perform((s: any) => editActiveShoppingItems(s, (scope: any) => applySuggestedPrices(scope)), `${suggestions.length} ${suggestions.length === 1 ? "preço aplicado" : "preços aplicados"}`);
  const shareCode = () => {
    const r: any = encodeShareCode(selectedState, { now: Date.now() });
    if (!r.ok) return void Share.share({ message: r.reason || "Não foi possível gerar o código." }).catch(() => {});
    void Share.share({
      message: `Lista de compras do Floco Finanças. Cole este código em "Colar lista" no app (sem preços):\n${r.code}`,
    }).catch(() => {});
  };
  const exportCsv = () => void Share.share({ message: listToCsv(selectedState), title: "Lista de compras (CSV)" }).catch(() => {});

  useEffect(() => {
    if (!cartFocus) return;
    focusAccessibility(cartControls.current.get(cartFocus));
    setCartFocus("");
  }, [cartFocus, state.shoppingItems]);
  const toggle = async (item: any) => {
    const action = item.inCart ? "item tirado do carrinho" : "item colocado no carrinho";
    if (await perform((s: any) => toggleCart(s, item.id), action)) {
      setCartStatus(`${item.name} ${item.inCart ? "voltou aos pendentes" : "foi para o carrinho"}.`);
      setCartFocus(item.id);
    }
  };
  const closePaste = () => {
    setShowPaste(false);
    requestAnimationFrame(() => focusAccessibility(pasteButton.current));
  };
  const closeItem = (id: string) => {
    setEditId(null);
    focusAccessibility(editControls.current.get(id));
  };
  const remove = async (id: string) => {
    const ok = await perform((s: any) => removeItem(s, id).state, "item removido");
    if (ok && editId === id) setEditId(null);
  };

  const share = () => void Share.share({ message: shareText(selectedState) }).catch(() => {});

  return (
    <>
      <View style={[k.row, { gap: space.sm, marginBottom: space.sm }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Lista de compras: ${selected?.name || "Minha lista"}`}
          onPress={() => setManage(true)}
          style={[k.row, { flex: 1, minHeight: 48, gap: space.xs, paddingHorizontal: space.sm, backgroundColor: c.surface, borderRadius: 12 }]}>
          <T style={{ flex: 1 }}>{selected?.name || "Minha lista"}</T>
          <I name="chevron-down" color={c.text} />
        </Pressable>
        <IconButton name="rotate-ccw" label={undoLabel || "Desfazer"} disabled={!undoLabel} onPress={() => void rewindShopping("undo")} />
        <IconButton name="rotate-cw" label={redoLabel || "Refazer"} disabled={!redoLabel} onPress={() => void rewindShopping("redo")} />
      </View>
      {manage && <SheetModal title="Gerenciar listas" onClose={() => { setManage(false); setEditor(null); }}>
        <ScrollView contentContainerStyle={{ gap: space.sm, padding: space.lg }} keyboardShouldPersistTaps="handled">
          <Choice label="Lista de compras" values={lists.filter((list: any) => !list.archived).map((list: any) => [list.id, list.name])}
            value={selectedId} onChange={(id) => { setManage(false); setQuery(""); setShowPaste(false); void perform((s: any) => ({ ...s, shoppingListId: id }), ""); }} />
          <Button title="Criar lista" secondary onPress={() => { setManage(false); setListName(""); setEditor({}); }} />
          <Button title="Renomear lista" secondary onPress={() => { setManage(false); setListName(selected?.name || ""); setEditor({ rename: true }); }} />
          <Button title="Excluir lista" secondary disabled={lists.filter((list: any) => !list.archived).length <= 1} onPress={() =>
            confirm("Excluir lista?", "Você pode recuperar a lista nas opções de listas.", () =>
              void perform((s: any) => migrateShoppingLists(archiveList(s, selectedId)), "lista excluída"), "Excluir")} />
          <Button title="Salvar lista como modelo" secondary onPress={() => void perform((s: any) => ({
            ...s, shoppingListTemplates: [...(s.shoppingListTemplates || []).filter((template: any) => template.name !== selected?.name),
              { id: uid(), ...saveAsTemplate(s, selectedId) }].slice(-20),
          }), "modelo salvo")} />
          {(state.shoppingListTemplates || []).map((template: any) => (
            <Button key={template.id} title={`Usar modelo ${template.name}`} secondary onPress={() => { setManage(false); setListName(""); setEditor({ template }); }} />
          ))}
          {lists.filter((list: any) => list.archived).map((list: any) => (
            <Button key={list.id} title={`Recuperar lista ${list.name}`} secondary onPress={() => void perform((s: any) => ({
              ...s, shoppingLists: shoppingListsOf(s).map((entry: any) => entry.id === list.id ? { ...entry, archived: false } : entry),
              shoppingListId: list.id,
            }), "lista recuperada")} />
          ))}
        </ScrollView>
      </SheetModal>}
        {editor && <SheetModal title={editor.rename ? "Renomear lista" : "Criar lista"} onClose={() => setEditor(null)}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }} keyboardShouldPersistTaps="handled">
            <Field label="Nome da lista" value={listName} onChange={setListName} maxLength={60} />
            <Button title="Salvar lista" disabled={!listName.trim()} onPress={() => void saveList()} />
            <Button title="Cancelar" secondary onPress={() => setEditor(null)} />
          </ScrollView>
        </SheetModal>}
      <Muted accessibilityLiveRegion="polite">{cartStatus}</Muted>
      {items.length === 0 ? (
        <>
          <Empty
            icon="shopping-cart"
            title="Nenhum item na lista"
            body="Digite o que precisa comprar. Use 2 leite para indicar a quantidade."
          />
          <View style={{ gap: space.sm }}>
            <Button title="Escanear produto" icon="maximize" secondary onPress={() => nav.push({ name: "scanProduct" })} />
            <Button title="Ler nota fiscal" icon="camera" secondary onPress={() => nav.push({ name: "scanNota" })} />
            <Button title="Histórico de compras" icon="clock" secondary onPress={() => nav.push({ name: "purchases" })} />
          </View>
        </>
      ) : (
        <>
          {items.length > 8 && (
            <View style={{ marginTop: 12 }}>
              <Field label="Buscar na lista" value={query} onChange={setQuery} placeholder="Ex.: leite" maxLength={60} />
              {searching && (
                <Muted accessibilityLiveRegion="polite">
                  {found.length === 0 ? "Nenhum item com esse nome." : `${found.length} ${found.length === 1 ? "item encontrado" : "itens encontrados"}.`}
                </Muted>
              )}
            </View>
          )}

          {groups.map((g) => (
            <View key={g.category}>
              <Section title={g.category} icon={<CategoryIcon category={g.category} />} />
              <Box style={{ padding: 0, overflow: "hidden" }}>
                {g.items.map((i: any, idx: number) => (
                  <View key={i.id} style={idx < g.items.length - 1 && [k.hairline, { borderBottomColor: c.line }]}>
                    <ItemRow
                      item={i}
                      editing={editId === i.id}
                      onToggle={() => void toggle(i)}
                      onCartRef={(node: ViewControl | null) => { if (node) cartControls.current.set(i.id, node); else cartControls.current.delete(i.id); }}
                      onEditRef={(node: ViewControl | null) => { if (node) editControls.current.set(i.id, node); else editControls.current.delete(i.id); }}
                      onEdit={() => setEditId(editId === i.id ? null : i.id)}
                      onRemove={() => void remove(i.id)}
                      show={show}
                    />
                    {editId === i.id && <EditPanel item={i} onDone={() => closeItem(i.id)} />}
                  </View>
                ))}
              </Box>
            </View>
          ))}

          <View accessible accessibilityLabel={summaryLabel(sum, show)}>
          <Box style={{ gap: 4 }}>
            <T style={{ fontFamily: "SoraSemi" }}>
              {sum.pending === 0 ? "Tudo no carrinho" : `${sum.pending} ${sum.pending === 1 ? "item pendente" : "itens pendentes"}`}
            </T>
            <Muted>
              {sum.estimatedCents > 0 ? `Estimativa ${show(sum.estimatedCents)}` : "Sem preços informados"}
              {sum.unpriced > 0 && sum.estimatedCents > 0 ? ` · ${sum.unpriced} sem preço` : ""}
              {sum.inCart > 0 ? ` · ${sum.inCart} no carrinho` : ""}
            </Muted>
          </Box>
          </View>

          {suggestions.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Box style={{ gap: 8 }}>
                <T style={{ fontFamily: "SoraSemi" }}>
                  {suggestions.length === 1 ? "1 item com preço no histórico" : `${suggestions.length} itens com preço no histórico`}
                </T>
                <Muted>
                  {suggestions
                    .slice(0, 3)
                    .map((s: any) => `${s.name} ${show(s.priceCents)}`)
                    .join(" · ")}
                  {suggestions.length > 3 ? ` e mais ${suggestions.length - 3}` : ""}
                </Muted>
                <Button title="Usar preços do histórico" icon="tag" secondary onPress={applySuggestions} />
              </Box>
            </View>
          )}

          <View style={{ marginTop: 16, gap: 8 }}>
            {draft.items > 0 && (
              <>
                <Button
                  title="Registrar despesa"
                  icon="dollar-sign"
                  onPress={() => {
                    const open = () =>
                      nav.push({
                        name: "form",
                        kind: "transaction",
                        initial: { type: "expense", amount: draft.amountText, description: draft.description },
                      });
                    const date = today();
                    const single = () => {
                      if (wouldDuplicate(state, { type: "expense", amount: draft.amountText, description: draft.description, date })) {
                        Alert.alert("Já existe uma despesa parecida", "Há uma despesa de mercado com valor e data próximos. Registrar mesmo assim?", [
                          { text: "Cancelar", style: "cancel" },
                          { text: "Registrar", onPress: open },
                        ]);
                      } else open();
                    };
                    Alert.alert("Registrar compra", "Escolha como registrar o total.", [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Uma despesa", onPress: single },
                      { text: "Dividir por categoria", onPress: () => nav.push(reviewExpenses(items)) },
                    ]);
                  }}
                />
                <Muted>
                  {draft.priced > 0
                    ? `Valor sugerido pelos itens no carrinho com preço${draft.unpriced ? `; ${draft.unpriced} sem preço ficam de fora` : ""}. Você confirma no formulário.`
                    : "Nenhum item no carrinho tem preço. Informe o valor no formulário."}
                </Muted>
              </>
            )}
            <Button title="Modo compra" icon="shopping-bag" onPress={() => nav.push({ name: "shoppingTrip" })} />
            <Button title="Escanear produto" icon="maximize" secondary onPress={() => nav.push({ name: "scanProduct" })} />
            <Button title="Ler nota fiscal" icon="camera" secondary onPress={() => nav.push({ name: "scanNota" })} />
            <Button title="Histórico de compras" icon="clock" secondary onPress={() => nav.push({ name: "purchases" })} />
            <Button title="Exportar em CSV" icon="download" secondary onPress={exportCsv} />
            <Button title="Compartilhar lista" icon="share-2" secondary onPress={share} />
            <Button title="Compartilhar código (sem preços)" icon="link" secondary onPress={shareCode} />
            {sum.inCart > 0 && (
              <Button
                title="Remover itens do carrinho"
                icon="check-circle"
                secondary
                onPress={() =>
                  confirm(
                    "Limpar o carrinho?",
                    `${sum.inCart} ${sum.inCart === 1 ? "item marcado sairá" : "itens marcados sairão"} da lista.`,
                    () => void perform((s: any) => clearCart(s), "Carrinho limpo"),
                    "Limpar",
                  )
                }
              />
            )}
          </View>
        </>
      )}
      <View style={{ marginBottom: 12 }}>
        {showPaste
          ? <ShoppingPastePanel onClose={closePaste} />
          : <Button title="Colar lista" controlRef={pasteButton} icon="clipboard" secondary onPress={() => setShowPaste(true)} />}
      </View>
    </>
  );
}

function summaryLabel(sum: any, show: (n: number) => string) {
  const base = sum.pending === 0 ? "Tudo no carrinho" : `${sum.pending} ${sum.pending === 1 ? "item pendente" : "itens pendentes"}`;
  return sum.estimatedCents > 0 ? `${base}. Estimativa ${show(sum.estimatedCents)}` : base;
}

function ItemRow({ item, editing, onToggle, onEdit, onRemove, onEditRef, onCartRef, show }: any) {
  const { c } = useTheme();
  const total = lineTotal(item);
  const q = qtyText(item);
  return (
    <View style={[k.row, { minHeight: 56, paddingLeft: 4, paddingRight: 4, gap: 0 }]}>
      <Pressable
        ref={onCartRef}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.inCart }}
        accessibilityLabel={item.inCart ? `${item.name}, no carrinho` : `${item.name}, pendente`}
        accessibilityHint="Toque duas vezes para alternar"
        onPress={onToggle}
        style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: item.inCart ? c.primary : c.muted,
            backgroundColor: item.inCart ? c.primary : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {item.inCart && <I name="check" size={16} color={c.onPrimary} />}
        </View>
      </Pressable>
      <Pressable
        ref={onEditRef}
        accessibilityRole="button"
        accessibilityLabel={`Editar ${item.name}, ${q || "1 unidade"}, ${total == null ? "sem preço" : show(total)}`}
        accessibilityState={{ expanded: editing }}
        onPress={onEdit}
        style={{ flex: 1, minHeight: 48, justifyContent: "center", paddingVertical: 6 }}
      >
        <T style={item.inCart ? { color: c.muted, textDecorationLine: "line-through" } : undefined}>
          {item.name}
        </T>
        {(q !== "" || total != null) && (
          <Muted>
            {q}
            {q !== "" && total != null ? " · " : ""}
            {total != null ? show(total) : ""}
          </Muted>
        )}
      </Pressable>
      <IconButton name="trash-2" label={`Excluir ${item.name}`} onPress={onRemove} />
    </View>
  );
}

function EditPanel({ item, onDone }: { item: any; onDone: () => void }) {
  const { perform } = useStore();
  const [name, setName] = useState(`${item.unit || item.qty > 1 ? `${item.qty}${item.unit ? item.unit : "x"} ` : ""}${item.name}`);
  const [price, setPrice] = useState(priceText(item.priceCents));
  const [category, setCategory] = useState<string>(item.category);
  const [staple, setStaple] = useState(item.staple === true);
  const [days, setDays] = useState(String(item.everyDays || 7));
  const [promotion, setPromotion] = useState<string>(item.deal?.type || "none");
  const [percent, setPercent] = useState(String(item.deal?.value ?? "").replace(".", ","));
  const [take, setTake] = useState(String(item.deal?.x ?? 3));
  const [pay, setPay] = useState(String(item.deal?.y ?? 2));
  // A categoria atual vem primeiro: a fileira rola e o estado selecionado nunca fica fora da tela.
  const cats = useMemo(() => [item.category, ...SHOPPING_CATEGORIES.filter((x: string) => x !== item.category)], []);
  const [error, setError] = useState("");

  const save = async () => {
    try {
      const number = (input: string) => /^\d+(?:[,.]\d+)?$/u.test(input.trim()) ? Number(input.replace(",", ".")) : NaN;
      const deal = promotion === "percent" ? { type: promotion, value: number(percent) } :
        promotion === "buyXPayY" ? { type: promotion, x: number(take), y: number(pay) } :
        promotion === "none" ? null : item.deal;
      const data = { text: name, price, category, everyDays: staple ? number(days) : null, deal };
      configureShoppingItem({ shoppingItems: [item] }, item.id, data);
      const ok = await perform((s: any) => configureShoppingItem(s, item.id, data), "Item atualizado");
      if (ok) onDone();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <SheetModal title="Editar item" onClose={onDone}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Field label="Nome e quantidade" value={name} onChange={setName} maxLength={80} hint="Ex.: 2 leite ou 500g farinha" />
      <Field
        label="Preço (opcional)"
        value={price}
        onChange={setPrice}
        numeric
        placeholder="0,00"
        hint={item.unit ? "Preço da porção inteira." : "Preço de uma unidade."}
      />
      <Choice label="Categoria do item" values={cats.map((x: string) => [x, x] as [string, string])} value={category} onChange={setCategory} />
      <Toggle label="Sempre comprar" value={staple} onChange={setStaple} />
      {staple && <Field label="Repetir a cada quantos dias" value={days} onChange={setDays} numeric />}
      <T accessibilityRole="header">Promoção</T>
      <Segmented values={item.deal?.type === "amountOff" || item.deal?.type === "unitPrice"
        ? [["none", "Sem promoção"], ["percent", "Desconto em %"], ["buyXPayY", "Leve e pague"], [item.deal.type, "Promoção atual"]]
        : [["none", "Sem promoção"], ["percent", "Desconto em %"], ["buyXPayY", "Leve e pague"]]} value={promotion} onChange={setPromotion} />
      {promotion === "percent" && <Field label="Percentual de desconto" value={percent} onChange={setPercent} numeric />}
      {promotion === "buyXPayY" && <>
        <Field label="Leve quantas unidades" value={take} onChange={setTake} numeric />
        <Field label="Pague quantas unidades" value={pay} onChange={setPay} numeric />
      </>}
      {!!error && <Muted accessibilityLiveRegion="polite">{error}</Muted>}
      <Button title="Salvar" onPress={save} />
      <Button title="Cancelar" secondary onPress={onDone} />
      </ScrollView>
    </SheetModal>
  );
}

// Barra de adicionar fixa na base (fora da rolagem): o polegar alcança e o teclado envia.
export function ShoppingAddBar({ autoFocus }: { autoFocus?: boolean }) {
  const { height } = useWindowDimensions();
  const { c } = useTheme();
  const { state, perform } = useStore();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const ready = text.trim().length > 0;
  const names: string[] = useMemo(
    () => (text.trim().length >= 2 ? suggestNames(activeShoppingState(state), text, { limit: 4, now: Date.now() } as any) : []),
    [state.shoppingProducts, state.shoppingItems, state.shoppingListId, text],
  );
  const pick = (name: string) => {
    const { qty } = completeQuantity(text);
    setText(qty > 1 ? `${qty} ${name}` : name);
    setError("");
  };

  const add = async () => {
    if (!ready) return;
    try {
      const next = text;
      addShoppingItem(state, next); // valida antes de gravar
      const ok = await perform((s: any) => addShoppingItem(s, next), "item adicionado");
      if (ok) {
        setText("");
        setError("");
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: c.line,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        gap: 4,
      }}
    >
      {!!error && (
        <Muted accessibilityLiveRegion="polite" style={{ color: c.red }}>
          {error}
        </Muted>
      )}
      {names.length > 0 && (
        <View style={[k.row, { gap: 8, flexWrap: "wrap" }]}>
          {names.map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`Usar ${n}`}
              onPress={() => pick(n)}
              style={{ minHeight: 48, paddingHorizontal: 14, borderRadius: 22, backgroundColor: c.soft, justifyContent: "center" }}
            >
              <T>{n}</T>
            </Pressable>
          ))}
        </View>
      )}
      <View style={[k.row, { gap: 8 }]}>
        <TextInput
          accessibilityLabel="Adicionar item"
          accessibilityHint="Digite o item, por exemplo 2 leite, e toque em adicionar"
          value={text}
          onChangeText={(v) => {
            setText(v);
            setError("");
          }}
          placeholder="Adicionar item, ex.: 2 leite"
          placeholderTextColor={c.muted}
          autoFocus={autoFocus}
          maxLength={80}
          returnKeyType="done"
          blurOnSubmit={false}
          onSubmitEditing={add}
          style={[k.input, { flex: 1, backgroundColor: c.bg, color: c.text, borderColor: c.line, fontFamily: "Sora" }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={() => void add()}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: c.primary,
            opacity: ready ? 1 : 0.35,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I name="plus" color={c.onPrimary} />
        </Pressable>
      </View>
      <ScrollView nestedScrollEnabled style={{ maxHeight: height / 3, flexGrow: 0 }} keyboardShouldPersistTaps="handled">
        <RestockList alerts />
      </ScrollView>
    </View>
  );
}
