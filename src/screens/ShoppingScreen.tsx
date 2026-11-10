import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Share, StyleSheet, TextInput, View } from "react-native";
import { Box, Button, Chips, Empty, Field, I, IconButton, Muted, Section, T, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import CategoryIcon from "../ui/ShoppingIcons";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import ShoppingPastePanel from "./ShoppingPastePanel";
import {
  SHOPPING_CATEGORIES,
  addShoppingItem,
  clearCart,
  groupByCategory,
  itemsOf,
  lineTotal,
  purchaseDraft,
  removeItem,
  renameItem,
  restoreItem,
  setItemCategory,
  setItemPrice,
  shareText,
  shoppingSummary,
  toggleCart,
} from "../shopping.mjs";

const priceText = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2).replace(".", ","));
const qtyText = (i: any) => (i.unit ? `${String(i.qty).replace(".", ",")} ${i.unit}` : i.qty > 1 ? `${i.qty}x` : "");

// Lista de compras: adicionar, marcar no carrinho, editar, excluir com Desfazer e compartilhar.
export default function ShoppingScreen() {
  const { c } = useTheme();
  const { state, perform, confirm, show } = useStore();
  const nav = useNav();
  const [showPaste, setShowPaste] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ item: any; index: number } | null>(null);
  const timer = useRef<any>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const items: any[] = itemsOf(state);
  const sum = shoppingSummary(state);
  const groups = groupByCategory(state);
  const draft = purchaseDraft(state);

  const remove = async (id: string) => {
    const found = items.findIndex((i) => i.id === id);
    if (found < 0) return;
    const item = items[found];
    // Sem aviso global: a barra "Desfazer" já informa a remoção.
    const ok = await perform((s: any) => removeItem(s, id).state, "");
    if (!ok) return;
    if (editId === id) setEditId(null);
    setUndo({ item, index: found });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setUndo(null), 7000);
  };

  const undoRemove = async () => {
    if (!undo) return;
    const { item, index } = undo;
    setUndo(null);
    clearTimeout(timer.current);
    await perform((s: any) => restoreItem(s, item, index), "Item restaurado");
  };

  const share = () => void Share.share({ message: shareText(state) }).catch(() => {});

  return (
    <>
      <View style={{ marginBottom: 12 }}>
        {showPaste
          ? <ShoppingPastePanel onClose={() => setShowPaste(false)} />
          : <Button title="Colar lista" icon="clipboard" secondary onPress={() => setShowPaste(true)} />}
      </View>
      {items.length === 0 ? (
        <>
          <Empty
            icon="shopping-cart"
            title="Nenhum item na lista"
            body="Digite o que precisa comprar. Use 2 leite para indicar a quantidade."
          />
          <Button title="Ler nota fiscal" icon="camera" secondary onPress={() => nav.push({ name: "scanNota" })} />
          <View style={{ height: 8 }} />
          <Button title="Histórico de compras" icon="clock" secondary onPress={() => nav.push({ name: "purchases" })} />
        </>
      ) : (
        <>
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

          {groups.map((g) => (
            <View key={g.category}>
              <Section title={g.category} icon={<CategoryIcon category={g.category} />} />
              <Box style={{ padding: 0, overflow: "hidden" }}>
                {g.items.map((i: any, idx: number) => (
                  <View key={i.id} style={idx < g.items.length - 1 && [k.hairline, { borderBottomColor: c.line }]}>
                    <ItemRow
                      item={i}
                      editing={editId === i.id}
                      onToggle={() => void perform((s: any) => toggleCart(s, i.id), "")}
                      onEdit={() => setEditId(editId === i.id ? null : i.id)}
                      onRemove={() => void remove(i.id)}
                      show={show}
                    />
                    {editId === i.id && <EditPanel item={i} onDone={() => setEditId(null)} />}
                  </View>
                ))}
              </Box>
            </View>
          ))}

          <View style={{ marginTop: 16, gap: 8 }}>
            {draft.items > 0 && (
              <>
                <Button
                  title="Registrar compra como despesa"
                  icon="dollar-sign"
                  onPress={() =>
                    nav.push({
                      name: "form",
                      kind: "transaction",
                      initial: { type: "expense", amount: draft.amountText, description: draft.description },
                    })
                  }
                />
                <Muted>
                  {draft.priced > 0
                    ? `Valor sugerido pelos itens no carrinho com preço${draft.unpriced ? `; ${draft.unpriced} sem preço ficam de fora` : ""}. Você confirma no formulário.`
                    : "Nenhum item no carrinho tem preço. Informe o valor no formulário."}
                </Muted>
              </>
            )}
            <Button title="Ler nota fiscal" icon="camera" secondary onPress={() => nav.push({ name: "scanNota" })} />
            <Button title="Histórico de compras" icon="clock" secondary onPress={() => nav.push({ name: "purchases" })} />
            <Button title="Compartilhar lista" icon="share-2" secondary onPress={share} />
            {sum.inCart > 0 && (
              <Button
                title="Limpar itens no carrinho"
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

      {undo && (
        <View
          accessibilityLiveRegion="polite"
          style={[k.row, { marginTop: 16, padding: 12, borderRadius: 14, backgroundColor: c.soft, minHeight: 56 }]}
        >
          <T style={{ flex: 1 }} numberOfLines={2}>{`${undo.item.name} removido`}</T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Desfazer remoção de ${undo.item.name}`}
            onPress={() => void undoRemove()}
            style={{ minHeight: 48, minWidth: 48, justifyContent: "center", paddingHorizontal: 12 }}
          >
            <T style={{ fontFamily: "SoraSemi", color: c.text }}>Desfazer</T>
          </Pressable>
        </View>
      )}
    </>
  );
}

function summaryLabel(sum: any, show: (n: number) => string) {
  const base = sum.pending === 0 ? "Tudo no carrinho" : `${sum.pending} ${sum.pending === 1 ? "item pendente" : "itens pendentes"}`;
  return sum.estimatedCents > 0 ? `${base}. Estimativa ${show(sum.estimatedCents)}` : base;
}

function ItemRow({ item, editing, onToggle, onEdit, onRemove, show }: any) {
  const { c } = useTheme();
  const total = lineTotal(item);
  const q = qtyText(item);
  return (
    <View style={[k.row, { minHeight: 56, paddingLeft: 4, paddingRight: 4, gap: 0 }]}>
      <Pressable
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
        accessibilityRole="button"
        accessibilityLabel={`Editar ${item.name}`}
        accessibilityState={{ expanded: editing }}
        onPress={onEdit}
        style={{ flex: 1, minHeight: 48, justifyContent: "center", paddingVertical: 6 }}
      >
        <T numberOfLines={2} style={item.inCart ? { color: c.muted, textDecorationLine: "line-through" } : undefined}>
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
  // A categoria atual vem primeiro: a fileira rola e o estado selecionado nunca fica fora da tela.
  const cats = useMemo(() => [item.category, ...SHOPPING_CATEGORIES.filter((x: string) => x !== item.category)], []);
  const [error, setError] = useState("");

  const save = async () => {
    try {
      // Valida tudo antes de gravar.
      let probe = renameItem({ shoppingItems: [item] }, item.id, name);
      probe = setItemPrice(probe, item.id, price);
      setItemCategory(probe, item.id, category);
      const ok = await perform((s: any) => {
        let t = renameItem(s, item.id, name);
        t = setItemPrice(t, item.id, price);
        return setItemCategory(t, item.id, category);
      }, "Item atualizado");
      if (ok) onDone();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Field label="Nome e quantidade" value={name} onChange={setName} maxLength={80} hint="Ex.: 2 leite ou 500g farinha" />
      <Field
        label="Preço (opcional)"
        value={price}
        onChange={setPrice}
        numeric
        placeholder="0,00"
        hint={item.unit ? "Preço da porção inteira." : "Preço de uma unidade."}
      />
      <Chips values={cats.map((x: string) => [x, x] as [string, string])} value={category} onChange={setCategory} />
      {!!error && <Muted accessibilityLiveRegion="polite">{error}</Muted>}
      <Button title="Salvar" onPress={save} />
      <Button title="Cancelar" secondary onPress={onDone} />
    </View>
  );
}

// Barra de adicionar fixa na base (fora da rolagem): o polegar alcança e o teclado envia.
export function ShoppingAddBar({ autoFocus }: { autoFocus?: boolean }) {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const ready = text.trim().length > 0;

  const add = async () => {
    if (!ready) return;
    try {
      const next = text;
      addShoppingItem(state, next); // valida antes de gravar
      const ok = await perform((s: any) => addShoppingItem(s, next), "");
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
    </View>
  );
}
