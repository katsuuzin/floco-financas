// Contas, Cartões, Orçamento e Metas — telas empilhadas a partir de Mais.
import React, { useState } from "react";
import { Alert, View, Pressable, ScrollView } from "react-native";
import { T, Muted, I, Box, Section, Button, CreateAction, Choice, Field, Empty, IconButton, Progress, Segmented, fitAmount, space, styles as k } from "../ui/kit";
import { daysOverdue, overdueLabel } from "../reminders.mjs";
import { minimumPayment, invoiceBreakdown } from "../invoices.mjs";
import { RowActions, SheetModal } from "../ui/Sheet";
import { entityColors, useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { invoice, invoiceDueDate, totalBalance, today, monthKey, parseMoney, uid, applyPotYieldChange } from "../finance.mjs";
import { normalizeBudget, budgetUsage, budgetHistory } from "../analysis.mjs";
import { toInput } from "../app/forms";
import { archiveGoal, isBox, goalForecast, completeGoal, removeGoalMove, registerYield, undoYield, yieldAccount } from "../goals.mjs";
import TransactionRow from "./TransactionRow";
import MonthBar from "./MonthBar";
import { AccountList } from "./HomeScreen";
import CategoryIcon, { categoryStyleOf } from "../ui/CategoryIcon";
import { archiveAccount, moveAccount, unarchiveAccount, visibleAccounts } from "../accountOrder.mjs";
import { archivePot, depositToPot, linkGoalToPot, potSummary, withdrawFromPot } from "../goalPots.mjs";

export function AccountsScreen() {
  const { state, perform, show, confirm, current } = useStore();
  const nav = useNav();
  const active = visibleAccounts(state);
  const archived = visibleAccounts(state, { includeArchived: true }).filter((a: any) => a.archived);
  const [ordering, setOrdering] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const move = (id: string, delta: number) => void perform((s: any) => {
    const ordered = visibleAccounts(s, { includeArchived: true });
    const visible = ordered.filter((a: any) => !a.archived);
    const other = visible[visible.findIndex((a: any) => a.id === id) + delta];
    if (!other) return s;
    return { ...s, accounts: moveAccount(ordered, id, ordered.indexOf(other)) };
  }, "Ordem salva");
  const archive = (id: string) => {
    const date = today();
    const preview: any = archiveAccount(current(), id, { now: date } as Parameters<typeof archiveAccount>[2]);
    const blockers = preview.blockers ?? [];
    const force = blockers.length === 1 && blockers[0].code === "saldo";
    const apply = () => void perform((s: any) => {
      const next: any = archiveAccount(s, id, { force, now: date } as Parameters<typeof archiveAccount>[2]);
      if (next.error) throw Error(next.blockers?.map((blocker: any) => blocker.message).join("\n") || next.error);
      return next;
    }, "Conta arquivada", { undoable: true, undo: (s) => unarchiveAccount(s, id) });
    if (preview.error && !force) {
      Alert.alert("Conta não arquivada", blockers.map((blocker: any) => blocker.message).join("\n") || preview.error);
      return;
    }
    confirm("Arquivar conta?", force ? "A conta tem saldo e sairá do saldo total. Os lançamentos continuam no histórico." :
      "A conta sai dos seletores. Os lançamentos continuam no histórico.", apply, "Arquivar");
  };
  return (
    <>
      <CreateAction title="Nova conta" onPress={() => nav.push({ name: "form", kind: "account" })} />
      <Box>
        <Muted>Saldo total</Muted>
        <T {...fitAmount} style={[k.balanceValue, { fontSize: 28, marginTop: 4 }]}>{show(totalBalance(state))}</T>
      </Box>
      <Section title="Contas ativas" action={ordering ? "Concluir" : undefined} onPress={() => setOrdering(false)} />
      {ordering ? active.map((a: any, i: number) => (
        <Box key={a.id} style={{ gap: 8 }}>
          <T>{a.name}</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            <Button secondary title="Subir" disabled={i === 0} onPress={() => move(a.id, -1)} />
            <Button secondary title="Descer" disabled={i === active.length - 1} onPress={() => move(a.id, 1)} />
          </View>
        </Box>
      )) : (
        <View style={{ gap: space.sm }}>
          <AccountList onArchive={archive} />
          {active.length > 1 && <Button secondary icon="list" title="Reordenar contas" onPress={() => setOrdering(true)} />}
        </View>
      )}
      {!!archived.length && <View style={{ gap: space.sm, marginTop: space.sm }}>
        <Button secondary title={showArchived ? "Ocultar arquivadas" : `Arquivadas (${archived.length})`}
          onPress={() => setShowArchived(!showArchived)} />
        {showArchived && archived.map((a: any) => <Box key={a.id} style={{ gap: 8 }}>
          <T>{a.name}</T>
          <Button title={`Desarquivar ${a.name}`} secondary
            onPress={() => void perform((s: any) => unarchiveAccount(s, a.id), "Conta restaurada")} />
        </Box>)}
      </View>}
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
  const dueDate = invoiceDueDate(card, month);
  const due = dueDate.split("-").reverse().join("/");
  const currentDate = today();
  const overdue = bill.due > 0 ? daysOverdue(dueDate, currentDate) : 0;
  const dueLabel = bill.due > 0 && dueDate === currentDate ? "Vence hoje" : `Vence ${due}`;
  const entity = entityColors(card.color, c);
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
      <View style={{ padding: 24, borderRadius: 16, backgroundColor: entity.backgroundColor, marginTop: 4 }}>
        <View style={k.row}>
          <I name="credit-card" color={entity.color} size={28} />
          <View style={{ flex: 1 }} />
          <IconButton
            name="edit-2"
            label="Editar cartão"
            color={entity.color}
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
        <T style={{ color: entity.color, fontFamily: "SoraSemi", fontSize: 19 }}>{card.name}</T>
        <T style={{ color: entity.color, marginTop: 6 }}>•••• {card.lastFour || "••••"}</T>
        <View style={[k.row, { marginTop: 22, justifyContent: "space-between", flexWrap: "wrap" }]}>
          <T style={{ color: entity.color, fontSize: 12 }}>Fecha dia {card.closingDay}</T>
          <T style={{ color: entity.color, fontSize: 12 }}>{dueLabel}</T>
          {overdue > 0 && <T style={{ color: entity.color, fontSize: 12, fontFamily: "SoraSemi" }}>{overdueLabel(overdue)}</T>}
        </View>
      </View>
      <Section title="Fatura do mês" />
      <Box>
        {overdue > 0 && (
          <View style={[k.row, { flexWrap: "wrap", marginBottom: 8 }]}>
            <I name="alert-circle" color={c.red} size={16} />
            <T style={{ color: c.red, fontFamily: "SoraSemi" }}>{overdueLabel(overdue)}</T>
            <Muted>{dueLabel}</Muted>
          </View>
        )}
        <Muted>Valor em aberto</Muted>
        <T {...fitAmount} style={[k.balanceValue, { fontSize: 30 }]}>{show(bill.due)}</T>
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
              initial: { cardId: card.id, month, accountId: card.accountId || visibleAccounts(state)[0]?.id },
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
  const [expanded, setExpanded] = useState("");
  const { c } = useTheme();
  const { state, show, perform, confirm } = useStore();
  const nav = useNav();
  const { month } = nav;
  const ref = month === monthKey(today()) ? today() : `${month}-15`;
  const cycleName: Record<string, string> = { monthly: "Mensal", fortnightly: "Quinzenal", weekly: "Semanal" };
  return (
    <>
      <MonthBar />
      <CreateAction title="Novo orçamento" onPress={() => nav.push({ name: "form", kind: "budget" })} />
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
                <CategoryIcon look={categoryStyleOf(state, b.categories[0] || "Outros")} />
                <Pressable style={{ flex: 1, minHeight: 48 }} accessibilityRole="button" accessibilityState={{ expanded: expanded === b.id }} onPress={() => setExpanded(expanded === b.id ? "" : b.id)}>
                  <T style={{ fontFamily: "SoraSemi" }}>{label}</T>
                  <Muted style={{ fontSize: 12 }}>
                    {income ? "Meta de receita" : "Teto de despesa"} · {cycleName[b.cycle]}{"\n"}{u.start.split("-").reverse().join("/").slice(0, 5)}–
                    {u.end.split("-").reverse().join("/").slice(0, 5)}
                  </Muted>
                </Pressable>
                <RowActions title={label} actions={[
                  { icon: "edit-2", label: "Editar orçamento", onPress: () => nav.push({
                    name: "form", kind: "budget", initial: { ...b, budgetType: b.type, amount: toInput(b.amount), startDay: String(b.startDay) },
                  }) },
                  { icon: "trash-2", label: "Excluir orçamento", danger: true, onPress: () =>
                    confirm("Excluir orçamento?", label, () => perform(
                      (s: any) => ({ ...s, budgets: s.budgets.filter((x: any) => x.id !== b.id) }),
                      "Orçamento excluído",
                      { undoable: true, undo: (s) => s.budgets.some((x: any) => x.id === b.id) ? s : { ...s, budgets: [...s.budgets, raw] } },
                    ), "Excluir") },
                ]} />
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
              {(bad || expanded === b.id) && <Muted style={{ fontSize: 12, marginTop: 4 }}>
                {h.within} de {h.cycles.length} ciclos recentes {income ? "atingiram a meta" : "fecharam dentro do teto"}
              </Muted>}
            </Box>
          );
        })
      ) : (
        <Empty
          icon="pie-chart"
          title="Um limite que você decide"
          body="Defina quanto quer gastar por categoria. Os gastos confirmados aparecem automaticamente."
        />
      )}
    </>
  );
}

export function GoalsScreen() {
  const [linking, setLinking] = useState("");
  const [goalDetail, setGoalDetail] = useState("");
  const { c } = useTheme();
  const { state, show, perform, confirm } = useStore();
  const nav = useNav();
  const [showArchived, setShowArchived] = useState(false);
  const [tab, setTab] = useState<"metas" | "caixinhas">("metas");
  const [potActions, setPotActions] = useState<string | null>(null);
  const [potForm, setPotForm] = useState<{ action: "create" | "deposit" | "withdraw" | "archive" | "yield" | "transfer" | "rename"; id: string } | null>(null);
  const [potName, setPotName] = useState("");
  const [potAmount, setPotAmount] = useState("");
  const [potDestination, setPotDestination] = useState("");
  const [potTarget, setPotTarget] = useState("");
  const accounts = visibleAccounts(state);
  const pots = (state.pots ?? []).filter((pot: any) => !pot.archived);
  const archivedPots = (state.pots ?? []).filter((pot: any) => pot.archived);
  const active = state.goals.filter((g: any) => !g.archived);
  const metas = active.filter((g: any) => !isBox(g));
  const openPot = (action: "deposit" | "withdraw" | "archive" | "yield" | "transfer" | "rename", id: string) => {
    setPotActions(null);
    const pot = pots.find((item: any) => item.id === id);
    const fallback = accounts[0]?.id ?? "";
    const reserve = yieldAccount(pot);
    setPotName(pot.name);
    setPotAmount("");
    setPotTarget("");
    setPotDestination(action === "archive" ? "" :
      action === "deposit" ? fallback : accounts.some((account: any) => account.id === reserve) ? reserve : fallback);
    setPotForm({ action, id });
  };
  const savePot = () => {
    if (!potForm || potForm.action === "create") return;
    const { action, id } = potForm;
    void perform((s: any) => {
      const date = today();
      if (action === "rename") {
        const name = potName.trim();
        if (!name) throw Error("Informe o nome da caixinha.");
        return { ...s, pots: s.pots.map((pot: any) => pot.id === id ? { ...pot, name } : pot) };
      }
      if (action === "yield") return applyPotYieldChange(s, id, (draft: any) =>
        registerYield(draft, id, { date, amount: parseMoney(potAmount), accountId: potDestination }));
      if (action === "transfer") {
        if (!potTarget || potTarget === id) throw Error("Escolha outra caixinha.");
        const movement = { date, amount: parseMoney(potAmount), accountId: potDestination };
        const from: any = withdrawFromPot(s, id, movement as any);
        if (from.error) throw Error(from.error);
        const to: any = depositToPot(from, potTarget, movement as any);
        if (to.error) throw Error(to.error);
        return to;
      }
      const next: any = action === "archive" ? archivePot(s, id, {
        date, toPotId: potDestination.startsWith("p:") ? potDestination.slice(2) : undefined,
        toAccountId: potDestination.startsWith("a:") ? potDestination.slice(2) : undefined,
      } as any) : (action === "deposit" ? depositToPot : withdrawFromPot)(s, id, {
        date, amount: parseMoney(potAmount), accountId: potDestination,
      } as any);
      if (next.error) throw Error(next.error);
      return next;
    }, action === "archive" ? "Caixinha arquivada" : "Movimento salvo").then((ok) => { if (ok) setPotForm(null); });
  };
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
  return (
    <>
      <Segmented accessibilityLabel="Metas e caixinhas" values={[["metas", "Metas"], ["caixinhas", "Caixinhas"]]}
        value={tab} onChange={(value) => { setTab(value); setPotForm(null); }} />
      {tab === "caixinhas" ? (
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <CreateAction title="Criar caixinha" onPress={() => setPotForm({ action: "create", id: "" })} />
          {!pots.length && <Muted>Nenhuma caixinha ativa.</Muted>}
          {potForm?.action === "create" && <Box style={{ gap: 8 }}>
            <Field label="Nome da caixinha" value={potName} onChange={setPotName} maxLength={80} />
            <Button title="Salvar caixinha" disabled={!potName.trim()} onPress={() => {
              const name = potName.trim();
              void perform((s: any) => ({ ...s, pots: [...(s.pots || []),
                { id: uid(), name, saved: 0, deposits: [], history: [] }] }), "Caixinha criada")
                .then((ok) => { if (ok) { setPotForm(null); setPotName(""); } });
            }} />
            <Button title="Cancelar" secondary onPress={() => setPotForm(null)} />
          </Box>}
          {pots.map((pot: any) => <Box key={pot.id} style={{ gap: 8 }}>
            <T accessibilityRole="header">{pot.name}</T>
            <Muted>Guardado {show(pot.saved)}</Muted>
            {potSummary({ pots: [pot] }, today()).pots[0]?.monthly.slice(0, 3).map((row: any) =>
              <Muted key={row.month}>{row.month.split("-").reverse().join("/")} · guardou {show(row.deposits)} · retirou {show(row.withdrawals)}
                {row.yields ? " · rendeu " + show(row.yields) : ""}</Muted>)}
            {!potForm || potForm.id !== pot.id ? <>
              <Button title="Depositar" onPress={() => openPot("deposit", pot.id)} />
              <Button title="Mais ações" secondary icon="more-horizontal" onPress={() => setPotActions(pot.id)} />
            </> : null}
            {potActions === pot.id && <SheetModal title={`Ações de ${pot.name}`} onClose={() => setPotActions(null)}>
              <ScrollView contentContainerStyle={{ gap: space.sm, padding: space.lg }} keyboardShouldPersistTaps="handled">
              {pot.saved > 0 && <>
                <Button title="Retirar" secondary onPress={() => openPot("withdraw", pot.id)} />
                <Button title="Registrar rendimento" secondary onPress={() => openPot("yield", pot.id)} />
                {pots.length > 1 && <Button title="Transferir entre caixinhas" secondary onPress={() => openPot("transfer", pot.id)} />}
              </>}
              <Button title="Renomear caixinha" secondary onPress={() => openPot("rename", pot.id)} />
              {(pot.history || []).filter((entry: any) => entry.type === "yield").slice(-5).reverse().map((entry: any) =>
                <Button key={entry.id} title={`Desfazer rendimento de ${entry.date.split("-").reverse().join("/")} · ${show(entry.amount)}`} secondary onPress={() => {
                  setPotActions(null);
                  confirm("Desfazer rendimento?", "O lançamento e o valor guardado serão retirados.", () =>
                    void perform((s: any) => applyPotYieldChange(s, pot.id, (draft: any) => undoYield(draft, pot.id, entry.id)), "Rendimento desfeito"), "Desfazer");
                }} />)}
              <Button title="Arquivar" secondary onPress={() => openPot("archive", pot.id)} />
              </ScrollView>
            </SheetModal>}
            {potForm && potForm.id === pot.id && <>
              {potForm.action === "archive" ? (pot.saved > 0 && <Choice label="Destino do saldo"
                values={[
                  ...pots.filter((item: any) => item.id !== pot.id).map((item: any) => ["p:" + item.id, item.name] as [string, string]),
                  ...accounts.map((item: any) => ["a:" + item.id, item.name] as [string, string]),
                ]} value={potDestination} onChange={setPotDestination} />) : potForm.action === "rename" ?
                <Field label="Nome da caixinha" value={potName} onChange={setPotName} maxLength={80} autoFocus /> : <>
                <Choice label="Conta" values={accounts.map((item: any) => [item.id, item.name] as [string, string])}
                  value={potDestination} onChange={setPotDestination} />
                {potForm.action === "transfer" && <Choice label="Caixinha de destino" values={pots.filter((item: any) => item.id !== pot.id)
                  .map((item: any) => [item.id, item.name] as [string, string])} value={potTarget} onChange={setPotTarget} />}
                <Field label="Valor (R$)" value={potAmount} onChange={setPotAmount} numeric autoFocus />
              </>}
              <Button title={potForm.action === "archive" ? "Confirmar arquivamento" : potForm.action === "rename" ? "Salvar nome" : "Confirmar valor"}
                disabled={potForm.action === "archive" ? pot.saved > 0 && !potDestination : potForm.action === "rename" ? !potName.trim() :
                  !potDestination || !potAmount.trim() || (potForm.action === "transfer" && !potTarget)}
                onPress={savePot} />
              <Button title="Cancelar" secondary onPress={() => setPotForm(null)} />
            </>}
          </Box>)}
          {archivedPots.length > 0 && <Section title="Caixinhas arquivadas" />}
          {archivedPots.map((pot: any) => <Box key={pot.id} style={{ gap: 8 }}>
            <T>{pot.name}</T>
            <Button title="Desarquivar caixinha" secondary onPress={() => void perform((s: any) => ({
              ...s, pots: (s.pots || []).map((item: any) => item.id === pot.id ? { ...item, archived: false } : item),
            }), "Caixinha restaurada")} />
          </Box>)}
        </View>
      ) : <>
      <CreateAction title="Nova meta" onPress={() => nav.push({ name: "form", kind: "goal", initial: { goalKind: "goal" } })} />
      <Muted style={{ marginBottom: 12 }}>Metas acompanham um objetivo sem separar dinheiro.</Muted>
      {metas.length === 0 && <Muted style={{ marginBottom: 12 }}>Nenhuma meta cadastrada.</Muted>}
      {metas.map((g: any) => {
        const linked = (state.pots ?? []).find((pot: any) => pot.id === g.potId);
        const progress = linked ? { ...g, saved: linked.saved, moves: [] } : g;
        const fc = goalForecast(progress);
        const moves = [...(g.moves || [])].sort((a: any, b: any) => b.date.localeCompare(a.date)).slice(0, 5);
        return (
        <Box key={g.id}>
          <View style={[k.row, { alignItems: "flex-start" }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={g.name} accessibilityState={{ expanded: goalDetail === g.id }}
              onPress={() => setGoalDetail(goalDetail === g.id ? "" : g.id)} style={{ flex: 1 }}>
              {header(progress)}
            </Pressable>
            <RowActions title={g.name} actions={[
              { icon: "link", label: "Vincular caixinha", onPress: () => setLinking(g.id) },
              { icon: "archive", label: "Arquivar meta", onPress: () => void perform((s: any) => archiveGoal(s, g.id), "Meta arquivada", { undoable: true, undo: (s) => archiveGoal(s, g.id, false) }) },
              { icon: "trash-2", label: "Excluir meta", danger: true, onPress: () => remove(g) },
            ]} />
          </View>
          {linking === g.id && <SheetModal title="Caixinha vinculada" onClose={() => setLinking("")}>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Choice label="Escolha a caixinha" values={[["", "Sem caixinha"], ...pots.map((pot: any) => [pot.id, pot.name] as [string, string])]}
            value={g.potId ?? ""} onChange={(id) => void perform((s: any) => {
              const next: any = linkGoalToPot(s, g.id, id || null);
              if (next.error) throw Error(next.error);
              return next;
            }, "Vínculo salvo").then((ok) => { if (ok) setLinking(""); })} />
          </ScrollView>
          </SheetModal>}
          {goalDetail === g.id && <>
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
            {!linked && <Button title="Depositar" icon="plus" onPress={() => nav.push({ name: "form", kind: "goalDeposit", initial: { goalId: g.id, description: "" } })} />}
            <Button
              title={g.completedAt ? "Reabrir" : "Concluir"}
              secondary
              icon={g.completedAt ? "rotate-ccw" : "check-circle"}
              onPress={() => perform((s: any) => completeGoal(s, g.id, !g.completedAt), g.completedAt ? "Meta reaberta" : "Meta concluída")}
            />
            {!linked && <Button title="Corrigir progresso" secondary icon="edit-3"
              onPress={() => nav.push({ name: "form", kind: "goalProgress", initial: { goalId: g.id, amount: toInput(g.saved) } })} />}
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
          </View>
          </>}
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
      </>}
    </>
  );
}
