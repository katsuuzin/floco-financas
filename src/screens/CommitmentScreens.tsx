import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { CreateAction, T, Muted, Box, Section, Button, Empty, IconButton, Progress, Chips, Field, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { today, monthKey, parseMoney, money } from "../finance.mjs";
import { installmentSimulation } from "../planning.mjs";
import { contractStatus, contractRows, methodLabel, removeContract } from "../contracts.mjs";
import { recurrenceTotals, recurrenceCalendar, nextOccurrence, frequencyLabel, installmentPlan, installmentPurchases } from "../commitments.mjs";
import { toInput } from "../app/forms";
import MonthBar, { monthLabel } from "./MonthBar";

const br = (d: string) => d.split("-").reverse().join("/");
const shortMonth = (m: string) =>
  new Date(m + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");

export function ContractsScreen({ type }: { type: "financing" | "loan" }) {
  const { c } = useTheme();
  const { state, show, perform, confirm } = useStore();
  const nav = useNav();
  const [open, setOpen] = useState("");
  const list = (state.financings || []).filter((f: any) => (f.type || "financing") === type && !f.archived);
  const label = type === "loan" ? "empréstimo" : "financiamento";
  if (!list.length)
    return (
      <Empty
        icon={type === "loan" ? "dollar-sign" : "home"}
        title={type === "loan" ? "Nenhum empréstimo ativo" : "Nenhum financiamento"}
        body={
          type === "loan"
            ? "Acompanhe as parcelas de um empréstimo de banco ou fintech, pague em partes e registre juros por atraso."
            : "Acompanhe o cronograma, o saldo devedor e a quitação de um bem financiado."
        }
        action={`Novo ${label}`}
        onPress={() => nav.push({ name: "form", kind: "contract", initial: { type } })}
      />
    );
  return (
    <>
      <CreateAction title={`Novo ${label}`} onPress={() => nav.push({ name: "form", kind: "contract", initial: { type } })} />
      {list.map((f: any) => {
        const st = contractStatus(state, f.id);
        const rows = contractRows(state, f.id);
        const expanded = open === f.id;
        const next = st.next;
        return (
          <Box key={f.id} style={{ marginTop: 12 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setOpen(expanded ? "" : f.id)}>
              <View style={[k.row, { justifyContent: "space-between" }]}>
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: "SoraSemi" }}>{f.name}</T>
                  <Muted>
                    {[f.institution, methodLabel[st.contract.method as "fixed"], st.contract.rate ? `${String(st.contract.rate).replace(".", ",")}% a.m.` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </Muted>
                </View>
                {st.finished ? <Muted style={{ color: c.green }}>Quitado</Muted> : <T style={{ fontFamily: "SoraSemi" }}>{show(st.debt)}</T>}
              </View>
              <View style={{ marginVertical: 12 }}>
                <Progress value={st.paidCount} max={f.count} />
              </View>
              <Muted>
                {st.paidCount} de {f.count} parcelas pagas
                {next ? ` · próxima ${br(next.date)} · ${show(next.amount - (next.paidPart || 0))}` : ""}
              </Muted>
            </Pressable>
            {expanded && (
              <View style={{ gap: 10, marginTop: 14 }}>
                <View style={k.row}>
                  <View style={k.flex}>
                    <Muted>Saldo devedor</Muted>
                    <T style={{ fontFamily: "SoraSemi" }}>{show(st.debt)}</T>
                  </View>
                  <View style={k.flex}>
                    <Muted>Já pago</Muted>
                    <T style={{ fontFamily: "SoraSemi" }}>{show(st.paidTotal)}</T>
                  </View>
                  {st.interestPaid > 0 && (
                    <View style={k.flex}>
                      <Muted>Juros pagos</Muted>
                      <T style={{ fontFamily: "SoraSemi" }}>{show(st.interestPaid)}</T>
                    </View>
                  )}
                </View>
                {next && (
                  <>
                    <Button
                      title={`Pagar parcela ${next.installment}/${f.count}`}
                      icon="check"
                      onPress={() =>
                        nav.push({
                          name: "form",
                          kind: "contractPay",
                          initial: { txId: next.id, amount: toInput(next.amount - (next.paidPart || 0)), accountId: f.accountId, info: `${next.description} · vence ${br(next.date)}` },
                        })
                      }
                    />
                    {type === "loan" && (
                      <Button
                        title="Lançar juros por atraso"
                        secondary
                        icon="alert-circle"
                        onPress={() => nav.push({ name: "form", kind: "lateFee", initial: { txId: next.id, info: next.description } })}
                      />
                    )}
                    <Button
                      title="Amortizar (pagar a mais)"
                      secondary
                      icon="fast-forward"
                      onPress={() => nav.push({ name: "form", kind: "extraAmort", initial: { contractId: f.id, accountId: f.accountId, info: `Saldo devedor ${money(st.debt)}` } })}
                    />
                    <Button
                      title="Trocar cálculo"
                      secondary
                      icon="sliders"
                      onPress={() =>
                        nav.push({
                          name: "form",
                          kind: "changeMethod",
                          initial: {
                            contractId: f.id,
                            method: st.contract.method,
                            rate: st.contract.rate ? String(st.contract.rate).replace(".", ",") : "",
                            principal: st.contract.method === "fixed" ? "" : toInput(st.debt),
                            insurance: st.contract.insurance ? toInput(st.contract.insurance) : "",
                          },
                        })
                      }
                    />
                    <Button
                      title="Quitar contrato"
                      secondary
                      icon="check-circle"
                      onPress={() => nav.push({ name: "form", kind: "settle", initial: { contractId: f.id, accountId: f.accountId, amount: toInput(st.debt), info: "As parcelas em aberto são substituídas por um pagamento único." } })}
                    />
                  </>
                )}
                {(f.amortizations || []).length > 0 && (
                  <>
                    <Section title="Histórico de abatimentos" />
                    {[...f.amortizations].reverse().map((a: any) => (
                      <View key={a.id} style={[k.row, k.hairline, { borderBottomColor: c.line, paddingVertical: 8, alignItems: "flex-start" }]}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <T style={{ fontSize: 13 }}>
                            {br(a.date)} · {show(a.amount)} · {a.mode === "payment" ? "reduziu a parcela" : "reduziu o prazo"}
                          </T>
                          <Muted>
                            Saldo devedor {show(a.debtBefore)} → {show(a.debtAfter)}
                            {a.offApp ? " · sem movimentar conta" : ""}
                            {a.note ? ` · ${a.note}` : ""}
                          </Muted>
                        </View>
                      </View>
                    ))}
                  </>
                )}
                <Section title="Cronograma" />
                {rows.slice(0, 60).map((t: any) => (
                  <View key={t.id} style={[k.row, k.hairline, { borderBottomColor: c.line, paddingVertical: 8 }]}>
                    <Muted style={{ width: 54 }}>
                      {t.installment}/{f.count}
                    </Muted>
                    <Muted style={{ flex: 1 }}>
                      {br(t.date)}
                      {t.interest ? ` · juros ${money(t.interest)}` : ""}
                      {t.paidPart ? ` · pago ${money(t.paidPart)}` : ""}
                    </Muted>
                    <T style={{ fontSize: 13, color: t.confirmed ? c.green : c.text }}>
                      {t.confirmed ? "✓ " : ""}
                      {show(t.amount)}
                    </T>
                  </View>
                ))}
                <Button
                  title={st.paidCount > (f.paid || 0) ? "Arquivar contrato" : "Excluir contrato"}
                  danger
                  icon="trash-2"
                  onPress={() =>
                    confirm(
                      "Remover contrato?",
                      "Sem pagamentos, o contrato e as parcelas são excluídos. Com pagamentos, ele é arquivado e o histórico continua.",
                      () => perform((s: any) => removeContract(s, f.id), "Contrato removido"),
                      "Remover",
                    )
                  }
                />
              </View>
            )}
          </Box>
        );
      })}
    </>
  );
}

export function RecurrencesScreen() {
  const { c } = useTheme();
  const { state, show, perform, confirm } = useStore();
  const nav = useNav();
  const [view, setView] = useState<"list" | "calendar">("list");
  const totals = recurrenceTotals(state);
  const list = [...(state.recurrences || [])].sort((a: any, b: any) => (a.type + a.description).localeCompare(b.type + b.description));
  return (
    <>
      <CreateAction title="Criar recorrência" onPress={() => nav.push({ name: "form", kind: "recurrence" })} />
      {!!list.length && <View style={[k.row, { gap: 12 }]}>
        <Box style={{ flex: 1 }}>
          <Muted>Despesas</Muted>
          <T style={{ fontFamily: "SoraSemi" }}>{show(totals.expense.month)}/mês</T>
          <Muted>{show(totals.expense.year)} por ano</Muted>
        </Box>
        <Box style={{ flex: 1 }}>
          <Muted>Receitas</Muted>
          <T style={{ fontFamily: "SoraSemi", color: c.green }}>{show(totals.income.month)}/mês</T>
          <Muted>{show(totals.income.year)} por ano</Muted>
        </Box>
      </View>}
      <Chips
        values={[
          ["list", "Lista"],
          ["calendar", "Calendário"],
        ]}
        value={view}
        onChange={setView}
      />
      {view === "calendar" ? (
        <>
          <MonthBar />
          {recurrenceCalendar(state, nav.month).map(([date, items]) => (
            <Box key={date}>
              <T style={{ fontFamily: "SoraSemi" }}>{br(date)}</T>
              {items.map((e: any, i: number) => (
                <View key={i} style={[k.row, { justifyContent: "space-between", marginTop: 6 }]}>
                  <Muted style={{ flex: 1 }}>
                    {e.description}
                    {e.generated ? (e.confirmed ? " · confirmado" : " · pendente") : " · previsto"}
                  </Muted>
                  <T style={{ color: e.type === "income" ? c.green : c.text }}>
                    {e.type === "income" ? "+" : "−"}
                    {show(e.amount)}
                  </T>
                </View>
              ))}
            </Box>
          ))}
          {!recurrenceCalendar(state, nav.month).length && <Muted>Nenhuma ocorrência em {monthLabel(nav.month).toLowerCase()}.</Muted>}
        </>
      ) : list.length ? (
        list.map((r: any) => {
          const next = nextOccurrence(r, today());
          return (
            <Box key={r.id} style={{ marginTop: 10 }}>
              <View style={[k.row, { justifyContent: "space-between" }]}>
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: "SoraSemi", opacity: r.active ? 1 : 0.6 }}>{r.description}</T>
                  <Muted>
                    {frequencyLabel[r.frequency as "monthly"]} · {r.category}
                    {!r.active ? " · pausada" : next ? ` · próxima ${br(next)}` : " · encerrada"}
                  </Muted>
                </View>
                <T style={{ fontFamily: "SoraSemi", color: r.type === "income" ? c.green : c.text }}>{show(r.amount)}</T>
              </View>
              <View style={[k.row, { marginTop: 8, gap: 4 }]}>
                <IconButton
                  name="edit-2"
                  label={`Editar ${r.description}`}
                  onPress={() => nav.push({ name: "form", kind: "recurrence", initial: { ...r, amount: toInput(r.amount) } })}
                />
                <IconButton
                  name={r.active ? "pause" : "play"}
                  label={r.active ? "Pausar" : "Retomar"}
                  onPress={() =>
                    perform(
                      (s: any) => ({ ...s, recurrences: s.recurrences.map((x: any) => (x.id === r.id ? { ...x, active: !x.active } : x)) }),
                      r.active ? "Recorrência pausada" : "Recorrência retomada",
                    )
                  }
                />
                <IconButton
                  name="trash-2"
                  label={`Excluir ${r.description}`}
                  onPress={() =>
                    confirm(
                      "Excluir recorrência?",
                      "Os lançamentos já gerados continuam no extrato. Só as próximas deixam de ser criadas.",
                      () => perform((s: any) => ({ ...s, recurrences: s.recurrences.filter((x: any) => x.id !== r.id) }), "Recorrência excluída"),
                      "Excluir",
                    )
                  }
                />
              </View>
            </Box>
          );
        })
      ) : (
        <Empty icon="repeat" title="Nenhuma recorrência" body="Cadastre algo que se repete — aluguel, assinatura, salário — para ver o total por mês e por ano." />
      )}
    </>
  );
}

export function InstallmentsScreen() {
  const { c } = useTheme();
  const { state, show } = useStore();
  const from = monthKey(today());
  const plan = installmentPlan(state, from, 12);
  const purchases = installmentPurchases(state, from).filter((p: any) => p.left > 0);
  const peak = Math.max(1, ...plan.rows.map((r: any) => r.total));
  const [sim, setSim] = useState({ amount: "", count: "10", rate: "0" });
  let result: any = null,
    simError = "";
  try {
    if (sim.amount.trim())
      result = installmentSimulation({ amount: parseMoney(sim.amount), count: Number(sim.count), rate: Number(sim.rate.replace(",", ".") || 0) });
  } catch (e: any) {
    simError = e.message;
  }
  return (
    <>
      <Box>
        <Muted>Falta pagar em parcelas</Muted>
        <T style={[k.balanceValue, { fontSize: 28, marginTop: 4 }]}>{show(plan.remaining)}</T>
        <Muted>
          {plan.freeFromCards > from ? `Os cartões ficam livres de parcelas em ${monthLabel(plan.freeFromCards).toLowerCase()}.` : "Nenhuma parcela de cartão em aberto."}
        </Muted>
      </Box>
      <Section title="Próximos 12 meses" />
      <Box>
        {plan.rows.map((r: any) => (
          <View key={r.month} style={[k.row, { marginBottom: 8 }]}>
            <Muted style={{ width: 64 }}>{shortMonth(r.month)}</Muted>
            <View style={{ flex: 1 }}>
              <Progress value={r.total} max={peak} />
            </View>
            <T style={{ width: 110, textAlign: "right", fontSize: 13 }}>{show(r.total)}</T>
          </View>
        ))}
      </Box>
      <Section title="Compras parceladas" />
      {purchases.length ? (
        purchases.map((p: any) => (
          <Box key={p.groupId}>
            <View style={[k.row, { justifyContent: "space-between" }]}>
              <T style={{ flex: 1, fontFamily: "SoraSemi" }}>{p.description}</T>
              <T>{show(p.leftValue)}</T>
            </View>
            <Muted>
              {state.cards.find((x: any) => x.id === p.cardId)?.name || state.accounts.find((a: any) => a.id === p.accountId)?.name} · faltam {p.left} de {p.count} · termina em {shortMonth(p.last)}
            </Muted>
          </Box>
        ))
      ) : (
        <Muted>Nenhuma compra parcelada em andamento.</Muted>
      )}
      <Section title="Simular uma compra parcelada" />
      <Box style={{ gap: 12 }}>
        <Field label="Valor da compra (R$)" value={sim.amount} onChange={(v) => setSim({ ...sim, amount: v })} numeric />
        <View style={[k.row, { alignItems: "flex-start" }]}>
          <View style={{ flex: 1 }}>
            <Field label="Parcelas" value={sim.count} onChange={(v) => setSim({ ...sim, count: v })} numeric maxLength={3} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Juros (% a.m.)" value={sim.rate} onChange={(v) => setSim({ ...sim, rate: v })} numeric />
          </View>
        </View>
        {result && (
          <View style={{ gap: 4 }}>
            <T style={{ fontFamily: "SoraSemi" }}>
              {result.rows.length}x de {money(result.payment)} · total {money(result.total)}
            </T>
            {result.interest > 0 && <Muted>Juros: {money(result.interest)}</Muted>}
            <Muted>
              Somando às parcelas atuais, o mês mais pesado fica em{" "}
              {money(Math.max(...plan.rows.slice(1, 1 + result.rows.length).map((r: any) => r.total + result.payment), result.payment))}.
            </Muted>
          </View>
        )}
        {!!simError && <Muted style={{ color: c.red }}>{simError}</Muted>}
      </Box>
    </>
  );
}
