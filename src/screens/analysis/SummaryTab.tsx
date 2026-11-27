// Resumo da Análise (equivale ao Início do Calen): resultado do mês, pode gastar por dia, avisos,
// gasto no mês, tendência da fatura, cartões, 12 meses, assinaturas, top categorias.
import React, { useMemo, useState } from "react";
import { View, Pressable, ScrollView, useWindowDimensions } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useStore } from "../../app/store";
import { useNav } from "../../app/nav";
import { analysisAlerts, splitDismissed, dismiss, restore } from "../../alerts.mjs";
import { totalBalance, totals, today, monthKey, addMonths } from "../../finance.mjs";
import { monthCalendar } from "../../spending.mjs";
import { spendPace, invoiceTrend, cardsOverview, yearBars, subscriptions, topCategories } from "../../overview.mjs";
import { lookOf } from "../../looks.mjs";
import { calenTokens } from "../../calenTheme.mjs";
import CategoryIcon from "../../ui/CategoryIcon";
import { useCountUp } from "../../ui/motion";
import { useCalen, CText, CCard, CSection, CPill, CBar } from "../../ui/calen";
import CalendarCard from "./CalendarCard";
import { PaceChart, YearBars, TrendCurve, monthShort } from "./Charts";

const dd = (iso: string) => `${iso.slice(8)}/${iso.slice(5, 7)}`;

const ALERT_ICON: Record<string, string> = { zero: "alert-triangle", invoice: "credit-card", due: "credit-card", outlier: "zap", merchant: "shopping-bag", budget: "target", category: "trending-up", price: "tag", saving: "trending-up" };
const SEVERITY_TEXT: Record<string, string> = { high: "Urgente", medium: "Atenção", low: "Informação" };

function AlertRow({ a, onOpen, onAction, actionLabel, muted }: { a: any; onOpen?: () => void; onAction: () => void; actionLabel: string; muted?: boolean }) {
  const { k, tint } = useCalen();
  const { show } = useStore();
  const color = a.severity === "high" ? k.danger : a.severity === "medium" ? k.warning : a.kind === "saving" ? k.success : k.info;
  const label = `${SEVERITY_TEXT[a.severity]}. ${a.title}${a.value !== null && a.value !== undefined ? ", " + show(Math.abs(a.value)) : ""}. ${a.note || ""}`;
  return (
    <CCard padded={false} style={{ opacity: muted ? 0.65 : 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable accessibilityRole={onOpen ? "button" : "text"} accessibilityLabel={label} disabled={!onOpen} onPress={onOpen} style={{ flex: 1, flexDirection: "row", gap: 12, padding: 14, alignItems: "flex-start" }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tint(color), alignItems: "center", justifyContent: "center" }}>
            <Feather name={(ALERT_ICON[a.kind] || "info") as any} size={18} color={color} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <CPill text={SEVERITY_TEXT[a.severity]} tone={a.severity === "high" ? "danger" : a.severity === "medium" ? "warning" : "neutral"} />
            <CText semi style={{ fontSize: 14, lineHeight: 19 }}>
              {a.title}
            </CText>
            {a.value !== null && a.value !== undefined && (
              <CText bold style={{ fontSize: 20, lineHeight: 26, color: a.value < 0 ? k.dangerText : k.text }}>
                {show(Math.abs(a.value))}
              </CText>
            )}
            {!!a.description && (
              <CText muted numberOfLines={1} style={{ fontSize: 12 }}>
                {a.description}
              </CText>
            )}
            {!!a.note && (
              <CText muted style={{ fontSize: 12 }}>
                {a.note}
              </CText>
            )}
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${actionLabel} aviso: ${a.title}`} onPress={onAction} style={{ minWidth: 48, minHeight: 48, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" }}>
          <CText semi style={{ fontSize: 12, color: k.primaryText }}>
            {actionLabel}
          </CText>
        </Pressable>
      </View>
    </CCard>
  );
}

export default function SummaryTab({ goTab }: { goTab: (t: "categories" | "spend" | "flow") => void }) {
  const { k, tint, dark } = useCalen();
  const { state, show, perform } = useStore();
  const nav = useNav();
  const { month } = nav;
  const bigFont = useWindowDimensions().fontScale >= 1.3; // fonte grande: empilha nome e valor
  const ref = today();
  const [cardPick, setCardPick] = useState("");
  const ds = [state.transactions, state.cards, state.recurrences, state.accounts, month];
  const pace = useMemo(() => spendPace(state, month, ref), ds);
  const trend = useMemo(() => invoiceTrend(state, month, cardPick ? [cardPick] : []), [...ds, cardPick]);
  const cards = useMemo(() => cardsOverview(state, ref), ds);
  const bars = useMemo(() => yearBars(state, month, ref), ds);
  const subs = useMemo(() => subscriptions(state, ref), ds);
  const top = useMemo(() => topCategories(state, month, 3), ds);
  const balance = totalBalance(state);
  const money = (c: number) => show(c);
  const night = calenTokens(true); // cartão escuro do "Gasto no mês" nos dois temas
  const monthName = new Date(month + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long" });
  const prevName = new Date(monthKey(addMonths(month + "-01", -1)) + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long" });
  const dueTotal = cards.reduce((a: number, c: any) => a + c.open, 0);
  const dismissedIds: string[] = state.settings?.dismissedAlerts || [];
  const alertsAll = useMemo(() => analysisAlerts(state, month, ref), [...ds, state.budgets]);
  const alerts = useMemo(() => splitDismissed(alertsAll, dismissedIds), [alertsAll, dismissedIds.join("|")]);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const dismissAlert = (a: any) => perform((st: any) => ({ ...st, settings: { ...st.settings, dismissedAlerts: dismiss(st.settings?.dismissedAlerts || [], a.id) } }), "Aviso dispensado", { undoable: true });
  const restoreAlert = (a: any) => perform((st: any) => ({ ...st, settings: { ...st.settings, dismissedAlerts: restore(st.settings?.dismissedAlerts || [], a.id) } }), "Aviso restaurado");
  const shownBalance = useCountUp("analysis-balance", balance);
  const tot = useMemo(() => totals(state, month), ds);
  const cal = useMemo(() => monthCalendar(state, month, ref), ds);
  const [calOpen, setCalOpen] = useState(false);
  const result = tot.income - tot.expense;
  const saving = tot.income > 0 ? Math.round((result / tot.income) * 100) : null;
  // Folga do mês: saldo de hoje menos o que já está previsto sair (contas, recorrências, faturas),
  // dividida pelos dias que faltam. Só vale para o mês corrente.
  const monthDays = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const daysLeft = month === monthKey(ref) ? monthDays - Number(ref.slice(8)) + 1 : 0;
  const free = balance - cal.plannedOut;
  const perDay = daysLeft > 0 ? Math.floor(free / daysLeft) : null;
  return (
    <>
      <CCard style={{ marginTop: 14, gap: 12 }}>
        <CText muted style={{ fontSize: 12, letterSpacing: 1.2 }}>
          RESULTADO DE {monthName.toUpperCase()}
        </CText>
        <CText bold numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontSize: 34, lineHeight: 44, color: result < 0 ? k.dangerText : k.text }}>
          {result < 0 ? "−" : ""}
          {money(Math.abs(result))}
        </CText>
        {(pace.pct !== null || saving !== null) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {pace.pct !== null && !pace.isEmpty && <CPill text={`${Math.abs(pace.pct)}% ${pace.pct >= 0 ? "a mais" : "a menos"} de gasto que em ${prevName} até hoje`} tone={pace.pct > 0 ? "warning" : "success"} />}
            {saving !== null && <CPill text={`Poupou ${saving}% da renda`} tone={saving >= 20 ? "success" : saving >= 0 ? "neutral" : "danger"} />}
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 24 }}>
          <View style={{ flex: 1 }}>
            <CText muted style={{ fontSize: 12 }}>
              Entrou
            </CText>
            <CText semi style={{ color: k.successText }}>
              {money(tot.income)}
            </CText>
          </View>
          <View style={{ flex: 1 }}>
            <CText muted style={{ fontSize: 12 }}>
              Saiu
            </CText>
            <CText semi>{money(tot.expense)}</CText>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Saldo nas contas ${money(balance)}. Ver saldo por conta`} onPress={() => nav.push({ name: "accounts" })} style={{ flexDirection: bigFont ? "column" : "row", alignItems: bigFont ? "flex-start" : "center", justifyContent: "space-between", gap: bigFont ? 2 : 12, minHeight: 44, borderTopWidth: 1, borderTopColor: k.line, paddingTop: 10 }}>
          <CText muted>Saldo nas contas</CText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
            <CText semi numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flexShrink: 1, color: balance < 0 ? k.dangerText : k.text }}>
              {shownBalance < 0 ? "−" : ""}
              {money(Math.abs(shownBalance))}
            </CText>
            <Feather name="chevron-right" size={16} color={k.muted} />
          </View>
        </Pressable>
      </CCard>

      {perDay !== null && (
        <CCard style={{ gap: 6, marginTop: 12 }}>
          <CText muted style={{ fontSize: 12, letterSpacing: 1.2 }}>
            {free > 0 ? "PODE GASTAR POR DIA" : balance < 0 ? "SALDO NEGATIVO NAS CONTAS" : "SEM FOLGA ATÉ O FIM DO MÊS"}
          </CText>
          <CText bold numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontSize: 28, lineHeight: 36, color: free > 0 ? k.text : k.dangerText }}>
            {free > 0 ? money(perDay) : balance < 0 ? `${money(-balance)} abaixo de zero` : `${money(-free)} a menos`}
          </CText>
          <CText muted style={{ fontSize: 12 }}>
            {free > 0 ? `${daysLeft} ${daysLeft === 1 ? "dia" : "dias"} até o fim do mês` : balance < 0 ? "O saldo das contas já está no vermelho" : "As contas previstas passam do saldo"}
            {cal.plannedOut > 0 ? (free > 0 ? ` · já descontando ${money(cal.plannedOut)} de contas e faturas previstas` : ` · ainda há ${money(cal.plannedOut)} de contas e faturas previstas`) : ""}
          </CText>
        </CCard>
      )}

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: calOpen }} onPress={() => setCalOpen(!calOpen)} style={{ marginTop: 12, minHeight: 52, borderRadius: 18, backgroundColor: k.soft, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 }}>
        <Feather name="calendar" size={17} color={k.muted} />
        <CText semi style={{ flex: 1 }}>
          Calendário do mês
        </CText>
        <Feather name={calOpen ? "chevron-up" : "chevron-down"} size={18} color={k.muted} />
      </Pressable>
      {calOpen && <CalendarCard />}

      {alerts.active.length > 0 && (
        <>
          <CSection title="Avisos">
            <CText muted style={{ fontSize: 13 }}>
              {alerts.active.length} {alerts.active.length === 1 ? "aviso" : "avisos"}
            </CText>
          </CSection>
          <View style={{ gap: 10 }}>
            {(showAllAlerts ? alerts.active : alerts.active.slice(0, 3)).map((a: any) => (
              <AlertRow key={a.id} a={a} onOpen={a.go ? () => nav.push(a.go) : undefined} onAction={() => dismissAlert(a)} actionLabel="Dispensar" />
            ))}
          </View>
          {alerts.active.length > 3 && (
            <Pressable accessibilityRole="button" onPress={() => setShowAllAlerts(!showAllAlerts)} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              <CText semi style={{ color: k.primaryText }}>
                {showAllAlerts ? "Mostrar menos" : `Ver mais ${alerts.active.length - 3}`}
              </CText>
            </Pressable>
          )}
        </>
      )}
      {alerts.dismissed.length > 0 && (
        <>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDismissed }} onPress={() => setShowDismissed(!showDismissed)} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <CText muted style={{ fontSize: 13 }}>
              Dispensados ({alerts.dismissed.length})
            </CText>
            <Feather name={showDismissed ? "chevron-up" : "chevron-down"} size={16} color={k.muted} />
          </Pressable>
          {showDismissed && (
            <View style={{ gap: 10 }}>
              {alerts.dismissed.map((a: any) => (
                <AlertRow key={a.id} a={a} muted onAction={() => restoreAlert(a)} actionLabel="Restaurar" />
              ))}
            </View>
          )}
        </>
      )}

      <CSection title="Gasto no mês" />
      <View style={{ borderRadius: 24, backgroundColor: night.card, borderWidth: 1, borderColor: night.line, padding: 18, gap: 10 }}>
        {pace.isEmpty ? (
          <CText style={{ color: night.muted }}>Sem gastos neste mês nem no anterior para comparar.</CText>
        ) : (
          <>
            <CText semi style={{ color: night.muted, fontSize: 13 }}>
              Gasto em {monthName}
            </CText>
            <CText bold style={{ fontSize: 32, lineHeight: 40, color: night.text }}>
              {money(pace.total)}
            </CText>
            {pace.pct !== null ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <CPill text={`${Math.abs(pace.pct)}% ${pace.pct >= 0 ? "acima" : "abaixo"}`} tone={pace.pct > 0 ? "warning" : "success"} />
                <CText style={{ color: night.muted, fontSize: 13 }}>
                  vs {money(pace.lastToDate)} em {prevName}
                </CText>
              </View>
            ) : (
              <CText style={{ color: night.muted, fontSize: 13 }}>Sem gastos em {prevName} até este dia para comparar.</CText>
            )}
            <PaceChart pace={pace} tk={night} hidden={!!state.settings?.hide} />
            <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
              {[
                [night.primary, "este mês"],
                [night.subtle, prevName],
                [night.primary, pace.isCurrent ? `previsto ${money(pace.projectedEnd)}` : ""],
              ]
                .filter((x) => x[1])
                .map(([c, t], idx) => (
                  <View key={String(t)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: c, opacity: idx === 2 ? 0.6 : 1 }} />
                    <CText style={{ color: night.muted, fontSize: 12 }}>{t}</CText>
                  </View>
                ))}
            </View>
          </>
        )}
      </View>
      {!pace.isEmpty && pace.pct !== null && (
        <View style={{ marginTop: 10, borderRadius: 22, backgroundColor: k.primary, padding: 16, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Feather name="bar-chart-2" size={17} color={k.onPrimary} />
            <CText semi style={{ color: k.onPrimary }}>
              Comparação com o mês passado
            </CText>
          </View>
          <CText style={{ color: k.onPrimary, fontSize: 14 }}>
            {pace.diff > 0
              ? `Você está gastando ${money(pace.diff)} acima de ${prevName} no mesmo dia. Dá pra segurar nos próximos dias e fechar melhor.`
              : pace.diff < 0
                ? `Você está gastando ${money(-pace.diff)} abaixo de ${prevName} no mesmo dia. Continue assim.`
                : `Seu gasto está igual ao de ${prevName} no mesmo dia.`}
          </CText>
        </View>
      )}

      {!trend.isEmpty && (
        <>
          <CSection title="Tendência da fatura" />
          <CCard style={{ gap: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[{ id: "", name: "Todos os cartões" }, ...state.cards.filter((c: any) => !c.archived).map((c: any) => ({ id: c.id, name: c.name }))].map((c) => {
                const on = cardPick === c.id;
                return (
                  <Pressable key={c.id || "all"} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setCardPick(c.id)} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: "center", backgroundColor: on ? k.primary : k.soft }}>
                    <CText semi={on} style={{ fontSize: 13, color: on ? k.onPrimary : k.muted }}>
                      {c.name}
                    </CText>
                  </Pressable>
                );
              })}
            </ScrollView>
            <TrendCurve values={trend.months.map((m: any) => m.total)} />
            <View style={{ flexDirection: "row" }}>
              {trend.months.map((m: any, i: number) => (
                <View key={m.month} style={{ flex: 1, alignItems: "center", gap: 2, paddingVertical: 8, borderRadius: 14, backgroundColor: i === 1 ? tint(k.primary) : "transparent", borderWidth: i === 1 ? 1 : 0, borderColor: k.primary }}>
                  <CText muted style={{ fontSize: 12, letterSpacing: 0.5 }}>
                    {monthShort(m.month).toUpperCase()}
                  </CText>
                  {m.change !== null && (
                    <CText style={{ fontSize: 12, color: m.change > 0 ? k.dangerText : k.successText }}>
                      {m.change > 0 ? "▲" : "▼"} {Math.abs(m.change)}%
                    </CText>
                  )}
                  <CText semi style={{ fontSize: 13 }}>
                    {money(m.total)}
                  </CText>
                </View>
              ))}
            </View>
          </CCard>
        </>
      )}

      {cards.length > 0 && (
        <>
          <CSection title="Resumo cartões">
            <CText muted style={{ fontSize: 13 }}>
              {money(dueTotal)} em aberto
            </CText>
          </CSection>
          <View style={{ gap: 10 }}>
            {cards.map((c: any) => (
              <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`${c.name}, fatura em aberto ${money(c.open)}, vence ${dd(c.dueDate)}`} onPress={() => nav.push({ name: "cards", cardId: c.id })}>
                <CCard style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: tint(k.primary) }}>
                      <Feather name="credit-card" size={19} color={k.primaryText} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CText semi numberOfLines={1}>
                        {c.name}
                      </CText>
                      <CText muted style={{ fontSize: 12 }}>
                        {c.open > 0 ? `Vence ${dd(c.dueDate)}` : "Nada em aberto"}
                      </CText>
                    </View>
                    <CText semi>{money(c.open)}</CText>
                  </View>
                  {c.usedPct !== null && (
                    <>
                      <CBar value={c.open} max={c.limit} color={c.usedPct >= 90 ? k.danger : k.primary} />
                      <CText muted style={{ fontSize: 12, textAlign: "right" }}>
                        {c.usedPct}% do limite
                      </CText>
                    </>
                  )}
                </CCard>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <CSection title="Gasto por mês" action="Ver fluxo" onAction={() => goTab("flow")} />
      <CCard style={{ gap: 10 }}>
        <YearBars bars={bars} month={month} kind="expense" onPick={(m) => nav.setMonth(m)} />
        <View style={{ flexDirection: "row", gap: 16 }}>
          {[
            [k.danger, "gasto"],
            [tint(k.danger), "previsto"],
          ].map(([c, t]) => (
            <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c, borderWidth: 1, borderColor: k.danger }} />
              <CText muted style={{ fontSize: 12 }}>
                {t}
              </CText>
            </View>
          ))}
        </View>
      </CCard>

      {subs.length > 0 && (
        <>
          <CSection title="Suas assinaturas">
            <CText muted style={{ fontSize: 13 }}>
              {subs.length} {subs.length === 1 ? "cobrança" : "cobranças"}
            </CText>
          </CSection>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
            {subs.map((s: any) => (
              <View key={s.key} style={{ width: 150, borderRadius: 20, borderWidth: 1.5, borderStyle: "dashed", borderColor: k.info, backgroundColor: tint(k.info), overflow: "hidden" }}>
                <View style={{ alignItems: "center", gap: 6, padding: 14 }}>
                  <CategoryIcon look={lookOf(state, s.category)} size={44} />
                  <CText semi numberOfLines={1} style={{ fontSize: 13 }}>
                    {s.name}
                  </CText>
                  <CText bold style={{ fontSize: 16 }}>
                    {money(s.amount)}
                  </CText>
                </View>
                <View style={{ borderTopWidth: 1, borderTopColor: k.info, borderStyle: "dashed", paddingVertical: 8, alignItems: "center" }}>
                  <CText semi style={{ fontSize: 12, letterSpacing: 0.6, color: k.info }}>
                    TODO DIA {s.day}
                  </CText>
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <CSection title="Top categorias" action="Ver todas" onAction={() => goTab("categories")} />
      <CCard style={{ gap: 14 }}>
        {top.rows.length ? (
          top.rows.map((r: any) => {
            const look = lookOf(state, r.name);
            return (
              <View key={r.name} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <CategoryIcon look={look} size={40} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: bigFont ? "column" : "row", justifyContent: "space-between", gap: bigFont ? 2 : 8 }}>
                    <CText numberOfLines={2} style={{ flex: bigFont ? undefined : 1 }}>
                      {r.name}
                    </CText>
                    <CText semi numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 0 }}>
                      {money(r.cents)}
                    </CText>
                  </View>
                  <CBar value={r.cents} max={top.total} color={look.color} />
                </View>
                <CText muted numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ width: bigFont ? 52 : 38, textAlign: "right", fontSize: 12 }}>
                  {Math.round(r.fraction * 100)}%
                </CText>
              </View>
            );
          })
        ) : (
          <CText muted>Quando você lançar uma despesa com categoria, ela aparece aqui.</CText>
        )}
      </CCard>
    </>
  );
}
