import React from "react";
import { View } from "react-native";
import { T, Muted, Box, Section, ListItem, Progress, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { totals, monthKey, addMonths, analysisAmount } from "../finance.mjs";
import MonthBar from "./MonthBar";

export function categoryBreakdown(state: any, month: string) {
  const map = new Map<string, number>();
  for (const t of state.transactions)
    if (
      t.type === "expense" &&
      t.confirmed &&
      !t.invoicePayment &&
      !t.loanSettlement &&
      monthKey(t.date) === month
    )
      map.set(t.category || "Outros", (map.get(t.category || "Outros") || 0) + analysisAmount(t));
  const rows = [...map.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((n, [, v]) => n + v, 0);
  return { rows, total };
}

export default function AnalysisScreen() {
  const { c } = useTheme();
  const { state, show } = useStore();
  const nav = useNav();
  const { month } = nav;
  const now = totals(state, month);
  const prev = totals(state, monthKey(addMonths(month + "-01", -1)));
  const result = now.income - now.expense;
  const change = prev.expense ? Math.round(((now.expense - prev.expense) / prev.expense) * 100) : null;
  const { rows, total } = categoryBreakdown(state, month);
  const months = Array.from({ length: 6 }, (_, i) => monthKey(addMonths(month + "-01", i - 5)));
  const flow = months.map((m) => ({ m, ...totals(state, m) }));
  const peak = Math.max(1, ...flow.map((f) => Math.max(f.income, f.expense)));
  return (
    <>
      <MonthBar />
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
            <T style={{ fontFamily: "SoraSemi", color: result < 0 ? c.red : c.green }}>
              {(result < 0 ? "−" : "") + show(Math.abs(result))}
            </T>
          </View>
        </View>
        {change !== null && (
          <Muted style={{ marginTop: 12 }}>
            Despesas {change >= 0 ? "+" : "−"}
            {Math.abs(change)}% em relação ao mês anterior
          </Muted>
        )}
      </Box>
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
      <Section title="Fluxo dos últimos 6 meses" />
      <Box>
        <View
          accessibilityLabel={flow
            .map((f) => `${f.m}: entrou ${show(f.income)}, saiu ${show(f.expense)}`)
            .join("; ")}
          style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 140 }}
        >
          {flow.map((f) => (
            <View key={f.m} style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 110 }}>
                <View style={{ width: 9, borderRadius: 3, height: (f.income / peak) * 110, backgroundColor: c.green }} />
                <View style={{ width: 9, borderRadius: 3, height: (f.expense / peak) * 110, backgroundColor: c.red }} />
              </View>
              <Muted style={{ fontSize: 10 }}>
                {new Date(f.m + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
              </Muted>
            </View>
          ))}
        </View>
        <View style={[k.row, { marginTop: 10, gap: 16 }]}>
          <Muted>■ Receitas</Muted>
          <Muted style={{ color: c.red }}>■ Despesas</Muted>
        </View>
      </Box>
      <Section title="Relatórios" />
      <ListItem icon="bar-chart-2" label="Relatórios avançados" detail="Fluxo de caixa, comparações, faturas, PDF" onPress={() => nav.push({ name: "reports" })} />
      <ListItem icon="trending-up" label="Projeções" detail="Curto, médio prazo e simulador" onPress={() => nav.push({ name: "projections" })} />
    </>
  );
}
