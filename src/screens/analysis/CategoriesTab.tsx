// Aba Categorias da Análise (equivale a Categorias do Calen): rosca do mês, ocultas do gráfico,
// busca, "Por fatura", R$ ou %, ordem e um cartão por categoria com limite. Sub-abas Tags e Lugares.
import React, { useMemo, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useStore } from "../../app/store";
import { useNav } from "../../app/nav";
import { today } from "../../finance.mjs";
import { categoryList, donutCaption, tagTotals, merchantTotals } from "../../spending.mjs";
import { budgetUsage, normalizeBudget } from "../../analysis.mjs";
import { lookOf, tagColor } from "../../looks.mjs";
import { toInput } from "../../app/forms";
import Donut from "../../ui/Donut";
import CategoryIcon from "../../ui/CategoryIcon";
import { Choice, Toggle } from "../../ui/kit";
import { SheetModal } from "../../ui/Sheet";
import { useCalen, CText, CCard, CPills, CIconButton, CBar, CButton } from "../../ui/calen";
import CategoryTransactions from "./CategoryTransactions";

type Sub = "categories" | "tags" | "merchants";
type Sort = "value" | "name" | "low";
const SORT_LABEL: Record<Sort, string> = { value: "Maior valor", name: "Nome", low: "Menor valor" };

export default function CategoriesTab() {
  const { k, tint } = useCalen();
  const { state, show, perform } = useStore();
  const nav = useNav();
  const { month } = nav;
  const [sub, setSub] = useState<Sub>("categories");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [unit, setUnit] = useState<"money" | "percent">("money");
  const [byInvoice, setByInvoice] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [sort, setSort] = useState<Sort>("value");
  const [open, setOpen] = useState(""); // categoria cuja folha de lançamentos está aberta
  const [showHidden, setShowHidden] = useState(false);
  const [info, setInfo] = useState(false);
  const [options, setOptions] = useState(false);
  const hiddenNames: string[] = state.settings?.donutHidden || [];
  const data = useMemo(() => categoryList(state, month, { kind, hidden: hiddenNames, byInvoice, query, sort } as any), [state.transactions, state.customCategories, month, kind, hiddenNames.join("|"), byInvoice, query, sort]);
  const slices = useMemo(() => data.slices.map((s: any) => ({ name: s.name, fraction: s.fraction, color: lookOf(state, s.name).color, look: lookOf(state, s.name) })), [data, state.categoryLooks]);
  const budgets = useMemo(() => state.budgets.map(normalizeBudget).filter((b: any) => b.type === "expense" && b.categories.length === 1), [state.budgets]);
  const ref = today();
  const setHidden = (name: string, off: boolean) =>
    perform(
      (s: any) => {
        const cur: string[] = s.settings?.donutHidden || [];
        return { ...s, settings: { ...s.settings, donutHidden: off ? [...new Set([...cur, name])] : cur.filter((x) => x !== name) } };
      },
      off ? `${name} fora do gráfico` : `${name} no gráfico`,
    );
  const pct = (f: number) => (f * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
  const visibleRows = data.rows.filter((r: any) => !r.hidden);
  const hiddenRows = data.rows.filter((r: any) => r.hidden);
  const biggest = Math.max(1, ...data.rows.map((r: any) => r.cents));
  const limitOf = (name: string) => budgets.find((b: any) => b.categories[0] === name);
  const editLimit = (name: string) => {
    const b: any = limitOf(name);
    nav.push({ name: "form", kind: "budget", initial: b ? { ...b, budgetType: b.type, amount: toInput(b.amount), startDay: String(b.startDay) } : { name, category: name, categories: [name], cycle: "monthly", startDay: "1", budgetType: "expense" } });
  };

  const SubTabs = (
    <CPills<Sub>
      items={[
        ["categories", "Categorias"],
        ["tags", "Tags"],
        ["merchants", "Lugares"],
      ]}
      value={sub}
      onChange={setSub}
    />
  );

  if (sub === "merchants") {
    const mt = merchantTotals(state, month, kind);
    return (
      <View style={{ gap: 14 }}>
        {SubTabs}
        <CPills<"expense" | "income"> small items={[["expense", "Despesas"], ["income", "Receitas"]]} value={kind} onChange={setKind} />
        <CCard style={{ gap: 14 }}>
          {mt.rows.length ? (
            mt.rows.slice(0, 30).map((r: any) => (
              <View key={r.name} style={{ gap: 6 }} accessible accessibilityLabel={`${r.name}, ${show(r.cents)}, ${r.count} ${r.count === 1 ? "compra" : "compras"}`}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <CText numberOfLines={1} style={{ flex: 1 }}>
                    {r.name}
                  </CText>
                  <CText semi>{show(r.cents)}</CText>
                </View>
                <CBar value={r.cents} max={mt.rows[0].cents} color={k.primary} />
                <CText muted style={{ fontSize: 12 }}>
                  {r.count} {r.count === 1 ? "compra" : "compras"} · {Math.round(r.fraction * 100)}%
                </CText>
              </View>
            ))
          ) : (
            <CText muted>Sem lançamentos confirmados neste mês.</CText>
          )}
        </CCard>
        {mt.rows.length > 30 && (
          <CText muted style={{ fontSize: 12 }}>
            + {mt.rows.length - 30} lugares menores
          </CText>
        )}
      </View>
    );
  }

  if (sub === "tags") {
    const tg = tagTotals(state, month, kind);
    return (
      <View style={{ gap: 14 }}>
        {SubTabs}
        <CPills<"expense" | "income"> small items={[["expense", "Despesas"], ["income", "Receitas"]]} value={kind} onChange={setKind} />
        <CCard style={{ gap: 14 }}>
          {tg.noTags ? (
            <CText muted>Você ainda não criou tags. Use tags para separar viagens, casa ou projetos e ver o total de cada uma aqui.</CText>
          ) : tg.rows.length ? (
            tg.rows.map((r: any) => (
              <View key={r.id} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <CText numberOfLines={1} style={{ flex: 1 }}>
                    #{r.name}
                  </CText>
                  <CText semi>{show(r.cents)}</CText>
                </View>
                <CBar value={r.cents} max={tg.total} color={tagColor(state.tags.find((t: any) => t.id === r.id))} />
              </View>
            ))
          ) : (
            <CText muted>Nenhum lançamento com tag neste mês.</CText>
          )}
        </CCard>
        <CButton title="Gerenciar tags" icon="tag" onPress={() => nav.push({ name: "tool", id: "tags" })} />
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {SubTabs}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
        <CIconButton name={kind === "expense" ? "arrow-down" : "arrow-up"} label={kind === "expense" ? "Mostrando despesas. Trocar para receitas" : "Mostrando receitas. Trocar para despesas"} onPress={() => setKind(kind === "expense" ? "income" : "expense")} active />
        <CIconButton name="info" label="Como a rosca é calculada" onPress={() => setInfo(!info)} />
      </View>
      {info && (
        <CCard style={{ backgroundColor: tint(k.primary), borderColor: k.primary }}>
          <CText style={{ fontSize: 13 }}>
            A rosca soma o que foi confirmado no mês por categoria principal (subcategorias entram na principal). Transferências, pagamentos de fatura e itens ignorados ficam de fora. Categorias ocultas saem do gráfico, mas continuam na lista.
          </CText>
        </CCard>
      )}
      {data.isEmpty ? (
        <CText muted style={{ textAlign: "center", paddingVertical: 24 }}>
          {kind === "income" ? "Sem receitas confirmadas neste mês." : "Sem gastos categorizados neste mês."}
        </CText>
      ) : data.allHidden ? (
        <CText muted>Todas as categorias estão ocultas do gráfico. Mostre alguma na lista abaixo.</CText>
      ) : (
        <Donut
          slices={slices}
          total={data.total}
          center={(cents) => show(cents)}
          caption={donutCaption(data, ref)}
          label={`${kind === "income" ? "Receitas" : "Despesas"} do mês: ${show(data.total)} em ${data.count} categorias. ${data.slices.map((s: any) => `${s.name} ${pct(s.fraction)}`).join(", ")}`}
          onPress={(name) => setOpen(name)}
        />
      )}
      {hiddenRows.length > 0 && (
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showHidden }} onPress={() => setShowHidden(!showHidden)} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }}>
          <CText semi style={{ fontSize: 16 }}>
            Ocultos do gráfico
          </CText>
          <View style={{ minWidth: 24, height: 24, borderRadius: 12, backgroundColor: k.soft, alignItems: "center", justifyContent: "center" }}>
            <CText style={{ fontSize: 12 }}>{hiddenRows.length}</CText>
          </View>
          <Feather name={showHidden ? "chevron-up" : "chevron-down"} size={18} color={k.muted} />
        </Pressable>
      )}
      {showHidden &&
        hiddenRows.map((r: any) => (
          <View key={r.name} style={{ flexDirection: "row", alignItems: "center", gap: 12, opacity: 0.7 }}>
            <CategoryIcon look={lookOf(state, r.name)} size={36} />
            <CText style={{ flex: 1 }}>
              {r.name} · {show(r.cents)}
            </CText>
            <Pressable accessibilityRole="button" onPress={() => setHidden(r.name, false)} style={{ minHeight: 44, justifyContent: "center" }}>
              <CText semi color={k.primaryText} style={{ fontSize: 13 }}>
                Mostrar
              </CText>
            </Pressable>
          </View>
        ))}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <CIconButton name="search" label="Buscar categoria" onPress={() => setSearching(!searching)} active={searching || !!query} />
        <View style={{ flex: 1 }} />
        <CIconButton name="more-horizontal" label="Opções das categorias" onPress={() => setOptions(true)} />
        {options && <SheetModal title="Opções das categorias" onClose={() => setOptions(false)}>
          <View style={{ padding: 16, gap: 14 }}>
            <Choice<Sort> label="Ordenar por" values={[["value", SORT_LABEL.value], ["name", SORT_LABEL.name], ["low", SORT_LABEL.low]]} value={sort} onChange={setSort} />
            <Choice<"money" | "percent"> label="Exibir" values={[["money", "Valor"], ["percent", "Percentual"]]} value={unit} onChange={setUnit} />
            <Toggle label="Por fatura" hint="Compras no cartão contam no mês da fatura." value={byInvoice} onChange={setByInvoice} />
          </View>
        </SheetModal>}
      </View>
      {(searching || !!query) && (
        <TextInput
          accessibilityLabel="Buscar categoria"
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar categoria…"
          placeholderTextColor={k.subtle}
          autoFocus={searching && !query}
          style={{ minHeight: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: k.soft, color: k.text }}
        />
      )}
      <CText muted style={{ fontSize: 12 }}>
        Ordem: {SORT_LABEL[sort]}
      </CText>
      {visibleRows.map((r: any) => {
        const look = lookOf(state, r.name);
        const b: any = limitOf(r.name);
        const use = b ? budgetUsage(state, b, ref) : null;
        return (
          <CCard key={r.name} style={{ gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityHint="Abre os lançamentos desta categoria" accessibilityLabel={`${r.name}, ${show(r.cents)}, ${pct(r.fraction)}`} onPress={() => setOpen(r.name)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <CategoryIcon look={look} size={44} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <CText semi numberOfLines={1} style={{ flex: 1 }}>
                    {r.name}
                  </CText>
                  <CText semi style={{ fontVariant: ["tabular-nums"] }}>
                    {unit === "money" ? show(r.cents) : pct(r.fraction)}
                  </CText>
                </View>
                <CBar value={use ? use.used : r.cents} max={use ? use.limit : biggest} color={use && use.used > use.limit ? k.danger : look.color} />
                <CText muted style={{ fontSize: 12 }}>
                  {use ? `${show(use.used)} de ${show(use.limit)} · ${Math.round(use.ratio * 100)}%` : "Sem limite definido"}
                </CText>
              </View>
              <CIconButton name="edit-2" label={`${b ? "Editar" : "Definir"} limite de ${r.name}`} onPress={() => editLimit(r.name)} />
            </Pressable>
          </CCard>
        );
      })}
      {!visibleRows.length && !!query && <CText muted>Nenhuma categoria encontrada.</CText>}
      <Pressable accessibilityRole="button" onPress={() => nav.push({ name: "tool", id: "categories" })} style={{ minHeight: 56, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: k.line, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 }}>
        <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: tint(k.primary), alignItems: "center", justifyContent: "center" }}>
          <Feather name="plus" size={18} color={k.primaryText} />
        </View>
        <CText semi color={k.primaryText}>
          Nova categoria
        </CText>
      </Pressable>
      {!!open && <CategoryTransactions month={month} name={open} kind={kind} byInvoice={byInvoice} hidden={hiddenNames.includes(open)} onHide={(off) => setHidden(open, off)} onClose={() => setOpen("")} />}
    </View>
  );
}
