// Contas, Cartões, Orçamento e Metas — telas empilhadas a partir de Mais.
import React, { useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { T, Muted, I, Box, Section, Button, Empty, IconButton, Progress, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { invoice, invoiceDueDate, spent, totalBalance } from "../finance.mjs";
import { toInput } from "../app/forms";
import TransactionRow from "./TransactionRow";
import MonthBar from "./MonthBar";
import { AccountList } from "./HomeScreen";

export function AccountsScreen() {
  const { state, perform, show } = useStore();
  const nav = useNav();
  const archived = state.accounts.filter((a: any) => a.archived);
  return (
    <>
      <Box>
        <Muted>Saldo total</Muted>
        <T style={[k.balanceValue, { fontSize: 28, marginTop: 4 }]}>{show(totalBalance(state))}</T>
      </Box>
      <Section title="Contas ativas" action="Adicionar" onPress={() => nav.push({ name: "form", kind: "account" })} />
      <AccountList />
      {!!archived.length && (
        <>
          <Section title="Arquivadas" />
          {archived.map((a: any) => (
            <Box key={a.id} style={[k.row, { justifyContent: "space-between" }]}>
              <T>{a.name}</T>
              <Button
                title="Restaurar"
                secondary
                onPress={() =>
                  perform(
                    (s: any) => ({
                      ...s,
                      accounts: s.accounts.map((x: any) => (x.id === a.id ? { ...x, archived: false } : x)),
                    }),
                    "Conta restaurada",
                  )
                }
              />
            </Box>
          ))}
        </>
      )}
    </>
  );
}

export function CardsScreen({ cardId }: { cardId?: string }) {
  const { c } = useTheme();
  const { state, show, perform } = useStore();
  const nav = useNav();
  const { month } = nav;
  const active = state.cards.filter((x: any) => !x.archived);
  const [selected, setSelected] = useState(cardId || active[0]?.id || "");
  const card = active.find((x: any) => x.id === selected) || active[0];
  if (!card)
    return (
      <Empty
        icon="credit-card"
        title="Sua fatura sem surpresas"
        body="Cadastre um cartão para acompanhar limite, fechamento e compras parceladas."
        action="Adicionar cartão"
        onPress={() => nav.push({ name: "form", kind: "card" })}
      />
    );
  const bill = invoice(state, card.id, month);
  const used =
    state.transactions.filter((t: any) => t.cardId === card.id).reduce((n: number, t: any) => n + t.amount, 0) -
    state.transactions
      .filter((t: any) => t.invoicePayment?.startsWith(card.id + ":"))
      .reduce((n: number, t: any) => n + t.amount, 0);
  const due = invoiceDueDate(card, month).split("-").reverse().join("/");
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={k.chips}>
        {active.map((x: any) => (
          <Pressable
            key={x.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: x.id === card.id }}
            onPress={() => setSelected(x.id)}
            style={[k.chip, { backgroundColor: x.id === card.id ? c.primary : c.surface }]}
          >
            <T style={{ fontSize: 12, color: x.id === card.id ? c.onPrimary : c.text }}>{x.name}</T>
          </Pressable>
        ))}
        <IconButton name="plus" label="Adicionar cartão" onPress={() => nav.push({ name: "form", kind: "card" })} />
      </ScrollView>
      <MonthBar />
      <View style={{ padding: 24, borderRadius: 16, backgroundColor: card.color || "#311E0D", marginTop: 4 }}>
        <View style={k.row}>
          <I name="credit-card" color="#FFFFFF" size={28} />
          <View style={{ flex: 1 }} />
          <IconButton
            name="edit-2"
            label="Editar cartão"
            color="#FFFFFF"
            onPress={() =>
              nav.push({
                name: "form",
                kind: "card",
                initial: {
                  ...card,
                  limit: toInput(card.limit),
                  closingDay: String(card.closingDay),
                  dueDay: String(card.dueDay),
                },
              })
            }
          />
        </View>
        <T style={{ color: "#FFFFFF", fontFamily: "SoraSemi", fontSize: 19 }}>{card.name}</T>
        <T style={{ color: "#F5E4D1", marginTop: 6 }}>•••• {card.lastFour || "••••"}</T>
        <View style={[k.row, { marginTop: 22, justifyContent: "space-between" }]}>
          <T style={{ color: "#F5E4D1", fontSize: 11 }}>Fecha dia {card.closingDay}</T>
          <T style={{ color: "#F5E4D1", fontSize: 11 }}>Vence {due}</T>
        </View>
      </View>
      <Section title="Fatura do mês" />
      <Box>
        <Muted>Valor em aberto</Muted>
        <T style={[k.balanceValue, { fontSize: 30 }]}>{show(bill.due)}</T>
        <View style={[k.row, { justifyContent: "space-between", marginVertical: 12 }]}>
          <Muted>Pago {show(bill.paid)}</Muted>
          <Muted>Total {show(bill.total)}</Muted>
        </View>
        <Progress value={used} max={card.limit} color={used > card.limit ? c.red : undefined} />
        <Muted style={{ marginTop: 10, marginBottom: 18 }}>
          Limite usado {show(Math.max(0, used))} de {show(card.limit)}
        </Muted>
        <Button
          title={bill.due ? "Pagar fatura" : "Fatura sem saldo a pagar"}
          disabled={!bill.due}
          icon="check"
          onPress={() =>
            nav.push({
              name: "form",
              kind: "payment",
              initial: { cardId: card.id, month, accountId: card.accountId || state.accounts[0]?.id },
            })
          }
        />
      </Box>
      <Section title="Compras desta fatura" />
      <Box style={{ paddingVertical: 0 }}>
        {bill.purchases.length ? (
          bill.purchases.map((t: any) => <TransactionRow key={t.id} t={t} />)
        ) : (
          <Empty title="Nenhuma compra nesta fatura" body="As compras entram na fatura conforme o fechamento do cartão." />
        )}
      </Box>
      <Button
        title="Arquivar cartão"
        danger
        icon="archive"
        onPress={() =>
          perform(
            (s: any) => ({ ...s, cards: s.cards.map((x: any) => (x.id === card.id ? { ...x, archived: true } : x)) }),
            "Cartão arquivado. O histórico continua nos relatórios.",
          )
        }
      />
    </>
  );
}

export function BudgetsScreen() {
  const { c } = useTheme();
  const { state, show, perform, confirm } = useStore();
  const nav = useNav();
  const { month } = nav;
  return (
    <>
      <MonthBar />
      <Section title="Orçamento por categoria" action="Adicionar" onPress={() => nav.push({ name: "form", kind: "budget" })} />
      {state.budgets.length ? (
        state.budgets.map((b: any) => {
          const used = spent(state, b.category, month);
          return (
            <Box key={b.id}>
              <View style={[k.row, { justifyContent: "space-between" }]}>
                <T style={{ fontFamily: "SoraSemi", flex: 1 }}>{b.category}</T>
                <IconButton
                  name="edit-2"
                  label={`Editar orçamento de ${b.category}`}
                  onPress={() =>
                    nav.push({ name: "form", kind: "budget", initial: { category: b.category, amount: toInput(b.amount) } })
                  }
                />
                <IconButton
                  name="trash-2"
                  label={`Excluir orçamento de ${b.category}`}
                  onPress={() =>
                    confirm("Excluir orçamento?", b.category, () =>
                      perform((s: any) => ({ ...s, budgets: s.budgets.filter((x: any) => x.id !== b.id) })),
                    )
                  }
                />
              </View>
              <Muted style={{ marginBottom: 12 }}>
                {show(used)} de {show(b.amount)}
              </Muted>
              <Progress
                value={used}
                max={b.amount}
                color={used > b.amount ? c.red : used / b.amount >= 0.8 ? c.amber : c.primary}
              />
              <T style={{ color: used > b.amount ? c.red : c.green, fontSize: 12, marginTop: 8 }}>
                {show(Math.abs(b.amount - used))} {used > b.amount ? "acima do limite" : "restante"}
              </T>
            </Box>
          );
        })
      ) : (
        <Empty
          icon="pie-chart"
          title="Um limite que você decide"
          body="Defina quanto quer gastar por categoria. Os gastos confirmados aparecem automaticamente."
          action="Criar orçamento"
          onPress={() => nav.push({ name: "form", kind: "budget" })}
        />
      )}
    </>
  );
}

export function GoalsScreen() {
  const { c } = useTheme();
  const { state, show, perform, confirm } = useStore();
  const nav = useNav();
  return (
    <>
      <Section title="Metas e caixinhas" action="Criar meta" onPress={() => nav.push({ name: "form", kind: "goal" })} />
      <Muted style={{ marginBottom: 16 }}>
        Os depósitos reservam dinheiro dentro da conta. O saldo total continua o mesmo; o disponível diminui.
      </Muted>
      {state.goals.length ? (
        state.goals.map((g: any) => (
          <Box key={g.id}>
            <View style={[k.row, { justifyContent: "space-between" }]}>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: "SoraSemi" }}>{g.name}</T>
                <Muted style={{ marginTop: 4 }}>
                  {show(g.saved)} de {show(g.target)}
                  {g.deadline ? ` · até ${g.deadline.split("-").reverse().join("/")}` : ""}
                </Muted>
              </View>
              <IconButton
                name="edit-2"
                label={`Editar meta ${g.name}`}
                onPress={() =>
                  nav.push({ name: "form", kind: "goal", initial: { ...g, target: toInput(g.target) } })
                }
              />
            </View>
            <View style={{ marginVertical: 14 }}>
              <Progress value={g.saved} max={g.target} color={g.saved >= g.target ? c.green : undefined} />
            </View>
            <View style={{ gap: 8 }}>
              <Button title="Guardar dinheiro" icon="plus" onPress={() => nav.push({ name: "form", kind: "deposit", initial: { goalId: g.id } })} />
              {g.saved > 0 && (
                <Button
                  title="Retirar"
                  secondary
                  icon="minus"
                  onPress={() => nav.push({ name: "form", kind: "withdraw", initial: { goalId: g.id } })}
                />
              )}
              {g.saved > 0 && state.goals.length > 1 && (
                <Button
                  title="Transferir para outra caixinha"
                  secondary
                  icon="shuffle"
                  onPress={() =>
                    nav.push({
                      name: "form",
                      kind: "reserveTransfer",
                      initial: { goalId: g.id, destinationGoalId: state.goals.find((x: any) => x.id !== g.id)?.id || "" },
                    })
                  }
                />
              )}
            </View>
            {!!g.history?.length && (
              <Muted style={{ marginTop: 12 }}>
                {g.history
                  .slice(-5)
                  .map(
                    (h: any) =>
                      `${h.date.split("-").reverse().join("/")} · ${h.type === "deposit" ? "Depósito" : "Retirada"} · ${show(h.amount)}`,
                  )
                  .join("\n")}
              </Muted>
            )}
            <Button
              title="Excluir e liberar reserva"
              danger
              onPress={() =>
                confirm(
                  "Excluir meta e liberar reserva?",
                  "Os valores reservados voltam a ficar disponíveis nas contas. O saldo total não muda.",
                  () => perform((s: any) => ({ ...s, goals: s.goals.filter((x: any) => x.id !== g.id) })),
                  "Excluir",
                )
              }
            />
          </Box>
        ))
      ) : (
        <Empty
          icon="target"
          title="Um plano para chegar lá"
          body="Crie uma reserva ou dê um nome ao seu próximo objetivo."
          action="Criar meta"
          onPress={() => nav.push({ name: "form", kind: "goal" })}
        />
      )}
    </>
  );
}
