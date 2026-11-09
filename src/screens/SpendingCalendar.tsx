// Calendário de gastos da aba Análise: o mês em dias, com entrada, saída e saldo previsto.
// Toque num dia abre o que aconteceu e o que está previsto.
import React, { useMemo, useState } from "react";
import { View, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { T, Muted, Box, Section, Segmented, I, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { today } from "../finance.mjs";
import { monthCalendar, dayDetail, intensity, compactCents } from "../spending.mjs";
import { categoryLabel } from "../categories.mjs";
import { lookOf } from "../looks.mjs";
import CategoryIcon from "../ui/CategoryIcon";
import { SheetModal } from "../ui/pickers";

type Mode = "color" | "spent" | "balance";
const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];
const fullDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const alpha = (hex: string, a: number) => (/^#[0-9a-f]{6}$/i.test(hex) ? hex + Math.round(a * 255).toString(16).padStart(2, "0") : hex);

export default function SpendingCalendar() {
  const { c } = useTheme();
  const { state, show } = useStore();
  const { month } = useNav();
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>("color");
  const [open, setOpen] = useState("");
  const ref = today();
  const cal = useMemo(() => monthCalendar(state, month, ref), [state.transactions, state.accounts, state.cards, state.recurrences, month, ref]);
  const hidden = !!state.settings?.hide;
  const cell = Math.floor((width - 32 - 32 - 6 * 4) / 7);
  const stat = (label: string, value: number | null, color?: string, note?: string) => (
    <View style={{ flex: 1, gap: 2 }}>
      <Muted style={{ fontSize: 11 }}>{label}</Muted>
      <T numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: "SoraSemi", fontSize: 14, color: color || c.text }}>
        {value === null ? "—" : (value < 0 ? "−" : "") + show(Math.abs(value))}
      </T>
      {!!note && <Muted style={{ fontSize: 10 }}>{note}</Muted>}
    </View>
  );
  const detail = open ? dayDetail(state, open, ref) : null;
  return (
    <>
      <Section title="Calendário de gastos" />
      <Box style={{ gap: 14 }}>
        <View style={{ gap: 12 }}>
          <View style={[k.row, { alignItems: "flex-start", gap: 12 }]}>
            {stat("Entrou", cal.income, c.green)}
            {stat("Saiu", cal.expense)}
          </View>
          <View style={[k.row, { alignItems: "flex-start", gap: 12 }]}>
            {stat("Resultado", cal.result, cal.result < 0 ? c.red : c.green)}
            {stat(cal.endProjected ? "Saldo previsto no fim do mês" : "Saldo no fim do mês", cal.endBalance, cal.endBalance !== null && cal.endBalance < 0 ? c.red : undefined)}
          </View>
        </View>
        <Segmented
          label="O que mostrar nas células"
          values={[
            ["color", "Cor"],
            ["spent", "Gasto"],
            ["balance", "Saldo"],
          ]}
          value={mode}
          onChange={setMode}
        />
        <View accessibilityRole="grid" style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {WEEK.map((w, i) => (
              <View key={i} style={{ width: cell, alignItems: "center" }}>
                <Muted style={{ fontSize: 11 }}>{w}</Muted>
              </View>
            ))}
          </View>
          {cal.weeks.map((week, wi) => (
            <View key={wi} style={{ flexDirection: "row", gap: 4 }}>
              {week.map((d: any, di: number) => {
                if (!d) return <View key={di} style={{ width: cell, height: cell + 6 }} />;
                const level = intensity(d.expense, cal.peakExpense);
                const negative = d.balance !== null && d.balance < 0;
                const isToday = d.date === ref;
                const planned = d.plannedIn + d.plannedOut > 0 || d.hasInvoice || d.pending > 0;
                const bg = level ? alpha(c.red, [0, 0.16, 0.3, 0.46][level]) : d.income ? alpha(c.green, 0.22) : c.soft;
                const line = d.hasInvoice ? c.primary : negative ? c.red : planned ? c.muted : "transparent";
                const sub = mode === "spent" ? (d.expense ? compactCents(d.expense) : "") : mode === "balance" ? (d.balance === null ? "" : compactCents(d.balance)) : "";
                const label = `${fullDate(d.date)}. ${d.income ? "Entrou " + show(d.income) + ". " : ""}${d.expense ? "Saiu " + show(d.expense) + ". " : ""}${d.hasInvoice ? "Fatura vence. " : ""}${negative ? "Saldo previsto negativo. " : ""}`;
                return (
                  <Pressable
                    key={di}
                    accessibilityRole="button"
                    accessibilityLabel={label.trim()}
                    onPress={() => setOpen(d.date)}
                    android_ripple={{ color: c.soft }}
                    style={{ width: cell, height: cell + 6, borderRadius: 12, backgroundColor: bg, borderWidth: line === "transparent" ? 0 : 1.5, borderColor: line, alignItems: "center", justifyContent: "center", gap: 1 }}
                  >
                    <View style={isToday ? { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" } : undefined}>
                      <T style={{ fontSize: 13, fontFamily: isToday ? "SoraBold" : "SoraSemi", color: isToday ? c.heroText : c.text }}>{d.day}</T>
                    </View>
                    {!!sub && (
                      <T numberOfLines={1} style={{ fontSize: 9.5, lineHeight: 12, color: mode === "balance" && negative ? c.red : c.muted, fontVariant: ["tabular-nums"] }}>
                        {hidden ? "•••" : sub}
                      </T>
                    )}
                    {!sub && d.income > 0 && level > 0 && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.green }} />}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <Muted style={{ fontSize: 11.5, lineHeight: 16 }}>
          Vermelho: dias com saída (mais forte, mais gasto). Verde: só entrada. Contorno na cor de destaque: fatura vence. Contorno vermelho: saldo previsto negativo. Depois de hoje o saldo é previsto, com pendentes, recorrências e faturas.
        </Muted>
        {cal.isEmpty && <Muted>Nenhum lançamento neste mês. Quando você registrar entradas e saídas, os dias ganham cor aqui.</Muted>}
      </Box>
      {detail && (
        <SheetModal title={fullDate(detail.date)} onClose={() => setOpen("")}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <View style={[k.row, { gap: 12 }]}>
              <View style={{ flex: 1 }}>
                <Muted>Receita</Muted>
                <T style={{ fontFamily: "SoraSemi", color: c.green }}>{show(detail.income)}</T>
              </View>
              <View style={{ flex: 1 }}>
                <Muted>Despesa</Muted>
                <T style={{ fontFamily: "SoraSemi" }}>{show(detail.expense)}</T>
              </View>
            </View>
            {detail.items.length === 0 && detail.planned.length === 0 && <Muted>Nada neste dia.</Muted>}
            {detail.items.map((i: any) => (
              <View key={i.id} style={[k.row, { gap: 12 }]}>
                <CategoryIcon look={lookOf(state, i.category)} size={38} />
                <View style={{ flex: 1 }}>
                  <T numberOfLines={1} style={{ fontFamily: "SoraSemi", fontSize: 14 }}>
                    {i.description}
                  </T>
                  <Muted numberOfLines={1}>
                    {categoryLabel(i.category, i.subcategory)}
                    {i.confirmed ? "" : " · pendente"}
                    {i.card ? " · cartão" : ""}
                    {i.ignored ? " · fora da análise" : ""}
                  </Muted>
                </View>
                <T style={{ fontFamily: "SoraSemi", color: i.type === "income" ? c.green : c.text, opacity: i.confirmed ? 1 : 0.6 }}>
                  {i.type === "income" ? "+" : "−"}
                  {show(i.amount)}
                </T>
              </View>
            ))}
            {detail.planned.length > 0 && (
              <>
                <Muted style={{ marginTop: 4 }}>PREVISTO</Muted>
                {detail.planned.map((p: any, n: number) => (
                  <View key={n} style={[k.row, { gap: 12 }]}>
                    <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.soft }}>
                      <I name="clock" size={18} />
                    </View>
                    <T numberOfLines={1} style={{ flex: 1 }}>
                      {p.description}
                    </T>
                    <T style={{ color: p.type === "income" ? c.green : c.text }}>
                      {p.type === "income" ? "+" : "−"}
                      {show(p.amount)}
                    </T>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </SheetModal>
      )}
    </>
  );
}
