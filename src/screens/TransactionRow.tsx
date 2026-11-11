import React from "react";
import { View, Pressable, Alert, StyleSheet } from "react-native";
import { T, Muted, I, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { money } from "../finance.mjs";
import { invoiceShiftOf } from "../invoices.mjs";
import { trashTransaction } from "../trash.mjs";
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
  const { state, perform, confirm, show } = useStore();
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
    );
  // O alerta do Android mostra no máximo 3 botões. Com 3 ações, "Fechar" sai e o
  // alerta fecha ao tocar fora ou pelo voltar.
  const options = () => {
    const actions: any[] = [
        ...(t.loanSettlement
          ? [{ text: "Ver dívida e recebimentos", onPress: () => nav.push({ name: "tool", id: "receivables" }) }]
          : []),
        ...(!t.cardId && !t.loanSettlement && !t.invoicePayment
          ? [
              {
                text: t.confirmed ? "Marcar como pendente" : "Confirmar",
                onPress: () =>
                  t.financingId
                    ? confirm("Alterar pagamento?", "O saldo da conta será recalculado.", toggleConfirmed)
                    : toggleConfirmed(),
              },
            ]
          : []),
        ...(!t.invoicePayment && !t.loanSettlement && !t.financingId && !t.adjustment && !t.boxYield
          ? [{ text: "Editar", onPress: () => nav.push({ name: "form", kind: "transaction", initial: editInitial(state, t) }) }]
          : []),
        ...(!t.loanSettlement && !t.financingId && !t.boxYield
          ? [
              {
                text: "Excluir",
                style: "destructive" as const,
                onPress: () =>
                  confirm(
                    "Excluir lançamento?",
                    t.installments > 1
                      ? "Todas as parcelas desta compra vão para a lixeira. Dá para restaurar por 30 dias."
                      : "O lançamento vai para a lixeira e o saldo é recalculado. Dá para restaurar por 30 dias.",
                    () => perform((s: any) => trashTransaction(s, t.id), "Lançamento movido para a lixeira"),
                    "Excluir",
                  ),
              },
            ]
          : []),
    ];
    Alert.alert(
      t.description,
      `${money(t.amount)} · ${br(t.date)}${t.time ? " " + t.time : ""}\n${categoryLabel(t.category, t.subcategory)}${
        t.installments > 1 ? ` · ${t.installment}/${t.installments}` : ""
      }${t.notes ? "\n\n" + t.notes : ""}`,
      actions.length >= 3 ? actions : [{ text: "Fechar", style: "cancel" }, ...actions],
      { cancelable: true },
    );
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
  const badges = [!t.confirmed ? "Pendente" : "", t.refund ? "Estorno" : "", t.adjustment ? "Ajuste" : "", t.boxYield ? "Rendimento" : "", t.ignored ? "Fora da análise" : ""].filter(Boolean);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.description}, ${income ? "entrada" : "saída"} de ${money(t.amount)}${
        t.confirmed ? "" : ", pendente"
      }. Abrir opções`}
      onPress={options}
      android_ripple={{ color: c.soft }}
      style={({ pressed }) => [row.tx, !last && k.hairline, { borderBottomColor: c.line, backgroundColor: pressed ? c.soft : "transparent" }]}
    >
      {t.type === "transfer" ? (
        <View style={[row.icon, { backgroundColor: c.bg }]} importantForAccessibility="no">
          <I name="repeat" size={18} color={c.primary} />
        </View>
      ) : (
        <CategoryIcon look={categoryStyleOf(state, t.category || "Outros")} size={38} />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <T numberOfLines={1} style={{ fontFamily: "SoraSemi", fontSize: 14 }}>
          {t.description}
        </T>
        <Muted numberOfLines={1}>{meta.join(" · ")}</Muted>
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
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <T
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
            <T style={{ fontSize: 10.5, color: b === "Pendente" && d.highlightPending ? c.heroText : c.text, fontFamily: "SoraSemi" }}>{b}</T>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const row = StyleSheet.create({
  tx: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64 },
  icon: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  badge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 1 },
});
