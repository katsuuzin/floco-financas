import React, { useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { T, Muted, I, Field, Choice, Toggle, Button, Box, IconButton, Segmented, AmountField, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { buildChange, buildExpenseBatchChange, defaults, formTitles, toInput, type BatchExpense } from "../app/forms";
import { batchDuplicates, buildExpenseBatch, validateBatch } from "../multiExpenseDraft.mjs";
import { safeCentsFromBr } from "../hardened.mjs";
import { categoryNames } from "../planning.mjs";
import { CategoryRow } from "../ui/pickers";
import { spendTypeConfig } from "../spendTypes.mjs";
import { bankProfiles, bankProfile } from "../banks.mjs";
import { invoice, balance, reserved, today, addMonths, ACCOUNT_TYPES } from "../finance.mjs";
import { categorize } from "../rules.mjs";
import { parseSignedMoney } from "../adjust.mjs";
import { parseMoney } from "../finance.mjs";
import { minimumPayment, chosenInvoiceMonth } from "../invoices.mjs";
import { previewOf, contractStatus } from "../contracts.mjs";
import { archiveAccount, visibleAccounts } from "../accountOrder.mjs";

const COLORS: [string, string][] = [
  ["#311E0D", "Marrom"],
  ["#820AD1", "Roxo"],
  ["#E67E22", "Laranja"],
  ["#335E9A", "Azul"],
  ["#2E7D5B", "Verde"],
  ["#B53846", "Vermelho"],
];

export default function FormScreen({ kind, initial }: { kind: string; initial?: any }) {
  return kind === "expenseBatch" ? <ExpenseBatchReview initial={initial} /> : <RegularFormScreen kind={kind} initial={initial} />;
}

function ExpenseBatchReview({ initial }: { initial: any }) {
  const { state, perform, show, confirm } = useStore();
  const nav = useNav();
  const accounts = visibleAccounts(state);
  const [accountId, setAccountId] = useState(() => accounts[0]?.id || "");
  const [draft] = useState(() => buildExpenseBatch(
    { ...state, shoppingItems: initial?.shoppingItems || [] },
    { date: today(), accountId, split: true } as Parameters<typeof buildExpenseBatch>[1],
  ));
  const [expenses, setExpenses] = useState<BatchExpense[]>(draft.expenses);
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const batch = { expenses: expenses.map((expense) => ({ ...expense, accountId })), totalCents: draft.totalCents };
  const validation = validateBatch(batch);
  const duplicates = batchDuplicates(state, batch);

  const applyAmount = () => {
    if (!editing) return;
    const amount = safeCentsFromBr(editing.text);
    const difference = amount === null ? 0 : amount - expenses[editing.index].amountCents;
    const other = expenses.reduce((largest, expense, index) =>
      index !== editing.index && (largest < 0 || expense.amountCents > expenses[largest].amountCents) ? index : largest, -1);
    if (amount === null || amount <= 0 || (difference !== 0 && (other < 0 || expenses[other].amountCents - difference <= 0))) {
      setError("Informe um valor positivo que mantenha as outras despesas e o total do carrinho.");
      return;
    }
    setExpenses(expenses.map((expense, index) => index === editing.index ? { ...expense, amountCents: amount } :
      index === other ? { ...expense, amountCents: expense.amountCents - difference } : expense));
    setEditing(null);
    setError("");
  };

  const save = async () => {
    if (lock.current || !validation.ok || !accounts.some((account: any) => account.id === accountId)) return;
    lock.current = true;
    setBusy(true);
    let ids: string[] = [];
    const change = buildExpenseBatchChange(batch);
    const saved = await perform((current: any) => {
      const oldIds = new Set(current.transactions.map((transaction: any) => transaction.id));
      const next = change(current);
      ids = next.transactions.filter((transaction: any) => !oldIds.has(transaction.id)).map((transaction: any) => transaction.id);
      return next;
    }, "Despesas salvas no aparelho");
    if (saved) setSavedIds(ids);
    lock.current = false;
    setBusy(false);
  };

  const undo = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const ids = new Set(savedIds);
    if (await perform((current: any) => ({
      ...current, transactions: current.transactions.filter((transaction: any) => !ids.has(transaction.id)),
    }), "Registro das despesas desfeito")) setSavedIds([]);
    lock.current = false;
    setBusy(false);
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={[k.row, { justifyContent: "space-between", gap: 8 }]}>
        <T accessibilityRole="header" style={[k.pageTitle, { flex: 1 }]}>Revisar despesas</T>
        {!savedIds.length && !busy && <IconButton name="x" label="Cancelar revisão de despesas" onPress={() => nav.back()} />}
      </View>
      {savedIds.length ? (
        <>
          <T accessibilityLiveRegion="polite">Despesas salvas no aparelho.</T>
          <Button title="Desfazer registro das despesas" disabled={busy} secondary onPress={() => void undo()} />
          <Button title="Concluir" disabled={busy} onPress={() => nav.back()} />
        </>
      ) : (
        <>
          <T>Total do carrinho {show(draft.totalCents ?? 0)}</T>
          {draft.skipped.length > 0 && <Muted>Itens sem preço ficaram de fora: {draft.skipped.map((item: any) => item.name).join(", ")}.</Muted>}
          {expenses.length > 1 && <Muted>Ao editar um valor, a maior das outras despesas absorve a diferença.</Muted>}
          <Choice label="Conta" values={accounts.map((account: any) => [account.id, account.name])} value={accountId} onChange={setAccountId} />
          {expenses.map((expense, index) => (
            <Box key={index} style={{ gap: 10 }}>
              <T>{expense.description}</T>
              <CategoryRow state={state} type="expense" category={expense.category} subcategory={expense.subcategory}
                label={`Categoria da despesa ${index + 1}`}
                onChange={(category, subcategory) => setExpenses(expenses.map((row, i) => i === index ? { ...row, category, subcategory } : row))} />
              {editing?.index === index ? (
                <>
                  <Field label={`Valor da despesa ${index + 1}`} value={editing.text} onChange={(text) => setEditing({ index, text })} numeric autoFocus />
                  <Button title="Aplicar valor" secondary onPress={applyAmount} />
                  <Button title="Cancelar edição do valor" secondary onPress={() => { setEditing(null); setError(""); }} />
                </>
              ) : (
                <Button title={`Editar valor da despesa ${index + 1} · ${show(expense.amountCents)}`} disabled={editing !== null || expenses.length === 1}
                  secondary onPress={() => setEditing({ index, text: toInput(expense.amountCents) })} />
              )}
            </Box>
          ))}
          {duplicates.length > 0 && <T accessibilityLiveRegion="polite">{duplicates.length} {duplicates.length === 1 ? "possível duplicata" : "possíveis duplicatas"}. Confira antes de salvar.</T>}
          {(error || !validation.ok) && <T accessibilityLiveRegion="polite">{error || ("message" in validation ? validation.message : "")}</T>}
          <Button title={busy ? "Salvando…" : "Salvar tudo"} disabled={busy || !!editing || !validation.ok || !accounts.some((account: any) => account.id === accountId)}
            onPress={() => duplicates.length ? confirm("Salvar despesas?", "Há despesas parecidas no extrato.", () => void save(), "Salvar tudo") : void save()} />
        </>
      )}
    </View>
  );
}

function RegularFormScreen({ kind, initial }: { kind: string; initial?: any }) {
  const { c } = useTheme();
  const { state, commit, setNotice, perform, confirm, show } = useStore();
  const nav = useNav();
  const [form, setForm] = useState<any>(() => defaults(kind, state, initial));
  const [details, setDetails] = useState(
    () => !!(initial?.notes || initial?.refund || initial?.ignored || initial?.tags?.length || initial?.repeat === "installments"),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));
  const accounts = visibleAccounts(state);
  const cards = state.cards.filter((x: any) => !x.archived || x.id === form.cardId);

  const save = async (again = false) => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await commit(buildChange(form, nav.month));
      setNotice("Salvo no aparelho");
      if (again)
        setForm((f: any) => ({ ...defaults(kind, state), type: f.type, cardId: f.cardId, accountId: f.accountId, date: f.date, category: f.category }));
      else nav.back();
    } catch (e: any) {
      setError(e?.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const removeAccount = () => {
    const used =
      state.transactions.some((t: any) => t.accountId === form.id || t.destinationId === form.id) ||
      [...state.goals, ...(state.pots || [])].some((g: any) => (g.deposits || []).some((d: any) => d.accountId === form.id)) ||
      (state.recurrences || []).some((r: any) => r.accountId === form.id) ||
      (state.financings || []).some((r: any) => r.accountId === form.id) ||
      state.cards.some((x: any) => x.accountId === form.id);
    if (used)
      return confirm(
        "Arquivar conta?",
        "Esta conta tem histórico. Ela sai das listas e dos formulários, mas o histórico e os relatórios continuam corretos. Dá para restaurar em Contas.",
        () =>
          perform(
            (s: any) => {
              const next: any = archiveAccount(s, form.id, { now: today() } as Parameters<typeof archiveAccount>[2]);
              if (next.error) throw Error(next.blockers?.map((blocker: any) => blocker.message).join("\n") || next.error);
              return next;
            },
            "Conta arquivada",
          ).then((ok) => ok && nav.back()),
        "Arquivar",
      );
    confirm(
      "Excluir conta?",
      form.name,
      () =>
        perform((s: any) => ({ ...s, accounts: s.accounts.filter((a: any) => a.id !== form.id) }), "Conta excluída").then(
          (ok) => ok && nav.back(),
        ),
      "Excluir",
    );
  };

  const tx = form.kind === "transaction";
  return (
    <View style={{ gap: 18 }}>
      <View style={[k.row, { justifyContent: "space-between" }]}>
        <T style={k.pageTitle}>{formTitles[form.kind]?.(form)}</T>
        <IconButton name="x" label="Cancelar e fechar" onPress={() => !saving && nav.back()} />
      </View>

      {tx && (
        <>
          {!form.editId && (
            <Segmented
              values={[
                ["expense", "Despesa"],
                ["card", "Cartão"],
                ["income", "Receita"],
                ["transfer", "Transferir"],
              ]}
              value={form.type === "expense" && form.cardId ? "card" : form.type}
              onChange={(v) =>
                setForm((f: any) => ({
                  ...f,
                  type: v === "card" ? "expense" : v,
                  cardId: v === "card" ? f.cardId || cards[0]?.id || "" : "",
                  repeat: "single",
                  refund: v === "expense" || v === "card" ? f.refund : false,
                }))
              }
            />
          )}
          <AmountField
            value={form.amount}
            onChange={(v) => set("amount", v)}
            autoFocus={!form.editId}
            color={form.type === "income" ? c.green : undefined}
          />
          {!form.editId && form.type !== "transfer" && (
            <Pressable
              accessibilityRole="button"
              onPress={() => nav.replace({ name: "receipt" })}
              style={[k.row, { minHeight: 44, gap: 8, alignSelf: "flex-start" }]}
            >
              <I name="camera" size={16} color={c.primary} />
              <T style={{ color: c.primary, fontSize: 13, fontFamily: "SoraSemi" }}>Preencher a partir de um comprovante</T>
            </Pressable>
          )}
          <View style={[k.row, { alignItems: "flex-end", gap: 8 }]}>
            <View style={{ flex: 1.6 }}>
              <Field label="Data" value={form.date} onChange={(v) => set("date", v)} placeholder={today()} maxLength={10} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Hora" value={form.time} onChange={(v) => set("time", v)} placeholder="HH:MM" maxLength={5} />
            </View>
          </View>
          <View style={[k.row, { marginTop: -8, gap: 4 }]}>
            <IconButton name="chevron-left" label="Dia anterior" onPress={() => set("date", shiftDay(form.date, -1))} />
            <Pressable accessibilityRole="button" onPress={() => set("date", today())} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}>
              <T style={{ fontSize: 13, color: c.primary }}>Hoje</T>
            </Pressable>
            <IconButton name="chevron-right" label="Próximo dia" onPress={() => set("date", shiftDay(form.date, 1))} />
          </View>
          {!form.cardId && form.type !== "transfer" && (
            <Toggle
              label={form.type === "income" ? "Já recebido" : "Já pago"}
              value={form.confirmed}
              onChange={(v) => set("confirmed", v)}
              hint={form.confirmed ? undefined : "Pendente: não altera o saldo até você confirmar."}
            />
          )}
          <Field
            label="Descrição (opcional)"
            value={form.description}
            onChange={(v) =>
              setForm((f: any) => {
                const rule = !f.categoryTouched && form.type !== "transfer" ? categorize(state, v, f.type) : null;
                return { ...f, description: v, ...(rule ? { category: rule.category, subcategory: rule.subcategory || "" } : {}) };
              })
            }
            hint="Sem descrição, o lançamento usa o nome da categoria. As regras de categorização sugerem a categoria."
          />
          {form.type !== "transfer" && (
            <CategoryRow
              state={state}
              type={form.type === "income" ? "income" : "expense"}
              category={form.category}
              subcategory={form.subcategory}
              onChange={(cat, sub) => setForm((f: any) => ({ ...f, category: cat, subcategory: sub, categoryTouched: true }))}
            />
          )}
          {form.type === "expense" && (
            <Choice
              label="Tipo de gasto"
              values={[["", "Automático (pela categoria)"], ...spendTypeConfig(state).types.filter((t: any) => !t.saved).map((t: any) => [t.id, t.name])] as [string, string][]}
              value={form.spendType || ""}
              onChange={(v) => set("spendType", v)}
            />
          )}
          {form.cardId && (() => {
            const card = state.cards.find((x: any) => x.id === form.cardId);
            const month = card ? chosenInvoiceMonth(card, form.date, Number(form.invoiceShift) || 0) : "";
            if (!month) return null;
            const label = new Date(`${month}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            return (
              <View style={{ gap: 4 }}>
                <T style={k.label}>Entra na fatura de</T>
                <View style={[k.row, { gap: 4 }]}>
                  <IconButton name="chevron-left" label="Fatura anterior" onPress={() => set("invoiceShift", (Number(form.invoiceShift) || 0) - 1)} />
                  <T style={{ flex: 1, textAlign: "center", fontFamily: "SoraSemi" }}>{label}</T>
                  <IconButton name="chevron-right" label="Próxima fatura" onPress={() => set("invoiceShift", (Number(form.invoiceShift) || 0) + 1)} />
                </View>
                {!!Number(form.invoiceShift) && <Muted>Escolhida por você. O cartão fecharia essa compra em outra fatura.</Muted>}
              </View>
            );
          })()}
          {form.cardId ? (
            <Choice label="Cartão" values={cards.map((x: any) => [x.id, x.name])} value={form.cardId} onChange={(v) => set("cardId", v)} empty="Cadastre um cartão em Mais › Cartões." />
          ) : (
            <Choice
              label={form.type === "transfer" ? "Conta de origem" : "Conta"}
              values={accounts.map((a: any) => [a.id, a.name])}
              value={form.accountId}
              onChange={(v) => set("accountId", v)}
              empty="Cadastre uma conta primeiro."
            />
          )}
          {form.type === "transfer" && (
            <Choice
              label="Conta de destino"
              values={accounts.filter((a: any) => a.id !== form.accountId).map((a: any) => [a.id, a.name])}
              value={form.destinationId}
              onChange={(v) => set("destinationId", v)}
            />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: details }}
            onPress={() => setDetails(!details)}
            style={[k.row, { minHeight: 48 }]}
          >
            <T style={{ fontFamily: "SoraSemi", color: c.primary, flex: 1 }}>{details ? "Ocultar detalhes" : "Mais detalhes"}</T>
          </Pressable>
          {details && (
            <View style={{ gap: 18 }}>
              {form.type !== "transfer" && !form.editId && (
                <Choice
                  label="Repetição"
                  values={[
                    ["single", "Única"],
                    ...(form.cardId ? [["installments", "Parcelar"] as [string, string]] : []),
                    ...(!form.cardId ? [["recurring", "Recorrente"] as [string, string]] : []),
                  ]}
                  value={form.repeat}
                  onChange={(v) => set("repeat", v)}
                />
              )}
              {form.repeat === "installments" && (
                <Field
                  label="Número de parcelas"
                  value={form.installments}
                  onChange={(v) => set("installments", v)}
                  numeric
                  hint="O valor informado é o total da compra. Os centavos são distribuídos sem sobra."
                />
              )}
              {form.repeat === "recurring" && (
                <Choice
                  label="Frequência"
                  values={[
                    ["weekly", "Semanal"],
                    ["fortnightly", "A cada 14 dias"],
                    ["monthly", "Mensal"],
                    ["yearly", "Anual"],
                  ]}
                  value={form.frequency}
                  onChange={(v) => set("frequency", v)}
                />
              )}
              {form.type === "expense" && !form.cardId && !form.editId && (
                <>
                  <Toggle
                    label="Alguém me deve isso"
                    value={!!form.owed}
                    onChange={(v) => setForm((f: any) => ({ ...f, owed: v, refund: false, repeat: "single" }))}
                    hint="O dinheiro sai da conta e vira valor a receber em Quem me deve, fora dos relatórios de gasto."
                  />
                  {form.owed && <Field label="Quem deve" value={form.person} onChange={(v) => set("person", v)} />}
                  <Button
                    title="É um contrato parcelado (financiamento ou empréstimo)"
                    secondary
                    icon="file-text"
                    onPress={() =>
                      nav.replace({
                        name: "form",
                        kind: "contract",
                        initial: {
                          amount: form.amount,
                          name: form.description,
                          category: form.category,
                          accountId: form.accountId,
                          date: form.date,
                          type: "financing",
                        },
                      })
                    }
                  />
                </>
              )}
              {form.type === "expense" && !form.owed && (
                <Toggle
                  label="É uma devolução / estorno"
                  value={form.refund}
                  onChange={(v) => set("refund", v)}
                  hint="O dinheiro volta para a conta e o valor abate o gasto da categoria nos relatórios."
                />
              )}
              <Toggle
                label="Ignorar na análise"
                value={form.ignored}
                onChange={(v) => set("ignored", v)}
                hint="Fica fora dos relatórios e do balanço, mas continua no saldo e na fatura."
              />
              {!!state.tags?.length && (
                <View style={{ gap: 8 }}>
                  <T style={k.label}>Tags</T>
                  <View style={k.chips}>
                    {state.tags.map((tag: any) => {
                      const on = (form.tags || []).includes(tag.id);
                      return (
                        <Pressable
                          key={tag.id}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                          onPress={() =>
                            set("tags", on ? form.tags.filter((x: string) => x !== tag.id) : [...(form.tags || []), tag.id])
                          }
                          style={[k.chip, { backgroundColor: on ? c.soft : c.surface, borderWidth: 1, borderColor: on ? c.primary : c.line }]}
                        >
                          <T style={{ fontSize: 12 }}>#{tag.name}</T>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
              <Field label="Observações" value={form.notes} onChange={(v) => set("notes", v)} multiline />
            </View>
          )}
        </>
      )}

      {form.kind === "account" && (
        <>
          <Choice
            label="Banco e perfil"
            values={[...bankProfiles.map((p: any) => [p.id, p.label] as [string, string]), ["custom", "Outro banco / carteira"]]}
            value={form.profileId || "custom"}
            onChange={(id) => {
              const p = bankProfile(id);
              setForm((f: any) => ({
                ...f,
                profileId: id,
                holderType: p?.holderType || f.holderType || "PF",
                institution: p?.institution || f.institution,
                name: !f.name || f.name === bankProfile(f.profileId)?.label ? p?.label || f.name : f.name,
                color: p?.color || f.color,
              }));
            }}
          />
          <Field label="Nome da conta" value={form.name} onChange={(v) => set("name", v)} autoFocus={!form.id} />
          <Choice label="Tipo de conta" values={ACCOUNT_TYPES as [string, string][]} value={form.accountType || "checking"} onChange={(v) => set("accountType", v)} />
          {!bankProfile(form.profileId) && (
            <Field label="Instituição (opcional)" value={form.institution} onChange={(v) => set("institution", v)} placeholder="Nubank, Itaú, Dinheiro…" />
          )}
          <Field
            label="Saldo inicial (R$)"
            value={form.initial}
            onChange={(v) => set("initial", v)}
            numeric
            placeholder="0,00"
            hint="O saldo atual é calculado a partir deste valor e dos lançamentos confirmados."
          />
          {form.id && (
            <Button
              title="Ajustar saldo"
              secondary
              icon="sliders"
              onPress={() =>
                nav.push({
                  name: "form",
                  kind: "adjustBalance",
                  initial: {
                    accountId: form.id,
                    sourceId: accounts.find((a: any) => a.id !== form.id)?.id || "",
                    category: "Outros",
                    description: "",
                  },
                })
              }
            />
          )}
          <Choice label="Cor" values={COLORS} value={form.color || COLORS[0][0]} onChange={(v) => set("color", v)} />
          <Toggle label="Ocultar saldo desta conta" value={!!form.hideBalance} onChange={(v) => set("hideBalance", v)} />
          <Toggle
            label="Incluir no saldo total"
            value={form.includeInTotal !== false}
            onChange={(v) => set("includeInTotal", v)}
            hint="Desligue para dinheiro que não é seu: a conta fica fora do total e das projeções, mas continua no histórico."
          />
          {form.id && <Button title="Excluir ou arquivar conta" danger icon="archive" onPress={removeAccount} />}
        </>
      )}

      {form.kind === "card" && (
        <>
          <Field label="Nome do cartão" value={form.name} onChange={(v) => set("name", v)} autoFocus={!form.id} />
          <Field label="Limite total (R$)" value={form.limit} onChange={(v) => set("limit", v)} numeric />
          <View style={[k.row, { alignItems: "flex-start" }]}>
            <View style={{ flex: 1 }}>
              <Field label="Fechamento (dia)" value={form.closingDay} onChange={(v) => set("closingDay", v)} numeric maxLength={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Vencimento (dia)" value={form.dueDay} onChange={(v) => set("dueDay", v)} numeric maxLength={2} />
            </View>
          </View>
          <Choice label="Conta para pagamento" values={accounts.map((a: any) => [a.id, a.name])} value={form.accountId} onChange={(v) => set("accountId", v)} />
          <Field label="Últimos 4 dígitos (opcional)" value={form.lastFour} onChange={(v) => set("lastFour", v)} numeric maxLength={4} />
          <Toggle
            label="Compra no dia do fechamento vai para a próxima fatura"
            value={!!form.closingDayNext}
            onChange={(v) => set("closingDayNext", v)}
            hint="Ligue se o seu banco funciona assim."
          />
          <Toggle
            label="Vencimento em dia útil"
            value={!!form.businessDayDue}
            onChange={(v) => set("businessDayDue", v)}
            hint="Se cair no sábado ou domingo, a data passa para a segunda-feira. Feriados não são considerados."
          />
          <Choice label="Cor" values={COLORS} value={form.color || COLORS[0][0]} onChange={(v) => set("color", v)} />
          <Muted>Mudar as datas não altera as faturas de compras já registradas.</Muted>
        </>
      )}

      {form.kind === "budget" && (
        <>
          <Choice
            label="Tipo"
            values={[
              ["expense", "Teto de despesa"],
              ["income", "Meta de receita"],
            ]}
            value={form.budgetType || "expense"}
            onChange={(v) => set("budgetType", v)}
          />
          <Field label="Valor (R$)" value={form.amount} onChange={(v) => set("amount", v)} numeric autoFocus={!form.id} />
          <Field label="Nome (opcional)" value={form.name} onChange={(v) => set("name", v)} placeholder="Ex.: Essenciais" />
          <View style={{ gap: 8 }}>
            <T style={k.label}>Categorias</T>
            <View style={k.chips}>
              {categoryNames(state).map((name: string) => {
                const list: string[] = form.categories?.length ? form.categories : form.category && form.id ? [form.category] : [];
                const on = list.includes(name);
                return (
                  <Pressable
                    key={name}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => set("categories", on ? list.filter((x) => x !== name) : [...list, name])}
                    style={[k.chip, { backgroundColor: on ? c.primary : c.surface, borderWidth: 1, borderColor: on ? c.primary : c.line }]}
                  >
                    <T style={{ fontSize: 12, color: on ? c.onPrimary : c.text }}>{name}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <T style={k.label}>Onde (vazio = todas as contas e cartões)</T>
            <View style={k.chips}>
              {[...accounts, ...cards].map((x: any) => {
                const list: string[] = form.where || [];
                const on = list.includes(x.id);
                return (
                  <Pressable
                    key={x.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => set("where", on ? list.filter((y) => y !== x.id) : [...list, x.id])}
                    style={[k.chip, { backgroundColor: on ? c.soft : c.surface, borderWidth: 1, borderColor: on ? c.primary : c.line }]}
                  >
                    <T style={{ fontSize: 12 }}>{x.name}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Choice
            label="Ciclo"
            values={[
              ["monthly", "Mensal"],
              ["fortnightly", "Quinzenal"],
              ["weekly", "Semanal"],
            ]}
            value={form.cycle || "monthly"}
            onChange={(v) => setForm((f: any) => ({ ...f, cycle: v, startDay: v === "monthly" ? 1 : 1 }))}
          />
          {(form.cycle || "monthly") === "monthly" ? (
            <Field label="Começa no dia (1 a 28)" value={String(form.startDay ?? 1)} onChange={(v) => set("startDay", v)} numeric maxLength={2} />
          ) : (
            <Choice
              label="Começa na"
              values={[
                ["1", "Segunda"],
                ["2", "Terça"],
                ["3", "Quarta"],
                ["4", "Quinta"],
                ["5", "Sexta"],
                ["6", "Sábado"],
                ["0", "Domingo"],
              ]}
              value={String(form.startDay ?? 1)}
              onChange={(v) => set("startDay", v)}
            />
          )}
        </>
      )}

      {form.kind === "goal" && (
        <>
          {!form.id && (
            <Segmented
              label="Tipo"
              values={[
                ["box", "Caixinha"],
                ["goal", "Meta"],
              ]}
              value={form.goalKind === "goal" ? "goal" : "box"}
              onChange={(v) => set("goalKind", v)}
            />
          )}
          <Muted>
            {form.goalKind === "goal"
              ? "Meta acompanha um objetivo sem separar dinheiro. Você atualiza o progresso quando quiser."
              : "Caixinha reserva dinheiro dentro de uma conta. O saldo total não muda; o disponível diminui."}
          </Muted>
          <Field label={form.goalKind === "goal" ? "Nome da meta" : "Nome da caixinha"} value={form.name} onChange={(v) => set("name", v)} autoFocus={!form.id} />
          <Field label="Quanto quer guardar? (R$)" value={form.target} onChange={(v) => set("target", v)} numeric />
          <Field label="Prazo (opcional, AAAA-MM-DD)" value={form.deadline || ""} onChange={(v) => set("deadline", v)} placeholder={addMonths(today(), 12)} />
        </>
      )}

      {form.kind === "adjustBalance" && (() => {
        const account = state.accounts.find((a: any) => a.id === form.accountId);
        const current = balance(state, form.accountId);
        let diff: number | null = null;
        try {
          diff = parseSignedMoney(`${form.negative ? "-" : ""}${form.amount}`) - current;
        } catch {
          diff = null;
        }
        const up = diff !== null && diff > 0;
        const others = accounts.filter((a: any) => a.id !== form.accountId);
        return (
          <>
            <Muted>
              {account?.name} · saldo atual {show(current)}
            </Muted>
            <Field
              label="Saldo real (R$)"
              value={form.amount}
              onChange={(v) => set("amount", v)}
              numeric
              autoFocus
              hint="O valor que a conta tem de verdade agora, como no app do banco."
            />
            <Toggle label="Saldo negativo (conta no vermelho)" value={!!form.negative} onChange={(v) => set("negative", v)} />
            {diff !== null && (
              <T style={{ fontFamily: "SoraSemi", color: diff === 0 ? c.muted : up ? c.green : c.red }}>
                {diff === 0 ? "Sem diferença: o saldo já é esse." : `Diferença: ${up ? "+" : "−"}${show(Math.abs(diff))}`}
              </T>
            )}
            <Choice
              label={diff === null ? "De onde veio a diferença?" : up ? "De onde vieram essas entradas?" : "Para onde foi a diferença?"}
              values={[
                ["income", up || diff === null ? "Lançar como receita" : "Lançar como despesa"],
                ["only", "Só ajustar (fora dos relatórios)"],
                ["transfer", "Foi transferência"],
              ]}
              value={form.adjustMode}
              onChange={(v) => set("adjustMode", v)}
            />
            <Muted>
              {form.adjustMode === "income"
                ? "Conta nos relatórios e nos totais do mês."
                : form.adjustMode === "only"
                  ? "Corrige o saldo sem entrar em receitas, despesas nem relatórios."
                  : "Move o valor entre duas contas suas. Os totais do mês não mudam."}
            </Muted>
            {form.adjustMode === "income" && (
              <Choice
                label="Categoria"
                values={categoryNames(state).map((x: string) => [x, x])}
                value={form.category}
                onChange={(v) => set("category", v)}
              />
            )}
            {form.adjustMode === "transfer" && (
              <Choice
                label={up ? "Veio de qual conta?" : "Foi para qual conta?"}
                values={others.map((a: any) => [a.id, a.name])}
                value={form.sourceId}
                onChange={(v) => set("sourceId", v)}
                empty="Cadastre outra conta para registrar uma transferência."
              />
            )}
            <Field label="Data (AAAA-MM-DD)" value={form.date} onChange={(v) => set("date", v)} maxLength={10} />
            <Field label="Motivo (opcional)" value={form.description} onChange={(v) => set("description", v)} placeholder="Ex.: dinheiro esquecido na carteira" />
          </>
        );
      })()}

      {form.kind === "goalProgress" && (
        <>
          <Field label="Quanto você já juntou? (R$)" value={form.amount} onChange={(v) => set("amount", v)} numeric autoFocus />
          <Muted>Corrige o total. A diferença fica no histórico como ajuste e não conta no ritmo dos depósitos.</Muted>
        </>
      )}

      {form.kind === "goalDeposit" && (
        <>
          <Muted>
            {state.goals.find((g: any) => g.id === form.goalId)?.name} · juntou {show(state.goals.find((g: any) => g.id === form.goalId)?.saved || 0)}
          </Muted>
          <Field label="Valor (R$)" value={form.amount} onChange={(v) => set("amount", v)} numeric autoFocus />
          <Muted>O depósito só marca o progresso da meta. Nenhuma conta muda.</Muted>
          <Field label="Data (AAAA-MM-DD)" value={form.date} onChange={(v) => set("date", v)} maxLength={10} />
          <Field label="Observação (opcional)" value={form.description} onChange={(v) => set("description", v)} placeholder="Ex.: salário de março" />
        </>
      )}

      {["deposit", "withdraw", "reserveTransfer"].includes(form.kind) && (
        <>
          <Choice label="Caixinha" values={state.goals.filter((g: any) => g.kind !== "goal" && !g.archived).map((g: any) => [g.id, g.name])} value={form.goalId} onChange={(v) => set("goalId", v)} />
          <Field label="Valor (R$)" value={form.amount} onChange={(v) => set("amount", v)} numeric autoFocus />
          <Choice
            label={form.kind === "deposit" ? "Reservar de qual conta?" : "De qual conta?"}
            values={accounts.map((a: any) => [a.id, `${a.name} · ${show(balance(state, a.id) - reserved(state, a.id))} livre`])}
            value={form.accountId}
            onChange={(v) => set("accountId", v)}
          />
          {form.kind === "reserveTransfer" && (
            <Choice
              label="Caixinha de destino"
              values={state.goals.filter((g: any) => g.id !== form.goalId && g.kind !== "goal" && !g.archived).map((g: any) => [g.id, g.name])}
              value={form.destinationGoalId}
              onChange={(v) => set("destinationGoalId", v)}
            />
          )}
        </>
      )}

      {form.kind === "yield" && (() => {
        const goal = state.goals.find((g: any) => g.id === form.goalId);
        const ids = [...new Set<string>((goal?.deposits || []).map((d: any) => d.accountId))];
        let gain: number | null = null;
        try {
          const typed = parseMoney(form.amount);
          gain = form.yieldMode === "total" ? typed - (goal?.saved || 0) : typed;
        } catch {
          gain = null;
        }
        return (
          <>
            <Muted>
              {goal?.name} · guardado {show(goal?.saved || 0)}
            </Muted>
            <Choice
              label="Como informar"
              values={[
                ["amount", "Quanto rendeu"],
                ["total", "Saldo atual da caixinha"],
              ]}
              value={form.yieldMode}
              onChange={(v) => set("yieldMode", v)}
            />
            <Field
              label={form.yieldMode === "total" ? "Saldo atual da caixinha (R$)" : "Quanto rendeu (R$)"}
              value={form.amount}
              onChange={(v) => set("amount", v)}
              numeric
              autoFocus
            />
            {gain !== null && (
              <T style={{ fontFamily: "SoraSemi", color: gain > 0 ? c.green : c.red }}>
                {gain > 0 ? `Rendimento: +${show(gain)} · caixinha passa a ${show((goal?.saved || 0) + gain)}` : "O valor precisa ser maior que o guardado."}
              </T>
            )}
            {ids.length > 1 && (
              <Choice
                label="Entra em qual conta?"
                values={ids.map((id) => [id, state.accounts.find((a: any) => a.id === id)?.name || id])}
                value={form.accountId}
                onChange={(v) => set("accountId", v)}
              />
            )}
            <Muted>O rendimento sobe o saldo da conta e a caixinha. O disponível não muda e a receita entra nos relatórios.</Muted>
            <Field label="Data (AAAA-MM-DD)" value={form.date} onChange={(v) => set("date", v)} maxLength={10} />
            <Field label="Observação (opcional)" value={form.description} onChange={(v) => set("description", v)} placeholder="Ex.: rendimento do mês" />
          </>
        );
      })()}

      {form.kind === "invoiceTotal" && (() => {
        const inv = invoice(state, form.cardId, form.month || nav.month);
        return (
          <>
            <Muted>
              Compras lançadas: {show(inv.purchasesTotal)}
              {inv.manual ? ` · total ajustado: ${show(inv.total)}` : ""}
            </Muted>
            <Field
              label="Total da fatura no banco (R$)"
              value={form.amount}
              onChange={(v) => set("amount", v)}
              numeric
              autoFocus
              hint="Deixe vazio e salve para voltar à soma das compras. O ajuste vale só para esta fatura e não pode ficar abaixo do que já foi pago."
            />
          </>
        );
      })()}

      {form.kind === "payment" && (
        <>
          <T style={[k.balanceValue, { fontSize: 30 }]}>{show(invoice(state, form.cardId, form.month || nav.month).due)}</T>
          <Muted>O pagamento sai da conta e abate a fatura. A despesa não é contada duas vezes.</Muted>
          {(() => {
            const min = minimumPayment(invoice(state, form.cardId, form.month || nav.month));
            return min > 0 ? (
              <View style={[k.row, { justifyContent: "space-between" }]}>
                <Muted style={{ flex: 1 }}>Pagamento mínimo estimado: {show(min)} (15% do total; confira no banco)</Muted>
                <Button title="Usar" secondary onPress={() => set("amount", (min / 100).toFixed(2).replace(".", ","))} />
              </View>
            ) : null;
          })()}
          <Field
            label="Valor a pagar (R$)"
            value={form.amount}
            onChange={(v) => set("amount", v)}
            numeric
            hint="Deixe vazio para pagar todo o saldo. Informe um valor para pagamento parcial."
          />
          <Choice label="Pagar usando" values={accounts.map((a: any) => [a.id, a.name])} value={form.accountId} onChange={(v) => set("accountId", v)} />
          <Field label="Data (AAAA-MM-DD)" value={form.date} onChange={(v) => set("date", v)} />
        </>
      )}

      {(form.kind === "contract" || form.kind === "changeMethod") && (
        <>
          {form.kind === "contract" && (
            <>
              <Choice
                label="Tipo de contrato"
                values={[
                  ["financing", "Financiamento"],
                  ["loan", "Empréstimo"],
                ]}
                value={form.type === "loan" ? "loan" : "financing"}
                onChange={(v) => set("type", v)}
              />
              <Muted>
                {form.type === "loan"
                  ? "Dinheiro tomado de banco ou fintech. As parcelas aceitam pagamento em partes e juros por atraso."
                  : "Um bem financiado — imóvel, carro, moto — com parcelas definidas."}
              </Muted>
              <Field label="Nome do contrato" value={form.name} onChange={(v) => set("name", v)} placeholder="Ex.: Carro, Apartamento" />
              <Field label="Instituição (opcional)" value={form.institution} onChange={(v) => set("institution", v)} />
            </>
          )}
          <Choice
            label="Como a parcela se comporta"
            values={[
              ["fixed", "Parcela fixa"],
              ["price", "Price"],
              ["sac", "SAC"],
            ]}
            value={form.method}
            onChange={(v) => set("method", v)}
          />
          <Muted>
            {form.method === "fixed"
              ? "Todas as parcelas iguais. Use quando não souber o sistema do contrato; não pede taxa. Dá para trocar depois sem perder o histórico."
              : form.method === "price"
                ? "Parcela constante, separando juros e amortização. Informe a taxa e a parcela, ou a taxa e o saldo devedor."
                : "A parcela cai um pouco a cada mês; comum em imóveis. Informe a taxa e o saldo devedor."}
          </Muted>
          {form.method !== "sac" && (
            <Field
              label="Valor da parcela mensal (R$)"
              value={form.amount}
              onChange={(v) => set("amount", v)}
              numeric
              hint="Quanto você paga por mês, sem seguros — não o total do contrato."
            />
          )}
          {form.method !== "fixed" && (
            <>
              <Field label="Taxa de juros (% ao mês)" value={form.rate} onChange={(v) => set("rate", v)} numeric placeholder="1,2" />
              <Field
                label={form.method === "sac" ? "Saldo devedor (R$)" : "Saldo devedor (opcional, R$)"}
                value={form.principal}
                onChange={(v) => set("principal", v)}
                numeric
                hint={form.method === "price" ? "Se informar, a parcela é calculada a partir dele." : undefined}
              />
            </>
          )}
          <Field label="Seguros e tarifas por mês (opcional, R$)" value={form.insurance} onChange={(v) => set("insurance", v)} numeric />
          {form.kind === "contract" && (
            <>
              <View style={[k.row, { alignItems: "flex-start" }]}>
                <View style={{ flex: 1 }}>
                  <Field label="Total de parcelas" value={form.count} onChange={(v) => set("count", v)} numeric maxLength={3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Já pagas" value={form.paid} onChange={(v) => set("paid", v)} numeric maxLength={3} />
                </View>
              </View>
              <Field label="Próxima parcela (AAAA-MM-DD)" value={form.date} onChange={(v) => set("date", v)} />
              <Choice label="Categoria" values={categoryNames(state).map((x: string) => [x, x])} value={form.category} onChange={(v) => set("category", v)} />
              <Choice label="Conta de pagamento" values={accounts.map((a: any) => [a.id, a.name])} value={form.accountId} onChange={(v) => set("accountId", v)} />
            </>
          )}
        </>
      )}

      {form.kind === "recurrence" && (
        <>
          <Choice
            label="Tipo"
            values={[
              ["expense", "Despesa"],
              ["income", "Receita"],
            ]}
            value={form.type === "income" ? "income" : "expense"}
            onChange={(v) => set("type", v)}
          />
          <Field label="Valor (R$)" value={form.amount} onChange={(v) => set("amount", v)} numeric autoFocus={!form.id} />
          <Field label="Descrição" value={form.description} onChange={(v) => set("description", v)} placeholder="Ex.: Aluguel, Salário, Streaming" />
          <Choice
            label="Frequência"
            values={[
              ["daily", "Diária"],
              ["weekly", "Semanal"],
              ["fortnightly", "A cada 14 dias"],
              ["monthly", "Mensal"],
              ["yearly", "Anual"],
            ]}
            value={form.frequency}
            onChange={(v) => set("frequency", v)}
          />
          <Field label="Primeira data (AAAA-MM-DD)" value={form.date} onChange={(v) => set("date", v)} />
          <Field label="Término (opcional)" value={form.endDate} onChange={(v) => set("endDate", v)} placeholder="AAAA-MM-DD" />
          <CategoryRow
            state={state}
            type={form.type === "income" ? "income" : "expense"}
            category={form.category}
            subcategory={form.subcategory}
            onChange={(cat, sub) => setForm((f: any) => ({ ...f, category: cat, subcategory: sub }))}
          />
          <Choice label="Conta" values={accounts.map((a: any) => [a.id, a.name])} value={form.accountId} onChange={(v) => set("accountId", v)} />
          <Muted>As ocorrências até hoje entram como pendentes para você confirmar. As futuras aparecem nas projeções.</Muted>
        </>
      )}

      {["contractPay", "lateFee", "extraAmort", "settle"].includes(form.kind) && (
        <>
          {!!form.info && <Muted>{form.info}</Muted>}
          {form.kind === "extraAmort" && (
            <Choice
              label="O que reduzir"
              values={[
                ["term", "Prazo (menos parcelas)"],
                ["payment", "Valor da parcela"],
              ]}
              value={form.mode}
              onChange={(v) => set("mode", v)}
            />
          )}
          <Field
            label={form.kind === "settle" ? "Valor da quitação (R$)" : form.kind === "extraAmort" ? "Valor pago (R$)" : "Valor (R$)"}
            value={form.amount}
            onChange={(v) => set("amount", v)}
            numeric
            autoFocus
            hint={
              form.kind === "settle"
                ? "Já vem com o saldo devedor. Ajuste se o banco informou outro valor."
                : form.kind === "contractPay"
                  ? "Informe menos que a parcela para pagar em partes."
                  : undefined
            }
          />
          {form.kind === "extraAmort" && (
            <>
              <Field
                label="Novo saldo devedor (R$)"
                value={form.newDebt}
                onChange={(v) => set("newDebt", v)}
                numeric
                hint="Deixe vazio para usar o calculado (saldo atual menos o valor pago). Informe o valor do banco se ele for diferente."
              />
              <Toggle
                label="Sem movimentar conta"
                value={!!form.offApp}
                onChange={(v) => set("offApp", v)}
                hint="Pago com FGTS ou outro recurso de fora: entra só no histórico do contrato e não debita nenhuma conta."
              />
            </>
          )}
          {form.kind !== "lateFee" && (
            <>
              {!(form.kind === "extraAmort" && form.offApp) && (
                <Choice label="Pagar com" values={accounts.map((a: any) => [a.id, a.name])} value={form.accountId} onChange={(v) => set("accountId", v)} />
              )}
              <Field label="Data (AAAA-MM-DD)" value={form.date} onChange={(v) => set("date", v)} />
            </>
          )}
          {form.kind === "extraAmort" && (
            <Field label="Observação (opcional)" value={form.description} onChange={(v) => set("description", v)} placeholder="Ex.: FGTS, bônus" />
          )}
        </>
      )}

      {["extraAmort", "changeMethod"].includes(form.kind) && form.contractId && (() => {
        let text = "";
        try {
          const next = buildChange(form, nav.month)(state);
          const p = previewOf(next, form.contractId);
          const last = p.lastDate ? p.lastDate.split("-").reverse().join("/") : "—";
          text = `Vai ficar assim: ${p.openCount} parcelas restantes · última em ${last} · ${show(p.total)} a pagar em parcelas · saldo devedor ${show(p.debt)}`;
        } catch (e: any) {
          if (form.kind === "extraAmort" && form.amount?.trim()) text = e?.message || "";
        }
        if (!text) {
          try {
            const now = contractStatus(state, form.contractId);
            text = `Agora: ${now.openCount} parcelas restantes · saldo devedor ${show(now.debt)}`;
          } catch {
            text = "";
          }
        }
        return text ? <Muted accessibilityLiveRegion="polite">{text}</Muted> : null;
      })()}

      {!!error && (
        <T accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: c.red }}>
          {error}
        </T>
      )}
      <Button
        title={saving ? "Salvando…" : form.kind === "payment" ? "Confirmar pagamento" : "Salvar"}
        disabled={saving}
        onPress={() => save(false)}
        icon="check"
      />
      {tx && !form.editId && <Button title="Salvar e continuar" secondary disabled={saving} onPress={() => save(true)} />}
      <View style={{ height: 24 }} />
    </View>
  );
}

function shiftDay(date: string, n: number) {
  const d = new Date((/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today()) + "T12:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
