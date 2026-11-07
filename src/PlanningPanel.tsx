import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  today,
  money,
  parseMoney,
  addMonths,
  monthKey,
  invoice,
  spent,
  uid,
} from "./finance.mjs";
import {
  categoryNames,
  saveLabel,
  removeLabel,
  saveRecurrence,
  generateRecurrences,
  installmentSimulation,
  saveFinancing,
  addReceivable,
  receiveDebt,
  undoDebtPayment,
  receivableBalance,
  projection,
  report,
} from "./planning.mjs";

export const planningOptions = [
  {
    id: "categories",
    label: "Categorias e subcategorias",
    icon: "layers",
    group: "Organizar",
  },
  { id: "tags", label: "Tags", icon: "tag", group: "Organizar" },
  {
    id: "recurrences",
    label: "Recorrências",
    icon: "repeat",
    group: "Acompanhar",
  },
  {
    id: "installments",
    label: "Parcelamentos e simulador",
    icon: "calendar",
    group: "Acompanhar",
  },
  {
    id: "financings",
    label: "Financiamentos e empréstimos",
    icon: "briefcase",
    group: "Acompanhar",
  },
  {
    id: "receivables",
    label: "Quem me deve",
    icon: "users",
    group: "Acompanhar",
  },
  {
    id: "projections",
    label: "Projeções",
    icon: "trending-up",
    group: "Planejar",
  },
  {
    id: "reports",
    label: "Relatórios",
    icon: "bar-chart-2",
    group: "Analisar",
  },
] as const;
const frequencies = [
  ["daily", "Diária"],
  ["weekly", "Semanal"],
  ["fortnightly", "A cada 14 dias"],
  ["monthly", "Mensal"],
  ["yearly", "Anual"],
];
const decimal = (n: number) => (n / 100).toFixed(2).replace(".", ",");
const asZeroMoney = (v: string) =>
  !v?.trim() || /^0(?:,0{1,2})?$/.test(v.trim()) ? 0 : parseMoney(v);
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
  onClose,
  onChange,
}: any) {
  const [page, setPage] = useState(initial),
    [form, setForm] = useState<any>(null),
    [detail, setDetail] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [simulation, setSimulation] = useState<any>(null);
  const [simInput, setSimInput] = useState({
    amount: "",
    entry: "",
    count: "12",
    rate: "0",
    date: today(),
  });
  const [horizon, setHorizon] = useState(30),
    [scenario, setScenario] = useState(""),
    [scenarioType, setScenarioType] = useState("expense");
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
  const [result, setResult] = useState<any>(null),
    [forecast, setForecast] = useState<any>(null);
  const cash = (n: number) => (s.settings.hide ? "R$ ••••" : money(n));
  const names = categoryNames(s);
  const accounts = s.accounts.map((a: any) => [a.id, a.name]);
  const field = (key: string, label: string, number = false, hint?: string) => (
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
  const back = () => {
    setError("");
    if (form) {
      setForm(null);
      return;
    }
    if (detail) {
      setDetail("");
      return;
    }
    onClose();
  };
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
        change = (s: any) =>
          saveLabel(s, f.kind === "tag" ? "tags" : "customCategories", f);
      if (f.kind === "recurrence") {
        const amount = parseMoney(f.amount);
        change = (s: any) => saveRecurrence(s, { ...f, amount });
      }
      if (f.kind === "financing") {
        const amount = parseMoney(f.amount);
        change = (s: any) => saveFinancing(s, { ...f, amount });
      }
      if (f.kind === "receivable") {
        const amount = parseMoney(f.amount);
        change = (s: any) => addReceivable(s, { ...f, amount });
      }
      if (f.kind === "receive") {
        const amount = parseMoney(f.amount);
        change = (s: any) =>
          receiveDebt(s, f.receivableId, amount, f.accountId, f.date);
      }
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
  const heading =
    planningOptions.find((o) => o.id === page)?.label || "Planejamento";
  const labelList = page === "tags" ? "tags" : "customCategories";
  const debt = (s.receivables || []).find((r: any) => r.id === detail);
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
            t.date,
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
  const pendingInstallments = s.transactions.filter(
    (t: any) =>
      t.installments > 1 &&
      (t.cardId ? invoice(s, t.cardId, t.invoiceMonth).due > 0 : !t.confirmed),
  );
  const monthly = new Map<string, number>();
  for (const t of pendingInstallments) {
    const m = t.invoiceMonth || monthKey(t.date);
    monthly.set(m, (monthly.get(m) || 0) + t.amount);
  }
  return (
    <Modal visible animationType="slide" onRequestClose={back}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderBottomWidth: 1,
              borderColor: c.line,
              gap: 8,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={back}
              hitSlop={8}
              style={{
                minWidth: 48,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="arrow-left" size={24} color={c.text} />
            </Pressable>
            <Txt c={c} bold style={{ fontSize: 19, flex: 1 }}>
              {form ? "Novo registro" : heading}
            </Txt>
          </View>
          <ScrollView
            key={form ? "form" : page + detail}
            contentContainerStyle={{
              padding: 20,
              paddingBottom: 48,
              maxWidth: 760,
              width: "100%",
              alignSelf: "center",
            }}
            keyboardShouldPersistTaps="handled"
          >
            {!!message && !form && (
              <Txt c={c} accessibilityRole="alert" style={{ marginBottom: 10 }}>
                {message}
              </Txt>
            )}
            {form ? (
              <>
                {(form.kind === "category" || form.kind === "tag") && (
                  <>
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
                {form.kind === "recurrence" && (
                  <>
                    {field("description", "Descrição")}
                    {choose("type", "Tipo", [
                      ["expense", "Despesa"],
                      ["income", "Receita"],
                    ])}
                    {field("amount", "Valor (R$)", true)}
                    {field(
                      "date",
                      "Início (AAAA-MM-DD)",
                      false,
                      "Dias 29–31 são ajustados ao último dia de cada mês, preservando o dia original.",
                    )}
                    {choose("frequency", "Frequência", frequencies)}
                    {field("endDate", "Término opcional (AAAA-MM-DD)")}
                    {choose("accountId", "Conta", accounts)}
                    {choose(
                      "category",
                      "Categoria",
                      names.map((n: string) => [n, n]),
                    )}
                    <Txt c={c} muted>
                      As ocorrências serão criadas pendentes ao tocar em Gerar
                      até hoje. Pausar não remove lançamentos já gerados.
                    </Txt>
                  </>
                )}
                {form.kind === "financing" && (
                  <>
                    {choose("type", "Tipo", [
                      ["financing", "Financiamento"],
                      ["loan", "Empréstimo a pagar"],
                    ])}
                    {field("name", "Nome do contrato")}
                    {field("institution", "Instituição (opcional)")}
                    {field("amount", "Parcela mensal (R$)", true)}
                    {field("count", "Total de parcelas", true)}
                    {field("paid", "Parcelas já pagas antes do Floco", true)}
                    {field(
                      "date",
                      "Primeiro vencimento em aberto (AAAA-MM-DD)",
                    )}
                    {choose("accountId", "Conta de pagamento", accounts)}
                    {choose(
                      "category",
                      "Categoria",
                      names.map((n: string) => [n, n]),
                    )}
                    <Txt c={c} muted>
                      As parcelas restantes entram como despesas pendentes. O
                      principal do contrato não vira uma receita. O valor
                      informado deve incluir juros e encargos.
                    </Txt>
                  </>
                )}
                {form.kind === "receivable" && (
                  <>
                    {field("person", "Quem te deve")}
                    {field("description", "Motivo / descrição")}
                    {field("amount", "Valor a receber (R$)", true)}
                    {field("date", "Data do registro (AAAA-MM-DD)")}
                    {field("dueDate", "Vencimento opcional (AAAA-MM-DD)")}
                    <Txt c={c} muted>
                      Este cadastro acompanha um valor que já te devem. Não
                      movimenta sua conta. Recebimentos aumentam o saldo sem
                      inflar as receitas dos relatórios.
                    </Txt>
                  </>
                )}
                {form.kind === "receive" && (
                  <>
                    {field("amount", "Valor recebido (R$)", true)}
                    {field("date", "Data do recebimento (AAAA-MM-DD)")}
                    {choose("accountId", "Conta que recebeu", accounts)}
                    <Txt c={c} muted>
                      O recebimento será vinculado à dívida e poderá ser
                      desfeito no histórico.
                    </Txt>
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
                    <Txt c={c} muted>
                      {page === "tags"
                        ? "Use várias tags em cada lançamento e filtre os relatórios."
                        : "Crie categorias e subcategorias. Renomear uma categoria atualiza seus lançamentos e orçamentos."}
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
                          {categoryNames({ ...s, customCategories: [] }).join(
                            " · ",
                          )}
                        </Txt>
                      </Card>
                    )}
                    {!(s[labelList] || []).length && (
                      <Txt c={c} muted style={{ marginTop: 15 }}>
                        Nenhum cadastro personalizado ainda.
                      </Txt>
                    )}
                    {(s[labelList] || []).map((r: any) => (
                      <Card key={r.id} c={c}>
                        <Txt c={c} bold>
                          {r.name}
                        </Txt>
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
                {page === "recurrences" && (
                  <>
                    <Txt c={c} muted>
                      Receitas e despesas que se repetem, com controle de pausa
                      e término.
                    </Txt>
                    <Action
                      c={c}
                      title="Nova recorrência"
                      onPress={() => open("recurrence")}
                    />
                    <Action
                      c={c}
                      secondary
                      title="Gerar pendentes até hoje"
                      disabled={busy}
                      onPress={() =>
                        run(
                          (s: any) => generateRecurrences(s),
                          "Ocorrências pendentes atualizadas sem duplicatas",
                        )
                      }
                    />
                    {!(s.recurrences || []).length && (
                      <Card c={c}>
                        <Txt c={c}>
                          Nenhuma recorrência. Cadastre salário, aluguel ou
                          assinaturas.
                        </Txt>
                      </Card>
                    )}
                    {(s.recurrences || []).map((r: any) => (
                      <Card c={c} key={r.id}>
                        <Txt c={c} bold>
                          {r.description}
                        </Txt>
                        <Txt c={c}>
                          {cash(r.amount)} ·{" "}
                          {r.type === "income" ? "Receita" : "Despesa"}
                        </Txt>
                        <Txt c={c} muted>
                          {frequencies.find((f) => f[0] === r.frequency)?.[1]} ·{" "}
                          {r.active ? "Ativa" : "Pausada"} · desde {r.date}
                          {r.endDate ? " até " + r.endDate : ""}
                        </Txt>
                        <Action
                          c={c}
                          secondary
                          title="Editar"
                          onPress={() =>
                            open("recurrence", {
                              ...r,
                              amount: decimal(r.amount),
                            })
                          }
                        />
                        <Action
                          c={c}
                          secondary
                          disabled={busy}
                          title={r.active ? "Pausar" : "Retomar"}
                          onPress={() =>
                            run((s: any) => ({
                              ...s,
                              recurrences: s.recurrences.map((x: any) =>
                                x.id === r.id ? { ...x, active: !x.active } : x,
                              ),
                            }))
                          }
                        />
                      </Card>
                    ))}
                  </>
                )}
                {page === "receivables" &&
                  (debt ? (
                    <>
                      <Txt c={c} bold style={{ fontSize: 24 }}>
                        {debt.person}
                      </Txt>
                      <Txt c={c}>{debt.description}</Txt>
                      <Card c={c}>
                        <Txt c={c} muted>
                          Falta receber
                        </Txt>
                        <Txt c={c} bold style={{ fontSize: 28 }}>
                          {cash(receivableBalance(debt))}
                        </Txt>
                        <Txt c={c} muted>
                          Total registrado: {cash(debt.amount)}
                          {debt.dueDate ? " · vence " + debt.dueDate : ""}
                        </Txt>
                      </Card>
                      {receivableBalance(debt) > 0 && (
                        <Action
                          c={c}
                          title="Registrar recebimento"
                          onPress={() =>
                            open("receive", {
                              receivableId: debt.id,
                              amount: decimal(receivableBalance(debt)),
                            })
                          }
                        />
                      )}
                      <Txt c={c} bold style={{ marginTop: 18 }}>
                        Histórico de recebimentos
                      </Txt>
                      {!debt.payments.length && (
                        <Txt c={c} muted>
                          Nenhum recebimento registrado.
                        </Txt>
                      )}
                      {debt.payments.map((p: any) => (
                        <Card c={c} key={p.id}>
                          <Txt c={c}>
                            {cash(p.amount)} · {p.date}
                          </Txt>
                          <Txt c={c} muted>
                            {
                              s.accounts.find((a: any) => a.id === p.accountId)
                                ?.name
                            }
                          </Txt>
                          <Action
                            c={c}
                            secondary
                            danger
                            title="Desfazer recebimento"
                            disabled={busy}
                            onPress={() =>
                              confirm(
                                "Desfazer recebimento?",
                                "O valor sairá do saldo da conta e voltará ao saldo a receber.",
                                () =>
                                  run((s: any) =>
                                    undoDebtPayment(s, debt.id, p.id),
                                  ),
                              )
                            }
                          />
                        </Card>
                      ))}
                      {!debt.payments.length && (
                        <Action
                          c={c}
                          secondary
                          danger
                          title="Excluir registro da dívida"
                          onPress={() =>
                            confirm(
                              "Excluir dívida?",
                              "Este registro será removido. Nenhuma conta será movimentada.",
                              async () => {
                                if (
                                  await run((s: any) => ({
                                    ...s,
                                    receivables: s.receivables.filter(
                                      (r: any) => r.id !== debt.id,
                                    ),
                                  }))
                                )
                                  setDetail("");
                              },
                            )
                          }
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <Card c={c}>
                        <Txt c={c} muted>
                          Total a receber
                        </Txt>
                        <Txt c={c} bold style={{ fontSize: 28 }}>
                          {cash(
                            (s.receivables || []).reduce(
                              (n: number, r: any) => n + receivableBalance(r),
                              0,
                            ),
                          )}
                        </Txt>
                      </Card>
                      <Action
                        c={c}
                        title="Novo valor a receber"
                        onPress={() => open("receivable")}
                      />
                      {!(s.receivables || []).length && (
                        <Txt c={c} muted>
                          Ninguém te deve por aqui. Acompanhe empréstimos,
                          vendas ou divisões de conta.
                        </Txt>
                      )}
                      {(s.receivables || []).map((r: any) => (
                        <Card c={c} key={r.id}>
                          <Txt c={c} bold>
                            {r.person}
                          </Txt>
                          <Txt c={c}>{r.description}</Txt>
                          <Txt c={c}>
                            {receivableBalance(r)
                              ? "A receber: " + cash(receivableBalance(r))
                              : "Quitado"}
                          </Txt>
                          {!!r.dueDate && (
                            <Txt c={c} muted>
                              {r.dueDate < today() && receivableBalance(r) > 0
                                ? "Vencido em "
                                : "Vencimento: "}
                              {r.dueDate}
                            </Txt>
                          )}
                          <Action
                            c={c}
                            secondary
                            title="Ver dívida e recebimentos"
                            onPress={() => setDetail(r.id)}
                          />
                        </Card>
                      ))}
                    </>
                  ))}
                {page === "financings" && (
                  <>
                    <Txt c={c} muted>
                      Controle contratos com parcelas fixas e empréstimos que
                      você precisa pagar. Confirme o pagamento na aba
                      Transações.
                    </Txt>
                    <Action
                      c={c}
                      title="Novo contrato"
                      onPress={() => open("financing", { type: "financing" })}
                    />
                    {!(s.financings || []).length && (
                      <Card c={c}>
                        <Txt c={c}>Nenhum contrato cadastrado.</Txt>
                      </Card>
                    )}
                    {(s.financings || []).map((f: any) => {
                      const tx = s.transactions.filter(
                          (t: any) => t.financingId === f.id,
                        ),
                        pending = tx.filter((t: any) => !t.confirmed);
                      return (
                        <Card c={c} key={f.id}>
                          <Txt c={c} bold>
                            {f.name}
                          </Txt>
                          <Txt c={c} muted>
                            {f.type === "loan" ? "Empréstimo" : "Financiamento"}
                            {f.institution ? " · " + f.institution : ""}
                          </Txt>
                          <Txt c={c}>
                            Parcela: {cash(f.amount)} · {f.count} no contrato
                          </Txt>
                          <Txt c={c}>
                            Restam {pending.length} parcelas ·{" "}
                            {cash(
                              pending.reduce(
                                (n: number, t: any) => n + t.amount,
                                0,
                              ),
                            )}
                          </Txt>
                          <Txt c={c} muted>
                            Este total soma as parcelas restantes, incluindo os
                            encargos informados. Não é o saldo principal para
                            quitação antecipada.
                          </Txt>
                          <Action
                            c={c}
                            secondary
                            title={
                              detail === f.id
                                ? "Ocultar parcelas"
                                : "Ver parcelas"
                            }
                            onPress={() =>
                              setDetail(detail === f.id ? "" : f.id)
                            }
                          />
                          {detail === f.id &&
                            tx.map((t: any) => (
                              <Txt c={c} key={t.id}>
                                {t.date} · {cash(t.amount)} ·{" "}
                                {t.confirmed ? "Paga" : "Pendente"}
                              </Txt>
                            ))}
                        </Card>
                      );
                    })}
                  </>
                )}
                {page === "installments" && (
                  <>
                    <Card c={c}>
                      <Txt c={c} bold>
                        Comprometimento em parcelas
                      </Txt>
                      <Txt c={c} muted>
                        Compras parceladas e contratos. Faturas com pagamento
                        parcial mantêm as compras visíveis até a quitação; o
                        saldo exato fica em Cartões.
                      </Txt>
                      {!monthly.size && (
                        <Txt c={c}>Nenhuma parcela em aberto.</Txt>
                      )}
                      {[...monthly.entries()].sort().map(([m, v]) => (
                        <Txt c={c} key={m}>
                          {m} · {cash(v)}
                        </Txt>
                      ))}
                    </Card>
                    <Txt c={c} bold style={{ fontSize: 20, marginTop: 18 }}>
                      Simular uma compra
                    </Txt>
                    <Txt c={c} muted>
                      Simulação de parcelas fixas pelo sistema Price. Não cria
                      lançamentos. Não inclui IOF, seguro nem tarifas
                      adicionais.
                    </Txt>
                    {(
                      [
                        ["amount", "Preço à vista (R$)"],
                        ["entry", "Entrada (R$, opcional)"],
                        ["count", "Quantidade de parcelas"],
                        ["rate", "Juros ao mês (%)"],
                        ["date", "Primeiro vencimento (AAAA-MM-DD)"],
                      ] as const
                    ).map(([key, label]) => (
                      <Field
                        c={c}
                        key={key}
                        label={label}
                        number={key !== "date"}
                        value={simInput[key]}
                        onChange={(v: string) => {
                          setSimInput({ ...simInput, [key]: v });
                          setSimulation(null);
                        }}
                      />
                    ))}
                    <Action
                      c={c}
                      title="Calcular simulação"
                      onPress={() => {
                        try {
                          setSimulation(
                            installmentSimulation({
                              amount: parseMoney(simInput.amount),
                              entry: asZeroMoney(simInput.entry),
                              count: Number(simInput.count),
                              rate: Number(simInput.rate.replace(",", ".")),
                              date: simInput.date,
                            }),
                          );
                          setError("");
                        } catch (e: any) {
                          setError(e.message);
                        }
                      }}
                    />
                    {simulation && (
                      <Card c={c}>
                        <Txt c={c} bold>
                          Parcela de referência: {cash(simulation.payment)}
                        </Txt>
                        <Txt c={c}>
                          Total com entrada: {cash(simulation.total)}
                        </Txt>
                        <Txt c={c}>
                          Juros estimados: {cash(simulation.interest)}
                        </Txt>
                        <Txt c={c} muted>
                          A última parcela ajusta os centavos do saldo.
                        </Txt>
                        {simulation.rows.map((r: any) => (
                          <Txt c={c} key={r.number}>
                            {r.number} · {r.date} · {cash(r.amount)}
                          </Txt>
                        ))}
                      </Card>
                    )}
                  </>
                )}
                {page === "projections" && (
                  <>
                    <Txt c={c} muted>
                      Saldo total das contas, pendências, faturas e recorrências
                      futuras. Valores vencidos entram no início do horizonte.
                      Reservas continuam incluídas no saldo total. Recebimentos
                      de dívidas sem pagamento confirmado não são presumidos.
                    </Txt>
                    <Options
                      c={c}
                      label="Horizonte"
                      values={[
                        [30, "30 dias"],
                        [60, "60 dias"],
                        [90, "90 dias"],
                        [180, "6 meses"],
                        [365, "12 meses"],
                        [730, "24 meses"],
                      ]}
                      value={horizon}
                      onChange={(v: number) => {
                        setHorizon(v);
                        setForecast(null);
                      }}
                    />
                    <Options
                      c={c}
                      label="Cenário opcional mensal"
                      values={[
                        ["expense", "Despesa extra"],
                        ["income", "Receita extra"],
                      ]}
                      value={scenarioType}
                      onChange={(v: string) => {
                        setScenarioType(v);
                        setForecast(null);
                      }}
                    />
                    <Field
                      c={c}
                      label="Valor mensal simulado (R$)"
                      number
                      value={scenario}
                      onChange={(v: string) => {
                        setScenario(v);
                        setForecast(null);
                      }}
                      hint="Primeiro evento hoje; seguintes na mesma data de cada mês. Não altera seus dados."
                    />
                    <Action
                      c={c}
                      title="Calcular projeção"
                      onPress={() => {
                        try {
                          const d = new Date(today() + "T12:00:00Z");
                          d.setUTCDate(d.getUTCDate() + horizon);
                          const cap = addMonths(today(), 24);
                          setForecast(
                            projection(
                              s,
                              d.toISOString().slice(0, 10) > cap
                                ? cap
                                : d.toISOString().slice(0, 10),
                              {
                                scenarioMonthly:
                                  asZeroMoney(scenario) *
                                  (scenarioType === "expense" ? -1 : 1),
                              },
                            ),
                          );
                          setError("");
                        } catch (e: any) {
                          setError(e.message);
                        }
                      }}
                    />
                    {forecast && (
                      <>
                        <Card c={c}>
                          <Txt c={c}>Hoje: {cash(forecast.initial)}</Txt>
                          <Txt c={c} bold>
                            Saldo final projetado: {cash(forecast.final)}
                          </Txt>
                          <Txt c={c}>Menor saldo: {cash(forecast.min)}</Txt>
                          <Txt c={c} muted>
                            Estimativa pelos registros atuais. Não prevê juros
                            bancários, inflação ou novos gastos.
                          </Txt>
                        </Card>
                        {forecast.rows.map((r: any, i: number) => (
                          <Card c={c} key={i}>
                            <Txt c={c} bold>
                              {r.description}
                            </Txt>
                            <Txt c={c} muted>
                              {r.date}
                            </Txt>
                            <Txt c={c}>
                              {cash(r.amount)} · Saldo: {cash(r.balance)}
                            </Txt>
                          </Card>
                        ))}
                      </>
                    )}
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
                    <Field
                      c={c}
                      label="De (AAAA-MM-DD)"
                      value={filters.start}
                      onChange={(v: string) => {
                        setFilters({ ...filters, start: v });
                        setResult(null);
                      }}
                    />
                    <Field
                      c={c}
                      label="Até, inclusive (AAAA-MM-DD)"
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
