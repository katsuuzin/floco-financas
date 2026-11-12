import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Pressable, Share, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import { AmountField, Box, Button, Choice, Empty, Field, I, IconButton, Muted, Segmented, T, Toggle, focusAccessibility, type ViewControl, radius, space, styles as k } from "../ui/kit";
import MotionPressable from "../ui/motion";
import { useTheme } from "../ui/theme";
import { listTone } from "../tones.mjs";
import { SheetModal } from "../ui/pickers";
import { CategoryBadge } from "../ui/ShoppingIcons";
import { PhotoField, removePhoto } from "../ui/ItemPhoto";
import { ConfirmSheet } from "../ui/Sheet";
import SwipeRow from "../ui/SwipeRow";
import Animated, { Easing as Ease, FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useStore } from "../app/store";
import { reviewExpenses, useNav } from "../app/nav";
import { wouldDuplicate } from "../shoppingReconcile.mjs";
import ShoppingPastePanel from "./ShoppingPastePanel";
import ShoppingVoicePanel from "./ShoppingVoicePanel";
import RestockList from "./RestockList";
import { ListEditorSheet } from "./ShoppingListsScreen";
import { archiveList, renameList, saveAsTemplate } from "../shoppingLists.mjs";
import { uid, today } from "../finance.mjs";
import { brDate } from "../dates.mjs";
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
  listOverview,
  toggleCart,
  setItemStatus,
  setItemPhoto,
  categorize,
  parseItemText,
  CART_GROUP,
} from "../shopping.mjs";
import { applySuggestedPrices, suggestPrices } from "../shoppingSuggestPrice.mjs";
import { listToCsv } from "../shoppingExport.mjs";
import { searchItems } from "../shoppingSearch.mjs";
import { suggestNames, completeQuantity } from "../shoppingAutocomplete.mjs";
import { encodeShareCode } from "../shoppingShareCode.mjs";
import { productKey } from "../shoppingPurchases.mjs";

const priceText = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2).replace(".", ","));
const qtyChip = (i: any) => (i.unit ? `${String(i.qty).replace(".", ",")} ${i.unit}` : i.qty > 1 ? `${i.qty}×` : "");
const UNIT_WORDS: Record<string, [string, string]> = { g: ["grama", "gramas"], kg: ["quilo", "quilos"], ml: ["mililitro", "mililitros"], l: ["litro", "litros"] };
const qtySpoken = (i: any) => {
  const n = String(i.qty).replace(".", ",");
  if (i.unit && UNIT_WORDS[i.unit]) return `${n} ${UNIT_WORDS[i.unit][i.qty === 1 ? 0 : 1]}`;
  return `${n} ${i.qty === 1 ? "unidade" : "unidades"}`;
};

// Lista de compras: adicionar, marcar no carrinho, editar, excluir com Desfazer e compartilhar.
export default function ShoppingScreen({ add: autoAdd }: { add?: boolean } = {}) {
  const { c, dark } = useTheme();
  const { fontScale } = useWindowDimensions();
  const big = fontScale > 1.5;
  const { state, perform, confirm, show, undoLabel, redoLabel, rewindShopping } = useStore();
  const nav = useNav();
  const [showPaste, setShowPaste] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const pasteButton = useRef<ViewControl>(null);
  const editControls = useRef(new Map<string, ViewControl>());
  const cartControls = useRef(new Map<string, ViewControl>());
  const [cartFocus, setCartFocus] = useState("");
  const [cartStatus, setCartStatus] = useState("");
  const [manage, setManage] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  // Recém-adicionados: ficam 7 s no topo antes de ir para o grupo (só na tela, nada é gravado).
  const [recent, setRecent] = useState<string[]>([]);
  const recentTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const dropRecent = (id: string) => {
    const t = recentTimers.current.get(id);
    if (t) clearTimeout(t);
    recentTimers.current.delete(id);
    setRecent((list) => list.filter((x) => x !== id));
  };
  const onAdded = (id: string, label: string, category: string) => {
    setRecent((list) => [id, ...list.filter((x) => x !== id)].slice(0, 3));
    recentTimers.current.set(id, setTimeout(() => dropRecent(id), RECENT_MS));
    setCartStatus(`${label} adicionado em ${category}.`);
  };
  useEffect(() => () => { recentTimers.current.forEach(clearTimeout); }, []);
  // Entradas animadas só depois da primeira pintura (abrir a lista não faz tudo esmaecer).
  const [animate, setAnimate] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimate(true), 400); return () => clearTimeout(t); }, []);
  const [sheet, setSheet] = useState<"" | "share" | "more" | "scan" | "trip">("");
  const [tripPick, setTripPick] = useState<string[]>([]);
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
  const recentSet = new Set(recent);
  const recentItems = recent.map((id) => items.find((i: any) => i.id === id)).filter((i: any) => i && !i.inCart && !i.status);
  const groups = groupByCategory(searching ? { ...selectedState, shoppingItems: found } :
    { ...selectedState, shoppingItems: items.filter((i: any) => !recentSet.has(i.id) || i.inCart || i.status) });
  const editItem = editId ? items.find((i: any) => i.id === editId) : null;
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
    const name = items.find((item: any) => item.id === id)?.name || "Item";
    const ok = await perform((s: any) => removeItem(s, id).state, `${name} apagado`, { undoable: true });
    if (ok && editId === id) setEditId(null);
  };

  // Faltou / Depois: tocar de novo no mesmo estado volta ao normal.
  const changeStatus = async (item: any, status: "missing" | "later") => {
    const next = item.status === status ? null : status;
    const label = next === "missing" ? "marcado como faltou" : next === "later" ? "fica para outra compra" : "voltou para a lista";
    if (await perform((s: any) => setItemStatus(s, item.id, next), `${item.name} ${label}`, { undoable: true }))
      setCartStatus(`${item.name} ${label}.`);
  };

  const share = () => void Share.share({ message: shareText(selectedState) }).catch(() => {});

  const tone = listTone(selected?.color, dark);
  const name = selected?.name || "Minha lista";
  const progress = sum.total === 0 ? (sum.later ? `${sum.later} para outra compra` : "Nada por aqui ainda")
    : `${sum.inCart} de ${sum.total} no carrinho`;
  const openSheet = (next: "" | "share" | "more" | "scan" | "trip") => setSheet(next);
  // Com mais de uma lista com itens pendentes, pergunta quais listas entram na compra; com uma só, entra direto.
  const tripLists = (listOverview(state) as any[]).filter((row) => row.kind === "list" && row.pending > 0);
  const goShopping = () => {
    if (tripLists.length < 2) { nav.push({ name: "shoppingTrip" }); return; }
    setTripPick([selectedId]);
    openSheet("trip");
  };
  const go = (route: any) => { setSheet(""); nav.push(route); };

  return (
    <>
      {/* Cabeçalho da lista: cor da lista, ações, nome, progresso, estimativa, barra de adicionar e atalhos. Rola junto. */}
      <View style={{ backgroundColor: tone.bg, borderRadius: radius.lg, padding: space.lg, paddingTop: space.sm, gap: space.sm }}>
        <View style={[k.row, { gap: space.xs, flexWrap: "wrap", justifyContent: "flex-end" }]}>
          {sum.total > 0 && (
            <MotionPressable kind="chip" accessibilityRole="button" accessibilityLabel="Ir às compras"
              onPress={goShopping}
              style={[k.row, { minHeight: 48, paddingHorizontal: space.lg, gap: space.sm, borderRadius: radius.pill, backgroundColor: tone.text,
                justifyContent: "center" }, big ? { width: "100%" } : { marginRight: "auto" }]}>
              <I name="shopping-cart" size={18} color={tone.bg} />
              <T style={{ color: tone.bg, fontFamily: "SoraSemi" }}>Ir às compras</T>
            </MotionPressable>
          )}
          <IconButton name="share-2" label="Compartilhar lista" color={tone.text} onPress={() => openSheet("share")} />
          <IconButton name="edit-2" label="Editar lista" color={tone.text} onPress={() => setManage(true)} />
          <IconButton name="more-vertical" label="Mais opções da lista" color={tone.text} onPress={() => openSheet("more")} />
        </View>
        <View style={[k.row, { gap: space.md, alignItems: "flex-start", flexWrap: big ? "wrap" : "nowrap" }]}>
          <View accessible accessibilityRole="header" accessibilityLabel={`Lista ${name}, ${progress}`}
            style={{ flex: 1, minHeight: 48, justifyContent: "center", gap: 2 }}>
            <T maxFontSizeMultiplier={1.6} style={{ fontFamily: "SoraSemi", fontSize: 28, lineHeight: 34, color: tone.text }}>{name}</T>
            <T style={{ color: tone.sub }}>{progress}</T>
          </View>
          {sum.estimatedCents > 0 && (
            <View accessible accessibilityLabel={`Estimativa ${show(sum.estimatedCents)}${sum.unpriced ? `, ${sum.unpriced} sem preço` : ""}`} style={{ alignItems: big ? "flex-start" : "flex-end" }}>
              <T style={{ fontSize: 12, color: tone.sub }}>Estimativa</T>
              <T style={{ fontFamily: "SoraSemi", fontSize: 22, color: tone.text, fontVariant: ["tabular-nums"] }}>{show(sum.estimatedCents)}</T>
            </View>
          )}
        </View>
        <ShoppingAddBar autoFocus={autoAdd} onAdded={onAdded} />
        <View style={[k.row, { justifyContent: "center", gap: space.xs, flexWrap: "wrap" }]}>
          <Shortcut icon="mic" label="Falar" color={tone.text} onPress={() => setShowVoice(true)} />
          <Shortcut icon="clipboard" label="Colar lista" color={tone.text} controlRef={pasteButton} onPress={() => setShowPaste(true)} />
          <Shortcut icon="maximize" label="Escanear" color={tone.text} onPress={() => openSheet("scan")} />
        </View>
      </View>

      {manage && <ListEditorSheet listId={selectedId} onClose={() => setManage(false)} onDeleted={() => nav.back()} />}
      {sheet === "trip" && <SheetModal title="Quais listas?" onClose={() => setSheet("")} footer={
        <View style={[k.row, { gap: space.sm }]}>
          <View style={{ flex: 1 }}><Button title="Cancelar" secondary onPress={() => setSheet("")} /></View>
          <View style={{ flex: 1 }}><Button title="Começar" disabled={tripPick.length === 0}
            onPress={() => { setSheet(""); nav.push({ name: "shoppingTrip", lists: tripPick }); }} /></View>
        </View>
      }>
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: space.xs, gap: space.sm }}>
          {tripLists.map((row: any) => {
            const on = tripPick.includes(row.id);
            return (
              <Pressable key={row.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                accessibilityLabel={`${row.name}, ${row.pending} ${row.pending === 1 ? "item" : "itens"} faltando${row.estimatedCents > 0 ? `, estimativa ${show(row.estimatedCents)}` : ""}`}
                onPress={() => setTripPick(on ? tripPick.filter((id) => id !== row.id) : [...tripPick, row.id])}
                style={[k.row, { minHeight: 56, gap: space.md, paddingHorizontal: space.md, borderRadius: radius.lg, backgroundColor: c.surface,
                  borderWidth: on ? 2 : 1, borderColor: on ? c.primary : c.line }]}>
                <View style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: on ? c.primary : c.muted,
                  backgroundColor: on ? c.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {on && <I name="check" size={18} color={c.onPrimary} />}
                </View>
                <View style={{ flex: 1, paddingVertical: space.sm }}>
                  <T style={{ fontFamily: "SoraSemi" }}>{row.name}</T>
                  <Muted>{`${row.pending} ${row.pending === 1 ? "item" : "itens"}${row.estimatedCents > 0 ? ` · ${show(row.estimatedCents)}` : ""}`}</Muted>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </SheetModal>}
      {sheet === "share" && <SheetModal title="Compartilhar" onClose={() => setSheet("")}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm }}>
          <Muted>Prévia do texto (só o que falta comprar)</Muted>
          <Box><T selectable>{shareText(selectedState)}</T></Box>
          <Button title="Enviar como texto" icon="send" onPress={() => { setSheet(""); share(); }} />
          <Button title="Compartilhar código (sem preços)" icon="link" secondary onPress={() => { setSheet(""); shareCode(); }} />
          <Button title="Exportar em CSV" icon="download" secondary onPress={() => { setSheet(""); exportCsv(); }} />
        </ScrollView>
      </SheetModal>}
      {sheet === "more" && <SheetModal title="Mais opções" onClose={() => setSheet("")}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm }}>
          <Button title={undoLabel || "Nada para desfazer"} icon="rotate-ccw" secondary disabled={!undoLabel}
            onPress={() => { setSheet(""); void rewindShopping("undo"); }} />
          <Button title={redoLabel || "Nada para refazer"} icon="rotate-cw" secondary disabled={!redoLabel}
            onPress={() => { setSheet(""); void rewindShopping("redo"); }} />
          <Button title="Histórico de compras" icon="clock" secondary onPress={() => go({ name: "purchases" })} />
        </ScrollView>
      </SheetModal>}
      {sheet === "scan" && <SheetModal title="Escanear" onClose={() => setSheet("")}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm }}>
          <Button title="Código de barras do produto" icon="maximize" onPress={() => go({ name: "scanProduct" })} />
          <Button title="Nota fiscal" icon="camera" secondary onPress={() => go({ name: "scanNota" })} />
        </ScrollView>
      </SheetModal>}
      {showVoice && <SheetModal title="Falar" onClose={() => setShowVoice(false)}>
        <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
          <ShoppingVoicePanel onClose={() => setShowVoice(false)} />
        </ScrollView>
      </SheetModal>}
      {showPaste && <SheetModal title="Colar lista" onClose={closePaste}>
        <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
          <ShoppingPastePanel onClose={closePaste} />
        </ScrollView>
      </SheetModal>}
      {clearing && (
        <ConfirmSheet
          title="Limpar os comprados?"
          changes={[`${sum.inCart} ${sum.inCart === 1 ? "item no carrinho" : "itens no carrinho"}`]}
          keeps={["Os que faltam, os de outra compra e os que faltaram", "Histórico de compras e preços"]}
          action="Limpar"
          onClose={() => setClearing(false)}
          onConfirm={() => {
            setClearing(false);
            const n = sum.inCart;
            void perform((s: any) => clearCart(s), `${n} ${n === 1 ? "item limpo" : "itens limpos"}`, { undoable: true });
          }}
        />
      )}

      <Muted accessibilityLiveRegion="polite">{cartStatus}</Muted>
      {items.length > 8 && (
        <View style={{ marginTop: space.sm }}>
          <Field label="Buscar na lista" value={query} onChange={setQuery} placeholder="Ex.: leite" maxLength={60} />
          {searching && (
            <Muted accessibilityLiveRegion="polite">
              {found.length === 0 ? "Nenhum item com esse nome." : `${found.length} ${found.length === 1 ? "item encontrado" : "itens encontrados"}.`}
            </Muted>
          )}
        </View>
      )}
      <View style={{ marginTop: space.sm }}>
        <RestockList alerts />
      </View>
      {!searching && recentItems.length > 0 && (
        <Animated.View layout={LinearTransition.duration(200)} entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}
          style={{ marginTop: space.md, padding: space.sm, gap: space.xs, borderRadius: radius.lg, backgroundColor: c.surface }}>
          <Muted accessibilityRole="header" style={{ fontSize: 13, paddingHorizontal: space.xs }}>Recém-adicionados</Muted>
          {recentItems.map((i: any) => (
            <Animated.View key={i.id} layout={LinearTransition.duration(200)} entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
              <RecentRow item={i} onEdit={() => setEditId(i.id)}
                onMark={() => { dropRecent(i.id); void toggle(i); }} />
            </Animated.View>
          ))}
        </Animated.View>
      )}
      {editItem && <EditPanel item={editItem} onDone={() => closeItem(editItem.id)} onRemove={() => void remove(editItem.id)} onAnnounce={setCartStatus} />}
      {items.length === 0 ? (
        <>
          <Empty icon="shopping-cart" title="Lista vazia" body="Escreva lá em cima o que falta em casa. Ex.: 2 leite." />
          <View style={{ gap: space.sm }}>
            <Button title="Ler nota fiscal" icon="camera" secondary onPress={() => nav.push({ name: "scanNota" })} />
            <Button title="Histórico de compras" icon="clock" secondary onPress={() => nav.push({ name: "purchases" })} />
          </View>
        </>
      ) : (
        <>
          {groups.map((g) => (
            <Animated.View key={g.category} layout={animate ? ROW_LAYOUT : undefined}
              entering={animate ? FadeIn.duration(200) : undefined} exiting={FadeOut.duration(150)}>
              <GroupHeader
                category={g.category}
                count={g.category === CART_GROUP ? g.items.length : undefined}
                action={g.category === CART_GROUP && !searching ? { label: "Limpar comprados", onPress: () => setClearing(true) } : undefined}
              />
              <View style={{ gap: space.xs }}>
                {g.items.map((i: any) => (
                  <Animated.View key={i.id} layout={animate ? ROW_LAYOUT : undefined}
                    entering={animate ? (g.category === CART_GROUP ? FadeIn.duration(200) : FadeIn.duration(150)) : undefined}
                    exiting={rowLeave}>
                    <SwipeRow id={i.id} openId={openId} onOpen={setOpenId} inCart={!!i.inCart}
                      onToggle={() => void toggle(i)} onEdit={() => setEditId(i.id)} onRemove={() => void remove(i.id)}>
                    <ItemRow
                      item={i}
                      editing={editId === i.id}
                      onToggle={() => { setOpenId(null); void toggle(i); }}
                      onCartRef={(node: ViewControl | null) => { if (node) cartControls.current.set(i.id, node); else cartControls.current.delete(i.id); }}
                      onEditRef={(node: ViewControl | null) => { if (node) editControls.current.set(i.id, node); else editControls.current.delete(i.id); }}
                      // Com uma linha aberta pelo deslizar, o toque só fecha (como tocar fora).
                      onEdit={() => { if (openId) setOpenId(null); else setEditId(editId === i.id ? null : i.id); }}
                      onRemove={() => void remove(i.id)}
                      onStatus={(status: "missing" | "later") => void changeStatus(i, status)}
                      show={show}
                    />
                    </SwipeRow>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          ))}

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

          <View style={{ marginTop: space.lg, gap: space.sm, marginBottom: space.lg }}>
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
          </View>
        </>
      )}
    </>
  );
}

function summaryLabel(sum: any, show: (n: number) => string) {
  const base = sum.pending === 0 ? "Tudo no carrinho" : `${sum.pending} ${sum.pending === 1 ? "item pendente" : "itens pendentes"}`;
  return sum.estimatedCents > 0 ? `${base}. Estimativa ${show(sum.estimatedCents)}` : base;
}

const RECENT_MS = 7000;
// As outras linhas assentam em 200 ms, com desaceleração e sem ricochete (A4).
const ROW_LAYOUT = LinearTransition.duration(200).easing(Ease.out(Ease.cubic));
// A linha marcada sai do grupo: esmaece e sobe 8 dp em 150 ms.
const rowLeave = () => {
  "worklet";
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
    animations: { opacity: withTiming(0, { duration: 150 }), transform: [{ translateY: withTiming(-8, { duration: 150 }) }] },
  };
};

// Linha do bloco Recém-adicionados: ícone em círculo com a contagem embaixo (esvazia em 7 s), nome,
// quantidade, Editar e ✓ (marca). Com "remover animações", a linha de contagem não anima.
function RecentRow({ item, onEdit, onMark }: { item: any; onEdit: () => void; onMark: () => void }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const left = useSharedValue(1);
  useEffect(() => { if (!reduce) left.value = withTiming(0, { duration: RECENT_MS, easing: Ease.linear }); }, []);
  const bar = useAnimatedStyle(() => ({ width: `${left.value * 100}%` }));
  const q = qtyChip(item);
  return (
    <View style={[k.row, { gap: space.sm, minHeight: 56 }]}>
      <View style={{ alignItems: "center", gap: 4, width: 44 }}>
        <CategoryBadge category={item.category} size={36} />
        <View style={{ height: 3, width: 36, borderRadius: 2, backgroundColor: c.line, overflow: "hidden" }}>
          <Animated.View style={[{ height: 3, backgroundColor: c.primary }, bar]} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <T>{item.name}</T>
        {!!q && <Muted>{q}</Muted>}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${item.name}`} onPress={onEdit}
        style={{ minHeight: 48, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: c.soft, justifyContent: "center" }}>
        <T style={{ fontFamily: "SoraSemi", fontSize: 14 }}>Editar</T>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Marcar ${item.name} como comprado`} onPress={onMark}
        style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: c.primary, alignItems: "center", justifyContent: "center" }}>
        <I name="check" color={c.primary} />
      </Pressable>
    </View>
  );
}

// Atalho em texto com ícone, alvo de 48 dp (abaixo da barra de adicionar).
function Shortcut({ icon, label, color, onPress, controlRef }: { icon: any; label: string; color: string; onPress: () => void; controlRef?: React.Ref<ViewControl> }) {
  return (
    <MotionPressable kind="chip" ref={controlRef as any} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={[k.row, { minHeight: 48, paddingHorizontal: space.md, gap: space.xs, justifyContent: "center" }]}>
      <I name={icon} size={18} color={color} />
      <T style={{ color, fontFamily: "SoraSemi", fontSize: 14 }}>{label}</T>
    </MotionPressable>
  );
}

// Cabeçalho de grupo: ícone em círculo + nome em maiúsculas espaçadas; à direita, ação opcional (48 dp).
function GroupHeader({ category, count, action }: { category: string; count?: number; action?: { label: string; onPress: () => void } }) {
  const { c } = useTheme();
  const title = count == null ? category : `${category} · ${count}`;
  return (
    <View style={[k.row, { marginTop: space.lg, marginBottom: space.xs, gap: space.sm, minHeight: 48, flexWrap: "wrap" }]}>
      <CategoryBadge category={category} size={24} />
      <T accessibilityRole="header" accessibilityLabel={title}
        style={{ flex: 1, minWidth: 140, fontFamily: "SoraSemi", fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: c.muted }}>
        {title}
      </T>
      {action && (
        <Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress} hitSlop={4}
          style={{ minHeight: 48, paddingHorizontal: space.sm, justifyContent: "center" }}>
          <T style={{ color: c.primary, fontFamily: "SoraSemi", fontSize: 14 }}>{action.label}</T>
        </Pressable>
      )}
    </View>
  );
}

const subtitleOf = (item: any) =>
  item.status === "missing" ? "Faltou no mercado" : item.status === "later" ? "Para outra compra" : item.details || "";

// Linha do item em pílula: círculo de marcar (alvo 56), nome, chip de quantidade e preço à direita.
// Com fonte grande (acima de 150%), o preço desce para a segunda linha.
function ItemRow({ item, editing, onToggle, onEdit, onRemove, onStatus, onEditRef, onCartRef, show }: any) {
  const { c } = useTheme();
  const { fontScale } = useWindowDimensions();
  const big = fontScale > 1.5;
  const total = lineTotal(item);
  const q = qtyChip(item);
  const sub = subtitleOf(item);
  const price = total == null ? "" : show(total);
  const spoken = [item.name, q ? qtySpoken(item) : "", price || "sem preço", sub].filter(Boolean).join(", ");
  const actions = [
    { name: "toggle", label: item.inCart ? "Desmarcar" : "Marcar como comprado" },
    { name: "edit", label: "Editar" },
    { name: "delete", label: "Apagar" },
    { name: "missing", label: item.status === "missing" ? "Tirar Faltou" : "Faltou" },
    { name: "later", label: item.status === "later" ? "Pôr de volta na lista" : "Depois" },
  ];
  const onAction = (e: any) => {
    const name = e.nativeEvent.actionName;
    if (name === "toggle") onToggle();
    else if (name === "edit") onEdit();
    else if (name === "delete") onRemove();
    else if (name === "missing" || name === "later") onStatus(name);
  };
  return (
    <View style={[k.row, { minHeight: 56, backgroundColor: c.surface, borderRadius: radius.lg, paddingRight: space.lg }]}>
      <Pressable
        ref={onCartRef}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.inCart }}
        accessibilityLabel={item.inCart ? `${item.name}, no carrinho` : `${item.name}, pendente`}
        accessibilityHint="Toque duas vezes para alternar"
        onPress={onToggle}
        style={{ width: 56, height: 56, alignItems: "center", justifyContent: "center" }}
      >
        <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2,
          borderColor: item.inCart ? c.primary : c.muted, backgroundColor: item.inCart ? c.primary : "transparent",
          alignItems: "center", justifyContent: "center" }}>
          {item.inCart && <I name="check" size={16} color={c.onPrimary} />}
        </View>
      </Pressable>
      <MotionPressable
        kind="row"
        ref={onEditRef}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityHint="Toque duas vezes para editar"
        accessibilityState={{ expanded: editing }}
        accessibilityActions={actions}
        onAccessibilityAction={onAction}
        onPress={onEdit}
        style={{ flex: 1, minHeight: 56, justifyContent: "center", paddingVertical: space.sm, gap: 2 }}
      >
        <View style={[k.row, { gap: space.sm }]}>
          <View style={[k.row, { flex: 1, gap: space.sm, flexWrap: "wrap" }]}>
            <T style={[{ flexShrink: 1 }, item.inCart ? { color: c.muted, textDecorationLine: "line-through" } : null]}>
              {item.name}
            </T>
            {!!q && (
              <View style={{ backgroundColor: c.soft, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 }}>
                <T style={{ fontSize: 13, color: item.inCart ? c.muted : c.text }}>{q}</T>
              </View>
            )}
          </View>
          {!big && !!price && (
            <T style={{ fontFamily: "SoraSemi", fontVariant: ["tabular-nums"], color: item.inCart ? c.muted : c.text }}>{price}</T>
          )}
        </View>
        {(!!sub || (big && !!price)) && (
          <Muted>{[big ? price : "", sub].filter(Boolean).join(" · ")}</Muted>
        )}
      </MotionPressable>
    </View>
  );
}

type ItemState = "cart" | "missing" | "later";

// Folha do item (1.12): nome, unidade ou peso, preço (com o último pago), quantidade, detalhes,
// três botões de estado que salvam e fecham, categoria, recorrente, promoção e rodapé Apagar | Salvar.
// X e voltar descartam.
function EditPanel({ item, onDone, onRemove, onAnnounce }: {
  item: any;
  onDone: () => void;
  onRemove: () => void;
  onAnnounce: (text: string) => void;
}) {
  const { c } = useTheme();
  const { state, perform, show } = useStore();
  const { fontScale } = useWindowDimensions();
  const big = fontScale > 1.5;
  const [name, setName] = useState(item.name);
  const [mode, setMode] = useState<"unit" | "weight">(item.unit ? "weight" : "unit");
  const [qty, setQty] = useState(item.unit ? 1 : Math.max(1, Math.round(item.qty)));
  const [amount, setAmount] = useState(item.unit ? `${String(item.qty).replace(".", ",")} ${item.unit}` : "");
  const [price, setPrice] = useState(priceText(item.priceCents));
  const [details, setDetails] = useState(item.details || "");
  const [category, setCategory] = useState<string>(item.category);
  const [staple, setStaple] = useState(item.staple === true);
  const [days, setDays] = useState(String(item.everyDays || 7));
  const [promotion, setPromotion] = useState<string>(item.deal?.type || "none");
  const [percent, setPercent] = useState(String(item.deal?.value ?? "").replace(".", ","));
  const [take, setTake] = useState(String(item.deal?.x ?? 3));
  const [pay, setPay] = useState(String(item.deal?.y ?? 2));
  const [error, setError] = useState("");
  // A categoria atual vem primeiro: a fileira rola e o estado selecionado nunca fica fora da tela.
  const cats = useMemo(() => [item.category, ...SHOPPING_CATEGORIES.filter((x: string) => x !== item.category)], []);
  const unitOfAmount = (/(kg|g|ml|l)\s*$/iu.exec(amount.trim())?.[1] || "").toLowerCase();
  const byKilo = mode === "weight" && (unitOfAmount === "g" || unitOfAmount === "kg");
  const last = useMemo(() => {
    const product = (state.shoppingProducts || []).find((entry: any) => entry.key === productKey(item.name, item.unit));
    return product?.lastPriceCents ? { cents: product.lastPriceCents, date: product.lastBoughtAt || "" } : null;
  }, [state.shoppingProducts]);
  const lastDate = last?.date ? ` em ${brDate(last.date)}` : "";

  const data = () => {
    const number = (input: string) => /^\d+(?:[,.]\d+)?$/u.test(input.trim()) ? Number(input.replace(",", ".")) : NaN;
    const clean = name.trim();
    if (!clean) throw Error("Informe o nome do item.");
    if (mode === "weight" && !unitOfAmount) throw Error("Informe o peso ou volume, por exemplo 500 g ou 1 l.");
    const text = mode === "weight" ? `${amount.trim()} ${clean}` : qty > 1 ? `${qty} ${clean}` : clean;
    const deal = promotion === "percent" ? { type: promotion, value: number(percent) } :
      promotion === "buyXPayY" ? { type: promotion, x: number(take), y: number(pay) } :
      promotion === "none" ? null : item.deal;
    return { text, price, category, everyDays: staple ? number(days) : null, deal, details, pricePer: byKilo ? "kg" as const : null };
  };

  const save = async (next?: ItemState) => {
    try {
      const values = data();
      const apply = (s: any) => {
        let out = configureShoppingItem(s, item.id, values);
        if (next === "cart") out = toggleCart(out, item.id);
        else if (next) out = setItemStatus(out, item.id, item.status === next ? null : next);
        return out;
      };
      apply({ ...state, shoppingItems: [item] }); // valida antes de gravar
      const label = next === "cart" ? (item.inCart ? `${values.text} saiu do carrinho` : "item no carrinho")
        : next === "missing" ? (item.status === "missing" ? "item voltou para a lista" : "item marcado como faltou")
        : next === "later" ? (item.status === "later" ? "item voltou para a lista" : "item fica para outra compra")
        : "Item atualizado";
      const ok = await perform(apply, label, next ? { undoable: true } : undefined);
      if (ok) {
        if (next) onAnnounce(`${name.trim()}: ${label.replace(/^item /u, "")}.`);
        onDone();
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const stateButton = (key: ItemState, label: string, icon: any, on: boolean) => (
    <MotionPressable key={key} kind="button" accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ selected: on }} onPress={() => void save(key)}
      style={{ flex: big ? undefined : 1, minHeight: 72, borderRadius: radius.md, alignItems: "center", justifyContent: "center", gap: space.xs,
        padding: space.sm, backgroundColor: key === "cart" ? c.primary : c.soft, borderWidth: on ? 2 : 0, borderColor: c.primary }}>
      <I name={icon} color={key === "cart" ? c.onPrimary : c.text} />
      <T style={{ fontFamily: "SoraSemi", fontSize: 14, textAlign: "center", color: key === "cart" ? c.onPrimary : c.text }}>{label}</T>
    </MotionPressable>
  );

  return (
    <SheetModal title={item.name} onClose={onDone} footer={
      <View style={{ gap: space.sm }}>
        {!!error && <Muted accessibilityLiveRegion="polite" style={{ color: c.red }}>{error}</Muted>}
        <View style={[k.row, { gap: space.sm }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Apagar ${item.name}`} onPress={() => { onDone(); onRemove(); }}
            style={[k.row, { flex: 1, minHeight: 56, borderRadius: radius.pill, backgroundColor: c.soft, justifyContent: "center", gap: space.xs }]}>
            <I name="trash-2" size={18} color={c.red} />
            <T style={{ fontFamily: "SoraSemi", color: c.red }}>Apagar</T>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Salvar" onPress={() => void save()}
            style={{ flex: 1.4, minHeight: 56, borderRadius: radius.pill, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
            <T style={{ fontFamily: "SoraSemi", color: c.onPrimary }}>Salvar</T>
          </Pressable>
        </View>
      </View>
    }>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, paddingTop: space.xs, gap: space.md }}>
        <Field label="Nome" value={name} onChange={setName} maxLength={80} />
        <Segmented values={[["unit", "Por unidade"], ["weight", "Por peso"]]} value={mode} onChange={setMode} />
        <AmountField label={mode === "unit" ? "Preço de cada" : byKilo ? "Preço do quilo" : "Preço da porção"} value={price} onChange={setPrice} />
        {last && (
          <View style={[k.row, { gap: space.sm }]}>
            <Muted style={{ flex: 1 }}>{`Última compra: ${show(last.cents)}${lastDate}`}</Muted>
            <Pressable accessibilityRole="button" accessibilityLabel={`Usar o preço da última compra, ${show(last.cents)}`}
              onPress={() => setPrice(priceText(last.cents))}
              style={{ minHeight: 48, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: c.soft, justifyContent: "center" }}>
              <T style={{ fontFamily: "SoraSemi", color: c.primary }}>Usar</T>
            </Pressable>
          </View>
        )}
        {mode === "unit" ? (
          <View style={{ gap: space.xs }}>
            <T style={{ fontFamily: "SoraSemi", fontSize: 14 }}>Quantidade</T>
            <View accessible accessibilityRole="adjustable" accessibilityLabel="Quantidade" accessibilityValue={{ text: String(qty) }}
              accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
              onAccessibilityAction={(e) => setQty((n) => e.nativeEvent.actionName === "increment" ? Math.min(999, n + 1) : Math.max(1, n - 1))}
              style={[k.row, { gap: space.md }]}>
              <IconButton name="minus" label="Diminuir" disabled={qty <= 1} onPress={() => setQty((n) => Math.max(1, n - 1))} />
              <T style={{ fontFamily: "SoraSemi", fontSize: 20, minWidth: 40, textAlign: "center", fontVariant: ["tabular-nums"] }}>{qty}</T>
              <IconButton name="plus" label="Aumentar" onPress={() => setQty((n) => Math.min(999, n + 1))} />
            </View>
          </View>
        ) : (
          <Field label="Peso ou volume" value={amount} onChange={setAmount} placeholder="Ex.: 500 g, 1,5 kg ou 2 l" maxLength={12} />
        )}
        <PhotoField itemId={item.id} itemName={item.name} photo={itemsOf(state).find((entry: any) => entry.id === item.id)?.photo}
          onChange={(name, old) => { void perform((s: any) => setItemPhoto(s, item.id, name), name ? "foto salva" : "foto removida").then((ok: boolean) => { if (ok && old) void removePhoto(old); }); }} />
        <Field label="Detalhes" value={details} onChange={setDetails} placeholder="Marca, sabor, tamanho…" maxLength={120} />
        <View style={{ flexDirection: big ? "column" : "row", gap: space.sm }}>
          {stateButton("cart", item.inCart ? "Tirar do carrinho" : "No carrinho", "shopping-cart", !!item.inCart)}
          {stateButton("missing", "Faltou", "x-circle", item.status === "missing")}
          {stateButton("later", "Depois", "clock", item.status === "later")}
        </View>
        <View style={{ gap: space.xs }}>
          <T style={{ fontFamily: "SoraSemi", fontSize: 14 }}>Categoria</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: 2 }}>
            {cats.map((cat: string) => {
              const on = cat === category;
              return (
                <Pressable key={cat} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={cat}
                  onPress={() => setCategory(cat)}
                  style={[k.row, { minHeight: 48, gap: space.xs, paddingLeft: 6, paddingRight: space.md, borderRadius: radius.pill,
                    backgroundColor: on ? c.primary : c.surface, borderWidth: 1, borderColor: on ? c.primary : c.line }]}>
                  <CategoryBadge category={cat} size={32} />
                  <T style={{ fontSize: 14, color: on ? c.onPrimary : c.text }}>{cat}</T>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <Toggle label="Sempre comprar" value={staple} onChange={setStaple} />
        {staple && <Field label="Repetir a cada quantos dias" value={days} onChange={setDays} numeric />}
        <T accessibilityRole="header" style={{ fontFamily: "SoraSemi", fontSize: 14 }}>Promoção</T>
        <Segmented values={item.deal?.type === "amountOff" || item.deal?.type === "unitPrice"
          ? [["none", "Sem promoção"], ["percent", "Desconto em %"], ["buyXPayY", "Leve e pague"], [item.deal.type, "Promoção atual"]]
          : [["none", "Sem promoção"], ["percent", "Desconto em %"], ["buyXPayY", "Leve e pague"]]} value={promotion} onChange={setPromotion} />
        {promotion === "percent" && <Field label="Percentual de desconto" value={percent} onChange={setPercent} numeric />}
        {promotion === "buyXPayY" && <>
          <Field label="Leve quantas unidades" value={take} onChange={setTake} numeric />
          <Field label="Pague quantas unidades" value={pay} onChange={setPay} numeric />
        </>}
      </ScrollView>
    </SheetModal>
  );
}

// Barra de adicionar no alto (dentro do cabeçalho da lista). À esquerda, a categoria adivinhada enquanto se digita;
// tocar abre a escolha manual, que vale até o campo ser limpo.
export function ShoppingAddBar({ autoFocus, onAdded }: { autoFocus?: boolean; onAdded?: (id: string, name: string, category: string) => void }) {
  const { c } = useTheme();
  const { fontScale } = useWindowDimensions();
  const { state, perform } = useStore();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [manual, setManual] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const ready = text.trim().length > 0;
  const guessed = useMemo(() => {
    if (!text.trim()) return null;
    try { return categorize(parseItemText(text).name); } catch { return null; }
  }, [text]);
  const category = manual ?? guessed;
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
      const id = uid();
      const options = manual ? { id, category: manual } : { id };
      const preview = itemsOf(addShoppingItem(state, next, options)).find((i: any) => i.id === id); // valida antes de gravar
      const ok = await perform((s: any) => addShoppingItem(s, next, options), "item adicionado");
      if (ok) {
        if (preview) onAdded?.(id, preview.name, preview.category);
        setText("");
        setManual(null);
        setError("");
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const cols = fontScale > 1.5 ? 2 : 3;
  return (
    <View style={{ gap: space.xs }}>
      <View style={[k.row, { backgroundColor: c.surface, borderRadius: radius.pill, borderWidth: focused ? 2 : 1,
        borderColor: focused ? c.primary : c.line, paddingHorizontal: 2, minHeight: 56 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={category ? `Categoria: ${category}. Toque para trocar` : "Escolher categoria"}
          onPress={() => setPicking(true)}
          style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}
        >
          <View style={{ borderRadius: 22, borderWidth: 2, borderColor: manual ? c.primary : "transparent", padding: 2 }}>
            {category ? <CategoryBadge category={category} size={36} />
              : <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" }}>
                  <I name="tag" size={18} color={c.muted} />
                </View>}
          </View>
        </Pressable>
        <TextInput
          accessibilityLabel="Adicionar item"
          accessibilityHint="Digite o item, por exemplo 2 leite, e toque em adicionar"
          value={text}
          onChangeText={(v) => {
            setText(v);
            setError("");
            if (!v.trim()) setManual(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="O que falta? Ex.: 2 leite"
          placeholderTextColor={c.muted}
          autoFocus={autoFocus}
          maxLength={80}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={add}
          style={{ flex: 1, minHeight: 48, color: c.text, fontFamily: "Sora", fontSize: 16, paddingHorizontal: space.xs }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={() => void add()}
          style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.primary, opacity: ready ? 1 : 0.35,
            alignItems: "center", justifyContent: "center", marginRight: 2 }}
        >
          <I name="plus" color={c.onPrimary} />
        </Pressable>
      </View>
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
              style={{ minHeight: 48, paddingHorizontal: 14, borderRadius: 22, backgroundColor: c.surface, justifyContent: "center" }}
            >
              <T>{n}</T>
            </Pressable>
          ))}
        </View>
      )}
      {picking && (
        <SheetModal title="Categoria do item" onClose={() => setPicking(false)}>
          <ScrollView contentContainerStyle={{ padding: space.md, flexDirection: "row", flexWrap: "wrap" }}>
            {SHOPPING_CATEGORIES.map((cat: string) => {
              const on = cat === category;
              return (
                <View key={cat} style={{ width: `${100 / cols}%`, padding: space.xs }}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={cat}
                    onPress={() => { setManual(cat); setPicking(false); }}
                    style={{ minHeight: 88, borderRadius: radius.md, alignItems: "center", justifyContent: "center", gap: space.xs,
                      padding: space.sm, backgroundColor: on ? c.soft : c.surface, borderWidth: on ? 2 : 1, borderColor: on ? c.primary : c.line }}
                  >
                    <CategoryBadge category={cat} size={44} />
                    <T style={{ textAlign: "center", fontSize: 13 }}>{cat}</T>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </SheetModal>
      )}
    </View>
  );
}
