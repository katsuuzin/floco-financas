import React, { useRef, useState } from "react";
import { View, Pressable, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { T, Muted, I, Button, Group, Row, fitAmount, focusAccessibility, type ViewControl, styles as k } from "../ui/kit";
import { ConfirmSheet, SheetModal } from "../ui/Sheet";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { today } from "../finance.mjs";
import { invoiceShiftOf } from "../invoices.mjs";
import { restoreTrash, trashTransaction } from "../trash.mjs";
import { categoryStyleOf, tagStyleOf } from "../ui/CategoryIcon";
import CategoryIcon from "../ui/CategoryIcon";
import { categoryLabel } from "../categories.mjs";
import { toInput } from "../app/forms";
import { displayOf } from "./PersonalizeScreens";

const br = (date: string) => date.split("-").reverse().join("/");

export function editInitial(state: any, t: any) {
  const group = state.transactions
    .filter((x: any) => (t.groupId ? x.groupId === t.groupId : x.id === t.id))
    .sort((a: any, b: any) => a.date.localeCompare(b.date));
  const first = group[0];
  return {
    ...first,
    editId: t.id,
    amount: toInput(group.reduce((n: number, x: any) => n + x.amount, 0)),
    repeat: first.installments > 1 ? "installments" : "single",
    installments: String(first.installments || 1),
    confirmed: true,
    time: first.time || "",
    notes: first.notes || "",
    refund: !!first.refund,
    ignored: !!first.ignored,
    cardId: first.cardId || "",
    invoiceShift: invoiceShiftOf(state.cards.find((c: any) => c.id === first.cardId), first),
    accountId: first.accountId || state.accounts[0]?.id || "",
  };
}

export default function TransactionRow({ t, withDate = false, last = false }: { t: any; withDate?: boolean; last?: boolean }) {
  const { c } = useTheme();
  const { state, perform, show } = useStore();
  const [sheet, setSheet] = useState<"actions" | "installments" | "financing" | null>(null);
  const trigger = useRef<ViewControl>(null);
  const largeText = useWindowDimensions().fontScale > 1.3;
  const nav = useNav();
  const account = state.accounts.find((a: any) => a.id === t.accountId);
  const card = state.cards.find((a: any) => a.id === t.cardId);
  const tags = (t.tags || [])
    .map((id: string) => state.tags?.find((x: any) => x.id === id)?.name)
    .filter(Boolean);
  const toggleConfirmed = () =>
    perform(
      (s: any) => ({
        ...s,
        transactions: s.transactions.map((x: any) => (x.id === t.id ? { ...x, confirmed: !x.confirmed } : x)),
      }),
      t.confirmed ? "Marcado como pendente" : "Confirmado",
      { undoable: true, undo: (s) => ({ ...s, transactions: s.transactions.map((x: any) => x.id === t.id ? { ...x, confirmed: t.confirmed } : x) }) },
    );
  const canConfirm = !t.cardId && !t.loanSettlement && !t.payableId && !t.invoicePayment;
  const canEdit = !t.invoicePayment && !t.loanSettlement && !t.payableId && !t.financingId && !t.adjustment && !t.boxYield;
  const canDelete = !t.loanSettlement && !t.payableId && !t.financingId && !t.boxYield;
  const confirmLabel = t.confirmed ? "Marcar como pendente" : "Confirmar";
  const dismiss = () => {
    setSheet(null);
    requestAnimationFrame(() => focusAccessibility(trigger.current));
  };
  const runAction = (action: () => void) => {
    setSheet(null);
    action();
  };
  const remove = () => {
    setSheet(null);
    let trashId = "";
    void perform((s: any) => {
      const next = trashTransaction(s, t.id);
      trashId = next.trash[0].id;
      return next;
    }, "Lançamento movido para a lixeira", {
      undoable: true,
      undo: (s) => restoreTrash(s, trashId),
    });
  };
  const income = t.type === "income" || t.refund;
  const d = displayOf(state);
  const shortDate = new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
  const meta = [
    withDate ? shortDate : "",
    d.showTime && t.time ? t.time : "",
    d.showCategory === "category" ? categoryLabel(t.category, t.subcategory) : "",
    card?.name || account?.name,
    t.installments > 1 ? `${t.installment}/${t.installments}` : "",

  ].filter(Boolean);
  const overdue = !t.confirmed && t.date < today();
  const badges = [!t.confirmed ? "Pendente" : "", overdue ? "Atrasado" : "", t.refund ? "Estorno" : "", t.adjustment ? "Ajuste" : "", t.boxYield ? "Rendimento" : "", t.ignored ? "Fora da análise" : ""].filter(Boolean);
  return (
    <>
    <Pressable
      ref={trigger}
      accessibilityRole="button"
      accessibilityLabel={`${t.description}, ${income ? "entrada" : "saída"} de ${show(t.amount)}${
        t.confirmed ? "" : overdue ? ", pendente e atrasado" : ", pendente"
      }. Abrir opções`}
      onPress={() => setSheet("actions")}
      android_ripple={{ color: c.soft }}
      style={({ pressed }) => [row.tx, largeText && row.txLarge, !last && k.hairline, { borderBottomColor: c.line, backgroundColor: pressed ? c.soft : "transparent" }]}
    >
      {t.type === "transfer" ? (
        <View style={[row.icon, { backgroundColor: c.bg }]} importantForAccessibility="no">
          <I name="repeat" size={18} color={c.primary} />
        </View>
      ) : (
        <CategoryIcon look={categoryStyleOf(state, t.category || "Outros")} size={38} />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <T numberOfLines={largeText ? 2 : 1} style={{ fontFamily: "SoraSemi", fontSize: 14 }}>
          {t.description}
        </T>
        <Muted numberOfLines={largeText ? undefined : 1}>{meta.join(" · ")}</Muted>
        {d.showTags && !!tags.length && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          {state.tags.filter((tag: any) => (t.tags || []).includes(tag.id)).map((tag: any) =>
            <View key={tag.id} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <CategoryIcon look={tagStyleOf(tag)} size={20} /><Muted>#{tag.name}</Muted>
            </View>)}
        </View>}
        {d.showNotes && !!t.notes && (
          <Muted numberOfLines={1} style={{ fontStyle: "italic" }}>
            {t.notes}
          </Muted>
        )}
      </View>
      <View style={[row.amount, largeText && row.amountLarge]}>
        <T {...fitAmount}
          style={{
            fontFamily: "SoraSemi",
            fontSize: 14,
            fontVariant: ["tabular-nums"],
            color: income ? c.green : t.type === "transfer" ? c.muted : c.text,
          }}
        >
          {t.type === "transfer" ? "" : income ? "+" : "−"}
          {show(t.amount)}
        </T>
        {badges.map((b) => (
          <View key={b} style={[row.badge, { backgroundColor: b === "Pendente" && d.highlightPending ? c.accent : c.soft }]}>
            <T style={{ fontSize: 12, color: b === "Atrasado" ? c.red : b === "Pendente" && d.highlightPending ? c.heroText : c.text, fontFamily: "SoraSemi" }}>{b}</T>
          </View>
        ))}
      </View>
    </Pressable>
    {sheet === "actions" && (
      <SheetModal title="Ações do lançamento" onClose={dismiss}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={{ gap: 4 }}>
            <T style={{ fontFamily: "SoraSemi" }}>{t.description}</T>
            <Muted>{show(t.amount)} · {br(t.date)}{t.time ? " " + t.time : ""} · {categoryLabel(t.category, t.subcategory)}
              {t.installments > 1 ? ` · ${t.installment}/${t.installments}` : ""}
            </Muted>
            {!!t.notes && <Muted>{t.notes}</Muted>}
          </View>
          {canEdit && <Button title="Editar" icon="edit-2" onPress={() =>
            runAction(() => nav.push({ name: "form", kind: "transaction", initial: editInitial(state, t) }))
          } />}
          {(canConfirm || t.loanSettlement || t.payableId) && (
            <Group>
              {canConfirm && <Row icon="check-circle" label={confirmLabel} onPress={() =>
                t.financingId ? setSheet("financing") : runAction(toggleConfirmed)
              } />}
              {t.loanSettlement && <Row icon="users" label="Ver dívida e recebimentos" onPress={() =>
                runAction(() => nav.push({ name: "people", tab: "receivables" }))
              } />}
              {t.payableId && <Row icon="users" label="Ver dívida e pagamentos" onPress={() =>
                runAction(() => nav.push({ name: "people", tab: "payables" }))
              } />}
            </Group>
          )}
          {canDelete && <Button title="Excluir" icon="trash-2" danger onPress={() =>
            t.installments > 1 ? setSheet("installments") : remove()
          } />}
        </ScrollView>
      </SheetModal>
    )}
    {sheet === "installments" && (
      <ConfirmSheet title="Excluir todas as parcelas?" changes={["Todas as parcelas desta compra vão para a lixeira."]}
        keeps={["Você pode restaurá-las por 30 dias."]} action="Excluir parcelas" onConfirm={remove} onClose={dismiss} />
    )}
    {sheet === "financing" && (
      <ConfirmSheet title="Alterar pagamento?" changes={["O saldo da conta será recalculado."]}
        keeps={[]} action={confirmLabel} destructive={false} onConfirm={() => runAction(toggleConfirmed)} onClose={dismiss} />
    )}
    </>
  );
}

const row = StyleSheet.create({
  tx: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64 },
  txLarge: { flexWrap: "wrap", alignItems: "flex-start" },
  amount: { alignItems: "flex-end", gap: 4, maxWidth: "50%" },
  amountLarge: { width: "100%", maxWidth: "100%" },
  icon: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  badge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 1 },
});
