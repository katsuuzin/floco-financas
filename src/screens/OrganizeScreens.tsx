// Contas, Cartões, Orçamento e Metas — telas empilhadas a partir de Mais.
import React, { useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { T, Muted, I, Box, Section, Button, Empty, IconButton, Progress, Segmented, styles as k } from "../ui/kit";
import { minimumPayment, invoiceBreakdown } from "../invoices.mjs";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { invoice, invoiceDueDate, totalBalance, today, monthKey, moveItem } from "../finance.mjs";
import { normalizeBudget, budgetUsage, budgetHistory } from "../analysis.mjs";
import { toInput } from "../app/forms";
import { archiveGoal, boxReport, isBox, undoYield, yieldAccount, goalForecast, completeGoal, removeGoalMove } from "../goals.mjs";
import TransactionRow from "./TransactionRow";
import MonthBar from "./MonthBar";
import { AccountList } from "./HomeScreen";

export function AccountsScreen() {
  const { state, perform, show } = useStore();
  const nav = useNav();
  const archived = state.accounts.filter((a: any) => a.archived);
  const active = state.accounts.filter((a: any) => !a.archived);
  const [ordering, setOrdering] = useState(false);
  const move = (id: string, delta: number) =>
    perform((s: any) => ({ ...s, accounts: moveItem(s.accounts, id, delta) }));
  return (
    <>
      <Box>
        <Muted>Saldo total</Muted>
        <T style={[k.balanceValue, { fontSize: 28, marginTop: 4 }]}>{show(totalBalance(state))}</T>
      </Box>
      <Section
        title="Contas ativas"
        action={ordering ? "Concluir" : "Adicionar"}
        onPress={() => (ordering ? setOrdering(false) : nav.push({ name: "form", kind: "account" }))}
      />
      {ordering ? (
        <Box style={{ paddingVertical: 0 }}>
          {active.map((a: any, i: number) => (
            <View key={a.id} style={[k.row, i < active.length - 1 && k.hairline, { minHeight: 64, gap: 4 }]}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: a.color || "#FFCB45" }} />
              <T style={{ flex: 1, fontFamily: "SoraSemi", marginLeft: 8 }} numberOfLines={1}>
                {a.name}
              </T>
              <IconButton name="arrow-up" label={`Subir ${a.name}`} onPress={() => move(a.id, -1)} />
              <IconButton name="arrow-down" label={`Descer ${a.name}`} onPress={() => move(a.id, 1)} />
            </View>
          ))}
        </Box>
      ) : (
        <>
          <AccountList />
          {active.length > 1 && (
            <View style={{ marginTop: 10 }}>
              <Button secondary icon="list" title="Reordenar contas" onPress={() => setOrdering(true)} />
            </View>
          )}
        </>
      )}
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
  const [by, setBy] = useState<"category" | "tag">("category");
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
        <Muted style={{ marginTop: 10, marginBottom: 8 }}>
          Limite usado {show(Math.max(0, used))} de {show(card.limit)}
        </Muted>
        {bill.manual && (
          <Muted style={{ marginBottom: 8 }}>
            Total ajustado à mão · as compras somam {show(bill.purchasesTotal)} ({bill.adjustment > 0 ? "+" : "−"}
            {show(Math.abs(bill.adjustment))})
          </Muted>
        )}
        {minimumPayment(bill) > 0 && <Muted style={{ marginBottom: 14 }}>Pagamento mínimo estimado {show(minimumPayment(bill))} (15% do total)</Muted>}
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
        <View style={{ height: 8 }} />
        <Button
          title={bill.manual ? "Mudar ou remover o ajuste do total" : "Ajustar total da fatura"}
          secondary
          icon="sliders"
          onPress={() =>
            nav.push({ name: "form", kind: "invoiceTotal", initial: { cardId: card.id, month, amount: bill.manual ? toInput(bill.total) : "" } })
          }
        />
      </Box>
      {bill.total > 0 && (
        <>
          <Section title="Análise da fatura" />
          <Box>
            <Segmented
              values={[
                ["category", "Categoria"],
                ["tag", "Tag"],
              ]}
              value={by}
              onChange={(v) => setBy(v as "category" | "tag")}
            />
            <View style={{ gap: 12, marginTop: 14 }}>
              {invoiceBreakdown(state, card.id, month, by).map((r: any) => (
                <View key={r.name} style={{ gap: 4 }}>
                  <View style={[k.row, { justifyContent: "space-between" }]}>
                    <T style={{ fontSize: 13 }}>{r.name}</T>
                    <T style={{ fontSize: 13, fontFamily: "SoraSemi" }}>
                      {show(r.amount)} · {Math.round(r.share * 100)}%
                    </T>
                  </View>
                  <Progress value={Math.max(0, r.amount)} max={Math.max(1, bill.total)} />
                </View>
              ))}
            </View>
            {by === "tag" && <Muted style={{ marginTop: 10 }}>Compra com mais de uma tag aparece em cada uma, então a soma pode passar do total.</Muted>}
          </Box>
        </>
      )}
      <Section title="Compras desta fatura" />
      <Box style={{ padding: 0, overflow: "hidden" }}>
        {bill.purchases.length ? (
          bill.purchases.map((t: any, i: number) => <TransactionRow key={t.id} t={t} withDate last={i === bill.purchases.length - 1} />)
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
  const ref = month === monthKey(today()) ? today() : `${month}-15`;
  const cycleName: Record<string, string> = { monthly: "Mensal", fortnightly: "Quinzenal", weekly: "Semanal" };
  return (
    <>
      <MonthBar />
      <Section title="Orçamentos" action="Adicionar" onPress={() => nav.push({ name: "form", kind: "budget" })} />
      {state.budgets.length ? (
        state.budgets.map((raw: any) => {
          const b = normalizeBudget(raw);
          const u = budgetUsage(state, b, ref);
          const h = budgetHistory(state, b, 6, ref);
          const income = b.type === "income";
          const bad = income ? false : u.used > u.limit;
          const label = b.name || b.categories.join(", ");
          return (
            <Box key={b.id}>
              <View style={[k.row, { justifyContent: "space-between" }]}>
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: "SoraSemi" }}>{label}</T>
                  <Muted style={{ fontSize: 11 }}>
                    {income ? "Meta de receita" : "Teto de despesa"} · {cycleName[b.cycle]} · {u.start.split("-").reverse().join("/").slice(0, 5)}–
                    {u.end.split("-").reverse().join("/").slice(0, 5)}
                  </Muted>
                </View>
                <IconButton
                  name="edit-2"
                  label={`Editar orçamento ${label}`}
                  onPress={() =>
                    nav.push({
                      name: "form",
                      kind: "budget",
                      initial: { ...b, budgetType: b.type, amount: toInput(b.amount), startDay: String(b.startDay) },
                    })
                  }
                />
                <IconButton
                  name="trash-2"
                  label={`Excluir orçamento ${label}`}
                  onPress={() =>
                    confirm("Excluir orçamento?", label, () =>
                      perform((s: any) => ({ ...s, budgets: s.budgets.filter((x: any) => x.id !== b.id) })),
                    )
                  }
                />
              </View>
              <Muted style={{ marginBottom: 12 }}>
                {show(u.used)} de {show(b.amount)}
              </Muted>
              <Progress
                value={u.used}
                max={b.amount}
                color={income ? c.green : bad ? c.red : u.ratio >= 0.8 ? c.amber : c.primary}
              />
              <T style={{ color: bad ? c.red : c.green, fontSize: 12, marginTop: 8 }}>
                {income
                  ? u.used >= u.limit
                    ? "Meta atingida"
                    : `Faltam ${show(u.limit - u.used)}`
                  : `${show(Math.abs(u.left))} ${bad ? "acima do limite" : "restante"}`}
              </T>
              <Muted style={{ fontSize: 11, marginTop: 4 }}>
                {h.within} de {h.cycles.length} ciclos recentes {income ? "atingiram a meta" : "fecharam dentro do teto"}
              </Muted>
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
  const [showArchived, setShowArchived] = useState(false);
  const active = state.goals.filter((g: any) => !g.archived);
  const boxes = active.filter(isBox);
  const metas = active.filter((g: any) => !isBox(g));
  const archived = state.goals.filter((g: any) => g.archived);
  const edit = (g: any) => nav.push({ name: "form", kind: "goal", initial: { ...g, goalKind: g.kind || "box", target: toInput(g.target) } });
  const remove = (g: any) =>
    confirm(
      isBox(g) ? "Excluir caixinha e liberar reserva?" : "Excluir meta?",
      isBox(g) ? "Os valores reservados voltam a ficar disponíveis nas contas. O saldo total não muda." : "A meta sai da lista. Nenhum saldo muda.",
      () => perform((s: any) => ({ ...s, goals: s.goals.filter((x: any) => x.id !== g.id) })),
      "Excluir",
    );
  const header = (g: any) => (
    <>
      <View style={[k.row, { justifyContent: "space-between" }]}>
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: "SoraSemi" }}>{g.name}</T>
          <Muted style={{ marginTop: 4 }}>
            {show(g.saved)} de {show(g.target)}
            {g.deadline ? ` · até ${g.deadline.split("-").reverse().join("/")}` : ""}
          </Muted>
        </View>
        <IconButton name="edit-2" label={`Editar ${g.name}`} onPress={() => edit(g)} />
      </View>
      <View style={{ marginVertical: 14 }}>
        <Progress value={g.saved} max={g.target} color={g.saved >= g.target ? c.green : undefined} />
      </View>
    </>
  );
  if (!state.goals.length)
    return (
      <Empty
        icon="target"
        title="Um plano para chegar lá"
        body="Crie uma caixinha para separar dinheiro numa conta, ou uma meta para acompanhar um objetivo."
        action="Criar"
        onPress={() => nav.push({ name: "form", kind: "goal" })}
      />
    );
  return (
    <>
      <Section title="Caixinhas" action="Criar" onPress={() => nav.push({ name: "form", kind: "goal" })} />
      <Muted style={{ marginBottom: 12 }}>
        Caixinhas reservam dinheiro dentro da conta. O saldo total continua o mesmo; o disponível diminui.
      </Muted>
      {boxes.length === 0 && <Muted style={{ marginBottom: 12 }}>Nenhuma caixinha ativa.</Muted>}
      {boxes.map((g: any) => {
        const report = boxReport(g).slice(0, 3);
        return (
          <Box key={g.id}>
            {header(g)}
            <View style={{ gap: 8 }}>
              <Button title="Guardar dinheiro" icon="plus" onPress={() => nav.push({ name: "form", kind: "deposit", initial: { goalId: g.id } })} />
              {g.saved > 0 && (
                <Button
                  title="Registrar rendimento"
                  secondary
                  icon="trending-up"
                  onPress={() => nav.push({ name: "form", kind: "yield", initial: { goalId: g.id, accountId: yieldAccount(g), description: "" } })}
                />
              )}
              {g.saved > 0 && (
                <Button title="Retirar" secondary icon="minus" onPress={() => nav.push({ name: "form", kind: "withdraw", initial: { goalId: g.id } })} />
              )}
              {g.saved > 0 && boxes.length > 1 && (
                <Button
                  title="Transferir para outra caixinha"
                  secondary
                  icon="shuffle"
                  onPress={() =>
                    nav.push({
                      name: "form",
                      kind: "reserveTransfer",
                      initial: { goalId: g.id, destinationGoalId: boxes.find((x: any) => x.id !== g.id)?.id || "" },
                    })
                  }
                />
              )}
            </View>
            {report.length > 0 && (
              <View style={{ marginTop: 12, gap: 2 }}>
                <Muted style={{ fontFamily: "SoraSemi" }}>Movimento por mês</Muted>
                {report.map((r: any) => (
                  <Muted key={r.month}>
                    {r.month.split("-").reverse().join("/")} · guardou {show(r.deposits)} · retirou {show(r.withdrawals)}{r.yields ? ` · rendeu ${show(r.yields)}` : ""}
                  </Muted>
                ))}
              </View>
            )}
            {(g.history || []).filter((h: any) => h.type === "yield").slice(-3).reverse().map((h: any) => (
              <View key={h.id} style={[k.row, { justifyContent: "space-between", minHeight: 44 }]}>
                <Muted style={{ flex: 1 }}>
                  Rendimento {h.date.split("-").reverse().join("/")} · +{show(h.amount)}
                </Muted>
                <Button
                  title="Desfazer"
                  secondary
                  onPress={() =>
                    confirm("Desfazer rendimento?", `Remove a receita de ${show(h.amount)} e tira esse valor da caixinha.`, () => perform((s: any) => undoYield(s, g.id, h.id), "Rendimento desfeito"), "Desfazer")
                  }
                />
              </View>
            ))}
            <View style={[k.row, { gap: 8, marginTop: 12 }]}>
              {g.saved === 0 && (
                <View style={{ flex: 1 }}>
                  <Button title="Arquivar" secondary icon="archive" onPress={() => perform((s: any) => archiveGoal(s, g.id), "Caixinha arquivada")} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Button title="Excluir" danger onPress={() => remove(g)} />
              </View>
            </View>
          </Box>
        );
      })}
      <Section title="Metas" />
      <Muted style={{ marginBottom: 12 }}>Metas acompanham um objetivo sem separar dinheiro.</Muted>
      {metas.length === 0 && <Muted style={{ marginBottom: 12 }}>Nenhuma meta. Toque em Criar e escolha Meta.</Muted>}
      {metas.map((g: any) => {
        const fc = goalForecast(g);
        const moves = [...(g.moves || [])].sort((a: any, b: any) => b.date.localeCompare(a.date)).slice(0, 5);
        return (
        <Box key={g.id}>
          {header(g)}
          {g.completedAt && <T style={{ color: c.green, fontFamily: "SoraSemi", marginBottom: 6 }}>Concluída em {g.completedAt.split("-").reverse().join("/")}</T>}
          {!g.completedAt && (
            <View style={{ marginBottom: 10, gap: 2 }}>
              {fc.reached ? (
                <Muted>Valor atingido. Toque em Concluir para encerrar.</Muted>
              ) : (
                <>
                  <Muted>Falta {show(fc.remaining)}</Muted>
                  {fc.months !== null ? (
                    <Muted>
                      Média {show(fc.average)} por mês · previsão em {fc.months} {fc.months === 1 ? "mês" : "meses"} ({fc.date.split("-").reverse().slice(1).join("/")})
                      {fc.noPrazo === false ? " · passa do prazo" : fc.noPrazo ? " · dentro do prazo" : ""}
                    </Muted>
                  ) : (
                    <Muted>Faça um depósito para ver a média e a previsão.</Muted>
                  )}
                  {fc.neededMonthly !== null && fc.noPrazo === false && <Muted>Para chegar no prazo: {show(fc.neededMonthly)} por mês.</Muted>}
                </>
              )}
            </View>
          )}
          <View style={{ gap: 8 }}>
            <Button
              title="Depositar"
              icon="plus"
              onPress={() => nav.push({ name: "form", kind: "goalDeposit", initial: { goalId: g.id, description: "" } })}
            />
            <Button
              title={g.completedAt ? "Reabrir" : "Concluir"}
              secondary
              icon={g.completedAt ? "rotate-ccw" : "check-circle"}
              onPress={() => perform((s: any) => completeGoal(s, g.id, !g.completedAt), g.completedAt ? "Meta reaberta" : "Meta concluída")}
            />
            <Button
              title="Corrigir progresso"
              secondary
              icon="edit-3"
              onPress={() => nav.push({ name: "form", kind: "goalProgress", initial: { goalId: g.id, amount: toInput(g.saved) } })}
            />
            {moves.length > 0 && (
              <View style={{ gap: 2 }}>
                <Muted style={{ fontFamily: "SoraSemi" }}>Histórico</Muted>
                {moves.map((m: any) => (
                  <View key={m.id} style={[k.row, { justifyContent: "space-between", minHeight: 44 }]}>
                    <Muted style={{ flex: 1 }}>
                      {m.date.split("-").reverse().join("/")} · {m.type === "deposit" ? "depósito" : "ajuste"} {m.amount > 0 ? "+" : "−"}{show(Math.abs(m.amount))}
                      {m.note ? ` · ${m.note}` : ""}
                    </Muted>
                    <Button
                      title="Excluir"
                      secondary
                      onPress={() =>
                        confirm("Excluir movimento?", "O progresso da meta volta ao valor de antes.", () => perform((s: any) => removeGoalMove(s, g.id, m.id), "Movimento excluído"), "Excluir")
                      }
                    />
                  </View>
                ))}
              </View>
            )}
            <View style={[k.row, { gap: 8 }]}>
              <View style={{ flex: 1 }}>
                <Button title="Arquivar" secondary icon="archive" onPress={() => perform((s: any) => archiveGoal(s, g.id), "Meta arquivada")} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Excluir" danger onPress={() => remove(g)} />
              </View>
            </View>
          </View>
        </Box>
        );
      })}
      {archived.length > 0 && (
        <>
          <Section title={`Arquivadas (${archived.length})`} action={showArchived ? "Ocultar" : "Mostrar"} onPress={() => setShowArchived(!showArchived)} />
          {showArchived &&
            archived.map((g: any) => (
              <Box key={g.id} style={[k.row, { justifyContent: "space-between" }]}>
                <View style={{ flex: 1 }}>
                  <T>{g.name}</T>
                  <Muted>{isBox(g) ? "Caixinha" : "Meta"} · {show(g.saved)} de {show(g.target)}</Muted>
                </View>
                <Button title="Restaurar" secondary onPress={() => perform((s: any) => archiveGoal(s, g.id, false), "Restaurada")} />
              </Box>
            ))}
        </>
      )}
    </>
  );
}
