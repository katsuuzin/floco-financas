// Folha da aba Categorias: os lançamentos que formam o valor de uma categoria no mês, com busca,
// ordem, filtro por subcategoria, seleção (um ou vários) e troca de categoria com Desfazer. Depois
// de mover, oferece criar uma regra para o mesmo comerciante e aplicá-la aos lançamentos antigos.
import React, { useMemo, useState } from "react";
import { View, Pressable, ScrollView, TextInput } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useStore } from "../../app/store";
import { useNav } from "../../app/nav";
import { categoryTransactions, categoryList } from "../../spending.mjs";
import { categoryLabel } from "../../categories.mjs";
import { recategorize, ruleSuggestion, addSuggestedRule, snapshotCategories, revertCategories } from "../../recategorize.mjs";
import { previewRules, applyRules, matchRule } from "../../rules.mjs";
import { SheetModal } from "../../ui/Sheet";
import { CategorySheet } from "../../ui/pickers";
import { useCalen, CText, CCard, CButton, CPills } from "../../ui/calen";
import { editInitial } from "../TransactionRow";

const dd = (iso: string) => `${iso.slice(8)}/${iso.slice(5, 7)}`;

export default function CategoryTransactions({ month, name, kind, byInvoice, hidden, onHide, onClose }: {
  month: string;
  name: string;
  kind: "expense" | "income";
  byInvoice: boolean;
  hidden: boolean;
  onHide: (off: boolean) => void;
  onClose: () => void;
}) {
  const { k, tint } = useCalen();
  const { state, show, perform } = useStore();
  const nav = useNav();
  const [sort, setSort] = useState<"value" | "date">("value");
  const [sub, setSub] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [moving, setMoving] = useState(false);
  const [suggest, setSuggest] = useState<any>(null);
  const [applyIds, setApplyIds] = useState<string[]>([]);
  const [last, setLast] = useState<{ text: string; snap: any[] } | null>(null);

  const list = useMemo(() => categoryTransactions(state, month, name, { kind, byInvoice, sub: sub as any, sort, query }), [state.transactions, month, name, kind, byInvoice, sub, sort, query]);
  const subs = useMemo(() => (categoryList(state, month, { kind, byInvoice }).rows.find((r: any) => r.name === name)?.subs || []) as { name: string; cents: number }[], [state.transactions, month, name, kind, byInvoice]);
  const accountName = (id: string) => state.accounts.find((a: any) => a.id === id)?.name || "";
  const cardName = (id: string) => state.cards.find((c: any) => c.id === id)?.name || "";
  const visibleIds = list.rows.map((r: any) => r.id);
  const allOn = visibleIds.length > 0 && visibleIds.every((id: string) => picked.includes(id));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const move = async (category: string, subcategory: string) => {
    const ids = picked;
    const preview = recategorize(state, ids, category, subcategory);
    if (!preview.changed) return;
    const n = preview.changed;
    const snap = snapshotCategories(state, ids);
    const text = `${n} ${n === 1 ? "lançamento movido" : "lançamentos movidos"} para ${categoryLabel(category, subcategory)}`;
    const ok = await perform((s: any) => recategorize(s, ids, category, subcategory).state, `${n} ${n === 1 ? "lançamento movido" : "lançamentos movidos"} para ${categoryLabel(category, subcategory)}`, { undoable: true });
    if (!ok) return;
    setLast({ text, snap });
    setPicked([]);
    const sg = ruleSuggestion(preview.state, ids, category, subcategory);
    if (sg) {
      setSuggest(sg);
      setApplyIds([]);
    }
  };

  const undoMove = async () => {
    const l = last;
    if (!l) return;
    const ok = await perform((s: any) => revertCategories(s, l.snap), "Movimento desfeito");
    if (ok) {
      setLast(null);
      setSuggest(null);
      setApplyIds([]);
    }
  };

  const createRule = async () => {
    const sg = suggest;
    if (!sg) return;
    const ok = await perform((s: any) => addSuggestedRule(s, sg), `Regra ${sg.pattern} criada`, { undoable: true });
    if (!ok) return;
    const after = addSuggestedRule(state, sg);
    const old = previewRules(after).filter((p: any) => matchRule({ pattern: sg.pattern, type: sg.type }, p.description, sg.type) && p.to === sg.category && (p.toSub || "") === (sg.subcategory || ""));
    setApplyIds(old.map((p: any) => p.id));
    if (!old.length) setSuggest(null);
  };

  const applyOld = async () => {
    const ids = applyIds;
    const ok = await perform((s: any) => applyRules(s, ids), `${ids.length} ${ids.length === 1 ? "lançamento antigo atualizado" : "lançamentos antigos atualizados"}`, { undoable: true });
    if (ok) {
      setSuggest(null);
      setApplyIds([]);
    }
  };

  if (moving)
    return (
      <CategorySheet
        state={state}
        type={kind}
        category={name}
        onPick={(c, s) => {
          setMoving(false);
          void move(c, s);
        }}
        onClose={() => setMoving(false)}
      />
    );

  const core = suggest ? (
    <View style={{ padding: 16, gap: 10 }}>
      {applyIds.length ? (
        <>
          <CText semi>Regra criada. Aplicar também a {applyIds.length} {applyIds.length === 1 ? "lançamento antigo" : "lançamentos antigos"} de {suggest.pattern}?</CText>
          <CButton title="Aplicar aos antigos" icon="check" onPress={applyOld} />
          <Pressable accessibilityRole="button" onPress={() => { setSuggest(null); setApplyIds([]); }} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
            <CText semi color={k.primaryText}>Só os novos</CText>
          </Pressable>
        </>
      ) : (
        <>
          <CText semi>Sempre categorizar "{suggest.pattern}" como {categoryLabel(suggest.category, suggest.subcategory)}?</CText>
          <CText muted style={{ fontSize: 12 }}>Vale para os próximos lançamentos do mesmo comerciante.</CText>
          <CButton title="Criar regra" icon="zap" onPress={createRule} />
          <Pressable accessibilityRole="button" onPress={() => setSuggest(null)} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
            <CText semi color={k.primaryText}>Agora não</CText>
          </Pressable>
        </>
      )}
    </View>
  ) : picked.length ? (
    <View style={{ padding: 16 }}>
      <CButton title={`Mover ${picked.length} para outra categoria`} icon="corner-down-right" onPress={() => setMoving(true)} />
    </View>
  ) : null;
  const footer =
    core || last ? (
      <View>
        {last && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
            <Feather name="check-circle" size={16} color={k.success} />
            <CText style={{ flex: 1, fontSize: 13 }}>{last.text}</CText>
            <Pressable accessibilityRole="button" accessibilityLabel="Desfazer movimento" onPress={undoMove} style={{ minHeight: 44, minWidth: 48, alignItems: "center", justifyContent: "center" }}>
              <CText semi color={k.primaryText}>Desfazer</CText>
            </Pressable>
          </View>
        )}
        {core}
      </View>
    ) : undefined;

  return (
    <SheetModal title={name} onClose={onClose} footer={footer}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <CText bold style={{ fontSize: 26, lineHeight: 32 }}>{show(list.total)}</CText>
          <CText muted style={{ fontSize: 13 }}>
            {list.rows.length} {list.rows.length === 1 ? "lançamento" : "lançamentos"}
          </CText>
        </View>

        {subs.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[{ name: null as string | null, label: "Todas" }, ...subs.map((s) => ({ name: s.name === "Sem subcategoria" ? "" : s.name, label: `${s.name} · ${show(s.cents)}` }))].map((c) => {
              const on = sub === c.name;
              return (
                <Pressable key={c.label} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setSub(c.name)} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: "center", backgroundColor: on ? k.primary : k.soft }}>
                  <CText semi={on} style={{ fontSize: 13, color: on ? k.onPrimary : k.muted }}>{c.label}</CText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <TextInput accessibilityLabel="Buscar lançamento" value={query} onChangeText={setQuery} placeholder="Buscar pelo nome…" placeholderTextColor={k.subtle} style={{ minHeight: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: k.soft, color: k.text }} />

        <View style={{ gap: 2 }}>
          <CPills<"value" | "date"> small items={[["value", "Maior valor"], ["date", "Mais recente"]]} value={sort} onChange={setSort} />
          {list.rows.length > 1 && (
            <Pressable accessibilityRole="button" onPress={() => setPicked(allOn ? picked.filter((id) => !visibleIds.includes(id)) : [...new Set([...picked, ...visibleIds])])} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-end" }}>
              <CText semi color={k.primaryText} style={{ fontSize: 13 }}>{allOn ? "Limpar" : "Selecionar todos"}</CText>
            </Pressable>
          )}
        </View>

        {list.rows.length ? (
          <CCard padded={false}>
            {list.rows.map((r: any, i: number) => {
              const on = picked.includes(r.id);
              const where = r.cardId ? cardName(r.cardId) : accountName(r.accountId);
              const full = state.transactions.find((t: any) => t.id === r.id);
              return (
                <View key={r.id} style={{ flexDirection: "row", alignItems: "center", borderTopWidth: i ? 1 : 0, borderTopColor: k.line, backgroundColor: on ? tint(k.primary) : "transparent" }}>
                  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${r.description}, ${show(r.amount)}, ${dd(r.date)}`} onPress={() => toggle(r.id)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 64 }}>
                    <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: on ? k.primary : k.subtle, backgroundColor: on ? k.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                      {on && <Feather name="check" size={15} color={k.onPrimary} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <CText semi numberOfLines={1} style={{ fontSize: 14 }}>{r.description}</CText>
                      <CText muted numberOfLines={1} style={{ fontSize: 12 }}>
                        {dd(r.date)}
                        {where ? ` · ${where}` : ""}
                        {r.subcategory ? ` · ${r.subcategory}` : ""}
                      </CText>
                    </View>
                    <CText semi style={{ color: kind === "income" ? k.success : k.text, fontVariant: ["tabular-nums"] }}>{show(r.amount)}</CText>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${r.description}`} onPress={() => { onClose(); nav.push({ name: "form", kind: "transaction", initial: editInitial(state, full) }); }} style={{ width: 48, minHeight: 64, alignItems: "center", justifyContent: "center" }}>
                    <Feather name="edit-2" size={16} color={k.muted} />
                  </Pressable>
                </View>
              );
            })}
          </CCard>
        ) : (
          <CText muted style={{ textAlign: "center", paddingVertical: 20 }}>{query ? "Nenhum lançamento com esse nome." : "Sem lançamentos nesta categoria no mês."}</CText>
        )}

        <Pressable accessibilityRole="button" onPress={() => { onHide(!hidden); onClose(); }} style={{ minHeight: 44, justifyContent: "center" }}>
          <CText semi color={k.primaryText} style={{ fontSize: 13 }}>{hidden ? "Mostrar no gráfico" : "Ocultar do gráfico"}</CText>
        </Pressable>
      </ScrollView>
    </SheetModal>
  );
}
