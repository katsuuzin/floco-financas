import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNav } from "./app/nav";
import Feather from "@expo/vector-icons/Feather";
import { subsOf } from "./categories.mjs";
import CategoryIcon from "./ui/CategoryIcon";
import { DateField, Segmented } from "./ui/kit";
import { brDate } from "./dates.mjs";
import { CALEN_PREFIX } from "./looks.mjs";
import { ALLOWED_COLORS, ALLOWED_ICONS, defaultStyleFor, readableOn, sanitizeStyle } from "./categoryStyle.mjs";
import { categoryStyleOf, tagStyleOf } from "./ui/CategoryIcon";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  today,
  money,
  addMonths,
  monthKey,
  spent,
  uid,
} from "./finance.mjs";
import {
  categoryNames,
  saveLabel,
  removeLabel,
  report,
} from "./planning.mjs";

const decimal = (n: number) => (n / 100).toFixed(2).replace(".", ",");
function Txt({
  c,
  children,
  muted = false,
  bold = false,
  style,
  ...rest
}: any) {
  return (
    <Text
      {...rest}
      style={[
        {
          color: muted ? c.muted : c.text,
          fontFamily: bold ? "SoraSemi" : "Sora",
          fontSize: 15,
          lineHeight: 23,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
function Action({
  c,
  title,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
}: any) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        padding: 13,
        borderRadius: 16,
        marginVertical: 5,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: secondary ? c.soft : c.primary,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      <Txt
        c={c}
        bold
        style={{ color: danger ? c.red : secondary ? c.text : c.onPrimary }}
      >
        {title}
      </Txt>
    </Pressable>
  );
}
function Field({ c, label, value, onChange, number = false, hint }: any) {
  return (
    <View style={{ marginVertical: 9 }}>
      <Txt c={c} bold>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        value={String(value ?? "")}
        onChangeText={onChange}
        keyboardType={number ? "decimal-pad" : "default"}
        autoCapitalize="sentences"
        style={{
          minHeight: 50,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 14,
          padding: 13,
          color: c.text,
          fontFamily: "Sora",
          fontSize: 16,
          backgroundColor: c.surface,
        }}
      />
      {hint && (
        <Txt c={c} muted style={{ fontSize: 12 }}>
          {hint}
        </Txt>
      )}
    </View>
  );
}
function Options({ c, label, values, value, onChange, multiple = false }: any) {
  return (
    <View style={{ marginVertical: 9 }}>
      <Txt c={c} bold>
        {label}
      </Txt>
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 7 }}
      >
        {values.map(([id, name]: any) => {
          const selected = multiple ? (value || []).includes(id) : id === value;
          return (
            <Pressable
              key={id}
              accessibilityRole={multiple ? "checkbox" : "radio"}
              accessibilityState={{ checked: selected }}
              onPress={() =>
                onChange(
                  multiple
                    ? selected
                      ? value.filter((v: string) => v !== id)
                      : [...(value || []), id]
                    : id,
                )
              }
              style={({ pressed }) => ({
                minHeight: 48,
                borderRadius: 13,
                borderWidth: 1,
                borderColor: selected ? c.primary : c.line,
                backgroundColor: selected ? c.soft : c.surface,
                padding: 12,
                opacity: pressed ? 0.7 : 1,
                maxWidth: "100%",
              })}
            >
              <Txt c={c} style={{ fontSize: 13 }}>
                {selected ? "✓ " : ""}
                {name}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
// O4/O5: escolha de cor (e ícone, para categorias). Cada opção tem nome falado.
const iconNames: Record<string, string> = {
  tag: "Etiqueta", "shopping-cart": "Carrinho", "shopping-bag": "Sacola", "credit-card": "Cartão",
  "dollar-sign": "Dinheiro", "trending-up": "Rendimento", briefcase: "Trabalho", grid: "Casa",
  bookmark: "Marcador", clipboard: "Prancheta", target: "Meta", shuffle: "Transporte", shield: "Proteção",
  zap: "Energia", "file-text": "Documento", "check-circle": "Confirmação",
};
const colorNames = ["Amarelo intenso", "Amarelo solar", "Marrom", "Laranja", "Azul", "Lilás", "Rosa", "Turquesa",
  "Verde", "Vermelho", "Grafite", "Branco"];

function LookPicker({ c, icon, color, onIcon, onColor }: any) {
  const current = sanitizeStyle({ icon, color });
  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
      <View style={{ alignSelf: "flex-start", padding: 12, gap: 8, flexDirection: "row",
        alignItems: "center", borderRadius: 12, backgroundColor: current.color }}>
        <Feather name={current.icon as any} size={20} color={readableOn(current.color)} />
        <Txt c={c} style={{ color: readableOn(current.color) }}>Prévia</Txt>
      </View>
      <Txt c={c} bold>Ícone</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ALLOWED_ICONS.map((value) => <Pressable key={value} accessibilityRole="radio"
          accessibilityState={{ checked: value === current.icon }} accessibilityLabel={iconNames[value]}
          onPress={() => onIcon(value)} style={{ width: 48, minHeight: 48, alignItems: "center", justifyContent: "center",
            borderRadius: 12, backgroundColor: value === current.icon ? c.primary : c.soft }}>
          <Feather name={value as any} size={20} color={value === current.icon ? c.onPrimary : c.text} />
        </Pressable>)}
      </View>
      <Txt c={c} bold>Cor</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ALLOWED_COLORS.map((value, index) => <Pressable key={value} accessibilityRole="radio"
          accessibilityState={{ checked: value === current.color }} accessibilityLabel={colorNames[index]}
          onPress={() => onColor(value)} style={{ width: 48, minHeight: 48, alignItems: "center", justifyContent: "center",
            borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: value }}>
          {value === current.color && <Feather name="check" size={20} color={readableOn(value)} />}
        </Pressable>)}
      </View>
    </View>
  );
}

function LookBadge({ icon, color, image }: any) {
  const chosen = typeof icon === "string" && icon.startsWith(CALEN_PREFIX);
  return <CategoryIcon look={{ icon: chosen ? "tag" : icon, color, image: chosen ? icon.slice(CALEN_PREFIX.length) : image }} size={36} />;
}
function Card({ c, children }: any) {
  return (
    <View
      style={{
        padding: 18,
        borderRadius: 20,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.line,
        marginVertical: 7,
        gap: 6,
      }}
    >
      {children}
    </View>
  );
}
export default function PlanningPanel({
  state: s,
  c,
  initial,
  onChange,
}: any) {
  const [page, setPage] = useState(initial),
    [form, setForm] = useState<any>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    start: monthKey(today()) + "-01",
    end: (() => {
      const d = new Date(
        addMonths(monthKey(today()) + "-01", 1) + "T12:00:00Z",
      );
      d.setUTCDate(d.getUTCDate() - 1);
      return d.toISOString().slice(0, 10);
    })(),
    status: "all",
    type: "all",
    accountId: "",
    category: "",
    tag: "",
    group: "category",
  });
  const [result, setResult] = useState<any>(null);
  const { registerBackGuard } = useNav();
  const editing = !!form;
  useEffect(() => registerBackGuard(() => {
    if (busy) return true;
    if (!editing) return false;
    setForm(null);
    setError("");
    return true;
  }), [registerBackGuard, editing, busy]);
  const cash = (n: number) => (s.settings.hide ? "R$ ••••" : money(n));
  const names = categoryNames(s);
  const accounts = s.accounts.map((a: any) => [a.id, a.name]);
  const field = (key: string, label: string, number = false, hint?: string) =>
    label.includes("AAAA-MM-DD") ? (
      <DateField
        key={key}
        label={label.replace(/\s*\(AAAA-MM-DD\)/, "")}
        optional={/opcional/i.test(label)}
        value={form?.[key] || ""}
        onChange={(v: string) => setForm({ ...form, [key]: v })}
      />
    ) : (
    <Field
      key={key}
      c={c}
      label={label}
      value={form?.[key]}
      onChange={(v: string) => setForm({ ...form, [key]: v })}
      number={number}
      hint={hint}
    />
    );
  const choose = (key: string, label: string, values: any) => (
    <Options
      key={key}
      c={c}
      label={label}
      values={values}
      value={form?.[key]}
      onChange={(v: string) => setForm({ ...form, [key]: v })}
    />
  );
  const open = (kind: string, data: any = {}) => {
    setError("");
    setMessage("");
    setForm({
      kind,
      name: "",
      description: "",
      amount: "",
      date: today(),
      dueDate: "",
      person: "",
      frequency: "monthly",
      endDate: "",
      type: "expense",
      category: "Outros",
      accountId: s.accounts[0]?.id || "",
      count: "12",
      paid: "0",
      institution: "",
      parent: "",
      ...data,
    });
  };
  const run = async (fn: any, success = "Salvo no aparelho") => {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      const ok = await onChange(fn, success);
      if (ok) {
        setMessage(success);
        return true;
      }
      return false;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (busy) return;
    try {
      const f = form;
      let change: any;
      if (f.kind === "category" || f.kind === "tag")
        change = (s: any) => {
          let n = saveLabel(s, f.kind === "tag" ? "tags" : "customCategories", f);
          const name = f.name.trim();
          if (f.kind === "category" && (f.lookIcon || f.lookColor)) {
            const style = sanitizeStyle({ ...categoryStyleOf(n, name), ...(f.lookIcon && { icon: f.lookIcon }), ...(f.lookColor && { color: f.lookColor }) });
            n = { ...n, categoryLooks: { ...n.categoryLooks, [name]: style } };
          }
          if (f.kind === "tag" && (f.lookIcon || f.lookColor)) {
            const style = sanitizeStyle({ ...tagStyleOf(f), ...(f.lookIcon && { icon: f.lookIcon }), ...(f.lookColor && { color: f.lookColor }) });
            n = { ...n, tags: n.tags.map((t: any) => t.name === name.toLowerCase() ? { ...t, ...style } : t) };
          }
          return n;
        };
      if (f.kind === "categoryLook")
        change = (s: any) => ({ ...s, categoryLooks: { ...s.categoryLooks, [f.name]: sanitizeStyle({
          ...categoryStyleOf(s, f.name), ...(f.lookIcon && { icon: f.lookIcon }), ...(f.lookColor && { color: f.lookColor }),
        }) } });
      if (await run(change)) setForm(null);
    } catch (e: any) {
      setError(e.message);
    }
  };
  const confirm = (title: string, body: string, action: any) =>
    Alert.alert(title, body, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: action },
    ]);
  const labelList = page === "tags" ? "tags" : "customCategories";
  const reportNow = () => {
    try {
      setResult(report(s, filters));
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };
  const exportReport = async () => {
    setBusy(true);
    setError("");
    try {
      const r = report(s, filters),
        quote = (v: any) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
      const csv =
        "\uFEFF" +
        [
          ["Data", "Descrição", "Tipo", "Categoria", "Valor (R$)", "Situação"],
          ...r.rows.map((t: any) => [
            brDate(t.date),
            t.description,
            t.type === "income" ? "Receita" : "Despesa",
            t.category,
            decimal(t.amount),
            t.confirmed ? "Concluída" : "Pendente",
          ]),
        ]
          .map((row) => row.map(quote).join(";"))
          .join("\r\n");
      const uri =
        FileSystem.cacheDirectory + "Floco-relatorio-" + uid() + ".csv";
      await FileSystem.writeAsStringAsync(uri, csv);
      if (!(await Sharing.isAvailableAsync()))
        throw Error("Compartilhamento indisponível neste aparelho.");
      await Sharing.shareAsync(uri, {
        mimeType: "text/csv",
        dialogTitle: "Exportar relatório do Floco",
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 10 }}>
      {form && <Txt c={c} bold>{form.kind === "categoryLook" ? "Ícone e cor" : form.id ? "Editar registro" : "Novo registro"}</Txt>}
            {!!message && !form && (
              <Txt c={c} accessibilityRole="alert" style={{ marginBottom: 10 }}>
                {message}
              </Txt>
            )}
            {form ? (
              <>
                {form.kind === "categoryLook" && (
                  <>
                    <Txt c={c} bold>
                      {form.name}
                    </Txt>
                    <LookPicker
                      c={c}
                      icon={form.lookIcon || categoryStyleOf(s, form.name).icon}
                      color={form.lookColor || categoryStyleOf(s, form.name).color}
                      onIcon={(v: string) => setForm({ ...form, lookIcon: v })}
                      onColor={(v: string) => setForm({ ...form, lookColor: v })}
                    />
                  </>
                )}
                {(form.kind === "category" || form.kind === "tag") && (
                  <>
                    <LookPicker
                      c={c}
                      icon={form.lookIcon || (form.kind === "tag" ? tagStyleOf(form).icon : categoryStyleOf(s, form.name).icon)}
                      color={form.lookColor || (form.kind === "tag" ? tagStyleOf(form).color : categoryStyleOf(s, form.name).color)}
                      onIcon={(v: string) => setForm({ ...form, lookIcon: v })}
                      onColor={(v: string) => setForm({ ...form, lookColor: v })}
                    />
                    {field(
                      "name",
                      form.kind === "tag" ? "Nome da tag" : "Nome da categoria",
                    )}
                    {form.kind === "category" &&
                      choose("parent", "Categoria principal", [
                        ["", "Nenhuma — categoria principal"],
                        ...names
                          .filter(
                            (n: string) =>
                              n !== form.name &&
                              !(s.customCategories || []).some(
                                (r: any) => r.name === n && r.parent,
                              ),
                          )
                          .map((n: string) => [n, n]),
                      ])}
                  </>
                )}
                {!!error && (
                  <Txt c={c} accessibilityRole="alert" style={{ color: c.red }}>
                    {error}
                  </Txt>
                )}
                <Action
                  c={c}
                  title={busy ? "Salvando…" : "Salvar"}
                  disabled={busy}
                  onPress={save}
                />
                <Action
                  c={c}
                  secondary
                  title="Cancelar"
                  disabled={busy}
                  onPress={() => setForm(null)}
                />
              </>
            ) : (
              <>
                {(page === "categories" || page === "tags") && (
                  <>
                    <Segmented
                      value={page}
                      onChange={(v: string) => setPage(v)}
                      values={[
                        ["categories", "Categorias"],
                        ["tags", "Tags"],
                      ]}
                    />
                    <Txt c={c} muted>
                      {page === "tags"
                        ? "Use várias tags em cada lançamento e filtre os relatórios."
                        : "As categorias já vêm com subcategorias (ex.: Assinaturas › Streaming). Crie as suas e escolha a categoria principal. Renomear atualiza lançamentos, regras e orçamentos."}
                    </Txt>
                    <Action
                      c={c}
                      title={page === "tags" ? "Nova tag" : "Nova categoria"}
                      onPress={() => open(page === "tags" ? "tag" : "category")}
                    />
                    {page === "categories" && (
                      <Card c={c}>
                        <Txt c={c} bold>
                          Categorias iniciais
                        </Txt>
                        <Txt c={c} muted>
                          Toque para escolher ícone e cor.
                        </Txt>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                          {categoryNames({ ...s, customCategories: [] }).map((n: string) => (
                            <Pressable
                              key={n}
                              accessibilityRole="button"
                              accessibilityLabel={`Ícone e cor de ${n}`}
                              onPress={() => open("categoryLook", { name: n })}
                              style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, paddingRight: 12, paddingLeft: 6, borderRadius: 16, backgroundColor: c.bg }}
                            >
                              <LookBadge {...categoryStyleOf(s, n)} />
                              <Text style={{ color: c.text, fontSize: 14 }}>{n}</Text>
                              <Text style={{ color: c.muted, fontSize: 12 }}>{subsOf(s, n).length || ""}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </Card>
                    )}
                    {!(s[labelList] || []).length && (
                      <Txt c={c} muted style={{ marginTop: 15 }}>
                        Nenhum cadastro personalizado ainda.
                      </Txt>
                    )}
                    {(s[labelList] || []).map((r: any) => (
                      <Card key={r.id} c={c}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <LookBadge {...(page === "tags" ? tagStyleOf(r) : categoryStyleOf(s, r.name))} />
                          <Txt c={c} bold>
                            {page === "tags" ? "#" + r.name : r.name}
                          </Txt>
                        </View>
                        {!!r.parent && (
                          <Txt c={c} muted>
                            Subcategoria de {r.parent}
                          </Txt>
                        )}
                        <Action
                          c={c}
                          secondary
                          title="Editar"
                          onPress={() =>
                            open(page === "tags" ? "tag" : "category", r)
                          }
                        />
                        <Action
                          c={c}
                          secondary
                          danger
                          title="Excluir"
                          disabled={busy}
                          onPress={() =>
                            confirm("Excluir cadastro?", r.name, () =>
                              run((s: any) => removeLabel(s, labelList, r.id)),
                            )
                          }
                        />
                      </Card>
                    ))}
                  </>
                )}
                {page === "reports" && (
                  <>
                    <Txt c={c} muted>
                      Entradas e despesas por período. Transferências,
                      pagamentos de fatura e devoluções de principal ficam fora
                      dos resultados. Compras no cartão aparecem no mês da
                      compra/parcela.
                    </Txt>
                    <DateField
                      label="De"
                      value={filters.start}
                      onChange={(v: string) => {
                        setFilters({ ...filters, start: v });
                        setResult(null);
                      }}
                    />
                    <DateField
                      label="Até, inclusive"
                      value={filters.end}
                      onChange={(v: string) => {
                        setFilters({ ...filters, end: v });
                        setResult(null);
                      }}
                    />
                    <Options
                      c={c}
                      label="Situação"
                      values={[
                        ["all", "Todas"],
                        ["confirmed", "Concluídas"],
                        ["pending", "Pendentes"],
                      ]}
                      value={filters.status}
                      onChange={(v: string) => {
                        setFilters({ ...filters, status: v });
                        setResult(null);
                      }}
                    />
                    <Options
                      c={c}
                      label="Tipo"
                      values={[
                        ["all", "Todos"],
                        ["income", "Receitas"],
                        ["expense", "Despesas"],
                      ]}
                      value={filters.type}
                      onChange={(v: string) => {
                        setFilters({ ...filters, type: v });
                        setResult(null);
                      }}
                    />
                    <Options
                      c={c}
                      label="Conta ou cartão"
                      values={[
                        ["", "Todos"],
                        ...accounts,
                        ...s.cards.map((a: any) => [a.id, a.name]),
                      ]}
                      value={filters.accountId}
                      onChange={(v: string) => {
                        setFilters({ ...filters, accountId: v });
                        setResult(null);
                      }}
                    />
                    <Options
                      c={c}
                      label="Categoria"
                      values={[
                        ["", "Todas"],
                        ...names.map((n: string) => [n, n]),
                      ]}
                      value={filters.category}
                      onChange={(v: string) => {
                        setFilters({ ...filters, category: v });
                        setResult(null);
                      }}
                    />
                    {!!s.tags?.length && (
                      <Options
                        c={c}
                        label="Tag"
                        values={[
                          ["", "Todas"],
                          ...s.tags.map((t: any) => [t.id, t.name]),
                        ]}
                        value={filters.tag}
                        onChange={(v: string) => {
                          setFilters({ ...filters, tag: v });
                          setResult(null);
                        }}
                      />
                    )}
                    <Options
                      c={c}
                      label="Agrupar"
                      values={[
                        ["category", "Categoria"],
                        ["month", "Mês / fluxo"],
                        ["account", "Conta / cartão"],
                        ["weekday", "Dia da semana"],
                        ["fixed", "Fixas × variáveis"],
                      ]}
                      value={filters.group}
                      onChange={(v: string) => {
                        setFilters({ ...filters, group: v });
                        setResult(null);
                      }}
                    />
                    <Action c={c} title="Gerar relatório" onPress={reportNow} />
                    <Action
                      c={c}
                      secondary
                      title="Exportar este filtro em CSV"
                      disabled={busy}
                      onPress={exportReport}
                    />
                    {result && (
                      <>
                        <Card c={c}>
                          <Txt c={c} bold>
                            {result.rows.length} lançamentos
                          </Txt>
                          <Txt c={c}>Entradas: {cash(result.income)}</Txt>
                          <Txt c={c}>Saídas: {cash(result.expense)}</Txt>
                          <Txt c={c} bold>
                            Resultado: {cash(result.income - result.expense)}
                          </Txt>
                        </Card>
                        {result.groups.map((g: any) => (
                          <Card c={c} key={g.name}>
                            <Txt c={c} bold>
                              {g.name}
                            </Txt>
                            <Txt c={c}>
                              Entradas {cash(g.income)} · Saídas{" "}
                              {cash(g.expense)}
                            </Txt>
                            <Txt c={c}>
                              Resultado {cash(g.income - g.expense)} · {g.count}{" "}
                              registros
                            </Txt>
                          </Card>
                        ))}
                      </>
                    )}
                    {!!s.budgets.length && (
                      <Card c={c}>
                        <Txt c={c} bold>
                          Orçado × realizado · {monthKey(today())}
                        </Txt>
                        {s.budgets.map((b: any) => (
                          <Txt c={c} key={b.id}>
                            {b.category}: previsto {cash(b.amount)}, gasto{" "}
                            {cash(spent(s, b.category, monthKey(today())))}
                          </Txt>
                        ))}
                        <Txt c={c} muted>
                          Este quadro usa o mês atual e os orçamentos
                          cadastrados; os filtros acima se aplicam ao relatório
                          gerado.
                        </Txt>
                      </Card>
                    )}
                  </>
                )}
                {!!error && (
                  <Txt
                    c={c}
                    accessibilityRole="alert"
                    style={{ color: c.red, marginTop: 12 }}
                  >
                    {error}
                  </Txt>
                )}
              </>
            )}
            {busy && (
              <ActivityIndicator
                accessibilityLabel="Salvando"
                color={c.primary}
                style={{ marginTop: 15 }}
              />
            )}
    </View>
  );
}
