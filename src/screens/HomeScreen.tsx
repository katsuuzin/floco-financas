import React from "react";
import { View, Pressable } from "react-native";
import { T, Muted, I, Box, Section, Button, Empty, IconButton, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import {
  totals,
  totalBalance,
  invoice,
  monthKey,
  demoState,
  balance,
  reserved,
  accountBalanceHidden,
} from "../finance.mjs";
import TransactionRow from "./TransactionRow";
import MonthBar from "./MonthBar";

export function AccountList({ limit }: { limit?: number }) {
  const { c } = useTheme();
  const { state, perform, show } = useStore();
  const nav = useNav();
  const accounts = state.accounts.filter((a: any) => !a.archived);
  if (!accounts.length)
    return (
      <Empty
        icon="briefcase"
        title="Seu dinheiro, no seu controle"
        body="Cadastre uma conta ou carteira para começar. Nenhuma conexão com o banco é necessária."
        action="Adicionar conta"
        onPress={() => nav.push({ name: "form", kind: "account" })}
      />
    );
  return (
    <Box style={{ paddingVertical: 0 }}>
      {accounts.slice(0, limit).map((a: any) => {
        const hidden = accountBalanceHidden(state, a.id);
        return (
          <View key={a.id} style={[k.row, k.hairline, { borderBottomColor: c.line, minHeight: 80, paddingVertical: 12 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Editar ${a.name}`}
              onPress={() =>
                nav.push({
                  name: "form",
                  kind: "account",
                  initial: { ...a, initial: (a.initial / 100).toFixed(2).replace(".", ",") },
                })
              }
              style={({ pressed }) => [k.row, { flex: 1, opacity: pressed ? 0.75 : 1 }]}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: a.color || c.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <I name="briefcase" color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontFamily: "SoraSemi", fontSize: 13 }}>{a.name}</T>
                <Muted style={{ fontSize: 11 }}>
                  {a.institution || "Carteira"}
                  {a.includeInTotal === false ? " · fora do saldo geral" : ""}
                </Muted>
              </View>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <T style={{ fontFamily: "SoraSemi", fontSize: 14 }}>{show(balance(state, a.id), hidden)}</T>
                {reserved(state, a.id) > 0 && (
                  <Muted style={{ fontSize: 10 }}>
                    Disponível {show(balance(state, a.id) - reserved(state, a.id), hidden)}
                  </Muted>
                )}
              </View>
            </Pressable>
            <IconButton
              name={a.hideBalance ? "eye-off" : "eye"}
              label={`${a.hideBalance ? "Mostrar" : "Ocultar"} saldo de ${a.name}`}
              onPress={() =>
                perform(
                  (s: any) => ({
                    ...s,
                    accounts: s.accounts.map((x: any) => (x.id === a.id ? { ...x, hideBalance: !x.hideBalance } : x)),
                  }),
                  "Visibilidade da conta alterada",
                )
              }
            />
          </View>
        );
      })}
    </Box>
  );
}

export default function HomeScreen() {
  const { c } = useTheme();
  const { state, perform, confirm, show } = useStore();
  const nav = useNav();
  const { month } = nav;
  const summary = totals(state, month);
  const recent = state.transactions
    .filter((t: any) => monthKey(t.date) === month)
    .sort((a: any, b: any) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  const bills = state.cards
    .filter((card: any) => !card.archived)
    .reduce((n: number, card: any) => n + invoice(state, card.id, month).due, 0);
  return (
    <>
      <MonthBar />
      <View style={{ borderRadius: 16, padding: 24, marginTop: 4, backgroundColor: c.accent }}>
        <View style={[k.row, { justifyContent: "space-between" }]}>
          <T style={{ color: c.heroText, fontFamily: "SoraSemi" }}>Saldo total</T>
          <IconButton
            name={state.settings.hide ? "eye-off" : "eye"}
            label="Ocultar ou mostrar valores"
            color={c.heroText}
            onPress={() =>
              perform(
                (s: any) => ({ ...s, settings: { ...s.settings, hide: !s.settings.hide } }),
                "Visibilidade alterada",
              )
            }
          />
        </View>
        <T style={[k.balanceValue, { color: c.heroText, marginTop: 0 }]}>{show(totalBalance(state))}</T>
        <T style={{ color: c.heroText, fontSize: 12, marginTop: 4 }}>Saldo atual das contas incluídas</T>
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <Box style={{ flex: 1, marginBottom: 0 }}>
          <View style={k.row}>
            <I name="arrow-down-left" color={c.green} />
            <Muted>Receitas</Muted>
          </View>
          <T style={{ fontFamily: "SoraSemi", fontSize: 17, color: c.green, marginTop: 8 }}>{show(summary.income)}</T>
        </Box>
        <Box style={{ flex: 1, marginBottom: 0 }}>
          <View style={k.row}>
            <I name="arrow-up-right" color={c.red} />
            <Muted>Despesas</Muted>
          </View>
          <T style={{ fontFamily: "SoraSemi", fontSize: 17, marginTop: 8 }}>{show(summary.expense)}</T>
        </Box>
      </View>
      {(summary.pay > 0 || summary.receive > 0 || bills > 0) && (
        <>
          <Section title="Pendências do mês" />
          <Box>
            <View style={k.row}>
              <View style={k.flex}>
                <Muted>A pagar</Muted>
                <T style={{ color: c.red, fontFamily: "SoraSemi", marginTop: 6 }}>{show(summary.pay)}</T>
              </View>
              <View style={k.flex}>
                <Muted>A receber</Muted>
                <T style={{ color: c.green, fontFamily: "SoraSemi", marginTop: 6 }}>{show(summary.receive)}</T>
              </View>
              <View style={k.flex}>
                <Muted>Faturas</Muted>
                <T style={{ fontFamily: "SoraSemi", marginTop: 6 }}>{show(bills)}</T>
              </View>
            </View>
          </Box>
        </>
      )}
      <Section title="Contas" action="Ver todas" onPress={() => nav.push({ name: "accounts" })} />
      <AccountList limit={5} />
      {state.cards.some((x: any) => !x.archived) && (
        <>
          <Section title="Cartões" action="Ver faturas" onPress={() => nav.push({ name: "cards" })} />
          <Box style={{ paddingVertical: 4 }}>
            {state.cards
              .filter((x: any) => !x.archived)
              .map((card: any) => {
                const bill = invoice(state, card.id, month);
                return (
                  <Pressable
                    key={card.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${card.name}, fatura ${show(bill.due)}`}
                    onPress={() => nav.push({ name: "cards", cardId: card.id })}
                    style={[k.row, { minHeight: 56 }]}
                  >
                    <I name="credit-card" color={card.color || c.primary} />
                    <T style={{ flex: 1 }}>{card.name}</T>
                    <T style={{ fontFamily: "SoraSemi" }}>{show(bill.due)}</T>
                  </Pressable>
                );
              })}
          </Box>
        </>
      )}
      <Section title="Lançamentos recentes" action="Ver todos" onPress={() => nav.setTab("transactions")} />
      {recent.length ? (
        <Box style={{ paddingVertical: 0 }}>
          {recent.slice(0, 5).map((t: any) => (
            <TransactionRow key={t.id} t={t} />
          ))}
        </Box>
      ) : (
        <Box>
          <Muted>Nenhum lançamento neste mês.</Muted>
        </Box>
      )}
      {!state.accounts.length && (
        <Button
          title="Explorar com dados de demonstração"
          secondary
          onPress={() =>
            confirm(
              "Carregar demonstração?",
              "Estes são valores fictícios. Você poderá apagar a demonstração em Configurações.",
              () => perform(demoState(), "Demonstração carregada · valores fictícios"),
            )
          }
        />
      )}
      <View style={[k.row, { justifyContent: "center", marginVertical: 26, gap: 8 }]}>
        <I name="shield" size={15} />
        <Muted style={{ fontSize: 11 }}>Sem cadastro. Seus registros ficam neste aparelho.</Muted>
      </View>
    </>
  );
}
