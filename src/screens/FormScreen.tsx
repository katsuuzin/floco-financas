import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { T, Muted, Field, Choice, Toggle, Button, IconButton, Section, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { buildChange, defaults, formTitles } from "../app/forms";
import { categoryNames } from "../planning.mjs";
import { bankProfiles, bankProfile } from "../banks.mjs";
import { invoice, balance, reserved, today, addMonths, ACCOUNT_TYPES } from "../finance.mjs";

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
            <Choice
              label="Tipo"
              values={[
                ["expense", "Despesa"],
                ["card", "Despesa no cartão"],
                ["income", "Receita"],
                ["transfer", "Transferência"],
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
          <Field label="Valor (R$)" value={form.amount} onChange={(v) => set("amount", v)} numeric placeholder="0,00" autoFocus={!form.editId} />
          {!form.cardId && form.type !== "transfer" && (
            <Toggle
              label={form.type === "income" ? "Já recebido" : "Já pago"}
              value={form.confirmed}
              onChange={(v) => set("confirmed", v)}
              hint={form.confirmed ? undefined : "Pendente: não altera o saldo até você confirmar."}
            />
          )}
          <View style={[k.row, { alignItems: "flex-end" }]}>
            <View style={{ flex: 1 }}>
              <Field label="Data (AAAA-MM-DD)" value={form.date} onChange={(v) => set("date", v)} placeholder={today()} />
            </View>
            <IconButton name="chevron-left" label="Dia anterior" onPress={() => set("date", shiftDay(form.date, -1))} />
            <IconButton name="chevron-right" label="Próximo dia" onPress={() => set("date", shiftDay(form.date, 1))} />
          </View>
          <Field label="Horário (opcional)" value={form.time} onChange={(v) => set("time", v)} placeholder="HH:MM" maxLength={5} />
          <Field
            label="Descrição (opcional)"
            value={form.description}
            onChange={(v) => set("description", v)}
            hint="Sem descrição, o lançamento usa o nome da categoria."
          />
          {form.type !== "transfer" && (
            <Choice
              label="Categoria"
              values={categoryNames(state).map((x: string) => [x, x])}
              value={form.category}
              onChange={(v) => set("category", v)}
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
              {form.type === "expense" && (
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
            label="Categoria"
            values={categoryNames(state).filter((x: string) => x !== "Salário").map((x: string) => [x, x])}
            value={form.category}
            onChange={(v) => set("category", v)}
          />
          <Field label="Limite mensal (R$)" value={form.amount} onChange={(v) => set("amount", v)} numeric />
          <Muted>Se a categoria já tiver orçamento, o limite é atualizado. O mesmo limite vale para todos os meses.</Muted>
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
