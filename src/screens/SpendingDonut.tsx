// Rosca de gastos da aba Análise: categorias do mês (despesa ou receita), com a lista abaixo
// em R$ ou %. Categorias podem ser ocultadas do gráfico e voltam por "Ocultos do gráfico".
import React, { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { T, Muted, Box, Section, Segmented, Progress, I, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { today } from "../finance.mjs";
import { donutSlices, donutCaption } from "../spending.mjs";
import { lookOf } from "../looks.mjs";
import { categoryLabel } from "../categories.mjs";
import Donut from "../ui/Donut";
import CategoryIcon from "../ui/CategoryIcon";

export default function SpendingDonut() {
  const { c } = useTheme();
  const { state, show, perform } = useStore();
  const { month } = useNav();
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [unit, setUnit] = useState<"money" | "percent">("money");
  const [open, setOpen] = useState("");
  const hiddenNames: string[] = state.settings?.donutHidden || [];
  const data = useMemo(() => donutSlices(state, month, { kind, hidden: hiddenNames } as any), [state.transactions, month, kind, hiddenNames.join("|")]);
  const slices = useMemo(() => data.slices.map((s: any) => ({ name: s.name, fraction: s.fraction, color: lookOf(state, s.name).color, look: lookOf(state, s.name) })), [data, state.categoryLooks]);
  const setHidden = (name: string, off: boolean) =>
    perform(
      (s: any) => {
        const cur: string[] = s.settings?.donutHidden || [];
        const next = off ? [...new Set([...cur, name])] : cur.filter((x) => x !== name);
        return { ...s, settings: { ...s.settings, donutHidden: next } };
      },
      off ? `${name} fora do gráfico` : `${name} no gráfico`,
    );
  const pct = (f: number) => (f * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
  const rows = [...data.slices, ...data.hidden.map((h: any) => ({ ...h, fraction: 0 }))];
  const biggest = Math.max(1, ...rows.map((r: any) => r.cents));
  return (
    <>
      <Section title="Rosca de gastos" />
      <Box style={{ gap: 14 }}>
        <Segmented
          label="Tipo"
          values={[
            ["expense", "Despesas"],
            ["income", "Receitas"],
          ]}
          value={kind}
          onChange={(v) => {
            setKind(v);
            setOpen("");
          }}
        />
        {data.isEmpty ? (
          <Muted>{kind === "income" ? "Sem receitas confirmadas neste mês." : "Sem gastos categorizados neste mês."}</Muted>
        ) : data.allHidden ? (
          <Muted>Todas as categorias estão ocultas do gráfico. Mostre alguma na lista abaixo.</Muted>
        ) : (
          <Donut
            slices={slices}
            total={data.total}
            center={(cents) => show(cents)}
            caption={donutCaption(data, today())}
            label={`${kind === "income" ? "Receitas" : "Despesas"} do mês: ${show(data.total)} em ${data.count} categorias. ${data.slices.map((s: any) => `${s.name} ${pct(s.fraction)}`).join(", ")}`}
            onPress={(name) => setOpen(open === name ? "" : name)}
          />
        )}
        {rows.map((r: any) => {
          const look = lookOf(state, r.name);
          const off = !!r.hidden;
          const expanded = open === r.name;
          return (
            <View key={r.name} style={{ gap: 6, opacity: off ? 0.55 : 1 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${r.name}, ${show(r.cents)}${off ? ", fora do gráfico" : ", " + pct(r.fraction)}`}
                onPress={() => setOpen(expanded ? "" : r.name)}
                style={[k.row, { gap: 12, minHeight: 48 }]}
              >
                <CategoryIcon look={look} size={38} />
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={[k.row, { justifyContent: "space-between", gap: 8 }]}>
                    <T numberOfLines={1} style={{ flex: 1, fontFamily: "SoraSemi", fontSize: 14 }}>
                      {r.name}
                    </T>
                    <Pressable accessibilityRole="button" accessibilityLabel="Alternar entre reais e porcentagem" onPress={() => setUnit(unit === "money" ? "percent" : "money")} hitSlop={8}>
                      <T style={{ fontFamily: "SoraSemi", fontSize: 14, fontVariant: ["tabular-nums"] }}>{off || unit === "money" ? show(r.cents) : pct(r.fraction)}</T>
                    </Pressable>
                  </View>
                  <Progress value={r.cents} max={biggest} color={look.color} />
                </View>
                <I name={expanded ? "chevron-up" : "chevron-down"} size={18} />
              </Pressable>
              {expanded && (
                <View style={{ paddingLeft: 50, gap: 4 }}>
                  {r.subs.map((sb: any) => (
                    <View key={sb.name} style={[k.row, { justifyContent: "space-between" }]}>
                      <Muted style={{ flex: 1 }} numberOfLines={1}>
                        {categoryLabel(r.name, sb.name === "Sem subcategoria" ? "" : sb.name)}
                      </Muted>
                      <Muted>{show(sb.cents)}</Muted>
                    </View>
                  ))}
                  <Pressable accessibilityRole="button" onPress={() => setHidden(r.name, !off)} style={{ minHeight: 44, justifyContent: "center" }}>
                    <T style={{ color: c.primary, fontFamily: "SoraSemi", fontSize: 13 }}>{off ? "Mostrar no gráfico" : "Ocultar do gráfico"}</T>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
        {data.hidden.length > 0 && <Muted>Ocultas do gráfico: {data.hidden.map((h: any) => h.name).join(", ")}. Toque numa delas para mostrar de novo.</Muted>}
      </Box>
    </>
  );
}
