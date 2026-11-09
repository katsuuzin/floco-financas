import React, { useMemo, useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { Box, Button, Chips, Empty, I, IconButton, Muted, T, styles as k } from "../ui/kit";
import { applyFilters, activeCount, emptyFilters, toggle, calendarWeeks, dailyNet } from "../tx-filters.mjs";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { monthKey, money, includedAccounts, signedAmount } from "../finance.mjs";
import { displayOf } from "./PersonalizeScreens";
import TransactionRow from "./TransactionRow";
import MonthBar from "./MonthBar";

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
  const { state, show } = useStore();
  const { month } = useNav();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [adv, setAdv] = useState(emptyFilters());
  const [panel, setPanel] = useState(false);
  const [cal, setCal] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const advCount = activeCount(adv);
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
    return applyFilters(rows, adv);
  }, [state.transactions, month, filter, search, adv, d.onlyConfirmed, d.searchNotes]);
  // Dia escolhido no calendário (só vale para o mês exibido).
  const pickedDay = day && monthKey(day) === month ? day : null;
  const found = pickedDay ? filtered.filter((t: any) => t.date === pickedDay) : filtered;
  const byAmount = adv.sort === "amountDesc" || adv.sort === "amountAsc";
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
          accessibilityLabel={panel ? "Fechar filtros" : advCount ? `Filtros, ${advCount} ativos` : "Abrir filtros"}
          accessibilityState={{ expanded: panel }}
          onPress={() => setPanel(!panel)}
          hitSlop={8}
          style={[k.compactChip, k.row, { gap: 8, backgroundColor: advCount ? c.primary : c.surface, borderColor: advCount ? c.primary : c.line }]}
        >
          <I name="sliders" size={16} color={advCount ? c.onPrimary : c.text} />
          <T style={{ fontSize: 13, fontFamily: "SoraSemi", color: advCount ? c.onPrimary : c.text }}>
            {advCount ? `Filtros · ${advCount}` : "Filtros"}
          </T>
        </Pressable>
        <IconButton
          name={cal ? "list" : "calendar"}
          label={cal ? "Fechar calendário" : "Ver calendário do mês"}
          onPress={() => {
            setCal(!cal);
            setDay(null);
          }}
        />
        <View style={{ flex: 1 }} />
        <Muted accessibilityLiveRegion="polite">
          {found.length} {found.length === 1 ? "lançamento" : "lançamentos"} · {(total < 0 ? "−" : "") + show(Math.abs(total))}
        </Muted>
      </View>
      {cal && <MonthCalendar month={month} net={dailyNet(filtered) as Record<string, number>} day={pickedDay} onPick={(d) => setDay(d === pickedDay ? null : d)} />}
      {pickedDay && (
        <Pressable accessibilityRole="button" onPress={() => setDay(null)} style={[k.row, { gap: 6, marginTop: 8 }]}>
          <I name="x-circle" size={16} color={c.primary} />
          <T style={{ color: c.primary, fontSize: 13, fontFamily: "SoraSemi" }}>
            Só {new Date(pickedDay + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })} · mostrar o mês todo
          </T>
        </Pressable>
      )}
      {panel && (
        <Box style={{ marginTop: 10, gap: 6 }}>
          <Pick title="Conta ou cartão" opts={sourceOpts} on={adv.sources} set={(v) => setAdv({ ...adv, sources: toggle(adv.sources, v) })} />
          {catOpts.length > 0 && (
            <Pick title="Categoria" opts={catOpts.map((x) => [x, x])} on={adv.categories} set={(v) => setAdv({ ...adv, categories: toggle(adv.categories, v) })} />
          )}
          {tagOpts.length > 0 && <Pick title="Tags" opts={tagOpts} on={adv.tags} set={(v) => setAdv({ ...adv, tags: toggle(adv.tags, v) })} />}
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
                style={[k.input, { flex: 1, marginTop: 0, backgroundColor: c.bg, color: c.text, borderColor: c.line }]}
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
          {advCount > 0 && <Button secondary icon="x" title="Limpar filtros" onPress={() => setAdv(emptyFilters())} />}
        </Box>
      )}
      {byAmount && found.length ? (
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
function Pick({ title, opts, on, set, single = false }: { title: string; opts: [string, string][]; on: string[]; set: (v: string) => void; single?: boolean }) {
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
              style={[k.compactChip, k.row, { gap: 6, backgroundColor: sel ? c.primary : c.bg, borderColor: sel ? c.primary : c.line }]}
            >
              {sel && <I name="check" size={14} color={c.onPrimary} />}
              <T style={{ fontSize: 13, fontFamily: sel ? "SoraSemi" : "Sora", color: sel ? c.onPrimary : c.text }}>{label}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// L12: calendário do mês com o resultado de cada dia; tocar num dia filtra o extrato.
function MonthCalendar({ month, net, day, onPick }: { month: string; net: Record<string, number>; day: string | null; onPick: (d: string) => void }) {
  const { c } = useTheme();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const short = (v: number) => {
    const a = Math.abs(v) / 100;
    return (v < 0 ? "−" : "+") + (a >= 1000 ? (a / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k" : Math.round(a));
  };
  return (
    <Box style={{ marginTop: 10, paddingHorizontal: 8, paddingVertical: 10 }}>
      <View style={{ flexDirection: "row" }}>
        {["D", "S", "T", "Q", "Q", "S", "S"].map((w, i) => (
          <Muted key={i} style={{ flex: 1, textAlign: "center", fontSize: 11 }} importantForAccessibility="no">
            {w}
          </Muted>
        ))}
      </View>
      {calendarWeeks(month).map((week: (string | null)[], wi: number) => (
        <View key={wi} style={{ flexDirection: "row" }}>
          {week.map((d, i) => {
            if (!d) return <View key={i} style={{ flex: 1 }} />;
            const v = net[d];
            const sel = d === day;
            const n = Number(d.slice(8));
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={`Dia ${n}${v ? (v < 0 ? ", saldo negativo de " : ", saldo positivo de ") + (Math.abs(v) / 100).toFixed(2).replace(".", ",") + " reais" : ", sem lançamentos"}`}
                onPress={() => onPick(d)}
                style={{
                  flex: 1,
                  minHeight: 48,
                  margin: 2,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: sel ? c.primary : "transparent",
                  borderWidth: d === today && !sel ? 1 : 0,
                  borderColor: c.primary,
                }}
              >
                <T style={{ fontSize: 13, fontFamily: sel ? "SoraSemi" : "Sora", color: sel ? c.onPrimary : c.text }}>{n}</T>
                {v ? (
                  <T style={{ fontSize: 9, color: sel ? c.onPrimary : v < 0 ? c.red : c.green, fontVariant: ["tabular-nums"] }} numberOfLines={1}>
                    {short(v)}
                  </T>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </Box>
  );
}
