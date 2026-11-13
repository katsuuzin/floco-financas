// Confirmação de uma notificação bancária: revisar e registrar em um toque.
// Linhas compactas com seta que abrem listas (tipo, conta ou cartão, categoria, tags).
import React, { useEffect, useRef, useState } from "react";
import { View, Keyboard, ScrollView, TextInput, StyleSheet } from "react-native";
import { T, Muted, I, Button, IconButton, styles as k } from "../ui/kit";
import { DateField } from "../ui/DateTime";
import { maskMoney, normalizeMoneyText } from "../moneyInput.mjs";
import { DiscardDraftSheet, SheetModal, ConfirmSheet, RowActions } from "../ui/Sheet";
import MotionPressable from "../ui/motion";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { draftFromNotification, importNotification, KIND_LABEL, KIND_DETAIL } from "../notification-import.mjs";
import { lookOf } from "../looks.mjs";
import BankBadge from "../ui/BankBadge";
import CategoryIcon from "../ui/CategoryIcon";
import { PickerRow, ListSheet, CategorySheet } from "../ui/pickers";
import { categoryLabel } from "../categories.mjs";

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

const INCOME_KINDS = ["pixIn", "transferIn", "yield", "income"];

export default function InboxSheet({ row, editDate = false, onClose, onDone }: { row: any | null; editDate?: boolean; onClose: () => void; onDone: (id: string) => void }) {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const [f, setF] = useState<any>(null);
  const baseline = useRef("");
  const [discard, setDiscard] = useState(false);
  const [dropAsk, setDropAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState<"" | "kind" | "target" | "category" | "tags">("");
  useEffect(() => {
    setError("");
    setPicker("");
    const draft = row ? draftFromNotification(state, row) : null;
    baseline.current = JSON.stringify(draft);
    setF(draft);
    setDiscard(false);
    setDropAsk(false);
    setBusy(false);
  }, [row?.id]);
  if (!row || !f) return null;
  const requestClose = () => {
    if (JSON.stringify(f) === baseline.current) onClose();
    else { Keyboard.dismiss(); setDiscard(true); }
  };
  const set = (key: string, value: any) => setF((x: any) => ({ ...x, [key]: value }));
  const income = f.type === "income";
  const color = income ? c.green : c.red;
  const when = new Date(row.postedAt);
  const stamp = `${String(row.bank).replace(/^SMS · /, "SMS ")} · ${when.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · ${f.time}`;
  const confirm = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    const ok = await perform((s: any) => importNotification(s, row, { ...f, cardId: f.kind === "card" ? f.cardId : "" }), "Lançamento registrado");
    setBusy(false);
    if (ok) onDone(row.id);
  };
  const cards = state.cards.filter((x: any) => !x.archived);
  const accounts = state.accounts.filter((x: any) => !x.archived);
  const isCard = f.kind === "card";
  const target = isCard ? cards.find((x: any) => x.id === f.cardId) : accounts.find((x: any) => x.id === f.accountId);
  const look = lookOf(state, f.category || "Outros");
  const tagNames = (f.tags || []).map((id: string) => state.tags?.find((t: any) => t.id === id)?.name).filter(Boolean);
  const line = { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line };
  if (discard) return <DiscardDraftSheet onDiscard={onClose} onContinue={() => setDiscard(false)} />;
  const confirmTitle = isCard ? "Confirmar compra" : income ? "Confirmar entrada" : "Confirmar saída";
  return (
    <>
      <SheetModal
        title="Revisar pendência"
        onClose={requestClose}
        headerAction={f.kind === "denied" ? undefined : (
          <RowActions title="Pendência" actions={[{ label: "Descartar pendência", icon: "trash-2", danger: true, onPress: () => setDropAsk(true) }]} />
        )}
        footer={f.kind === "denied" ? (
          <Button title="Descartar aviso" icon="x" onPress={() => onDone(row.id)} />
        ) : (
          <Button title={busy ? "Registrando…" : confirmTitle} icon={busy ? undefined : "check"} disabled={busy} accessibilityLiveRegion="polite" onPress={confirm} />
        )}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          <View style={[k.row, { justifyContent: "space-between", gap: 8 }]}>
            <View style={[s.badge, { backgroundColor: c.soft, flexShrink: 0 }]}>
              <I name={KIND_ICON[f.kind]} size={16} color={color} />
              <T style={{ color, fontFamily: "SoraSemi", fontSize: 13 }}>{KIND_LABEL[f.kind as "card"]}</T>
            </View>
            <View style={[k.row, { gap: 8, flexShrink: 1 }]}>
              <BankBadge name={row.bank} size={24} />
              <Muted numberOfLines={1} style={{ flexShrink: 1 }}>
                {stamp}
              </Muted>
            </View>
          </View>
          <View style={[k.row, { gap: 6 }]}>
            <T style={{ fontSize: 24, fontFamily: "SoraSemi", color }}>R$</T>
            <TextInput
              accessibilityLabel="Valor em reais"
              value={normalizeMoneyText(f.amount)}
              onChangeText={(v) => set("amount", maskMoney(v, normalizeMoneyText(f.amount)).text)}
              keyboardType="number-pad"
              style={{ flex: 1, minHeight: 48, fontSize: 32, fontFamily: "SoraBold", color, paddingVertical: 2 }}
            />
            <View importantForAccessibility="no"><I name="edit-2" size={18} /></View>
          </View>
          {f.kind === "denied" && <Muted>O banco recusou esta compra: nada foi cobrado. Descarte o aviso ou, se ele estiver errado, escolha o tipo certo.</Muted>}
          <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 18, overflow: "hidden" }}>
            <PickerRow icon={KIND_ICON[f.kind]} tint={color} label="Tipo · lido do banco" value={KIND_DETAIL[f.kind as "card"]} onPress={() => setPicker("kind")} />
            <View style={[k.row, s.fieldRow, line]}>
              <View style={[s.rowIcon, { backgroundColor: c.soft }]} importantForAccessibility="no">
                <I name="edit-2" size={18} />
              </View>
              <TextInput
                accessibilityLabel="Descrição"
                value={f.description}
                onChangeText={(v) => set("description", v)}
                placeholder="Descrição"
                placeholderTextColor={c.muted}
                style={{ flex: 1, minHeight: 48, color: c.text, fontFamily: "SoraSemi", fontSize: 15 }}
              />
            </View>
            <PickerRow
              label={isCard ? "Cartão" : "Conta"}
              value={target?.name}
              placeholder={isCard ? "Escolher cartão…" : "Escolher conta…"}
              icon={isCard ? "credit-card" : "briefcase"}
              right={target ? <BankBadge name={target.institution} alt={target.name} size={30} /> : null}
              onPress={() => setPicker("target")}
            />
            {isCard && (
              <View style={[k.row, s.fieldRow, line]}>
                <View style={[s.rowIcon, { backgroundColor: c.soft }]} importantForAccessibility="no">
                  <I name="repeat" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Muted style={{ fontSize: 12 }}>Parcelas</Muted>
                  <T style={{ fontFamily: "SoraSemi" }}>{Number(f.installments) > 1 ? `${f.installments}x` : "À vista"}</T>
                </View>
                <View style={[k.row, { gap: 4 }]}>
                  <IconButton name="minus" label="Menos parcelas" disabled={Number(f.installments) <= 1} onPress={() => set("installments", String(Math.max(1, Number(f.installments) - 1)))} />
                  <T style={{ minWidth: 24, textAlign: "center" }}>{f.installments}</T>
                  <IconButton name="plus" label="Mais parcelas" disabled={Number(f.installments) >= 48} onPress={() => set("installments", String(Math.min(48, Number(f.installments) + 1)))} />
                </View>
              </View>
            )}
            <PickerRow
              label="Categoria"
              value={f.category ? categoryLabel(f.category, f.subcategory) : ""}
              placeholder="Selecionar categoria…"
              leading={<CategoryIcon look={look} size={38} />}
              onPress={() => setPicker("category")}
            />
            {!!f.suggested && (
              <View style={[k.row, { paddingHorizontal: 14, minHeight: 48, gap: 8, backgroundColor: c.soft }]}>
                <I name="zap" size={15} color={c.primary} />
                <T style={{ flex: 1, color: c.primary, fontSize: 13 }}>Sugestão do app para esta loja</T>
                <MotionPressable kind="row" accessibilityRole="button" accessibilityLabel="Trocar a categoria sugerida" onPress={() => setPicker("category")} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 6 }}>
                  <T style={{ color: c.primary, fontFamily: "SoraSemi", fontSize: 13 }}>Trocar</T>
                </MotionPressable>
              </View>
            )}
            <PickerRow icon="hash" value={tagNames.length ? tagNames.map((n: string) => "#" + n).join("  ") : ""} placeholder="Adicionar tags" onPress={() => setPicker("tags")} />
            <View style={[k.row, s.fieldRow, { alignItems: "flex-start", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
              <View style={[s.rowIcon, { backgroundColor: c.soft, marginTop: 6 }]} importantForAccessibility="no">
                <I name="file-text" size={18} />
              </View>
              <TextInput
                accessibilityLabel="Observações (texto do banco)"
                value={f.notes}
                onChangeText={(v) => set("notes", v)}
                multiline
                placeholder="Observações"
                placeholderTextColor={c.muted}
                style={{ flex: 1, minHeight: 48, color: c.text, fontFamily: "Sora", fontSize: 15, lineHeight: 22, paddingVertical: 10 }}
              />
              {!!f.notes && <IconButton name="x" label="Limpar observações" onPress={() => set("notes", "")} />}
            </View>
          </View>
          {editDate && <DateField label="Data" value={f.date} onChange={(value) => set("date", value)} />}
          {!!error && <T accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ color: c.red }}>{error}</T>}
        </ScrollView>
      </SheetModal>
      {dropAsk && (
        <ConfirmSheet
          title="Descartar esta pendência?"
          changes={["O aviso sai da fila de pendentes."]}
          keeps={["Nenhum lançamento é criado.", "Saldos e contas não mudam."]}
          action="Descartar"
          cancelLabel="Voltar"
          preferCancel
          onConfirm={() => onDone(row.id)}
          onClose={() => setDropAsk(false)}
        />
      )}
        {picker === "kind" && (
          <ListSheet
            title="Tipo · lido do banco"
            value={f.kind}
            options={Object.keys(KIND_LABEL)
              .filter((key) => !["income", "expense", "denied"].includes(key))
              .map((key) => ({
                key,
                label: KIND_DETAIL[key as "card"],
                sub: KIND_LABEL[key as "card"] !== KIND_DETAIL[key as "card"] ? KIND_LABEL[key as "card"] : undefined,
                icon: KIND_ICON[key],
              }))}
            onPick={(key) => setF((x: any) => ({ ...x, kind: key, type: INCOME_KINDS.includes(key) ? "income" : "expense" }))}
            onClose={() => setPicker("")}
          />
        )}
        {picker === "target" && (
          <ListSheet
            title={isCard ? "Cartão" : "Conta"}
            value={isCard ? f.cardId : f.accountId}
            options={(isCard ? cards : accounts).map((x: any) => ({
              key: x.id,
              label: x.name,
              sub: x.institution || undefined,
              leading: <BankBadge name={x.institution} alt={x.name} size={36} />,
            }))}
            empty={isCard ? "Cadastre o cartão em Mais › Cartões." : "Cadastre uma conta primeiro."}
            onPick={(key) => set(isCard ? "cardId" : "accountId", key)}
            onClose={() => setPicker("")}
          />
        )}
        {picker === "category" && (
          <CategorySheet
            state={state}
            type={income ? "income" : "expense"}
            category={f.category}
            subcategory={f.subcategory}
            onPick={(cat, sub) => setF((x: any) => ({ ...x, category: cat, subcategory: sub, suggested: false }))}
            onClose={() => setPicker("")}
          />
        )}
        {picker === "tags" && (
          <ListSheet
            title="Tags"
            multiple
            value={f.tags || []}
            options={(state.tags || []).map((t: any) => ({ key: t.id, label: "#" + t.name, icon: "hash" as any }))}
            empty="Você ainda não criou tags. Crie em Mais › Categorias e tags."
            onPick={(key) => set("tags", (f.tags || []).includes(key) ? f.tags.filter((x: string) => x !== key) : [...(f.tags || []), key])}
            onClose={() => setPicker("")}
          />
        )}
    </>
  );
}

const s = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  fieldRow: { gap: 12, minHeight: 60, paddingHorizontal: 14, paddingVertical: 4 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
