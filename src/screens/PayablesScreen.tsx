// Quem eu devo (1.12): dívidas a pagar a uma pessoa ou empresa, com pagamentos parciais, vencimento e anexos
// (print, comprovante ou documento). É o espelho de "Quem me deve". Pagar cria uma despesa na conta escolhida.
import React, { useRef, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { AmountField, Box, Button, CreateAction, Choice, DateField, Empty, Field, Muted, T, space } from "../ui/kit";
import { DiscardDraftSheet, SheetModal } from "../ui/Sheet";
import AttachmentsField, { deleteAttachmentFiles } from "../ui/Attachments";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { visibleAccounts } from "../accountOrder.mjs";
import { brDate } from "../dates.mjs";
import { formatMoneyInput, parseMoney, today } from "../finance.mjs";
import { addPayable, payDebt, payableBalance, undoPayablePayment } from "../planning.mjs";


export default function PayablesScreen() {
  const { c } = useTheme();
  const { state, perform, show } = useStore();
  const debts: any[] = state.payables || [];
  const [detail, setDetail] = useState("");
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(false);
  const current = debts.find((d) => d.id === detail);
  const total = debts.reduce((n, d) => n + payableBalance(d), 0);

  if (current) {
    const left = payableBalance(current);
    return (
      <View style={{ gap: space.md }}>
        <T style={{ fontFamily: "SoraSemi", fontSize: 24 }}>{current.person}</T>
        <T>{current.description}</T>
        <Box style={{ gap: 4 }}>
          <Muted>Falta pagar</Muted>
          <T accessibilityLabel={`Falta pagar ${show(left)}`} style={{ fontFamily: "SoraBold", fontSize: 28 }}>{show(left)}</T>
          <Muted>
            {`Total da dívida: ${show(current.amount)} · desde ${brDate(current.date)}`}
            {current.dueDate ? ` · vence ${brDate(current.dueDate)}` : ""}
          </Muted>
        </Box>
        {left > 0 && <Button title="Registrar pagamento" icon="dollar-sign" onPress={() => setPaying(true)} />}
        <T style={{ fontFamily: "SoraSemi", marginTop: space.sm }}>Histórico de pagamentos</T>
        {!current.payments.length && <Muted>Nenhum pagamento registrado.</Muted>}
        {current.payments.map((p: any) => (
          <Box key={p.id} style={{ gap: 6 }}>
            <T>{`${show(p.amount)} · ${brDate(p.date)}`}</T>
            <Muted>{state.accounts.find((a: any) => a.id === p.accountId)?.name || ""}</Muted>
            <Button title="Desfazer pagamento" secondary icon="rotate-ccw" onPress={() =>
              Alert.alert("Desfazer pagamento?", "A despesa sai da conta e o valor volta para o que falta pagar.", [
                { text: "Cancelar", style: "cancel" },
                { text: "Desfazer", onPress: () => void perform((s: any) => undoPayablePayment(s, current.id, p.id), "pagamento desfeito") },
              ])} />
          </Box>
        ))}
        <AttachmentsField list="payables" rowId={current.id} attachments={current.attachments} />
        {!current.payments.length && (
          <Button title="Excluir dívida" secondary icon="trash-2" onPress={() =>
            Alert.alert("Excluir dívida?", "O registro e os anexos serão apagados. Nenhuma conta é movimentada.", [
              { text: "Cancelar", style: "cancel" },
              { text: "Excluir", style: "destructive", onPress: async () => {
                const files = current.attachments;
                if (await perform((s: any) => ({ ...s, payables: s.payables.filter((d: any) => d.id !== current.id) }), "dívida excluída")) {
                  void deleteAttachmentFiles(files);
                  setDetail("");
                }
              } },
            ])} />
        )}
        <Button title="Voltar para a lista" secondary onPress={() => setDetail("")} />
        {paying && <PaySheet debt={current} onClose={() => setPaying(false)} />}
      </View>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <Box style={{ gap: 4 }}>
        <Muted>Total que você deve</Muted>
        <T accessibilityLabel={`Total que você deve ${show(total)}`} style={{ fontFamily: "SoraBold", fontSize: 28 }}>{show(total)}</T>
      </Box>
      <CreateAction title="Nova dívida" onPress={() => setCreating(true)} />
      {debts.length === 0 && (
        <Empty icon="users" title="Você não deve a ninguém por aqui" body="Anote empréstimos, compras combinadas e contas que você precisa pagar a alguém, com o print da conversa." />
      )}
      {debts.map((d) => {
        const left = payableBalance(d);
        const late = !!d.dueDate && d.dueDate < today() && left > 0;
        return (
          <Box key={d.id} style={{ gap: 6 }}>
            <T style={{ fontFamily: "SoraSemi" }}>{d.person}</T>
            <T>{d.description}</T>
            <T>{left ? `A pagar: ${show(left)}` : "Quitado"}</T>
            {!!d.dueDate && <Muted style={late ? { color: c.red } : undefined}>{`${late ? "Vencido em " : "Vencimento: "}${brDate(d.dueDate)}`}</Muted>}
            {!!d.attachments?.length && <Muted>{`${d.attachments.length} ${d.attachments.length === 1 ? "anexo" : "anexos"}`}</Muted>}
            <Button title="Ver dívida e pagamentos" secondary onPress={() => setDetail(d.id)} />
          </Box>
        );
      })}
      {creating && <NewSheet onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setDetail(id); }} />}
    </View>
  );
}

function NewSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { c } = useTheme();
  const { perform } = useStore();
  const [form, setForm] = useState({ person: "", description: "", amount: "", date: today(), dueDate: "" });
  const baseline = useRef(JSON.stringify(form));
  const [discard, setDiscard] = useState(false);
  const closeDraft = () => JSON.stringify(form) === baseline.current ? onClose() : setDiscard(true);
  const [error, setError] = useState("");
  const set = (key: string, value: string) => { setForm({ ...form, [key]: value }); setError(""); };
  const save = async () => {
    try {
      const amount = parseMoney(form.amount);
      let id = "";
      const change = (s: any) => {
        const next = addPayable(s, { ...form, amount });
        id = next.payables[next.payables.length - 1].id;
        return next;
      };
      change({ payables: [] });
      if (await perform(change, "dívida registrada")) onCreated(id);
    } catch (e: any) {
      setError(e.message);
    }
  };
  if (discard) return <DiscardDraftSheet title="Descartar alterações?" onContinue={() => setDiscard(false)} onDiscard={onClose} />;
  return (
    <SheetModal title="Nova dívida" onClose={closeDraft} footer={<Button title="Salvar" onPress={() => void save()} />}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, paddingTop: space.xs, gap: space.md }}>
        <Field label="A quem você deve" value={form.person} onChange={(v) => set("person", v)} maxLength={80} />
        <Field label="Motivo / descrição" value={form.description} onChange={(v) => set("description", v)} maxLength={120} />
        <AmountField label="Valor da dívida" value={form.amount} onChange={(v) => set("amount", v)} />
        <DateField label="Data do registro" value={form.date} onChange={(v) => set("date", v)} />
        <DateField label="Vencimento" value={form.dueDate} onChange={(v) => set("dueDate", v)} optional />
        <Muted>Este cadastro acompanha um valor que você deve. Não movimenta nenhuma conta até você registrar um pagamento.</Muted>
        {!!error && <Muted accessibilityLiveRegion="polite" style={{ color: c.red }}>{error}</Muted>}
      </ScrollView>
    </SheetModal>
  );
}

function PaySheet({ debt, onClose }: { debt: any; onClose: () => void }) {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const accounts = visibleAccounts(state);
  const [form, setForm] = useState({ amount: formatMoneyInput(payableBalance(debt)), date: today(), accountId: accounts[0]?.id || "" });
  const baseline = useRef(JSON.stringify(form));
  const [discard, setDiscard] = useState(false);
  const closeDraft = () => JSON.stringify(form) === baseline.current ? onClose() : setDiscard(true);
  const [error, setError] = useState("");
  const set = (key: string, value: string) => { setForm({ ...form, [key]: value }); setError(""); };
  const save = async () => {
    try {
      const amount = parseMoney(form.amount);
      payDebt({ ...state }, debt.id, amount, form.accountId, form.date);
      if (await perform((s: any) => payDebt(s, debt.id, amount, form.accountId, form.date), "pagamento registrado")) onClose();
    } catch (e: any) {
      setError(e.message);
    }
  };
  if (discard) return <DiscardDraftSheet title="Descartar alterações?" onContinue={() => setDiscard(false)} onDiscard={onClose} />;
  return (
    <SheetModal title="Registrar pagamento" onClose={closeDraft} footer={<Button title="Registrar" onPress={() => void save()} />}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, paddingTop: space.xs, gap: space.md }}>
        <AmountField label="Valor pago" value={form.amount} onChange={(v) => set("amount", v)} />
        <DateField label="Data do pagamento" value={form.date} onChange={(v) => set("date", v)} />
        <Choice label="Conta de onde saiu" value={form.accountId} onChange={(v) => set("accountId", v)}
          values={accounts.map((a: any) => [a.id, a.name] as [string, string])} />
        <Muted>O pagamento vira uma despesa na conta e pode ser desfeito no histórico da dívida.</Muted>
        {!!error && <Muted accessibilityLiveRegion="polite" style={{ color: c.red }}>{error}</Muted>}
      </ScrollView>
    </SheetModal>
  );
}
