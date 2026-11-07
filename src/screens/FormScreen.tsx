import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { T, Muted, I, Field, Choice, Toggle, Button, IconButton, Segmented, AmountField, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { buildChange, defaults, formTitles } from "../app/forms";
import { categoryNames } from "../planning.mjs";
import { bankProfiles, bankProfile } from "../banks.mjs";
import { invoice, balance, reserved, today, addMonths, ACCOUNT_TYPES } from "../finance.mjs";
import { categorize } from "../rules.mjs";

const COLORS: [string, string][] = [
  ["#311E0D", "Marrom"],
  ["#820AD1", "Roxo"],
  ["#E67E22", "Laranja"],
  ["#335E9A", "Azul"],
  ["#2E7D5B", "Verde"],
  ["#B53846", "Vermelho"],
];

export default function FormScreen({ kind, initial }: { kind: string; initial?: any }) {
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
  const accounts = state.accounts.filter((a: any) => !a.archived || a.id === form.accountId);
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
      state.goals.some((g: any) => g.deposits.some((d: any) => d.accountId === form.id)) ||
      (state.recurrences || []).some((r: any) => r.accountId === form.id) ||
      (state.financings || []).some((r: any) => r.accountId === form.id) ||
      state.cards.some((x: any) => x.accountId === form.id);
    if (used)
      return confirm(
        "Arquivar conta?",
        "Esta conta tem histórico. Ela sai das listas e dos formulários, mas o histórico e os relatórios continuam corretos. Dá para restaurar em Contas.",
        () =>
          perform(
            (s: any) => ({ ...s, accounts: s.accounts.map((a: any) => (a.id === form.id ? { ...a, archived: true } : a)) }),
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
                return { ...f, description: v, ...(rule ? { category: rule.category } : {}) };
              })
            }
            hint="Sem descrição, o lançamento usa o nome da categoria. As regras de categorização sugerem a categoria."
          />
          {form.type !== "transfer" && (
            <Choice
              label="Categoria"
              values={categoryNames(state).map((x: string) => [x, x])}
              value={form.category}
              onChange={(v) => setForm((f: any) => ({ ...f, category: v, categoryTouched: true }))}
            />
          )}
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
          <Choice label="Cor" values={COLORS} value={form.color || "#311E0D"} onChange={(v) => set("color", v)} />
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
          <Choice label="Cor" values={COLORS} value={form.color || "#311E0D"} onChange={(v) => set("color", v)} />
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
          <Field label="Nome da meta" value={form.name} onChange={(v) => set("name", v)} autoFocus={!form.id} />
          <Field label="Quanto quer guardar? (R$)" value={form.target} onChange={(v) => set("target", v)} numeric />
          <Field label="Prazo (opcional, AAAA-MM-DD)" value={form.deadline || ""} onChange={(v) => set("deadline", v)} placeholder={addMonths(today(), 12)} />
        </>
      )}

      {["deposit", "withdraw", "reserveTransfer"].includes(form.kind) && (
        <>
          <Choice label="Meta" values={state.goals.map((g: any) => [g.id, g.name])} value={form.goalId} onChange={(v) => set("goalId", v)} />
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
              values={state.goals.filter((g: any) => g.id !== form.goalId).map((g: any) => [g.id, g.name])}
              value={form.destinationGoalId}
              onChange={(v) => set("destinationGoalId", v)}
            />
          )}
        </>
      )}

      {form.kind === "payment" && (
        <>
          <T style={[k.balanceValue, { fontSize: 30 }]}>{show(invoice(state, form.cardId, form.month || nav.month).due)}</T>
          <Muted>O pagamento sai da conta e abate a fatura. A despesa não é contada duas vezes.</Muted>
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
          <Choice label="Categoria" values={categoryNames(state).map((x: string) => [x, x])} value={form.category} onChange={(v) => set("category", v)} />
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
            label={form.kind === "settle" ? "Valor da quitação (R$)" : "Valor (R$)"}
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
          {form.kind !== "lateFee" && (
            <>
              <Choice label="Pagar com" values={accounts.map((a: any) => [a.id, a.name])} value={form.accountId} onChange={(v) => set("accountId", v)} />
              <Field label="Data (AAAA-MM-DD)" value={form.date} onChange={(v) => set("date", v)} />
            </>
          )}
        </>
      )}

      {!!error && (
        <T accessibilityRole="alert" style={{ color: c.red }}>
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
