// Itens de uma compra (Revisar pendência › ⋯ › Dividir em itens). Cada item leva a sua categoria,
// adivinhada pelo nome; o total dos itens precisa fechar com o valor da compra.
import React, { useState } from "react";
import { View, ScrollView, TextInput } from "react-native";
import { T, Muted, I, Button, IconButton, styles as k } from "../ui/kit";
import { SheetModal } from "../ui/Sheet";
import { useTheme } from "../ui/theme";
import MotionPressable from "../ui/motion";
import CategoryIcon from "../ui/CategoryIcon";
import { CategorySheet } from "../ui/pickers";
import { lookOf } from "../looks.mjs";
import { categoryLabel } from "../categories.mjs";
import { maskMoney, normalizeMoneyText } from "../moneyInput.mjs";
import { guessItemCategory, parseItem, itemCents, sumItems } from "../purchaseSplit.mjs";

const reais = (cents: number) => `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PurchaseItemsSheet({ state, total, fallback, items, onSave, onFixTotal, onClose }: {
  state: any;
  total: number; // centavos da compra
  fallback: { category: string; subcategory: string };
  items: any[];
  onSave: (items: any[]) => void;
  onFixTotal: (cents: number) => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const [list, setList] = useState<any[]>(items);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState("");
  const [pick, setPick] = useState<string>("");
  const sum = sumItems(list);
  const diff = total - sum;
  const fits = list.length > 0 && diff === 0;
  const guess = name.trim() ? guessItemCategory(state, name, fallback) : null;

  const add = () => {
    try {
      const g = guessItemCategory(state, name, fallback);
      const item = parseItem({ name, qty, unit, category: g.category, subcategory: g.subcategory });
      setList((x) => [...x, item]);
      setName(""); setQty("1"); setUnit(""); setError("");
    } catch (e: any) {
      setError(e?.message || "Confira o item.");
    }
  };
  const field = { minHeight: 48, color: c.text, fontFamily: "SoraSemi", fontSize: 15, borderBottomWidth: 1, borderBottomColor: c.line } as const;
  const picked = list.find((x) => x.id === pick);

  return (
    <>
      <SheetModal
        title="Itens da compra"
        onClose={onClose}
        footer={
          <View style={{ gap: 8 }}>
            <View style={[k.row, { justifyContent: "space-between" }]} accessibilityLiveRegion="polite">
              <Muted>Itens {reais(sum)} de {reais(total)}</Muted>
              <T style={{ fontFamily: "SoraSemi", color: fits ? c.green : c.red }}>
                {fits ? "Fechou" : diff > 0 ? `Faltam ${reais(diff)}` : `Passou ${reais(-diff)}`}
              </T>
            </View>
            {!fits && list.length > 0 && <Button secondary title={`Usar o total dos itens (${reais(sum)})`} onPress={() => { onFixTotal(sum); onSave(list); }} />}
            <Button title="Usar estes itens" icon="check" disabled={!fits} onPress={() => onSave(list)} />
          </View>
        }
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <View style={[k.row, { gap: 8, alignItems: "flex-end" }]}>
            <View style={{ flex: 1 }}>
              <TextInput accessibilityLabel="Nome do item" value={name} onChangeText={setName} placeholder="Item (ex.: gasolina)" placeholderTextColor={c.muted} style={field} />
            </View>
            <View style={{ width: 44 }}>
              <TextInput accessibilityLabel="Quantidade" value={qty} onChangeText={(v) => setQty(v.replace(/\D/g, "").slice(0, 3))} keyboardType="number-pad" style={[field, { textAlign: "center" }]} />
            </View>
            <View style={{ width: 96 }}>
              <TextInput accessibilityLabel="Valor de cada unidade em reais" value={normalizeMoneyText(unit)} onChangeText={(v) => setUnit(maskMoney(v, normalizeMoneyText(unit)).text)} keyboardType="number-pad" placeholder="0,00" placeholderTextColor={c.muted} style={[field, { textAlign: "right" }]} />
            </View>
            <IconButton name="plus" label="Adicionar item" onPress={add} />
          </View>
          {guess && <Muted accessibilityLiveRegion="polite">Categoria: {categoryLabel(guess.category, guess.subcategory)}{guess.guessed ? "" : " (a da compra)"}</Muted>}
          {!!error && <T accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ color: c.red }}>{error}</T>}
          {list.length === 0 && <Muted>Adicione o que você comprou. Cada item vira um lançamento na sua categoria; o total da compra não muda.</Muted>}
          {list.length > 0 && (
            <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 18, overflow: "hidden" }}>
              {list.map((it, i) => (
                <View key={it.id} style={[k.row, { paddingLeft: 12, paddingRight: 4, minHeight: 64 }, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}>
                  <MotionPressable kind="row" accessibilityRole="button" accessibilityLabel={`${it.name}, ${it.qty > 1 ? `${it.qty} unidades, ` : ""}${reais(itemCents(it))}, ${categoryLabel(it.category, it.subcategory)}. Trocar categoria`}
                    onPress={() => setPick(it.id)} style={[k.row, { flex: 1, paddingVertical: 8 }]}>
                    <CategoryIcon look={lookOf(state, it.category || "Outros")} size={34} />
                    <View style={{ flex: 1, gap: 1 }}>
                      <T numberOfLines={1} style={{ fontFamily: "SoraSemi", fontSize: 14 }}>{it.name}{it.qty > 1 ? `  ·  ${it.qty} × ${reais(it.unit)}` : ""}</T>
                      <Muted numberOfLines={1}>{categoryLabel(it.category, it.subcategory)}</Muted>
                    </View>
                    <T style={{ fontFamily: "SoraSemi", fontVariant: ["tabular-nums"] }}>{reais(itemCents(it))}</T>
                  </MotionPressable>
                  <IconButton name="x" label={`Remover ${it.name}`} onPress={() => setList((x) => x.filter((y) => y.id !== it.id))} />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SheetModal>
      {picked && (
        <CategorySheet
          state={state}
          type="expense"
          category={picked.category}
          subcategory={picked.subcategory}
          onPick={(cat, sub) => setList((x) => x.map((y) => (y.id === picked.id ? { ...y, category: cat, subcategory: sub } : y)))}
          onClose={() => setPick("")}
        />
      )}
    </>
  );
}
