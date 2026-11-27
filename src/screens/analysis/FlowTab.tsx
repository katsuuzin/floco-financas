// Aba Fluxo da Análise (equivale a Fluxo do Calen): o que entrou ou saiu no mês, barras de 12
// meses, recorrentes e avulsas, caixa do mês e projeção do saldo.
import React, { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useStore } from "../../app/store";
import { useNav } from "../../app/nav";
import { today } from "../../finance.mjs";
import { yearBars } from "../../overview.mjs";
import { flowHeader, flowLists, flowCash, recurrenceSuggestions } from "../../flow.mjs";
import { monthCalendar } from "../../spending.mjs";
import { lookOf } from "../../looks.mjs";
import { categoryLabel } from "../../categories.mjs";
import CategoryIcon from "../../ui/CategoryIcon";
import { useCalen, CText, CCard, CButton, CPills, CPill, CSection } from "../../ui/calen";
import { YearBars, BalanceLine } from "./Charts";
import { monthLabel } from "./MonthNav";

type Seg = "income" | "expense" | "cash" | "projection";
const dd = (iso: string) => `${iso.slice(8)}/${iso.slice(5, 7)}`;

export default function FlowTab() {
  const { k, tint } = useCalen();
  const { state, show } = useStore();
  const nav = useNav();
  const { month } = nav;
  const ref = today();
  const [seg, setSeg] = useState<Seg>("income");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const kind = seg === "expense" ? "expense" : "income";
  const ds = [state.transactions, state.recurrences, state.accounts, state.cards, month];
  const head = useMemo(() => flowHeader(state, month, kind), [...ds, kind]);
  const bars = useMemo(() => yearBars(state, month, ref), ds);
  const lists = useMemo(() => flowLists(state, month, kind, ref), [...ds, kind]);
  const cash = useMemo(() => flowCash(state, month, ref), ds);
  const cal = useMemo(() => monthCalendar(state, month, ref), ds);
  const sugg = useMemo(() => recurrenceSuggestions(state, kind, ref), [...ds, kind]);
  const monthName = monthLabel(month).toUpperCase();
  const prevName = new Date(month + "-01T12:00:00");
  prevName.setMonth(prevName.getMonth() - 1);
  const prevLabel = prevName.toLocaleDateString("pt-BR", { month: "long" });
  const withMoney = bars.filter((b: any) => (kind === "income" ? b.income : b.spent) > 0);
  const avg = withMoney.length ? Math.round(withMoney.reduce((a: number, b: any) => a + (kind === "income" ? b.income : b.spent), 0) / withMoney.length) : 0;
  const isIncome = kind === "income";
  const word = isIncome ? "RECEBIDO" : "GASTO";
  const statusText = (s: string) => (s === "done" ? (isIncome ? "Já entrou" : "Já saiu") : s === "pending" ? "Pendente" : isIncome ? "Ainda vai entrar" : "Ainda vai sair");
  const signed = (v: number) => (v < 0 ? "−" : "") + show(Math.abs(v));
  const Row = ({ label, value, color, strong, note }: { label: string; value: string; color?: string; strong?: boolean; note?: string }) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, paddingVertical: 10 }}>
      <View style={{ flex: 1 }}>
        <CText semi={strong}>{label}</CText>
        {!!note && (
          <CText muted style={{ fontSize: 12 }}>
            {note}
          </CText>
        )}
      </View>
      <CText semi={strong} color={color} style={{ fontVariant: ["tabular-nums"] }}>
        {value}
      </CText>
    </View>
  );
  const Group = ({ id, title, count, left, rows, empty }: { id: string; title: string; count: number; left: number; rows: any[]; empty: string }) => {
    const on = open[id] ?? true;
    return (
      <CCard padded={false}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: on }} onPress={() => setOpen({ ...open, [id]: !on })} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}>
          <View style={{ flex: 1 }}>
            <CText semi>{title}</CText>
            <CText muted style={{ fontSize: 12 }}>
              {count} {count === 1 ? "lançamento" : "lançamentos"}
              {left > 0 ? ` · ${statusText("planned").toLowerCase()} ${show(left)}` : ""}
            </CText>
          </View>
          <Feather name={on ? "chevron-up" : "chevron-down"} size={18} color={k.muted} />
        </Pressable>
        {on &&
          (rows.length ? (
            rows.map((r: any) => (
              <View key={r.key || r.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: 1, borderTopColor: k.line }}>
                <CategoryIcon look={lookOf(state, r.category)} size={38} />
                <View style={{ flex: 1 }}>
                  <CText semi numberOfLines={1} style={{ fontSize: 14 }}>
                    {r.name || r.description}
                  </CText>
                  <CText muted numberOfLines={1} style={{ fontSize: 12 }}>
                    {dd(r.date)} · {categoryLabel(r.category, r.subcategory)}
                  </CText>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <CText semi style={{ color: isIncome ? k.success : k.text }}>
                    {isIncome ? "+" : "−"}
                    {show(r.amount)}
                  </CText>
                  {(r.status || r.confirmed === false) && <CPill text={statusText(r.status || "pending")} tone={r.status === "done" ? "success" : r.status === "planned" ? "neutral" : "warning"} />}
                </View>
              </View>
            ))
          ) : (
            <CText muted style={{ padding: 16, paddingTop: 0 }}>
              {empty}
            </CText>
          ))}
      </CCard>
    );
  };
  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 12, marginTop: 6 }}>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Feather name={isIncome ? "arrow-down-left" : "arrow-up-right"} size={14} color={k.muted} />
            <CText muted style={{ fontSize: 12, letterSpacing: 0.8 }}>
              {seg === "cash" || seg === "projection" ? "CAIXA EM" : `${word} EM`} {monthName}
            </CText>
          </View>
          {seg !== "cash" && seg !== "projection" && head.pct !== null && (
            <CPill text={`${head.pct >= 0 ? "↑" : "↓"} ${Math.abs(head.pct)}% vs ${prevLabel}`} tone={(isIncome ? head.pct >= 0 : head.pct <= 0) ? "success" : "danger"} />
          )}
          <CText bold numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontSize: 32, lineHeight: 40 }}>
            {seg === "cash" || seg === "projection" ? signed(cash.current) : show(head.total)}
          </CText>
        </View>
        <View style={{ alignSelf: "flex-start" }}>
          <CButton icon="plus" title={isIncome ? "Adicionar receita" : "Adicionar despesa"}
            onPress={() => nav.push({ name: "form", kind: "transaction", initial: { type: isIncome ? "income" : "expense" } })} />
        </View>
      </View>

      {(seg === "income" || seg === "expense") && (
        <CCard style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <CText muted style={{ fontSize: 12, letterSpacing: 0.6 }}>
              {word} · {bars[0].month.slice(0, 4)}–{bars[bars.length - 1].month.slice(0, 4)}
            </CText>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {[
                [isIncome ? k.success : k.danger, isIncome ? "recebido" : "gasto"],
                [tint(isIncome ? k.success : k.danger), "previsto"],
              ].map(([c, t]) => (
                <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, borderWidth: 1, borderColor: isIncome ? k.success : k.danger }} />
                  <CText muted style={{ fontSize: 12 }}>
                    {t}
                  </CText>
                </View>
              ))}
            </View>
          </View>
          <YearBars bars={bars} month={month} kind={kind} onPick={(m) => nav.setMonth(m)} />
          <CText muted style={{ fontSize: 12 }}>
            {avg ? `média ${show(avg)}/mês nos meses com ${isIncome ? "entrada" : "gasto"}` : `Sem ${isIncome ? "entradas" : "gastos"} nos últimos meses para calcular a média.`}
          </CText>
        </CCard>
      )}

      <CPills<Seg>
        items={[
          ["income", "Receitas"],
          ["expense", "Despesas"],
          ["cash", "Caixa"],
          ["projection", "Projeção"],
        ]}
        value={seg}
        onChange={setSeg}
      />

      {(seg === "income" || seg === "expense") && (
        <>
          {sugg.length > 0 && (
            <CCard style={{ borderColor: k.primary, backgroundColor: tint(k.primary), flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: k.primary, alignItems: "center", justifyContent: "center" }}>
                <Feather name="zap" size={19} color={k.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <CText semi>Sugestões de {isIncome ? "receita" : "despesa"} recorrente</CText>
                <CText muted style={{ fontSize: 12 }}>
                  {sugg.length} {sugg.length === 1 ? "recorrência detectada" : "recorrências detectadas"}: {sugg.slice(0, 3).map((x: any) => x.name).join(", ")}
                </CText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Criar recorrência a partir da sugestão" onPress={() => nav.push({ name: "form", kind: "recurrence", initial: { type: kind, description: sugg[0].name, amount: (sugg[0].amount / 100).toFixed(2).replace(".", ","), category: sugg[0].category } })} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 4 }}>
                <Feather name="chevron-right" size={20} color={k.primaryText} />
              </Pressable>
            </CCard>
          )}
          <Group id="rec" title={isIncome ? "Receitas recorrentes" : "Despesas recorrentes"} count={lists.recurring.length} left={lists.recurringLeft} rows={lists.recurring} empty={isIncome ? "Defina suas receitas recorrentes para o app projetar o seu saldo futuro." : "Defina suas despesas fixas e parcelas para o app projetar o seu saldo futuro."} />
          <Pressable accessibilityRole="button" onPress={() => nav.push({ name: "form", kind: "recurrence", initial: { type: kind } })} style={{ minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", borderColor: k.line, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Feather name="plus" size={17} color={k.primaryText} />
            <CText semi color={k.primaryText}>
              {isIncome ? "Nova receita recorrente" : "Nova despesa recorrente"}
            </CText>
          </Pressable>
          <Group id="spo" title={isIncome ? "Receitas esporádicas" : "Despesas esporádicas"} count={lists.sporadic.length} left={lists.sporadicLeft} rows={lists.sporadic} empty={isIncome ? "Nada entrou na conta neste mês." : "Nada saiu da conta neste mês."} />
        </>
      )}

      {seg === "cash" && (
        <CCard style={{ gap: 0 }}>
          <Row label={cash.isFuture ? "Saldo hoje" : "Saldo no começo do mês"} value={signed(cash.opening)} strong />
          <Row label="Entradas na conta" value={`+${show(cash.income)}`} color={k.success} />
          <Row label="Saídas da conta" value={`−${show(cash.expense)}`} />
          {cash.other !== 0 && <Row label="Faturas e outros pagamentos" note="Pagamento de fatura, dívidas e itens fora da análise" value={signed(cash.other)} />}
          <View style={{ height: 1, backgroundColor: k.line }} />
          <Row label={cash.isPast ? "Saldo no fim do mês" : cash.isFuture ? "Saldo previsto" : "Saldo hoje"} value={signed(cash.current)} strong color={cash.current < 0 ? k.dangerText : undefined} />
          {!cash.isPast && (
            <Row label="Saldo previsto no fim do mês" note="Com pendentes, recorrências e faturas" value={cal.endBalance === null ? "—" : signed(cal.endBalance)} color={cal.endBalance !== null && cal.endBalance < 0 ? k.dangerText : undefined} />
          )}
          {cash.reserved > 0 && <Row label="Guardado em metas e caixinhas" note="Já separado do saldo disponível" value={show(cash.reserved)} />}
          {cash.reserved > 0 && <Row label="Disponível" value={signed(cash.current - cash.reserved)} strong />}
        </CCard>
      )}

      {seg === "projection" && (
        <CCard style={{ gap: 12 }}>
          {cal.minBalance === null ? (
            <CText muted>Sem projeção para este mês. A projeção vai até 24 meses à frente.</CText>
          ) : (
            <>
              <BalanceLine values={cal.days.map((d: any) => d.balance)} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <CText muted style={{ fontSize: 12 }}>
                    MENOR SALDO
                  </CText>
                  <CText semi color={cal.minBalance < 0 ? k.dangerText : undefined}>
                    {signed(cal.minBalance)}
                  </CText>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <CText muted style={{ fontSize: 12 }}>
                    {cal.endProjected ? "NO FIM DO MÊS (PREVISTO)" : "NO FIM DO MÊS"}
                  </CText>
                  <CText semi color={cal.endBalance !== null && cal.endBalance < 0 ? k.dangerText : undefined}>
                    {cal.endBalance === null ? "—" : signed(cal.endBalance)}
                  </CText>
                </View>
              </View>
              <CText muted style={{ fontSize: 12 }}>
                Saídas previstas {show(cal.plannedOut)} · entradas previstas {show(cal.plannedIn)} neste mês.
              </CText>
            </>
          )}
        </CCard>
      )}
    </View>
  );
}
