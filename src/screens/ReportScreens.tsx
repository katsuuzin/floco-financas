// F4: Projeções (P4–P6) e relatórios avançados (R3–R10), livres.
import React, { useMemo, useState } from "react";
import { View, Alert } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { T, Muted, Box, Section, Button, Chips, Field, MoneyField, ListItem, Progress, styles as k } from "../ui/kit";
import { DateField } from "../ui/DateTime";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { today, monthKey, addMonths, money, parseMoney } from "../finance.mjs";
import { projection, report } from "../planning.mjs";
import {
  mediumTerm, cashFlow, topCategory, categoryNet, comparePeriods, previousPeriod, invoiceReport,
  budgetVsActual, monthlyByAccount, counts,
} from "../analysis.mjs";
import MonthBar, { monthLabel } from "./MonthBar";

const br = (d: string) => d.split("-").reverse().join("/");
const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate();
const monthRange = (m: string) => ({ start: `${m}-01`, end: `${m}-${pad(lastDay(m))}` });
const shortMonth = (m: string) =>
  new Date(m + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
const signed = (show: (n: number) => string, n: number) => (n < 0 ? "−" : "+") + show(Math.abs(n));

type Period = "month" | "year" | "custom";
function usePeriod() {
  const { month } = useNav();
  const [kind, setKind] = useState<Period>("month");
  const [custom, setCustom] = useState({ start: `${month}-01`, end: today() });
  const range =
    kind === "month"
      ? monthRange(month)
      : kind === "year"
        ? { start: `${month.slice(0, 4)}-01-01`, end: `${month.slice(0, 4)}-12-31` }
        : custom;
  const picker = (
    <>
      <Chips
        values={[
          ["month", "Mês"],
          ["year", "Ano"],
          ["custom", "Personalizado"],
        ]}
        value={kind}
        onChange={setKind}
      />
      {kind === "custom" ? (
        <View style={[k.row, { alignItems: "flex-start" }]}>
          <View style={{ flex: 1 }}>
            <DateField label="De" value={custom.start} onChange={(v) => setCustom({ ...custom, start: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <DateField label="Até" value={custom.end} onChange={(v) => setCustom({ ...custom, end: v })} />
          </View>
        </View>
      ) : (
        <MonthBar />
      )}
    </>
  );
  return { range, picker, kind };
}

export function ReportsScreen() {
  const nav = useNav();
  const items: [string, string, any, any][] = [
    ["Relatório personalizado", "Período, situação, contas, categorias, tags e agrupamento", "sliders", { name: "tool", id: "reports" }],
    ["Fluxo de caixa", "Entradas, saídas e acumulado mês a mês", "activity", { name: "report", id: "cashflow" }],
    ["Resultado por categoria", "Entradas, saídas e saldo por categoria", "layers", { name: "report", id: "categories" }],
    ["Comparar períodos", "Mês, ano ou intervalo contra o anterior", "columns", { name: "report", id: "compare" }],
    ["Relatório de faturas", "Total por cartão, categoria ou tag", "credit-card", { name: "report", id: "invoices" }],
    ["Previsto × realizado", "Orçado contra gasto, mês a mês", "target", { name: "report", id: "budget" }],
    ["Dia da semana e fixas × variáveis", "Onde e como você gasta", "calendar", { name: "report", id: "patterns" }],
    ["Exportar", "PDF do período e planilhas CSV", "share", { name: "report", id: "export" }],
  ];
  return (
    <>
      {items.map(([label, detail, icon, route]) => (
        <ListItem key={label} icon={icon} label={label} detail={detail} onPress={() => nav.push(route)} />
      ))}
    </>
  );
}

export function ReportScreen({ id }: { id: string }) {
  if (id === "cashflow") return <CashFlow />;
  if (id === "categories") return <CategoryNet />;
  if (id === "compare") return <Compare />;
  if (id === "invoices") return <Invoices />;
  if (id === "budget") return <BudgetActual />;
  if (id === "patterns") return <Patterns />;
  if (id === "export") return <Export />;
  return null;
}

function Bars({ rows }: { rows: { label: string; value: number; color?: string }[] }) {
  const { show } = useStore();
  const peak = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <>
      {rows.map((r) => (
        <View key={r.label} style={{ marginBottom: 10, gap: 4 }}>
          <View style={[k.row, { justifyContent: "space-between" }]}>
            <T style={{ flex: 1 }}>{r.label}</T>
            <T style={{ fontFamily: "SoraSemi", color: r.color }}>{show(r.value)}</T>
          </View>
          <Progress value={Math.abs(r.value)} max={peak} color={r.color} />
        </View>
      ))}
    </>
  );
}

function CashFlow() {
  const { c } = useTheme();
  const { state, show } = useStore();
  const { month } = useNav();
  const [forecast, setForecast] = useState(true);
  const year = Number(month.slice(0, 4));
  const f = useMemo(() => cashFlow(state, year, { forecast }), [state, year, forecast]);
  const top = f.worst ? topCategory(state, f.worst.month) : null;
  return (
    <>
      <MonthBar />
      <Chips
        values={[
          ["yes", "Com previstos"],
          ["no", "Só realizados"],
        ]}
        value={forecast ? "yes" : "no"}
        onChange={(v) => setForecast(v === "yes")}
      />
      <Box>
        <Muted>{forecast ? "Resultado do ano, se nada mudar" : "Resultado realizado no ano"}</Muted>
        <T style={[k.balanceValue, { fontSize: 28, color: f.total < 0 ? c.red : c.green }]}>{signed(show, f.total)}</T>
        {f.worst && f.worst.net < 0 && (
          <Muted>
            {monthLabel(f.worst.month as string)} é o mês que mais tira ({show(Math.abs(f.worst.net))})
            {top ? ` · ${top[0]} pesa mais` : ""}.
          </Muted>
        )}
      </Box>
      <Section title={`Mês a mês · ${year}`} />
      <Box>
        <View style={[k.row, { marginBottom: 8 }]}>
          <Muted style={{ width: 40 }}> </Muted>
          <Muted style={{ flex: 1, textAlign: "right" }}>Entrou</Muted>
          <Muted style={{ flex: 1, textAlign: "right" }}>Saiu</Muted>
          <Muted style={{ flex: 1, textAlign: "right" }}>Acumulado</Muted>
        </View>
        {f.rows.map((r: any) => (
          <View key={r.month} style={[k.row, { marginBottom: 6 }]}>
            <Muted style={{ width: 40 }}>{shortMonth(r.month)}</Muted>
            <T style={{ flex: 1, textAlign: "right", fontSize: 12, color: c.green }}>{show(r.totalIncome)}</T>
            <T style={{ flex: 1, textAlign: "right", fontSize: 12 }}>{show(r.totalExpense)}</T>
            <T style={{ flex: 1, textAlign: "right", fontSize: 12, color: r.cumulative < 0 ? c.red : c.text }}>{signed(show, r.cumulative)}</T>
          </View>
        ))}
      </Box>
      <Muted>Compras no cartão entram pelo mês da fatura. Com previstos, soma pendências e recorrências que vencem no período.</Muted>
    </>
  );
}

function CategoryNet() {
  const { c } = useTheme();
  const { state, show } = useStore();
  const { range, picker } = usePeriod();
  let rows: any[] = [];
  try {
    rows = categoryNet(state, range.start, range.end);
  } catch {}
  return (
    <>
      {picker}
      <Box>
        {rows.length ? (
          rows.map((r) => (
            <View key={r.category} style={[k.row, k.hairline, { borderBottomColor: c.line, paddingVertical: 10 }]}>
              <T style={{ flex: 1 }}>{r.category}</T>
              <View style={{ alignItems: "flex-end" }}>
                <T style={{ fontFamily: "SoraSemi", color: r.net < 0 ? c.red : c.green }}>{signed(show, r.net)}</T>
                <Muted style={{ fontSize: 12 }}>
                  +{show(r.income)} · −{show(r.expense)}
                </Muted>
              </View>
            </View>
          ))
        ) : (
          <Muted>Sem lançamentos confirmados no período.</Muted>
        )}
      </Box>
    </>
  );
}

function Compare() {
  const { c } = useTheme();
  const { state, show } = useStore();
  const { range, picker } = usePeriod();
  let cmp: any = null;
  try {
    cmp = comparePeriods(state, range, previousPeriod(range.start, range.end));
  } catch {}
  if (!cmp) return picker;
  const prev = previousPeriod(range.start, range.end);
  const col = (label: string, a: number, b: number, good: "up" | "down") => {
    const diff = a - b;
    const better = good === "up" ? diff >= 0 : diff <= 0;
    return (
      <View style={k.flex}>
        <Muted>{label}</Muted>
        <T style={{ fontFamily: "SoraSemi" }}>{show(a)}</T>
        <Muted style={{ color: diff ? (better ? c.green : c.red) : c.muted }}>{signed(show, diff)}</Muted>
      </View>
    );
  };
  return (
    <>
      {picker}
      <Muted>
        {br(range.start)}–{br(range.end)} contra {br(prev.start)}–{br(prev.end)}
      </Muted>
      <Box>
        <View style={k.row}>
          {col("Entradas", cmp.current.income, cmp.previous.income, "up")}
          {col("Saídas", cmp.current.expense, cmp.previous.expense, "down")}
          {col("Resultado", cmp.current.result, cmp.previous.result, "up")}
        </View>
      </Box>
      <Section title="Despesas por categoria" />
      <Box>
        {cmp.categories.map((r: any) => (
          <View key={r.category} style={[k.row, k.hairline, { borderBottomColor: c.line, paddingVertical: 8 }]}>
            <T style={{ flex: 1 }}>{r.category}</T>
            <Muted style={{ width: 90, textAlign: "right" }}>{show(r.previous)}</Muted>
            <T style={{ width: 90, textAlign: "right" }}>{show(r.current)}</T>
            <T style={{ width: 90, textAlign: "right", color: r.diff > 0 ? c.red : c.green }}>{signed(show, r.diff)}</T>
          </View>
        ))}
        {!cmp.categories.length && <Muted>Sem despesas nos dois períodos.</Muted>}
      </Box>
    </>
  );
}

function Invoices() {
  const { state, show } = useStore();
  const { month } = useNav();
  const [group, setGroup] = useState<"card" | "category" | "tag">("card");
  const r = invoiceReport(state, month, { group });
  return (
    <>
      <MonthBar />
      <Chips
        values={[
          ["card", "Por cartão"],
          ["category", "Por categoria"],
          ["tag", "Por tag"],
        ]}
        value={group}
        onChange={setGroup}
      />
      <Box>
        <Muted>Total das faturas de {monthLabel(month).toLowerCase()}</Muted>
        <T style={[k.balanceValue, { fontSize: 28 }]}>{show(r.total)}</T>
        <Muted>{r.count} itens</Muted>
      </Box>
      <Box>{r.groups.length ? <Bars rows={r.groups.map((g: any) => ({ label: g.name, value: g.value }))} /> : <Muted>Nenhuma compra nas faturas deste mês.</Muted>}</Box>
    </>
  );
}

function BudgetActual() {
  const { c } = useTheme();
  const { state, show } = useStore();
  const { month } = useNav();
  const rows = budgetVsActual(state, month, 6);
  if (!state.budgets.length) return <Muted>Crie um orçamento para comparar o planejado com o gasto.</Muted>;
  return (
    <>
      <MonthBar />
      {rows.map((r: any) => (
        <Box key={r.month}>
          <View style={[k.row, { justifyContent: "space-between" }]}>
            <T style={{ fontFamily: "SoraSemi" }}>{monthLabel(r.month)}</T>
            <T style={{ color: r.diff < 0 ? c.red : c.green }}>{r.diff < 0 ? `${show(-r.diff)} acima` : `${show(r.diff)} abaixo`}</T>
          </View>
          <Muted style={{ marginVertical: 6 }}>
            Gasto {show(r.actual)} de {show(r.planned)} planejados
          </Muted>
          <Progress value={r.actual} max={r.planned} color={r.actual > r.planned ? c.red : undefined} />
        </Box>
      ))}
    </>
  );
}

function Patterns() {
  const { state } = useStore();
  const { range, picker } = usePeriod();
  let week: any = null,
    fixed: any = null;
  try {
    week = report(state, { ...range, type: "expense", group: "weekday" });
    fixed = report(state, { ...range, type: "expense", group: "fixed" });
  } catch {}
  const order = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return (
    <>
      {picker}
      <Section title="Despesas por dia da semana" />
      <Box>
        {week && (
          <Bars
            rows={order.map((d) => ({ label: d, value: week.groups.find((g: any) => g.name === d)?.expense || 0 }))}
          />
        )}
      </Box>
      <Section title="Fixas × variáveis" />
      <Box>{fixed && <Bars rows={fixed.groups.map((g: any) => ({ label: g.name, value: g.expense }))} />}</Box>
      <Muted>Fixas são lançamentos vindos de recorrências e contratos; o resto é variável.</Muted>
    </>
  );
}

const csv = (rows: any[][]) =>
  "﻿" + rows.map((r) => r.map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(";")).join("\r\n");
const brl = (n: number) => (n / 100).toFixed(2).replace(".", ",");
async function share(name: string, content: string, mime: string) {
  const path = FileSystem.cacheDirectory + name;
  await FileSystem.writeAsStringAsync(path, content);
  await Sharing.shareAsync(path, { mimeType: mime, dialogTitle: name });
}

export function periodHtml(state: any, range: { start: string; end: string }) {
  const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);
  const tx = state.transactions
    .filter((t: any) => counts(t) && t.date >= range.start && t.date <= range.end)
    .sort((a: any, b: any) => a.date.localeCompare(b.date));
  const cats = categoryNet(state, range.start, range.end);
  const accounts = monthlyByAccount(state, range.start, range.end);
  const income = cats.reduce((n: number, r: any) => n + r.income, 0);
  const expense = cats.reduce((n: number, r: any) => n + r.expense, 0);
  const row = (cells: any[]) => "<tr>" + cells.map((c) => `<td>${esc(c)}</td>`).join("") + "</tr>";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:sans-serif;color:#311E0D;font-size:11px;margin:24px}h1{font-size:20px}h2{font-size:14px;margin-top:22px}
    table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #E4D6C8;padding:4px;text-align:left}td:last-child,th:last-child{text-align:right}
    .k{display:inline-block;margin-right:24px}</style></head><body>
    <h1>Floco Finanças · relatório</h1><p>${br(range.start)} a ${br(range.end)} · gerado em ${br(today())}</p>
    <p><span class="k">Receitas <b>${money(income)}</b></span><span class="k">Despesas <b>${money(expense)}</b></span><span class="k">Resultado <b>${money(income - expense)}</b></span></p>
    <h2>Por categoria</h2><table><tr><th>Categoria</th><th>Entradas</th><th>Saídas</th><th>Resultado</th></tr>
    ${cats.map((r: any) => row([r.category, money(r.income), money(r.expense), money(r.net)])).join("")}</table>
    <h2>Por conta e mês</h2><table><tr><th>Mês</th><th>Conta/cartão</th><th>Entradas</th><th>Saídas</th></tr>
    ${accounts.map((r: any) => row([r.month, r.account, money(r.income), money(r.expense)])).join("")}</table>
    <h2>Lançamentos</h2><table><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Situação</th><th>Valor</th></tr>
    ${tx.map((t: any) => row([br(t.date), t.description, t.category, t.confirmed ? "Efetivado" : "Pendente", (t.type === "income" || t.refund ? "+" : "−") + money(t.amount)])).join("")}</table>
    </body></html>`;
}

function Export() {
  const { state } = useStore();
  const { range, picker } = usePeriod();
  const [busy, setBusy] = useState("");
  const run = async (kind: string, fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e: any) {
      Alert.alert("Falha na exportação", e.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      {picker}
      <Button
        title={busy === "pdf" ? "Gerando…" : "Relatório PDF do período"}
        icon="file"
        disabled={!!busy}
        onPress={() =>
          run("pdf", async () => {
            const { uri } = await Print.printToFileAsync({ html: periodHtml(state, range) });
            await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Relatório do Floco" });
          })
        }
      />
      <Muted>Resumo com totais, categorias, contas por mês e lançamentos.</Muted>
      <Button
        title="Planilha mensal por conta (CSV)"
        icon="grid"
        secondary
        disabled={!!busy}
        onPress={() =>
          run("acc", () =>
            share(
              "floco-por-conta.csv",
              csv([["Mês", "Conta/cartão", "Receitas", "Despesas"], ...monthlyByAccount(state, range.start, range.end).map((r: any) => [r.month, r.account, brl(r.income), brl(r.expense)])]),
              "text/csv",
            ),
          )
        }
      />
      <Button
        title="Todas as transações do período (CSV)"
        icon="list"
        secondary
        disabled={!!busy}
        onPress={() =>
          run("tx", () =>
            share(
              "floco-transacoes.csv",
              csv([
                ["Data", "Hora", "Descrição", "Tipo", "Valor", "Categoria", "Conta", "Cartão", "Situação", "Observações"],
                ...state.transactions
                  .filter((t: any) => t.date >= range.start && t.date <= range.end)
                  .map((t: any) => [
                    br(t.date),
                    t.time || "",
                    t.description,
                    t.type === "income" ? "Receita" : t.type === "transfer" ? "Transferência" : t.refund ? "Estorno" : "Despesa",
                    brl(t.amount),
                    t.category,
                    state.accounts.find((a: any) => a.id === t.accountId)?.name,
                    state.cards.find((x: any) => x.id === t.cardId)?.name,
                    t.confirmed ? "Efetivado" : "Pendente",
                    t.notes || "",
                  ]),
              ]),
              "text/csv",
            ),
          )
        }
      />
      <Muted>CSV com separador “;”, no padrão brasileiro: abre direto no Excel ou no Google Planilhas. Nada sai do aparelho sem você compartilhar.</Muted>
    </>
  );
}

// ---------- Projeções (P4–P6) ----------
export function ProjectionsScreen() {
  const { c } = useTheme();
  const { state, show } = useStore();
  const [view, setView] = useState<"short" | "medium" | "whatif">("short");
  const [days, setDays] = useState<"30" | "60" | "90">("30");
  const [months, setMonths] = useState<"3" | "6" | "12">("6");
  const [cut, setCut] = useState("");
  const [horizon, setHorizon] = useState<"6" | "12" | "24">("12");
  const from = today();
  const short = useMemo(() => {
    const d = new Date(from + "T12:00:00");
    d.setDate(d.getDate() + Number(days));
    const through = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return projection(state, through, { from });
  }, [state, days, from]);
  const minRow = short.rows.reduce((a: any, r: any) => (!a || r.balance < a.balance ? r : a), null);
  const medium = useMemo(() => mediumTerm(state, Number(months), from), [state, months, from]);
  let scenario: any = null;
  try {
    const value = cut.trim() ? parseMoney(cut) : 0;
    const base = mediumTerm(state, Number(horizon), from);
    scenario = base.rows.map((r: any, i: number) => ({ ...r, with: r.estimated + value * (i + 1) }));
  } catch {}
  const peak = Math.max(1, ...medium.rows.map((r: any) => Math.abs(r.estimated)), Math.abs(medium.initial));
  return (
    <>
      <Chips
        values={[
          ["short", "Curto prazo"],
          ["medium", "Médio prazo"],
          ["whatif", "Cenário"],
        ]}
        value={view}
        onChange={setView}
      />
      {view === "short" && (
        <>
          <Chips
            values={[
              ["30", "30 dias"],
              ["60", "60 dias"],
              ["90", "90 dias"],
            ]}
            value={days}
            onChange={setDays}
          />
          <Box>
            <Muted>Saldo previsto em {days} dias</Muted>
            <T style={[k.balanceValue, { fontSize: 28, color: short.final < 0 ? c.red : c.text }]}>{signed(show, short.final)}</T>
            {short.min !== short.final && <Muted>
              Menor folga: {signed(show, short.min)}
              {minRow ? ` em ${br(minRow.date)}` : ""}
              {short.min < 0 ? " · o saldo fica negativo no período" : ""}
            </Muted>}
          </Box>
          <Section title="O que acontece no período" />
          <Box>
            {short.rows.length ? (
              short.rows.slice(0, 80).map((r: any, i: number) => (
                <View key={i} style={[k.row, { marginBottom: 6 }]}>
                  <Muted style={{ width: 52 }}>{br(r.date).slice(0, 5)}</Muted>
                  <T style={{ flex: 1, fontSize: 12 }} numberOfLines={1}>
                    {r.description}
                  </T>
                  <T style={{ fontSize: 12, color: r.amount < 0 ? c.text : c.green }}>{signed(show, r.amount)}</T>
                </View>
              ))
            ) : (
              <Muted>Nenhum vencimento, recorrência ou pendência no período.</Muted>
            )}
          </Box>
          <Muted>Soma ao saldo de hoje tudo o que já está agendado: recorrências, faturas em aberto e lançamentos pendentes das contas incluídas.</Muted>
        </>
      )}
      {view === "medium" && (
        <>
          <Chips
            values={[
              ["3", "3 meses"],
              ["6", "6 meses"],
              ["12", "12 meses"],
            ]}
            value={months}
            onChange={setMonths}
          />
          <Box>
            <Muted>Mantendo o ritmo atual</Muted>
            <T style={[k.balanceValue, { fontSize: 26 }]}>{signed(show, medium.rows[medium.rows.length - 1]?.estimated ?? medium.initial)}</T>
            <Muted>
              {medium.firstNegative ? `Fica no vermelho a partir de ${monthLabel(medium.firstNegative).toLowerCase()}. ` : ""}
              {Math.round(medium.contractedShare * 100)}% da variação já está contratada.
            </Muted>
          </Box>
          <Box>
            {medium.rows.map((r: any) => (
              <View key={r.month} style={{ marginBottom: 10, gap: 4 }}>
                <View style={[k.row, { justifyContent: "space-between" }]}>
                  <T>{monthLabel(r.month)}</T>
                  <T style={{ fontFamily: "SoraSemi", color: r.estimated < 0 ? c.red : c.text }}>{signed(show, r.estimated)}</T>
                </View>
                <Progress value={Math.abs(r.estimated)} max={peak} color={r.estimated < 0 ? c.red : undefined} />
                <Muted style={{ fontSize: 12 }}>Contratado {signed(show, r.contracted)}</Muted>
              </View>
            ))}
          </Box>
          <Muted>
            Contratado: saldo de hoje mais pendências, recorrências, faturas e parcelas. Estimado: soma o ritmo avulso médio dos últimos 3 meses (
            {signed(show, medium.rhythm.net)} por mês).
          </Muted>
        </>
      )}
      {view === "whatif" && (
        <>
          <MoneyField label="E se você economizasse por mês?" value={cut} onChange={setCut} placeholder="200,00" hint="Use um valor para ver como a trajetória muda. Nada é gravado." />
          <Chips
            values={[
              ["6", "6 meses"],
              ["12", "12 meses"],
              ["24", "24 meses"],
            ]}
            value={horizon}
            onChange={setHorizon}
          />
          {scenario && (
            <Box>
              {scenario.map((r: any) => (
                <View key={r.month} style={[k.row, { marginBottom: 6 }]}>
                  <Muted style={{ width: 56 }}>{shortMonth(r.month)}</Muted>
                  <Muted style={{ flex: 1, textAlign: "right" }}>{signed(show, r.estimated)}</Muted>
                  <T style={{ flex: 1, textAlign: "right", fontFamily: "SoraSemi", color: r.with < 0 ? c.red : c.green }}>{signed(show, r.with)}</T>
                </View>
              ))}
              <Muted style={{ marginTop: 8 }}>À esquerda, o ritmo atual; à direita, com a economia.</Muted>
            </Box>
          )}
        </>
      )}
    </>
  );
}
