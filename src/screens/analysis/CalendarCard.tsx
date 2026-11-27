// Atividade do mês em calendário (Resumo da Análise), no padrão do Calen: resumo em cima
// (resultado, entrada, saída, saldo previsto), dias coloridos e folha do dia ao tocar.
import React, { useMemo, useState } from "react";
import { View, Pressable, ScrollView, useWindowDimensions } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useStore } from "../../app/store";
import { useNav } from "../../app/nav";
import { today } from "../../finance.mjs";
import { monthCalendar, dayDetail, compactCents } from "../../spending.mjs";
import { categoryLabel } from "../../categories.mjs";
import { lookOf } from "../../looks.mjs";
import CategoryIcon from "../../ui/CategoryIcon";
import { SheetModal } from "../../ui/Sheet";
import { Button, Choice } from "../../ui/kit";
import { useCalen, CText, CCard, CPills, CIconButton, CDotLabel } from "../../ui/calen";

type Mode = "color" | "spent" | "received" | "balance";
type Source = "account" | "card" | "all";
const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];
const fullDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default function CalendarCard() {
  const { k, tint } = useCalen();
  const { state, show } = useStore();
  const { month } = useNav();
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>("color");
  const [source, setSource] = useState<Source>("all");
  const [small, setSmall] = useState(false);
  const [options, setOptions] = useState(false);
  const [open, setOpen] = useState("");
  const ref = today();
  const cal = useMemo(() => monthCalendar(state, month, ref, { source }), [state.transactions, state.accounts, state.cards, state.recurrences, month, ref, source]);
  const hidden = !!state.settings?.hide;
  const cell = Math.floor((Math.min(width, 900) - 32 - 32 - 6 * 6) / 7);
  const h = small ? Math.round(cell * 0.72) : cell + 4;
  const signed = (v: number | null) => (v === null ? "—" : (v < 0 ? "−" : "") + show(Math.abs(v)));
  const detail = open ? dayDetail(state, open, ref) : null;
  const MONTH = new Date(month + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
  return (
    <>
      {/* O mês já aparece no seletor do topo e no título do cartão: aqui ficam só o filtro e as opções, numa linha. */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <CPills<Source>
            small
            items={[
              ["all", "Tudo"],
              ["account", "Conta"],
              ["card", "Cartão"],
            ]}
            value={source}
            onChange={setSource}
          />
        </View>
        <CIconButton name="more-horizontal" label="Opções do calendário" onPress={() => setOptions(true)} />
      </View>
      <CCard style={{ marginTop: 12, gap: 12 }}>
        <CText semi style={{ textAlign: "center", fontSize: 15 }} accessibilityRole="header">
          {MONTH} <CText muted>{month.slice(0, 4)}</CText>
        </CText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12 }}>
          <View style={{ width: "50%", paddingRight: 8 }}><CDotLabel color={k.primary} label="RESULTADO" value={signed(cal.result)} valueColor={cal.result < 0 ? k.dangerText : undefined} /></View>
          <View style={{ width: "50%" }}><CDotLabel color={k.success} label="ENTRADA" value={signed(cal.income)} /></View>
          <View style={{ width: "50%", paddingRight: 8 }}><CDotLabel color={k.danger} label="SAÍDA" value={signed(cal.expense)} /></View>
          <View style={{ width: "50%" }}><CDotLabel color={k.info} label={cal.endProjected ? "SALDO PREVISTO" : "SALDO NO FIM"} value={signed(cal.endBalance)} valueColor={cal.endBalance !== null && cal.endBalance < 0 ? k.dangerText : undefined} /></View>
        </View>
        <View accessibilityRole="grid" style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {WEEK.map((w, i) => (
              <View key={i} style={{ width: cell, alignItems: "center" }}>
                <CText muted style={{ fontSize: 12 }}>
                  {w}
                </CText>
              </View>
            ))}
          </View>
          {cal.weeks.map((week: any[], wi: number) => (
            <View key={wi} style={{ flexDirection: "row", gap: 6 }}>
              {week.map((d: any, di: number) => {
                if (!d) return <View key={di} style={{ width: cell, height: h }} />;
                const negative = d.balance !== null && d.balance < 0 && d.projected;
                const isToday = d.date === ref;
                const planned = d.hasInvoice || d.plannedIn + d.plannedOut > 0 || d.pending > 0;
                let bg: string = k.soft;
                if (d.income > 0) bg = tint(k.success);
                else if (d.expense > 0) bg = tint(k.primary);
                else if (d.hasInvoice || (d.projected && planned)) bg = tint(k.info);
                const line = isToday ? k.text : negative ? k.danger : "transparent";
                const sub = hidden
                  ? mode === "color"
                    ? ""
                    : "•••"
                  : mode === "spent"
                    ? d.expense
                      ? compactCents(d.expense)
                      : ""
                    : mode === "received"
                      ? d.income
                        ? compactCents(d.income)
                        : ""
                      : mode === "balance"
                        ? d.balance === null
                          ? ""
                          : compactCents(d.balance)
                        : "";
                const label = `${fullDate(d.date)}. ${d.income ? "Entrou " + show(d.income) + ". " : ""}${d.expense ? "Saiu " + show(d.expense) + ". " : ""}${d.hasInvoice ? "Fatura vence. " : ""}${negative ? "Saldo previsto negativo. " : ""}`;
                return (
                  <Pressable
                    key={di}
                    accessibilityRole="button"
                    accessibilityLabel={label.trim()}
                    onPress={() => setOpen(d.date)}
                    android_ripple={{ color: k.line }}
                    style={{ width: cell, height: h, borderRadius: 12, backgroundColor: bg, borderWidth: line === "transparent" ? 0 : 2, borderColor: line, alignItems: "center", justifyContent: "center" }}
                  >
                    <CText semi style={{ fontSize: small ? 12 : 14, lineHeight: small ? 15 : 18 }}>
                      {d.day}
                    </CText>
                    {!!sub && !small && (
                      <CText numberOfLines={1} style={{ fontSize: 12, lineHeight: 12, color: mode === "balance" && d.balance < 0 ? k.dangerText : k.muted }}>
                        {sub}
                      </CText>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[
            [tint(k.success), "entrada no dia"],
            [tint(k.primary), "saída no dia"],
            [tint(k.info), "fatura ou previsto"],
          ].map(([c, t]) => (
            <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: c, borderWidth: 1, borderColor: k.line }} />
              <CText muted style={{ fontSize: 12 }}>
                {t}
              </CText>
            </View>
          ))}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 4, borderWidth: 2, borderColor: k.danger }} />
            <CText muted style={{ fontSize: 12 }}>
              saldo previsto negativo
            </CText>
          </View>
        </View>
        {cal.isEmpty && <CText muted>Nenhum lançamento neste mês. Quando você registrar entradas e saídas, os dias ganham cor aqui.</CText>}
      </CCard>
      {options && <SheetModal title="Opções do calendário" onClose={() => setOptions(false)}>
        <View style={{ padding: 16, gap: 12 }}>
          <Choice<Mode> label="Exibir nos dias" values={[["color", "Cor"], ["spent", "Gasto"], ["received", "Recebido"], ["balance", "Saldo"]]} value={mode} onChange={setMode} />
          <Button title={small ? "Aumentar células" : "Diminuir células"} secondary onPress={() => { setSmall(!small); setOptions(false); }} />
        </View>
      </SheetModal>}
      {detail && (
        <SheetModal title={fullDate(detail.date)} onClose={() => setOpen("")}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <CDotLabel color={k.success} label="RECEITA" value={show(detail.income)} />
              </View>
              <View style={{ flex: 1 }}>
                <CDotLabel color={k.danger} label="DESPESA" value={show(detail.expense)} />
              </View>
            </View>
            {detail.items.length === 0 && detail.planned.length === 0 && <CText muted>Nada neste dia.</CText>}
            {detail.items.map((i: any) => (
              <View key={i.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <CategoryIcon look={lookOf(state, i.category)} size={40} />
                <View style={{ flex: 1 }}>
                  <CText numberOfLines={1} semi style={{ fontSize: 14 }}>
                    {i.description}
                  </CText>
                  <CText muted numberOfLines={1} style={{ fontSize: 12 }}>
                    {categoryLabel(i.category, i.subcategory)}
                    {i.confirmed ? "" : " · pendente"}
                    {i.card ? " · cartão" : ""}
                    {i.ignored ? " · fora da análise" : ""}
                  </CText>
                </View>
                <CText semi style={{ color: i.type === "income" ? k.success : k.text, opacity: i.confirmed ? 1 : 0.6 }}>
                  {i.type === "income" ? "+" : "−"}
                  {show(i.amount)}
                </CText>
              </View>
            ))}
            {detail.planned.length > 0 && (
              <>
                <CText muted style={{ marginTop: 4, fontSize: 12, letterSpacing: 0.5 }}>
                  PREVISTO
                </CText>
                {detail.planned.map((p: any, n: number) => (
                  <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: tint(k.info) }}>
                      <Feather name="clock" size={18} color={k.info} />
                    </View>
                    <CText numberOfLines={1} style={{ flex: 1 }}>
                      {p.description}
                    </CText>
                    <CText semi style={{ color: p.type === "income" ? k.success : k.text }}>
                      {p.type === "income" ? "+" : "−"}
                      {show(p.amount)}
                    </CText>
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
