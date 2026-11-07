import React, { useMemo, useState } from "react";
import { View, TextInput } from "react-native";
import { Box, Chips, Empty, Muted, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { monthKey, money, includedAccounts, signedAmount } from "../finance.mjs";
import { displayOf } from "./PersonalizeScreens";
import TransactionRow from "./TransactionRow";
import MonthBar from "./MonthBar";

type Filter = "all" | "income" | "expense" | "transfer" | "pending";
const norm = (s: string) =>
  s
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function matches(t: any, query: string, notes = true) {
  if (!query.trim()) return true;
  const q = norm(query.trim());
  const amount = (t.amount / 100).toFixed(2);
  return (
    norm(t.description).includes(q) ||
    (notes && norm(t.notes || "").includes(q)) ||
    norm(t.category || "").includes(q) ||
    amount.includes(q.replace(",", ".")) ||
    money(t.amount).includes(query.trim())
  );
}

export default function TransactionsScreen() {
  const { c } = useTheme();
  const { state, show } = useStore();
  const { month } = useNav();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const d = displayOf(state);
  const days = useMemo(() => {
    const rows = state.transactions
      .filter((t: any) => monthKey(t.date) === month)
      .filter((t: any) => !d.onlyConfirmed || t.confirmed)
      .filter((t: any) =>
        filter === "all"
          ? true
          : filter === "pending"
            ? !t.confirmed
            : filter === "income"
              ? t.type === "income" || t.refund
              : filter === "expense"
                ? t.type === "expense" && !t.refund
                : t.type === filter,
      )
      .filter((t: any) => matches(t, search, d.searchNotes))
      .sort((a: any, b: any) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
    const map = new Map<string, any[]>();
    for (const t of rows) map.set(t.date, [...(map.get(t.date) || []), t]);
    // Compras do cartão no fim de cada dia, quando pedido.
    if (d.cardSeparate) for (const [k2, v] of map) map.set(k2, [...v.filter((t) => !t.cardId), ...v.filter((t) => t.cardId)]);
    return [...map.entries()];
  }, [state.transactions, month, filter, search, d.onlyConfirmed, d.searchNotes, d.cardSeparate]);
  // Saldo das contas incluídas ao fim de cada dia (para a preferência "saldo acumulado").
  const endOfDay = (date: string) =>
    includedAccounts(state).reduce((n: number, a: any) => n + a.initial, 0) +
    state.transactions
      .filter((t: any) => t.confirmed && !t.cardId && t.date <= date)
      .reduce((n: number, t: any) => {
        const inc = includedAccounts(state).map((a: any) => a.id);
        return (
          n +
          (inc.includes(t.accountId) ? signedAmount(t) : 0) +
          (t.type === "transfer" && inc.includes(t.destinationId) ? t.amount : 0)
        );
      }, 0);
  return (
    <>
      <MonthBar />
      <TextInput
        accessibilityLabel="Buscar por descrição, valor ou observação"
        placeholder="Buscar por descrição ou valor"
        placeholderTextColor={c.muted}
        value={search}
        onChangeText={setSearch}
        style={[k.input, { backgroundColor: c.surface, color: c.text, borderColor: c.line }]}
      />
      <Chips
        values={[
          ["all", "Todas"],
          ["income", "Receitas"],
          ["expense", "Despesas"],
          ["transfer", "Transferências"],
          ["pending", "Pendentes"],
        ]}
        value={filter}
        onChange={setFilter}
      />
      {days.length ? (
        days.map(([date, rows]) => {
          const net = rows.reduce(
            (n: number, t: any) =>
              t.type === "transfer" ? n : n + (t.type === "income" || t.refund ? t.amount : -t.amount),
            0,
          );
          return (
            <View key={date}>
              <View style={[k.row, { justifyContent: "space-between", marginTop: 14, marginBottom: 6 }]}>
                <Muted>
                  {(() => {
                    const s = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    });
                    return s.charAt(0).toUpperCase() + s.slice(1);
                  })()}
                </Muted>
                <Muted>
                  {d.dailyBalance
                    ? "Saldo " + (endOfDay(date) < 0 ? "−" : "") + show(Math.abs(endOfDay(date)))
                    : (net >= 0 ? "+" : "−") + show(Math.abs(net))}
                </Muted>
              </View>
              <Box style={{ padding: 0, marginBottom: 4, overflow: "hidden" }}>
                {rows.map((t: any, i: number) => (
                  <TransactionRow key={t.id} t={t} last={i === rows.length - 1} />
                ))}
              </Box>
            </View>
          );
        })
      ) : (
        <Empty
          title="Nenhum lançamento encontrado"
          body="Tente outra busca, escolha outro mês ou registre uma movimentação pelo botão +."
        />
      )}
    </>
  );
}
