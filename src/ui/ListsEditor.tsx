// Modo de edição da visão geral das listas (1.12, passo 9): arrastar pela alça, Subir/Descer, grupos (divisores).
// Trabalha num rascunho local; Cancelar descarta e Concluir devolve a ordem nova (quem chama grava de uma vez).
// O arrastar é o movimento medido na auditoria (A1): o cartão cresce 2%, ganha sombra e segue o dedo; ao soltar, encaixa em 150 ms.
// Sem gesto: Subir e Descer em cada cartão e ações de acessibilidade. Com "remover animações" não há escala nem encaixe animado.
import React, { useCallback, useRef, useState } from "react";
import { AccessibilityInfo, LayoutAnimation, Pressable, TextInput, Vibration, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { Button, I, T, radius, space, styles as k } from "./kit";
import { useTheme } from "./theme";
import { listTone } from "../tones.mjs";
import { uid } from "../finance.mjs";

export type EditRow =
  | { kind: "list"; id: string; name: string; color: string | null; total: number; pending: number; inCart: number }
  | { kind: "divider"; id: string; name: string };

const GAP = space.md;

export default function ListsEditor({ initial, onCancel, onDone }: {
  initial: EditRow[];
  onCancel: () => void;
  onDone: (rows: EditRow[]) => void;
}) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const [rows, setRows] = useState<EditRow[]>(initial);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const heights = useRef<Record<string, number>>({});
  const dy = useSharedValue(0);
  const off = useSharedValue(0);
  const active = useSharedValue("");
  const [adding, setAdding] = useState<number | null>(null);
  const [newName, setNewName] = useState("");

  const commit = (next: EditRow[]) => { rowsRef.current = next; setRows(next); };

  // Subir / Descer (e ações de acessibilidade): troca com o vizinho e anuncia a nova posição.
  const step = useCallback((id: string, dir: -1 | 1) => {
    const list = rowsRef.current;
    const i = list.findIndex((row) => row.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.create(200, "easeInEaseOut", "opacity"));
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
    AccessibilityInfo.announceForAccessibility(`${list[i].name} agora é ${j + 1}º de ${list.length}`);
  }, [reduce]);

  // Durante o arrastar: ao passar da metade do vizinho, troca de lugar e compensa o deslocamento do dedo.
  const track = useCallback((id: string, rel: number) => {
    const list = rowsRef.current;
    const i = list.findIndex((row) => row.id === id);
    if (i < 0) return;
    const dir = rel > 0 ? 1 : -1;
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const size = (heights.current[list[j].id] || 120) + GAP;
    if (Math.abs(rel) < size / 2) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    off.value += dir * size;
    commit(next);
  }, [off]);

  const buzz = useCallback(() => Vibration.vibrate(10), []);
  const remove = (id: string) => commit(rowsRef.current.filter((row) => row.id !== id));
  const rename = (id: string, name: string) => commit(rowsRef.current.map((row) => row.id === id ? { ...row, name } : row));
  const addGroup = () => {
    const name = newName.trim();
    if (!name || adding === null) return;
    const next = [...rowsRef.current];
    next.splice(adding, 0, { kind: "divider", id: "grupo-" + uid(), name });
    commit(next);
    setAdding(null);
    setNewName("");
  };
  const finish = () => onDone(rowsRef.current.filter((row) => row.kind === "list" || row.name.trim()).map((row) => row.kind === "divider" ? { ...row, name: row.name.trim() } : row));

  const groupPill = (index: number) => adding === index ? (
    <View key={"add" + index} style={[k.row, { minHeight: 48, gap: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: c.primary, paddingHorizontal: space.md }]}>
      <TextInput autoFocus value={newName} onChangeText={setNewName} onSubmitEditing={addGroup} maxLength={40} returnKeyType="done"
        placeholder="Nome do grupo, ex.: Viagem" placeholderTextColor={c.muted} accessibilityLabel="Nome do grupo"
        style={{ flex: 1, minHeight: 48, color: c.text, fontFamily: "Sora" }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Cancelar grupo" onPress={() => { setAdding(null); setNewName(""); }}
        style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
        <I name="x" color={c.muted} />
      </Pressable>
    </View>
  ) : (
    <Pressable key={"add" + index} accessibilityRole="button" accessibilityLabel={`Novo grupo na posição ${index + 1}`}
      onPress={() => { setAdding(index); setNewName(""); }}
      style={[k.row, { minHeight: 48, justifyContent: "center", gap: space.xs, borderRadius: radius.md, borderWidth: 1, borderStyle: "dashed", borderColor: c.line }]}>
      <I name="plus" size={16} color={c.muted} />
      <T style={{ color: c.muted, fontFamily: "SoraSemi", fontSize: 13 }}>Grupo</T>
    </Pressable>
  );

  return (
    <View style={{ gap: GAP }}>
      <View style={[k.row, { gap: space.sm }]}>
        <View style={{ flex: 1 }}><Button title="Cancelar" secondary onPress={onCancel} /></View>
        <View style={{ flex: 1 }}><Button title="Concluir" onPress={finish} /></View>
      </View>
      {rows.map((row, index) => (
        <React.Fragment key={row.id}>
          {groupPill(index)}
          <EditItem row={row} index={index} count={rows.length} reduce={reduce} dy={dy} off={off} active={active}
            onHeight={(h) => { heights.current[row.id] = h; }} step={step} track={track} buzz={buzz}
            onRemove={() => remove(row.id)} onRename={(name) => rename(row.id, name)} />
        </React.Fragment>
      ))}
      {groupPill(rows.length)}
    </View>
  );
}

function EditItem({ row, index, count, reduce, dy, off, active, onHeight, step, track, buzz, onRemove, onRename }: {
  row: EditRow; index: number; count: number; reduce: boolean;
  dy: any; off: any; active: any;
  onHeight: (h: number) => void;
  step: (id: string, dir: -1 | 1) => void;
  track: (id: string, rel: number) => void;
  buzz: () => void;
  onRemove: () => void;
  onRename: (name: string) => void;
}) {
  const { c, dark } = useTheme();
  const id = row.id;
  const tone = row.kind === "list" ? listTone(row.color, dark) : { bg: c.surface, text: c.text, sub: c.muted };

  const pan = usePanGesture({
    minDistance: 4,
    onActivate: () => {
      "worklet";
      active.value = id;
      dy.value = 0;
      off.value = 0;
      runOnJS(buzz)();
    },
    onUpdate: (e) => {
      "worklet";
      if (active.value !== id) return;
      dy.value = e.translationY;
      runOnJS(track)(id, e.translationY - off.value);
    },
    onDeactivate: () => {
      "worklet";
      if (active.value !== id) return;
      dy.value = withTiming(off.value, { duration: reduce ? 0 : 150 }, () => {
        active.value = "";
        dy.value = 0;
        off.value = 0;
      });
    },
  });

  const style = useAnimatedStyle(() => {
    const on = active.value === id;
    return {
      zIndex: on ? 10 : 0,
      elevation: on ? 8 : 0,
      shadowOpacity: on ? 0.25 : 0,
      transform: [{ translateY: on ? dy.value - off.value : 0 }, { scale: on && !reduce ? 1.02 : 1 }],
    };
  });

  const circle = { width: 48, height: 48, alignItems: "center" as const, justifyContent: "center" as const };
  const position = `${index + 1}º de ${count}`;
  const label = row.kind === "list" ? `Lista ${row.name}, ${position}` : `Grupo ${row.name}, ${position}`;

  return (
    <Animated.View onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
      style={[{ borderRadius: radius.lg, backgroundColor: tone.bg, paddingLeft: space.lg, paddingRight: space.xs, paddingVertical: space.xs,
        shadowColor: "#000", shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, style]}>
      <View style={[k.row, { gap: 0, minHeight: row.kind === "list" ? 72 : 56 }]}>
        {row.kind === "list" ? (
          <View accessible accessibilityRole="text" accessibilityLabel={label} style={{ flex: 1, paddingVertical: space.sm }}
            accessibilityActions={[{ name: "moveUp", label: "Subir" }, { name: "moveDown", label: "Descer" }]}
            onAccessibilityAction={(e) => step(id, e.nativeEvent.actionName === "moveUp" ? -1 : 1)}>
            <T numberOfLines={2} maxFontSizeMultiplier={1.6} style={{ fontFamily: "SoraSemi", fontSize: 18, color: tone.text }}>{row.name}</T>
            <T style={{ color: tone.sub, fontSize: 12 }}>{`Faltam ${row.pending} · No carrinho ${row.inCart}`}</T>
          </View>
        ) : (
          <TextInput value={row.name} onChangeText={onRename} maxLength={40} accessibilityLabel={`Nome do grupo, ${position}`}
            placeholder="Nome do grupo" placeholderTextColor={c.muted}
            style={{ flex: 1, minHeight: 48, color: c.muted, fontFamily: "SoraSemi", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}
            accessibilityActions={[{ name: "moveUp", label: "Subir" }, { name: "moveDown", label: "Descer" }]}
            onAccessibilityAction={(e) => step(id, e.nativeEvent.actionName === "moveUp" ? -1 : 1)} />
        )}
        {row.kind === "divider" && (
          <Pressable accessibilityRole="button" accessibilityLabel={`Remover grupo ${row.name}`} onPress={onRemove} style={circle}>
            <I name="x" color={tone.sub} />
          </Pressable>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Subir" accessibilityState={{ disabled: index === 0 }}
          disabled={index === 0} onPress={() => step(id, -1)} style={[circle, { opacity: index === 0 ? 0.35 : 1 }]}>
          <I name="arrow-up" color={tone.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Descer" accessibilityState={{ disabled: index === count - 1 }}
          disabled={index === count - 1} onPress={() => step(id, 1)} style={[circle, { opacity: index === count - 1 ? 0.35 : 1 }]}>
          <I name="arrow-down" color={tone.text} />
        </Pressable>
        <GestureDetector gesture={pan}>
          <View accessible={false} importantForAccessibility="no-hide-descendants" style={circle}>
            <I name="move" color={tone.text} />
          </View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}
