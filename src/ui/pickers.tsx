// Linhas compactas com seta que abrem uma lista (estilo "folha de confirmação") e o seletor
// de Categoria › Subcategoria.
import React, { useMemo, useRef, useState } from "react";
import { View, Pressable, ScrollView, TextInput, StyleSheet } from "react-native";
import { focusAccessibility, T, Muted, I, type ViewControl, styles as k } from "./kit";
import type { Icon } from "./kit";
import { useTheme } from "./theme";
import { categoryTree, categoryLabel } from "../categories.mjs";
import { categoryStyleOf } from "./CategoryIcon";
import CategoryIcon from "./CategoryIcon";

// A folha passou para Sheet.tsx (movimento, desfoque e X de 48 dp); o nome continua exportado daqui.
import { SheetModal } from "./Sheet";
export { SheetModal };

// Uma linha do cartão de campos: ícone, rótulo pequeno + valor, algo à direita e chevron.
export function PickerRow({
  icon,
  leading,
  label,
  value,
  placeholder,
  right,
  onPress,
  last,
  tint,
  accessibilityHint,
}: {
  icon?: Icon;
  leading?: React.ReactNode;
  label?: string;
  value?: string;
  placeholder?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  tint?: string;
  accessibilityHint?: string;
}) {
  const { c } = useTheme();
  const body = (
    <>
      {leading || (
        <View style={[s.rowIcon, { backgroundColor: c.soft }]} importantForAccessibility="no">
          <I name={icon || "tag"} size={18} color={tint || c.muted} />
        </View>
      )}
      <View style={{ flex: 1, gap: 1 }}>
        {!!label && <Muted style={{ fontSize: 12 }}>{label}</Muted>}
        <T numberOfLines={2} style={{ fontFamily: "SoraSemi", fontSize: 15, color: value ? c.text : c.muted }}>
          {value || placeholder}
        </T>
      </View>
      {right}
      {!!onPress && <I name="chevron-right" size={18} color={c.muted} />}
    </>
  );
  const style = [k.row, s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }];
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label || placeholder || ""}: ${value || "não definido"}`}
      accessibilityHint={accessibilityHint || "Abre as opções"}
      onPress={onPress}
      android_ripple={{ color: c.soft }}
      style={style}
    >
      {body}
    </Pressable>
  ) : (
    <View style={style}>{body}</View>
  );
}

export type Option = { key: string; label: string; sub?: string; leading?: React.ReactNode; icon?: Icon };

// Lista de escolha única ou múltipla numa folha.
export function ListSheet({
  title,
  options,
  value,
  multiple,
  onPick,
  onClose,
  empty = "Nenhuma opção.",
}: {
  title: string;
  options: Option[];
  value: string | string[];
  multiple?: boolean;
  onPick: (key: string) => void;
  onClose: () => void;
  empty?: string;
}) {
  const { c } = useTheme();
  const chosen = (key: string) => (Array.isArray(value) ? value.includes(key) : value === key);
  return (
    <SheetModal title={title} onClose={onClose}>
      <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
        {options.length ? (
          options.map((o) => (
            <Pressable
              key={o.key}
              accessibilityRole={multiple ? "checkbox" : "radio"}
              accessibilityState={{ checked: chosen(o.key) }}
              onPress={() => {
                onPick(o.key);
                if (!multiple) onClose();
              }}
              android_ripple={{ color: c.soft }}
              style={[k.row, s.row, { paddingHorizontal: 16 }]}
            >
              {o.leading ||
                (o.icon ? (
                  <View style={[s.rowIcon, { backgroundColor: c.soft }]}>
                    <I name={o.icon} size={18} />
                  </View>
                ) : null)}
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: chosen(o.key) ? "SoraSemi" : "Sora" }}>{o.label}</T>
                {!!o.sub && <Muted>{o.sub}</Muted>}
              </View>
              {chosen(o.key) && <I name="check" size={18} color={c.primary} />}
            </Pressable>
          ))
        ) : (
          <Muted style={{ padding: 16 }}>{empty}</Muted>
        )}
        {multiple && (
          <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 52, alignItems: "center", justifyContent: "center" }}>
            <T style={{ color: c.primary, fontFamily: "SoraSemi" }}>Pronto</T>
          </Pressable>
        )}
      </ScrollView>
    </SheetModal>
  );
}

const norm = (x: string) => x.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "");

// Categoria › Subcategoria. Toque numa categoria abre as subcategorias dela; busca acha as duas.
export function CategorySheet({
  state,
  type,
  category,
  subcategory,
  onPick,
  onClose,
}: {
  state: any;
  type?: "expense" | "income";
  category: string;
  subcategory?: string;
  onPick: (category: string, subcategory: string) => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const tree = useMemo(() => categoryTree(state, type), [state.customCategories, state.transactions.length, type]);
  const [open, setOpen] = useState<string>(category);
  const [q, setQ] = useState("");
  const done = (cat: string, sub: string) => {
    onPick(cat, sub);
    onClose();
  };
  const query = norm(q.trim());
  const flat = query
    ? tree.flatMap((n: any) => [
        ...(norm(n.name).includes(query) ? [{ cat: n.name, sub: "" }] : []),
        ...n.subs.filter((sb: string) => norm(sb).includes(query) || norm(n.name).includes(query)).map((sb: string) => ({ cat: n.name, sub: sb })),
      ])
    : [];
  return (
    <SheetModal title="Categoria" onClose={onClose}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <TextInput
          accessibilityLabel="Buscar categoria"
          value={q}
          onChangeText={setQ}
          placeholder="Buscar categoria ou subcategoria…"
          placeholderTextColor={c.muted}
          style={{ minHeight: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: c.soft, color: c.text, fontFamily: "Sora" }}
        />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
        {query ? (
          flat.length ? (
            flat.map((r: any) => (
              <Pressable key={r.cat + "|" + r.sub} accessibilityRole="button" onPress={() => done(r.cat, r.sub)} style={[k.row, s.row, { paddingHorizontal: 16 }]} android_ripple={{ color: c.soft }}>
                <CategoryIcon look={categoryStyleOf(state, r.cat)} size={34} />
                <T style={{ flex: 1 }}>{categoryLabel(r.cat, r.sub)}</T>
              </Pressable>
            ))
          ) : (
            <Muted style={{ padding: 16 }}>Nada encontrado.</Muted>
          )
        ) : (
          tree.map((n: any) => {
            const look = categoryStyleOf(state, n.name);
            const expanded = open === n.name && n.subs.length > 0;
            const on = category === n.name;
            return (
              <View key={n.name}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded, selected: on }}
                  accessibilityLabel={`${n.name}${n.subs.length ? ", " + n.subs.length + " subcategorias" : ""}`}
                  onPress={() => (n.subs.length ? setOpen(expanded ? "" : n.name) : done(n.name, ""))}
                  android_ripple={{ color: c.soft }}
                  style={[k.row, s.row, { paddingHorizontal: 16 }]}
                >
                  <CategoryIcon look={look} size={34} />
                  <T style={{ flex: 1, fontFamily: on ? "SoraSemi" : "Sora" }}>{n.name}</T>
                  {on && !!subcategory && <Muted>{subcategory}</Muted>}
                  {n.subs.length ? <I name={expanded ? "chevron-up" : "chevron-down"} size={18} color={c.muted} /> : on ? <I name="check" size={18} color={c.primary} /> : null}
                </Pressable>
                {expanded && (
                  <View style={{ paddingLeft: 62, paddingRight: 16, paddingBottom: 6, gap: 2 }}>
                    <Pressable accessibilityRole="button" onPress={() => done(n.name, "")} style={s.subRow} android_ripple={{ color: c.soft }}>
                      <T style={{ color: c.muted, flex: 1 }}>Só a categoria</T>
                      {on && !subcategory && <I name="check" size={16} color={c.primary} />}
                    </Pressable>
                    {n.subs.map((sb: string) => (
                      <Pressable key={sb} accessibilityRole="button" accessibilityState={{ selected: on && subcategory === sb }} onPress={() => done(n.name, sb)} style={s.subRow} android_ripple={{ color: c.soft }}>
                        <T style={{ flex: 1, fontFamily: on && subcategory === sb ? "SoraSemi" : "Sora" }}>{sb}</T>
                        {on && subcategory === sb && <I name="check" size={16} color={c.primary} />}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SheetModal>
  );
}

// Linha "Categoria" pronta: mostra "Assinaturas › Streaming" e abre a folha.
export function CategoryRow({
  state,
  type,
  category,
  subcategory,
  onChange,
  last,
  label = "Categoria",
}: {
  state: any;
  type?: "expense" | "income";
  category: string;
  subcategory?: string;
  onChange: (category: string, subcategory: string) => void;
  last?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const look = categoryStyleOf(state, category || "Outros");
  return (
    <>
      <PickerRow
        label={label}
        value={category ? categoryLabel(category, subcategory) : ""}
        placeholder="Selecionar categoria…"
        leading={<CategoryIcon look={look} size={38} />}
        onPress={() => setOpen(true)}
        last={last}
      />
      {open && <CategorySheet state={state} type={type} category={category} subcategory={subcategory} onPick={onChange} onClose={() => setOpen(false)} />}
    </>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: { maxHeight: "85%", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: "center", marginTop: 8 },
  row: { gap: 12, minHeight: 54, paddingHorizontal: 14, paddingVertical: 6 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dot: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  subRow: { minHeight: 40, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, borderRadius: 10 },
});
