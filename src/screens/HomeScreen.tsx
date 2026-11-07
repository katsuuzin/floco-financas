import React from "react";
import { View, Pressable } from "react-native";
import { T, Muted, I, Box, Section, Button, Empty, IconButton, Progress, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav, destination } from "../app/nav";
import { layoutOf, firstSteps, DESTINATIONS } from "../layout.mjs";
import { monthInsights } from "../insights.mjs";
import { normalizeBudget, budgetUsage } from "../analysis.mjs";
import { receivableBalance } from "../planning.mjs";
import { installmentPlan, recurrenceTotals } from "../commitments.mjs";
import {
  totals,
  totalBalance,
  invoice,
  monthKey,
  today,
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

function Shortcuts() {
  const { c } = useTheme();
  const { state } = useStore();
  const nav = useNav();
  const ids: string[] = layoutOf(state).shortcuts;
  return (
    <View style={[k.chips, { marginTop: 12 }]}>
      {ids.map((id) => {
        const d = DESTINATIONS.find(([x]) => x === id);
        if (!d) return null;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={d[1]}
            onPress={() => {
              const to = destination(id);
              if (to.tab) nav.setTab(to.tab);
              else if (to.route) nav.push(to.route);
            }}
            style={({ pressed }) => ({
              flexGrow: 1,
              flexBasis: "22%",
              minHeight: 72,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              backgroundColor: c.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <I name={d[2] as any} color={c.primary} />
            <T style={{ fontSize: 11, textAlign: "center" }}>{d[1]}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

function FirstSteps() {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const nav = useNav();
  const f = firstSteps(state);
  if (f.hidden || f.done === f.steps.length) return null;
  const go: Record<string, () => void> = {
    account: () => nav.push({ name: "form", kind: "account" }),
    expense: () => nav.push({ name: "form", kind: "transaction", initial: { type: "expense" } }),
    card: () => nav.push({ name: "form", kind: "card" }),
    reminders: () => nav.push({ name: "reminders" }),
  };
  return (
    <>
      <Section title="Vamos começar" action="Ocultar" onPress={() => perform((s: any) => ({ ...s, settings: { ...s.settings, firstStepsHidden: true } }), "Primeiros passos ocultos. Reabra em Configurações › Manutenção.")} />
      <Box>
        <Muted>
          {f.done} de {f.steps.length} concluídos
        </Muted>
        <View style={{ marginVertical: 10 }}>
          <Progress value={f.done} max={f.steps.length} />
        </View>
        {f.steps.map((step: any) => (
          <Pressable
            key={step.id}
            accessibilityRole="button"
            accessibilityState={{ checked: step.done }}
            disabled={step.done}
            onPress={go[step.id]}
            style={[k.row, { minHeight: 48, paddingVertical: 6 }]}
          >
            <I name={step.done ? "check-circle" : "circle"} color={step.done ? c.green : c.muted} />
            <T style={{ flex: 1, textDecorationLine: step.done ? "line-through" : "none", opacity: step.done ? 0.6 : 1 }}>{step.label}</T>
            {!step.done && <I name="chevron-right" size={18} />}
          </Pressable>
        ))}
        {!state.cards.length && !state.settings.noCard && (
          <Button title="Não uso cartão de crédito" secondary onPress={() => perform((s: any) => ({ ...s, settings: { ...s.settings, noCard: true } }), "Anotado")} />
        )}
      </Box>
    </>
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
  const ref = month === monthKey(today()) ? today() : `${month}-15`;
  const blocks: Record<string, () => React.ReactNode> = {
    firstSteps: () => <FirstSteps />,
    shortcuts: () => <Shortcuts />,
    pending: () =>
      (summary.pay > 0 || summary.receive > 0 || bills > 0) && (
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
      ),
    insights: () => {
      const list = monthInsights(state, month).slice(0, 3);
      return (
        <>
          <Section title="Destaques" action="Assistente" onPress={() => nav.push({ name: "assistant" })} />
          <Box>{list.length ? list.map((i: any, n: number) => <Muted key={n}>• {i.text}</Muted>) : <Muted>Nada fora do comum neste mês.</Muted>}</Box>
        </>
      );
    },
    accounts: () => (
      <>
        <Section title="Contas" action="Ver todas" onPress={() => nav.push({ name: "accounts" })} />
        <AccountList limit={5} />
      </>
    ),
    cards: () =>
      state.cards.some((x: any) => !x.archived) && (
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
      ),
    budgets: () =>
      state.budgets.length > 0 && (
        <>
          <Section title="Orçamentos" action="Ver" onPress={() => nav.push({ name: "budgets" })} />
          <Box>
            {state.budgets.slice(0, 4).map((raw: any) => {
              const b = normalizeBudget(raw);
              const u = budgetUsage(state, b, ref);
              return (
                <View key={b.id} style={{ marginBottom: 10, gap: 4 }}>
                  <View style={[k.row, { justifyContent: "space-between" }]}>
                    <T style={{ flex: 1, fontSize: 13 }}>{b.name || b.categories.join(", ")}</T>
                    <Muted>
                      {show(u.used)} / {show(u.limit)}
                    </Muted>
                  </View>
                  <Progress value={u.used} max={u.limit} color={b.type === "expense" && u.used > u.limit ? c.red : undefined} />
                </View>
              );
            })}
          </Box>
        </>
      ),
    goals: () =>
      state.goals.length > 0 && (
        <>
          <Section title="Metas" action="Ver" onPress={() => nav.push({ name: "goals" })} />
          <Box>
            {state.goals.slice(0, 4).map((g: any) => (
              <View key={g.id} style={{ marginBottom: 10, gap: 4 }}>
                <View style={[k.row, { justifyContent: "space-between" }]}>
                  <T style={{ flex: 1, fontSize: 13 }}>{g.name}</T>
                  <Muted>
                    {show(g.saved)} / {show(g.target)}
                  </Muted>
                </View>
                <Progress value={g.saved} max={g.target} />
              </View>
            ))}
          </Box>
        </>
      ),
    receivables: () => {
      const open = (state.receivables || []).filter((r: any) => receivableBalance(r) > 0);
      return (
        open.length > 0 && (
          <>
            <Section title="Quem me deve" action="Ver" onPress={() => nav.push({ name: "tool", id: "receivables" })} />
            <Box>
              {open.slice(0, 4).map((r: any) => (
                <View key={r.id} style={[k.row, { justifyContent: "space-between", marginBottom: 6 }]}>
                  <T style={{ flex: 1, fontSize: 13 }}>{r.person}</T>
                  <T style={{ color: c.green }}>{show(receivableBalance(r))}</T>
                </View>
              ))}
            </Box>
          </>
        )
      );
    },
    installments: () => {
      const plan = installmentPlan(state, month, 3);
      return (
        plan.remaining > 0 && (
          <>
            <Section title="Parcelamentos" action="Ver" onPress={() => nav.push({ name: "installments" })} />
            <Box>
              <Muted>Falta pagar {show(plan.remaining)} em parcelas.</Muted>
              {plan.rows.map((r: any) => (
                <Muted key={r.month}>
                  {r.month.slice(5)}/{r.month.slice(2, 4)}: {show(r.total)}
                </Muted>
              ))}
            </Box>
          </>
        )
      );
    },
    recurrences: () => {
      const t = recurrenceTotals(state);
      return (
        (state.recurrences || []).length > 0 && (
          <>
            <Section title="Recorrências" action="Ver" onPress={() => nav.push({ name: "recurrences" })} />
            <Box>
              <Muted>
                Despesas fixas {show(t.expense.month)}/mês · receitas {show(t.income.month)}/mês
              </Muted>
            </Box>
          </>
        )
      );
    },
    recent: () => (
      <>
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
      </>
    ),
  };
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
      <View style={{ height: 4 }} />
      {layoutOf(state)
        .home.filter((b: any) => b.visible && blocks[b.id])
        .map((b: any) => (
          <React.Fragment key={b.id}>{blocks[b.id]()}</React.Fragment>
        ))}
      <Pressable accessibilityRole="button" onPress={() => nav.push({ name: "layout" })} style={[k.row, { justifyContent: "center", minHeight: 48, marginTop: 8 }]}>
        <I name="sliders" size={16} color={c.primary} />
        <T style={{ color: c.primary, fontSize: 13 }}>Personalizar início</T>
      </Pressable>
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
