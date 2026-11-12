// Visão geral das listas de compras (1.12): um cartão por lista, na ordem do layout, com divisores;
// "Nova lista" no alto e "Listas excluídas" no fim. A folha Nova/Editar lista também é usada na tela da lista.
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Vibration, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useReducedMotion, withDelay, withTiming } from "react-native-reanimated";
import { Button, Choice, Field, I, IconButton, Muted, T, radius, space, styles as k } from "../ui/kit";
import MotionPressable from "../ui/motion";
import { useTheme } from "../ui/theme";
import { SheetModal } from "../ui/pickers";
import { ConfirmSheet } from "../ui/Sheet";
import { cleanupPhotos } from "../ui/ItemPhoto";
import ListsEditor, { type EditRow } from "../ui/ListsEditor";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { uid } from "../finance.mjs";
import { LIST_COLORS } from "../shoppingData.mjs";
import { DEFAULT_LIST_COLOR, LIST_COLOR_NAMES, listTone } from "../tones.mjs";
import { createShoppingList, listOverview, migrateShoppingLists, shoppingListsOf, shoppingSummary } from "../shopping.mjs";
import { addDivider, archiveList, groupOfList, listLayout, renameList, saveAsTemplate, setListColor, setListGroup, setListLayout, visibleLayout } from "../shoppingLists.mjs";

// Cartões voltam em cascata: cada um esmaece e sobe 12 dp, 50 ms depois do anterior (A7).
const cascade = (index: number) => () => {
  "worklet";
  const delay = Math.min(index, 6) * 50;
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 12 }] },
    animations: {
      opacity: withDelay(delay, withTiming(1, { duration: 250 })),
      transform: [{ translateY: withDelay(delay, withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) })) }],
    },
  };
};

type Row = { kind: "list"; id: string; name: string; color: string | null; total: number; pending: number; inCart: number; later: number; estimatedCents: number }
  | { kind: "divider"; id: string; name: string };

export default function ShoppingListsScreen() {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const nav = useNav();
  const reduce = useReducedMotion();
  const all = listOverview(state) as Row[];
  // Grupo sem nenhuma lista logo abaixo não aparece aqui (continua no modo de edição).
  const rows = all.filter((row, i) => row.kind === "list" || all[i + 1]?.kind === "list");
  const archived = shoppingListsOf(state).filter((list: any) => list.archived);
  const [editor, setEditor] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [draft, setDraft] = useState<EditRow[] | null>(null);
  // Fotos de itens que não existem mais são apagadas ao abrir as Listas.
  useEffect(() => { void cleanupPhotos(new Set((state.shoppingItems || []).map((item: any) => item.photo).filter(Boolean))); }, []);
  const organize = () => setDraft(all as EditRow[]);

  const open = async (id: string) => {
    if (state.shoppingListId !== id) await perform((s: any) => ({ ...s, shoppingListId: id }), "");
    nav.push({ name: "shoppingList" });
  };

  if (draft) {
    return (
      <ListsEditor initial={draft} onCancel={() => setDraft(null)} onDone={(rows) => {
        setDraft(null);
        void perform((s: any) => setListLayout(s, rows.map((row) => ({ kind: row.kind, id: row.id, name: row.kind === "divider" ? row.name : undefined }))),
          "Ordem das listas salva", { undoable: true });
      }} />
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <View style={[k.row, { justifyContent: "flex-end" }]}>
        <IconButton name="move" label="Organizar listas" onPress={organize} />
      </View>
      <MotionPressable kind="row" accessibilityRole="button" accessibilityLabel="Nova lista" onPress={() => setEditor(true)}
        style={[k.row, { minHeight: 56, paddingLeft: space.lg, paddingRight: space.xs, borderRadius: radius.lg, backgroundColor: c.surface }]}>
        <T style={{ flex: 1, fontFamily: "SoraSemi" }}>Nova lista</T>
        <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
          <I name="plus" color={c.onPrimary} />
        </View>
      </MotionPressable>

      {rows.map((row, index) => (
        <Animated.View key={row.id} entering={reduce ? undefined : cascade(index)}>
          {row.kind === "divider"
            ? <T accessibilityRole="header" style={{ marginTop: space.sm, fontFamily: "SoraSemi", fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: c.muted }}>{row.name}</T>
            : <ListCard row={row} onPress={() => void open(row.id)} onLongPress={() => { Vibration.vibrate(10); organize(); }} />}
        </Animated.View>
      ))}

      {archived.length > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Listas excluídas, ${archived.length}`} onPress={() => setShowArchived(true)}
          style={[k.row, { minHeight: 48, paddingHorizontal: space.sm, gap: space.xs }]}>
          <I name="archive" size={18} color={c.muted} />
          <Muted style={{ flex: 1 }}>{`Listas excluídas (${archived.length})`}</Muted>
          <I name="chevron-right" size={18} color={c.muted} />
        </Pressable>
      )}

      {editor && <ListEditorSheet onClose={() => setEditor(false)} onCreated={() => { setEditor(false); nav.push({ name: "shoppingList" }); }} />}
      {showArchived && (
        <SheetModal title="Listas excluídas" onClose={() => setShowArchived(false)}>
          <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm }}>
            {archived.map((list: any) => (
              <Button key={list.id} title={`Recuperar ${list.name}`} icon="rotate-ccw" secondary onPress={() => {
                setShowArchived(false);
                void perform((s: any) => ({
                  ...s, shoppingLists: shoppingListsOf(s).map((entry: any) => entry.id === list.id ? { ...entry, archived: false } : entry),
                }), `Lista ${list.name} recuperada`, { undoable: true });
              }} />
            ))}
          </ScrollView>
        </SheetModal>
      )}
    </View>
  );
}

// Cartão de lista: N itens e seta; nome grande; Faltam · No carrinho · estimativa. Cor própria da lista.
export function ListCard({ row, onPress, onLongPress, preview = false }: { row: any; onPress?: () => void; onLongPress?: () => void; preview?: boolean }) {
  const { dark } = useTheme();
  const { show } = useStore();
  const tone = listTone(row.color, dark);
  const count = row.total + (row.later || 0);
  const countText = `${count} ${count === 1 ? "item" : "itens"}`;
  const parts = [`Faltam ${row.pending}`, `No carrinho ${row.inCart}`, row.estimatedCents > 0 ? show(row.estimatedCents) : ""].filter(Boolean);
  const spoken = `Lista ${row.name}, ${countText}, faltam ${row.pending}, ${row.inCart} no carrinho` +
    (row.estimatedCents > 0 ? `, estimativa ${show(row.estimatedCents)}` : "");
  const body = (
    <>
      <View style={[k.row, { gap: space.sm }]}>
        <T style={{ flex: 1, color: tone.sub }}>{countText}</T>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
          style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: tone.text, alignItems: "center", justifyContent: "center" }}>
          <I name="chevron-right" color={tone.bg} />
        </View>
      </View>
      <T numberOfLines={2} maxFontSizeMultiplier={1.6} style={{ fontFamily: "SoraSemi", fontSize: 26, lineHeight: 32, color: tone.text }}>{row.name}</T>
      <T style={{ color: tone.sub, fontVariant: ["tabular-nums"] }}>{parts.join(" · ")}</T>
    </>
  );
  const style = { minHeight: 140, padding: space.lg, gap: space.sm, borderRadius: radius.lg, backgroundColor: tone.bg, justifyContent: "space-between" as const };
  if (preview) return <View accessible accessibilityLabel={`Prévia: ${spoken}`} style={style}>{body}</View>;
  return (
    <MotionPressable kind="row" accessibilityRole="button" accessibilityLabel={spoken} accessibilityHint="Toque duas vezes para abrir. Toque longo para organizar"
      onPress={onPress} onLongPress={onLongPress} delayLongPress={400} style={style}>
      {body}
    </MotionPressable>
  );
}

// Folha Nova lista (sem `listId`) ou Editar lista (com `listId`): nome, cor, grupo; na Nova, "Começar de" (modelo);
// na Editar, prévia do cartão, "Salvar como modelo" e "Excluir lista" (confirmação; a lista é arquivada e pode ser recuperada).
export function ListEditorSheet({ listId, onClose, onCreated, onDeleted }: {
  listId?: string;
  onClose: () => void;
  onCreated?: (id: string) => void;
  onDeleted?: () => void;
}) {
  const { c, dark } = useTheme();
  const { state, perform } = useStore();
  const { fontScale } = useWindowDimensions();
  const lists = shoppingListsOf(state);
  const current = listId ? lists.find((list: any) => list.id === listId) : null;
  const dividers = listLayout(state).filter((row: any) => row.kind === "divider");
  const [name, setName] = useState(current?.name || "");
  const [color, setColor] = useState<string>(current?.color || DEFAULT_LIST_COLOR);
  const startGroup = listId ? groupOfList(state, listId)?.id ?? "" : "";
  const [group, setGroup] = useState<string>(startGroup);
  const [groupName, setGroupName] = useState("");
  const [template, setTemplate] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const activeCount = lists.filter((list: any) => !list.archived).length;
  const summary = useMemo(() => listId ? shoppingSummary({ ...state, shoppingListId: listId }) : null, [state, listId]);

  const save = async () => {
    try {
      let createdId = "";
      const change = (s: any) => {
        let next = s;
        let id = listId || "";
        if (listId) next = renameList(migrateShoppingLists(next), listId, name);
        else {
          const chosen = (s.shoppingListTemplates || []).find((t: any) => t.id === template);
          next = createShoppingList(next, name, chosen);
          id = next.shoppingListId;
          createdId = id;
        }
        next = setListColor(next, id, color === DEFAULT_LIST_COLOR ? null : color);
        if (group === "__new") {
          const gid = "grupo-" + uid();
          next = addDivider(next, visibleLayout(next).length, groupName, { id: gid });
          next = setListGroup(next, id, gid);
        } else next = setListGroup(next, id, group || null);
        return next;
      };
      change(state); // valida antes de gravar
      const ok = await perform(change, listId ? "lista atualizada" : "lista criada");
      if (!ok) return;
      if (listId) onClose();
      else onCreated?.(createdId);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (confirming && current) {
    return (
      <ConfirmSheet
        title={`Excluir a lista ${current.name}?`}
        changes={[summary && summary.pending > 0 ? `A lista e os ${summary.pending} itens que faltam saem da tela` : "A lista sai da tela"]}
        keeps={["Compras, preços e o que o app aprendeu", "Dá para desfazer logo depois ou recuperar em Listas excluídas"]}
        action="Excluir"
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          void perform((s: any) => migrateShoppingLists(archiveList(s, current.id)), `Lista ${current.name} excluída`, { undoable: true })
            .then((ok: boolean) => { if (ok) { onClose(); onDeleted?.(); } });
        }}
      />
    );
  }

  const templates = state.shoppingListTemplates || [];
  return (
    <SheetModal title={listId ? "Editar lista" : "Nova lista"} onClose={onClose} footer={
      <View style={{ gap: space.sm }}>
        {!!error && <Muted accessibilityLiveRegion="polite" style={{ color: c.red }}>{error}</Muted>}
        <Button title={listId ? "Salvar" : "Criar lista"} disabled={!name.trim() || (group === "__new" && !groupName.trim())} onPress={() => void save()} />
      </View>
    }>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, paddingTop: space.xs, gap: space.md }}>
        {listId && summary && (
          <ListCard preview row={{ name: name.trim() || current?.name, color: color === DEFAULT_LIST_COLOR ? null : color, total: summary.total,
            pending: summary.pending, inCart: summary.inCart, later: summary.later, estimatedCents: summary.estimatedCents }} />
        )}
        <Field label="Nome da lista" value={name} onChange={(v) => { setName(v); setError(""); }} maxLength={60} />
        <View style={{ gap: space.xs }}>
          <T style={{ fontFamily: "SoraSemi", fontSize: 14 }}>Cor</T>
          <View accessibilityRole="radiogroup" accessibilityLabel="Cor da lista" style={[k.row, { flexWrap: "wrap", gap: space.sm }]}>
            {LIST_COLORS.map((key: string) => {
              const on = key === color;
              const tone = listTone(key, dark);
              return (
                <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: on }}
                  accessibilityLabel={(LIST_COLOR_NAMES as any)[key]} onPress={() => setColor(key)}
                  style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center",
                    borderWidth: on ? 3 : 1, borderColor: on ? c.primary : c.line, backgroundColor: tone.bg }}>
                  {on && <I name="check" size={20} color={tone.text} />}
                </Pressable>
              );
            })}
          </View>
        </View>
        <Choice label="Grupo" value={group} onChange={setGroup}
          values={[["", "Sem grupo"], ...dividers.map((row: any) => [row.id, row.name] as [string, string]), ["__new", "Novo grupo…"]]} />
        {group === "__new" && <Field label="Nome do grupo" value={groupName} onChange={setGroupName} placeholder="Ex.: Viagem" maxLength={40} />}
        {!listId && templates.length > 0 && (
          <Choice label="Começar de" value={template} onChange={setTemplate}
            values={[["", "Lista vazia"], ...templates.map((t: any) => [t.id, `Modelo ${t.name}`] as [string, string])]} />
        )}
        {listId && (
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            <Button title="Salvar como modelo" icon="copy" secondary onPress={() => void perform((s: any) => ({
              ...s, shoppingListTemplates: [...(s.shoppingListTemplates || []).filter((t: any) => t.name !== current?.name),
                { id: uid(), ...saveAsTemplate(s, listId) }].slice(-20),
            }), "modelo salvo")} />
            <Pressable accessibilityRole="button" accessibilityLabel="Excluir lista" accessibilityState={{ disabled: activeCount <= 1 }}
              disabled={activeCount <= 1} onPress={() => setConfirming(true)}
              style={[k.row, { minHeight: 48, justifyContent: "center", gap: space.xs, opacity: activeCount <= 1 ? 0.5 : 1 }]}>
              <I name="trash-2" size={18} color={c.red} />
              <T style={{ color: c.red, fontFamily: "SoraSemi", fontSize: 14 }}>Excluir lista</T>
            </Pressable>
            {activeCount <= 1 && <Muted style={{ textAlign: "center", fontSize: fontScale > 1.5 ? 14 : 12 }}>Mantenha pelo menos uma lista.</Muted>}
          </View>
        )}
      </ScrollView>
    </SheetModal>
  );
}
