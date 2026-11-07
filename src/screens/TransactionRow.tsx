import React from "react";
import { View, Pressable, Alert, StyleSheet } from "react-native";
import { T, Muted, I, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { money, deleteTransaction } from "../finance.mjs";
import { toInput } from "../app/forms";

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
    accountId: first.accountId || state.accounts[0]?.id || "",
  };
}

export default function TransactionRow({ t }: { t: any }) {
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
  const options = () =>
    Alert.alert(
      t.description,
      `${money(t.amount)} · ${br(t.date)}${t.time ? " " + t.time : ""}\n${t.category || "Outros"}${
        t.installments > 1 ? ` · ${t.installment}/${t.installments}` : ""
      }${t.notes ? "\n\n" + t.notes : ""}`,
      [
        { text: "Fechar", style: "cancel" },
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
        ...(!t.invoicePayment && !t.loanSettlement && !t.financingId
          ? [{ text: "Editar", onPress: () => nav.push({ name: "form", kind: "transaction", initial: editInitial(state, t) }) }]
          : []),
        ...(!t.loanSettlement && !t.financingId
          ? [
              {
                text: "Excluir",
                style: "destructive" as const,
                onPress: () =>
                  confirm(
                    "Excluir lançamento?",
                    t.installments > 1
                      ? "Todas as parcelas desta compra serão excluídas."
                      : "Esta ação remove o lançamento e recalcula o saldo.",
                    () => perform((s: any) => deleteTransaction(s, t.id), "Lançamento excluído"),
                    "Excluir",
                  ),
              },
            ]
          : []),
      ],
    );
  const income = t.type === "income" || t.refund;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.description}, ${income ? "entrada" : "saída"} de ${money(t.amount)}${
        t.confirmed ? "" : ", pendente"
      }. Abrir opções`}
      onPress={options}
      style={({ pressed }) => [row.tx, k.hairline, { borderBottomColor: c.line, opacity: pressed ? 0.75 : 1 }]}
    >
      <View style={[row.icon, { backgroundColor: c.soft }]}>
        <I
          name={
            t.type === "transfer"
              ? "repeat"
              : income
                ? "arrow-down-left"
                : t.cardId
                  ? "credit-card"
                  : "arrow-up-right"
          }
          color={income ? c.green : c.primary}
        />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <T numberOfLines={2} style={{ fontFamily: "SoraSemi", fontSize: 13 }}>
          {t.description}
        </T>
        <Muted style={{ fontSize: 11 }}>
          {t.category} · {card?.name || account?.name}
          {t.installments > 1 ? ` · ${t.installment}/${t.installments}` : ""}
          {tags.length ? " · " + tags.map((x: string) => "#" + x).join(" ") : ""}
        </Muted>
        <Muted style={{ fontSize: 10 }}>
          {br(t.date)}
          {t.time ? " · " + t.time : ""}
          {!t.confirmed ? " · Pendente" : t.cardId ? " · Na fatura" : ""}
          {t.refund ? " · Estorno" : ""}
          {t.ignored ? " · Fora da análise" : ""}
        </Muted>
      </View>
      <T
        style={{
          fontFamily: "SoraSemi",
          fontSize: 13,
          color: income ? c.green : t.type === "transfer" ? c.muted : c.text,
          opacity: t.confirmed ? 1 : 0.7,
        }}
      >
        {t.type === "transfer" ? "" : income ? "+" : "−"}
        {show(t.amount)}
      </T>
    </Pressable>
  );
}

const row = StyleSheet.create({
  tx: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 15, minHeight: 80 },
  icon: { width: 37, height: 37, borderRadius: 12, justifyContent: "center", alignItems: "center" },
});
