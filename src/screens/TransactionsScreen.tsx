import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, TextInput, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { Box, Button, Chips, Empty, I, Muted, T, focusAccessibility, type ViewControl, styles as k } from "../ui/kit";
import { applyFilters, centsOf, emptyFilters, toggle } from "../tx-filters.mjs";
import { activeFilterCount, applyStatementFilter, describeFilter, sanitizeFilter } from "../statementFilter.mjs";
import { dayDetail, monthGrid } from "../statementCalendar.mjs";
import { toAmountText } from "../calc.mjs";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { monthKey, money, includedAccounts, signedAmount } from "../finance.mjs";
import { displayOf } from "./PersonalizeScreens";
import TransactionRow from "./TransactionRow";
import MonthBar from "./MonthBar";
import CategoryIcon, { categoryStyleOf, tagStyleOf } from "../ui/CategoryIcon";

type Filter = "all" | "income" | "expense" | "transfer" | "pending";
const norm = (s: string) =>
  s
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function matches(t: any, query: string, notes = true) {
  if (!query.trim()) return true;
  const q = norm(query.trim());
  const amount = (t.amount / 100).toFixed(2);
  return (
    norm(t.description).includes(q) ||
    (notes && norm(t.notes || "").includes(q)) ||
    norm(t.category || "").includes(q) ||
    amount.includes(q.replace(",", ".")) ||
    money(t.amount).includes(query.trim())
  );
}

export default function TransactionsScreen() {
  const { c } = useTheme();
  const { state, show, perform } = useStore();
  const { month } = useNav();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const saved = state.settings?.display?.statementFilter;
  const core = useMemo(() => sanitizeFilter(saved), [saved]);
  const extras = useMemo(() => ({
    cards: Array.isArray(saved?.cards) ? saved.cards.filter((id: unknown) => typeof id === "string" && id.startsWith("c:")) : [],
    categories: Array.isArray(saved?.categories) ? saved.categories.filter((name: unknown) => typeof name === "string") : [],
    sort: ["dateAsc", "amountAsc", "amountDesc"].includes(saved?.sort) ? saved.sort : "date",
  }), [saved]);
  const [adv, setAdv] = useState<{ sources: string[]; categories: string[]; tags: string[]; types: string[]; min: string; max: string; sort: string }>({ ...emptyFilters(), types: [] });
  const [panel, setPanel] = useState(false);
  const filterButton = useRef<ViewControl>(null);
  const filterHeading = useRef<ViewControl>(null);
  const visitedFilters = useRef(false);
  useEffect(() => {
    if (!visitedFilters.current) return;
    focusAccessibility(panel ? filterHeading.current : filterButton.current);
  }, [panel]);
  const [cal, setCal] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const advCount = activeFilterCount(core) + Number(extras.cards.length > 0 && core.accountIds.length === 0) +
    Number(extras.categories.length > 0) + Number(extras.sort !== "date");
  const summary = describeFilter(core, { accounts: state.accounts, tags: state.tags });
  const openFilters = () => {
    visitedFilters.current = true;
    if (!panel) setAdv({ ...extras, types: core.types,
      sources: [...core.accountIds.map((id: string) => "a:" + id), ...extras.cards], tags: core.tagIds,
      min: core.minCents === null ? "" : toAmountText(core.minCents),
      max: core.maxCents === null ? "" : toAmountText(core.maxCents) });
    setPanel(!panel);
  };
  const saveFilters = (clear = false) => {
    const next = clear ? undefined : { ...sanitizeFilter({
      accountIds: adv.sources.filter((id: string) => id.startsWith("a:")).map((id: string) => id.slice(2)),
      tagIds: adv.tags, types: adv.types, minCents: centsOf(adv.min), maxCents: centsOf(adv.max),
    }), cards: adv.sources.filter((id: string) => id.startsWith("c:")), categories: adv.categories, sort: adv.sort };
    void perform((s: any) => ({ ...s, settings: { ...s.settings, display: { ...s.settings?.display, statementFilter: next } } }), "")
      .then((ok) => { if (ok) setPanel(false); });
  };
  const d = displayOf(state);
  const filtered = useMemo(() => {
    const rows = state.transactions
      .filter((t: any) => monthKey(t.date) === month)
      .filter((t: any) => !d.onlyConfirmed || t.confirmed)
      .filter((t: any) =>
        filter === "all"
          ? true
          : filter === "pending"
            ? !t.confirmed
            : filter === "income"
              ? t.type === "income" || t.refund
              : filter === "expense"
                ? t.type === "expense" && !t.refund
                : t.type === filter,
      )
      .filter((t: any) => matches(t, search, d.searchNotes));
    const sources = extras.cards.length ? [...core.accountIds.map((id: string) => "a:" + id), ...extras.cards] : [];
    const selected = applyStatementFilter(rows, sources.length ? { ...core, accountIds: [] } : core);
    return applyFilters(selected, { ...emptyFilters(), sources, categories: extras.categories, sort: extras.sort });
  }, [state.transactions, month, filter, search, core, extras, d.onlyConfirmed, d.searchNotes]);
  // Dia escolhido no calendário (só vale para o mês exibido).
  const pickedDay = day && monthKey(day) === month ? day : null;
  const detail = pickedDay ? dayDetail(filtered, pickedDay) : null;
  const found = detail?.transactions ?? filtered;
  const byAmount = extras.sort === "amountDesc" || extras.sort === "amountAsc";
  const grid = cal ? monthGrid(filtered, month) : null;
  const days = useMemo(() => {
    const rows = found;
    const map = new Map<string, any[]>();
    for (const t of rows) map.set(t.date, [...(map.get(t.date) || []), t]);
    // Compras do cartão no fim de cada dia, quando pedido.
    if (d.cardSeparate) for (const [k2, v] of map) map.set(k2, [...v.filter((t) => !t.cardId), ...v.filter((t) => t.cardId)]);
    return [...map.entries()];
  }, [found, d.cardSeparate]);
  // Opções do painel: contas e cartões ativos; categorias que aparecem no mês; tags cadastradas.
  const monthRows = state.transactions.filter((t: any) => monthKey(t.date) === month);
  const sourceOpts: [string, string][] = [
    ...state.accounts.filter((a: any) => !a.archived).map((a: any) => ["a:" + a.id, a.name] as [string, string]),
    ...state.cards.filter((x: any) => !x.archived).map((x: any) => ["c:" + x.id, /^cart[aã]o/i.test(x.name) ? x.name : "Cartão " + x.name] as [string, string]),
  ];
  const catOpts = [...new Set(monthRows.map((t: any) => t.category).filter(Boolean))].sort() as string[];
  const tagOpts: [string, string][] = (state.tags || []).map((g: any) => [g.id, "#" + g.name]);
  const total = found.reduce((n: number, t: any) => (t.type === "transfer" ? n : n + (t.type === "income" || t.refund ? t.amount : -t.amount)), 0);
  // Saldo das contas incluídas ao fim de cada dia (para a preferência "saldo acumulado").
  const endOfDay = (date: string) =>
    includedAccounts(state).reduce((n: number, a: any) => n + a.initial, 0) +
    state.transactions
      .filter((t: any) => t.confirmed && !t.cardId && t.date <= date)
      .reduce((n: number, t: any) => {
        const inc = includedAccounts(state).map((a: any) => a.id);
        return (
          n +
          (inc.includes(t.accountId) ? signedAmount(t) : 0) +
          (t.type === "transfer" && inc.includes(t.destinationId) ? t.amount : 0)
        );
      }, 0);
  return (
    <>
      <MonthBar />
      <TextInput
        accessibilityLabel="Buscar por descrição, valor ou observação"
        placeholder="Buscar por descrição ou valor"
        placeholderTextColor={c.muted}
        value={search}
        onChangeText={setSearch}
        style={[k.input, { backgroundColor: c.surface, color: c.text, borderColor: c.line }]}
      />
      <Chips
        values={[
          ["all", "Todas"],
          ["income", "Receitas"],
          ["expense", "Despesas"],
          ["transfer", "Transferências"],
          ["pending", "Pendentes"],
        ]}
        value={filter}
        onChange={setFilter}
      />
      <View style={[k.row, { gap: 4, marginTop: 2 }]}>
        <Pressable
          accessibilityRole="button"
          ref={filterButton}
          accessibilityLabel={panel ? "Fechar filtros" : advCount ? `Filtros, ${advCount} ativos` : "Abrir filtros"}
          accessibilityState={{ expanded: panel }}
          onPress={openFilters}
          hitSlop={8}
          style={[k.compactChip, k.row, { minHeight: 48, gap: 8, backgroundColor: advCount ? c.primary : c.surface, borderColor: advCount ? c.primary : c.line }]}
        >
          <I name="sliders" size={16} color={advCount ? c.onPrimary : c.text} />
          <T style={{ fontSize: 13, fontFamily: "SoraSemi", color: advCount ? c.onPrimary : c.text }}>
            {advCount ? `Filtros · ${advCount}` : "Filtros"}
          </T>
        </Pressable>
        <Button secondary title={cal ? "Ver lista" : "Ver calendário"} onPress={() => { setCal(!cal); setDay(null); }} />
        <View style={{ flex: 1 }} />
        <Muted accessibilityLiveRegion="polite">
          {found.length} {found.length === 1 ? "lançamento" : "lançamentos"} · {(total < 0 ? "−" : "") + show(Math.abs(total))}
        </Muted>
      </View>
      {advCount > 0 && (
        <View style={{ gap: 8 }}>
          <Muted>{[summary, extras.cards.length ? "Cartões selecionados" : "", extras.categories.length ? "Categorias selecionadas" : "",
            extras.sort !== "date" ? "Ordem personalizada" : ""].filter(Boolean).join(" · ")}</Muted>
          <Button secondary title="Limpar filtros" onPress={() => saveFilters(true)} />
        </View>
      )}
      {grid && <MonthCalendar weeks={grid.weeks} day={pickedDay} onPick={setDay} />}
      {pickedDay && (
        <View style={{ gap: 6, marginTop: 8 }}>
          <T accessibilityRole="header">{new Date(pickedDay + "T12:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "UTC" })}</T>
          {detail && <Muted accessibilityLiveRegion="polite">Entradas {show(detail.incomeCents ?? 0)} · Despesas {show(detail.expenseCents ?? 0)}</Muted>}
          <Button secondary title="Fechar detalhe do dia" onPress={() => setDay(null)} />
        </View>
      )}
      {panel && (
        <Box style={{ marginTop: 10, gap: 6 }}>
          <View ref={filterHeading} accessible accessibilityRole="header"><T>Filtros do extrato</T></View>
          <Pick title="Conta ou cartão" opts={sourceOpts} on={adv.sources} set={(v) => setAdv({ ...adv, sources: toggle(adv.sources, v) })} />
          {catOpts.length > 0 && (
            <Pick title="Categoria" badge={(name) => categoryStyleOf(state, name)} opts={catOpts.map((x) => [x, x])} on={adv.categories} set={(v) => setAdv({ ...adv, categories: toggle(adv.categories, v) })} />
          )}
          {tagOpts.length > 0 && <Pick title="Tags" badge={(id) => tagStyleOf((state.tags || []).find((tag: any) => tag.id === id))} opts={tagOpts} on={adv.tags} set={(v) => setAdv({ ...adv, tags: toggle(adv.tags, v) })} />}
          <Pick title="Tipos de lançamento" opts={[["income", "Receitas"], ["expense", "Despesas"], ["transfer", "Transferências"]]}
            on={adv.types} set={(v) => setAdv({ ...adv, types: toggle(adv.types, v) })} />
          <Muted style={{ marginTop: 6 }}>Faixa de valor (R$)</Muted>
          <View style={[k.row, { gap: 10 }]}>
            {(["min", "max"] as const).map((key) => (
              <TextInput
                key={key}
                accessibilityLabel={key === "min" ? "Valor mínimo" : "Valor máximo"}
                placeholder={key === "min" ? "De 0,00" : "Até 0,00"}
                placeholderTextColor={c.muted}
                keyboardType="decimal-pad"
                value={adv[key]}
                onChangeText={(v) => setAdv({ ...adv, [key]: v })}
                style={[k.input, { flex: 1, marginTop: 0, backgroundColor: c.bg, color: c.text, borderColor: c.muted }]}
              />
            ))}
          </View>
          <Pick
            title="Ordenar por"
            single
            opts={[
              ["date", "Mais recentes"],
              ["dateAsc", "Mais antigos"],
              ["amountDesc", "Maior valor"],
              ["amountAsc", "Menor valor"],
            ]}
            on={[adv.sort]}
            set={(v) => setAdv({ ...adv, sort: v })}
          />
          <Button title="Aplicar filtros" onPress={() => saveFilters()} />
        </Box>
      )}
      {cal && !pickedDay ? null : byAmount && found.length ? (
        <Box style={{ padding: 0, marginTop: 14, overflow: "hidden" }}>
          {found.map((t: any, i: number) => (
            <TransactionRow key={t.id} t={t} withDate last={i === found.length - 1} />
          ))}
        </Box>
      ) : days.length ? (
        days.map(([date, rows]) => {
          const net = rows.reduce(
            (n: number, t: any) =>
              t.type === "transfer" ? n : n + (t.type === "income" || t.refund ? t.amount : -t.amount),
            0,
          );
          return (
            <View key={date}>
              <View style={[k.row, { justifyContent: "space-between", marginTop: 14, marginBottom: 6 }]}>
                <Muted>
                  {(() => {
                    const s = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    });
                    return s.charAt(0).toUpperCase() + s.slice(1);
                  })()}
                </Muted>
                <Muted>
                  {d.dailyBalance
                    ? "Saldo " + (endOfDay(date) < 0 ? "−" : "") + show(Math.abs(endOfDay(date)))
                    : (net >= 0 ? "+" : "−") + show(Math.abs(net))}
                </Muted>
              </View>
              <Box style={{ padding: 0, marginBottom: 4, overflow: "hidden" }}>
                {rows.map((t: any, i: number) => (
                  <TransactionRow key={t.id} t={t} last={i === rows.length - 1} />
                ))}
              </Box>
            </View>
          );
        })
      ) : (
        <Empty
          title="Nenhum lançamento encontrado"
          body="Tente outra busca, escolha outro mês ou registre uma movimentação pelo botão +."
        />
      )}
    </>
  );
}

// Grupo de chips de seleção múltipla, quebrando linha (o painel não rola na horizontal).
function Pick({ title, opts, on, set, single = false, badge }: { title: string; opts: [string, string][]; on: string[]; set: (v: string) => void; single?: boolean; badge?: (id: string) => { icon: string; color: string } }) {
  const { c } = useTheme();
  if (!opts.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <Muted style={{ marginTop: 6 }}>{title}</Muted>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {opts.map(([key, label]) => {
          const sel = on.includes(key);
          return (
            <Pressable
              key={key}
              accessibilityRole={single ? "radio" : "checkbox"}
              accessibilityState={single ? { selected: sel } : { checked: sel }}
              accessibilityLabel={label}
              onPress={() => set(key)}
              hitSlop={{ top: 4, bottom: 4 }}
              style={[k.compactChip, k.row, { minHeight: 48, gap: 6, backgroundColor: sel ? c.primary : c.bg, borderColor: sel ? c.primary : c.line }]}
            >
              {sel && <I name="check" size={14} color={c.onPrimary} />}
              {badge && <CategoryIcon look={badge(key)} size={24} />}
              <T style={{ fontSize: 13, fontFamily: sel ? "SoraSemi" : "Sora", color: sel ? c.onPrimary : c.text }}>{label}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// O calendário rola horizontalmente em larguras em que sete alvos de 48 dp não cabem.
function MonthCalendar({ weeks, day, onPick }: { weeks: any[][]; day: string | null; onPick: (date: string) => void }) {
  const { c } = useTheme();
  const { fontScale } = useWindowDimensions();
  const cellStyle = { flex: 1, minWidth: Math.max(48, 32 * fontScale) };
  return (
    <Box style={{ marginTop: 10, paddingHorizontal: 8 }}>
      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ minWidth: cellStyle.minWidth * 7, flexGrow: 1 }}>
          <View style={{ flexDirection: "row" }} importantForAccessibility="no-hide-descendants">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((letter, i) =>
              <Muted key={i} style={[cellStyle, { textAlign: "center" }]}>{letter}</Muted>)}
          </View>
          {weeks.map((week, i) => (
            <View key={i} style={{ flexDirection: "row" }}>
              {week.map((cell) => {
                if (!cell.inMonth) return <View key={cell.date} style={cellStyle} />;
                const selected = cell.date === day;
                const number = Number(cell.date.slice(-2));
                return (
                  <Pressable key={cell.date} accessibilityRole="button" accessibilityState={{ selected }}
                    accessibilityLabel={`Dia ${number}, ${cell.count} ${cell.count === 1 ? "lançamento" : "lançamentos"}, intensidade de gasto ${cell.level} de 4`}
                    onPress={() => onPick(cell.date)}
                    style={[cellStyle, { minHeight: 48, alignItems: "center", justifyContent: "center",
                      borderRadius: 12, backgroundColor: selected ? c.primary : c.surface }]}>
                    <T style={{ color: selected ? c.onPrimary : c.text }}>{number}</T>
                    {cell.level > 0 && <View importantForAccessibility="no" style={{ height: 4, borderRadius: 2,
                      width: 6 * cell.level, backgroundColor: selected ? c.onPrimary : c.primary, opacity: 0.35 + 0.15 * cell.level }} />}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </Box>
  );
}
