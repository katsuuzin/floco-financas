// Confirmação de uma notificação bancária: revisar e registrar em um toque.
import React, { useEffect, useState } from "react";
import { View, Modal, Pressable, ScrollView, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { T, Muted, I, Button, Choice, Field, IconButton, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { draftFromNotification, importNotification, KIND_LABEL } from "../notification-import.mjs";
import { categoryNames } from "../planning.mjs";
import BankBadge from "../ui/BankBadge";

const KIND_ICON: Record<string, any> = {
  card: "credit-card",
  pixOut: "arrow-up-right",
  pixIn: "arrow-down-left",
  transferOut: "arrow-up-right",
  transferIn: "arrow-down-left",
  bill: "file-text",
  debit: "credit-card",
  income: "arrow-down-left",
  expense: "arrow-up-right",
  yield: "trending-up",
  denied: "slash",
};

export default function InboxSheet({ row, onClose, onDone }: { row: any | null; onClose: () => void; onDone: (id: string) => void }) {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const [f, setF] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setError("");
    setF(row ? draftFromNotification(state, row) : null);
  }, [row?.id]);
  if (!row || !f) return null;
  const set = (key: string, value: any) => setF((x: any) => ({ ...x, [key]: value }));
  const income = f.type === "income";
  const color = income ? c.green : c.red;
  const when = new Date(row.postedAt);
  const stamp = `${String(row.bank).replace(/^SMS · /, "SMS ")} · ${when.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · ${f.time}`;
  const confirm = async () => {
    setError("");
    const ok = await perform((s: any) => importNotification(s, row, { ...f, cardId: f.kind === "card" ? f.cardId : "" }), "Lançamento registrado");
    if (ok) onDone(row.id);
  };
  const cards = state.cards.filter((x: any) => !x.archived);
  const accounts = state.accounts.filter((x: any) => !x.archived);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Fechar" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[s.sheet, { backgroundColor: c.bg }]}>
        <View style={[s.handle, { backgroundColor: c.line }]} />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          <View style={[k.row, { justifyContent: "space-between" }]}>
            <View style={[s.badge, { backgroundColor: c.soft, flexShrink: 0 }]}>
              <I name={KIND_ICON[f.kind]} size={16} color={color} />
              <T style={{ color, fontFamily: "SoraSemi", fontSize: 13 }}>{KIND_LABEL[f.kind as "card"]}</T>
            </View>
            <View style={[k.row, { gap: 8, flexShrink: 1 }]}>
              <BankBadge name={row.bank} size={24} />
              <Muted numberOfLines={1} style={{ flexShrink: 1 }}>{stamp}</Muted>
            </View>
          </View>
          <View style={[k.row, { gap: 6 }]}>
            <T style={{ fontSize: 24, fontFamily: "SoraSemi", color }}>R$</T>
            <TextInput
              accessibilityLabel="Valor em reais"
              value={f.amount}
              onChangeText={(v) => set("amount", v)}
              keyboardType="decimal-pad"
              style={{ flex: 1, fontSize: 32, fontFamily: "SoraBold", color, paddingVertical: 2 }}
            />
            <I name="edit-2" size={18} />
          </View>
          {f.kind === "denied" && <Muted>O banco recusou esta compra: nada foi cobrado. Descarte o aviso ou, se ele estiver errado, escolha o tipo certo abaixo.</Muted>}
          <Choice
            label="Tipo · lido do banco"
            values={Object.entries(KIND_LABEL).filter(([key]) => !["income", "expense", "denied"].includes(key)) as [string, string][]}
            value={f.kind}
            onChange={(v) => setF((x: any) => ({ ...x, kind: v, type: ["pixIn", "transferIn", "yield"].includes(v) ? "income" : "expense" }))}
          />
          <Field label="Descrição" value={f.description} onChange={(v) => set("description", v)} />
          {f.kind === "card" ? (
            <>
              <Choice label="Cartão" values={cards.map((x: any) => [x.id, x.name])} value={f.cardId} onChange={(v) => set("cardId", v)} empty="Cadastre o cartão em Mais › Cartões." />
              <View style={[k.row, { justifyContent: "space-between" }]}>
                <View>
                  <Muted>Parcelas</Muted>
                  <T style={{ fontFamily: "SoraSemi" }}>{Number(f.installments) > 1 ? `${f.installments}x` : "À vista"}</T>
                </View>
                <View style={[k.row, { gap: 4 }]}>
                  <IconButton name="minus" label="Menos parcelas" onPress={() => set("installments", String(Math.max(1, Number(f.installments) - 1)))} />
                  <T style={{ minWidth: 28, textAlign: "center" }}>{f.installments}</T>
                  <IconButton name="plus" label="Mais parcelas" onPress={() => set("installments", String(Math.min(48, Number(f.installments) + 1)))} />
                </View>
              </View>
            </>
          ) : (
            <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Conta">
              <Muted>Conta</Muted>
              {accounts.length ? (
                accounts.map((a: any) => {
                  const on = f.accountId === a.id;
                  return (
                    <Pressable
                      key={a.id}
                      accessibilityRole="radio"
                      accessibilityLabel={`${a.name}${a.institution ? ", " + a.institution : ""}`}
                      accessibilityState={{ checked: on }}
                      onPress={() => set("accountId", a.id)}
                      android_ripple={{ color: c.soft }}
                      style={[k.row, { gap: 12, minHeight: 56, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: on ? c.primary : c.line, backgroundColor: on ? c.soft : "transparent" }]}
                    >
                      <BankBadge name={a.institution} alt={a.name} size={36} />
                      <View style={{ flex: 1 }}>
                        <T style={{ fontFamily: "SoraSemi" }}>{a.name}</T>
                        {!!a.institution && a.institution !== a.name && <Muted>{a.institution}</Muted>}
                      </View>
                      {on && <I name="check" size={18} color={c.primary} />}
                    </Pressable>
                  );
                })
              ) : (
                <Muted>Cadastre uma conta primeiro.</Muted>
              )}
            </View>
          )}
          <Choice label="Categoria" values={categoryNames(state).map((x: string) => [x, x])} value={f.category} onChange={(v) => set("category", v)} />
          {!!state.tags?.length && (
            <Choice
              label="Tag"
              values={[["", "Sem tag"], ...state.tags.map((t: any) => [t.id, "#" + t.name])] as [string, string][]}
              value={f.tags[0] || ""}
              onChange={(v) => set("tags", v ? [v] : [])}
            />
          )}
          <View style={{ gap: 4 }}>
            <Field label="Observações (texto do banco)" value={f.notes} onChange={(v) => set("notes", v)} multiline />
            {!!f.notes && (
              <Pressable accessibilityRole="button" accessibilityLabel="Limpar observações" onPress={() => set("notes", "")} style={{ alignSelf: "flex-end", minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}>
                <T style={{ color: c.primary, fontFamily: "SoraSemi", fontSize: 13 }}>Limpar observações</T>
              </Pressable>
            )}
          </View>
          {!!error && <T style={{ color: c.red }}>{error}</T>}
        </ScrollView>
        <View style={[k.row, s.footer, { borderTopColor: c.line }]}>
          <Pressable accessibilityRole="button" onPress={() => onDone(row.id)} style={{ flex: 1, minHeight: 52, justifyContent: "center", alignItems: "center" }}>
            <T style={{ color: c.primary, fontFamily: "SoraSemi" }}>Descartar</T>
          </Pressable>
          <View style={{ flex: 1.6 }}>
            {f.kind === "denied" ? (
              <Button title="Descartar aviso" icon="x" onPress={() => onDone(row.id)} />
            ) : (
              <Button title={f.kind === "card" ? "Confirmar compra" : income ? "Confirmar entrada" : "Confirmar saída"} icon="check" onPress={confirm} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { maxHeight: "88%", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: "center", marginTop: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  footer: { padding: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
