import React from "react";
import { View, Pressable } from "react-native";
import { T, Muted, Box, Section, ListItem, Progress, I, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { totals, monthKey, addMonths, analysisAmount, totalBalance, signedAmount, includedAccounts, today } from "../finance.mjs";
import { report } from "../planning.mjs";
import { layoutOf } from "../layout.mjs";
import MonthBar from "./MonthBar";
import SpendingCalendar from "./SpendingCalendar";
import SpendingDonut from "./SpendingDonut";

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate();
const short = (m: string) => new Date(m + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");

export function categoryBreakdown(state: any, month: string) {
  const map = new Map<string, number>();
  for (const t of state.transactions)
    if (t.type === "expense" && t.confirmed && !t.invoicePayment && !t.loanSettlement && monthKey(t.date) === month)
      map.set(t.category || "Outros", (map.get(t.category || "Outros") || 0) + analysisAmount(t));
  const rows = [...map.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((n, [, v]) => n + v, 0);
  return { rows, total };
}

// Saldo das contas incluídas no fim de cada mês (patrimônio em contas).
function netWorth(state: any, months: string[]) {
  const ids = new Set(includedAccounts(state).map((a: any) => a.id));
  const now = totalBalance(state);
  return months.map((m) => {
    const end = `${m}-${pad(lastDay(m))}`;
    const after = state.transactions
      .filter((t: any) => t.confirmed && !t.cardId && t.date > end)
      .reduce((n: number, t: any) => n + (ids.has(t.accountId) ? signedAmount(t) : 0) + (t.type === "transfer" && ids.has(t.destinationId) ? t.amount : 0), 0);
    return { m, value: now - after };
  });
}

function Bars({ rows, color }: { rows: { label: string; value: number }[]; color?: string }) {
  const { show } = useStore();
  const peak = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <>
      {rows.map((r) => (
        <View key={r.label} style={{ marginBottom: 10, gap: 4 }}>
          <View style={[k.row, { justifyContent: "space-between" }]}>
            <T style={{ flex: 1, fontSize: 13 }} numberOfLines={1}>
              {r.label}
            </T>
            <T style={{ fontFamily: "SoraSemi", fontSize: 13 }}>{show(r.value)}</T>
          </View>
          <Progress value={Math.abs(r.value)} max={peak} color={color} />
        </View>
      ))}
    </>
  );
}

export default function AnalysisScreen() {
  const { c } = useTheme();
  const { state, show } = useStore();
  const nav = useNav();
  const { month } = nav;
  const now = totals(state, month);
  const prevMonth = monthKey(addMonths(month + "-01", -1));
  const prev = totals(state, prevMonth);
  const result = now.income - now.expense;
  const change = prev.expense ? Math.round(((now.expense - prev.expense) / prev.expense) * 100) : null;
  const range = { start: `${month}-01`, end: `${month}-${pad(lastDay(month))}` };
  const blocks: Record<string, () => React.ReactNode> = {
    balance: () => (
      <>
        <Section title="Balanço do mês" />
        <Box>
          <View style={k.row}>
            <View style={k.flex}>
              <Muted>Receitas</Muted>
              <T style={{ color: c.green, fontFamily: "SoraSemi" }}>{show(now.income)}</T>
            </View>
            <View style={k.flex}>
              <Muted>Despesas</Muted>
              <T style={{ fontFamily: "SoraSemi" }}>{show(now.expense)}</T>
            </View>
            <View style={k.flex}>
              <Muted>Resultado</Muted>
              <T style={{ fontFamily: "SoraSemi", color: result < 0 ? c.red : c.green }}>{(result < 0 ? "−" : "") + show(Math.abs(result))}</T>
            </View>
          </View>
          {change !== null && (
            <Muted style={{ marginTop: 12 }}>
              Despesas {change >= 0 ? "+" : "−"}
              {Math.abs(change)}% em relação ao mês anterior
            </Muted>
          )}
        </Box>
      </>
    ),
    calendar: () => <SpendingCalendar />,
    donut: () => <SpendingDonut />,
    categories: () => {
      const { rows, total } = categoryBreakdown(state, month);
      return (
        <>
          <Section title="Despesas por categoria" />
          <Box>
            {rows.length ? (
              rows.map(([name, value]) => (
                <View key={name} style={{ marginBottom: 14, gap: 6 }}>
                  <View style={[k.row, { justifyContent: "space-between" }]}>
                    <T style={{ flex: 1 }}>{name}</T>
                    <Muted>{((value / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</Muted>
                    <T style={{ fontFamily: "SoraSemi" }}>{show(value)}</T>
                  </View>
                  <Progress value={value} max={total} />
                </View>
              ))
            ) : (
              <Muted>Sem despesas confirmadas neste mês.</Muted>
            )}
          </Box>
        </>
      );
    },
    flow: () => {
      const months = Array.from({ length: 6 }, (_, i) => monthKey(addMonths(month + "-01", i - 5)));
      const flow = months.map((m) => ({ m, ...totals(state, m) }));
      const peak = Math.max(1, ...flow.map((f) => Math.max(f.income, f.expense)));
      return (
        <>
          <Section title="Fluxo dos últimos 6 meses" />
          <Box>
            <View
              accessibilityLabel={flow.map((f) => `${f.m}: entrou ${show(f.income)}, saiu ${show(f.expense)}`).join("; ")}
              style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 140 }}
            >
              {flow.map((f) => (
                <View key={f.m} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 110 }}>
                    <View style={{ width: 9, borderRadius: 3, height: (f.income / peak) * 110, backgroundColor: c.green }} />
                    <View style={{ width: 9, borderRadius: 3, height: (f.expense / peak) * 110, backgroundColor: c.red }} />
                  </View>
                  <Muted style={{ fontSize: 10 }}>{short(f.m)}</Muted>
                </View>
              ))}
            </View>
            <View style={[k.row, { marginTop: 10, gap: 16 }]}>
              <Muted style={{ color: c.green }}>■ Receitas</Muted>
              <Muted style={{ color: c.red }}>■ Despesas</Muted>
            </View>
          </Box>
        </>
      );
    },
    net: () => {
      const months = Array.from({ length: 12 }, (_, i) => monthKey(addMonths(month + "-01", i - 11)));
      const rows = netWorth(state, months);
      const peak = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
      const first = rows[0].value,
        last = rows[rows.length - 1].value;
      return (
        <>
          <Section title="Patrimônio em contas · 12 meses" />
          <Box>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 100 }} accessibilityLabel={`De ${show(first)} para ${show(last)}`}>
              {rows.map((r) => (
                <View key={r.m} style={{ flex: 1, height: Math.max(2, (Math.abs(r.value) / peak) * 100), borderRadius: 3, backgroundColor: r.value < 0 ? c.red : c.primary }} />
              ))}
            </View>
            <Muted style={{ marginTop: 8 }}>
              {short(rows[0].m)}: {show(first)} → {short(rows[rows.length - 1].m)}: {show(last)}
            </Muted>
          </Box>
        </>
      );
    },
    pace: () => {
      const day = month === monthKey(today()) ? Number(today().slice(8)) : lastDay(month);
      const sumUntil = (m: string, d: number) =>
        state.transactions
          .filter((t: any) => t.type === "expense" && t.confirmed && !t.invoicePayment && !t.loanSettlement && monthKey(t.date) === m && Number(t.date.slice(8)) <= d)
          .reduce((n: number, t: any) => n + analysisAmount(t), 0);
      const nowSpent = sumUntil(month, day),
        prevSpent = sumUntil(prevMonth, Math.min(day, lastDay(prevMonth)));
      return (
        <>
          <Section title="Ritmo de gasto" />
          <Box>
            <T>
              Até o dia {day}: {show(nowSpent)} {prevSpent ? `(${nowSpent >= prevSpent ? "+" : "−"}${show(Math.abs(nowSpent - prevSpent))} contra o mesmo ponto do mês anterior)` : ""}
            </T>
            <Muted>Mantendo o ritmo, o mês fecha perto de {show(Math.round((nowSpent / Math.max(1, day)) * lastDay(month)))}.</Muted>
          </Box>
        </>
      );
    },
    top: () => {
      const rows = state.transactions
        .filter((t: any) => t.type === "expense" && t.confirmed && !t.invoicePayment && !t.ignored && !t.refund && monthKey(t.date) === month)
        .sort((a: any, b: any) => b.amount - a.amount)
        .slice(0, 5);
      return (
        <>
          <Section title="Maiores gastos" />
          <Box>{rows.length ? <Bars rows={rows.map((t: any) => ({ label: t.description, value: t.amount }))} color={c.red} /> : <Muted>Sem gastos no mês.</Muted>}</Box>
        </>
      );
    },
    savings: () => {
      const rate = now.income ? (now.income - now.expense) / now.income : 0;
      return (
        <>
          <Section title="Taxa de poupança" />
          <Box>
            <T style={{ fontFamily: "SoraSemi", fontSize: 22, color: rate < 0 ? c.red : c.green }}>{now.income ? `${Math.round(rate * 100)}%` : "—"}</T>
            <Muted>{now.income ? "Quanto da renda do mês sobrou. Uma referência comum é guardar 20%." : "Sem receitas no mês."}</Muted>
          </Box>
        </>
      );
    },
    weekday: () => {
      const r = report(state, { ...range, type: "expense", group: "weekday" });
      const order = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      return (
        <>
          <Section title="Gastos por dia da semana" />
          <Box>
            <Bars rows={order.map((d) => ({ label: d, value: r.groups.find((g: any) => g.name === d)?.expense || 0 }))} />
          </Box>
        </>
      );
    },
    fixed: () => {
      const r = report(state, { ...range, type: "expense", group: "fixed" });
      return (
        <>
          <Section title="Fixas e variáveis" />
          <Box>{r.groups.length ? <Bars rows={r.groups.map((g: any) => ({ label: g.name, value: g.expense }))} /> : <Muted>Sem gastos no mês.</Muted>}</Box>
        </>
      );
    },
    links: () => (
      <>
        <Section title="Relatórios" />
        <ListItem icon="bar-chart-2" label="Relatórios avançados" detail="Fluxo de caixa, comparações, faturas, PDF" onPress={() => nav.push({ name: "reports" })} />
        <ListItem icon="trending-up" label="Projeções" detail="Curto, médio prazo e simulador" onPress={() => nav.push({ name: "projections" })} />
        <ListItem icon="message-circle" label="Assistente" detail="Saúde financeira e plano de ação" onPress={() => nav.push({ name: "assistant" })} />
      </>
    ),
  };
  return (
    <>
      <MonthBar />
      {layoutOf(state)
        .analysis.filter((b: any) => b.visible && blocks[b.id])
        .map((b: any) => (
          <React.Fragment key={b.id}>{blocks[b.id]()}</React.Fragment>
        ))}
      <Pressable accessibilityRole="button" onPress={() => nav.push({ name: "layout" })} style={[k.row, { justifyContent: "center", minHeight: 48, marginTop: 8 }]}>
        <I name="sliders" size={16} color={c.primary} />
        <T style={{ color: c.primary, fontSize: 13 }}>Personalizar análise</T>
      </Pressable>
    </>
  );
}
