// Quem me deve: valores a receber de uma pessoa ou empresa, com recebimentos parciais, vencimento e anexos
// (print, comprovante ou documento). É o espelho de "Quem eu devo". Receber cria uma receita na conta escolhida.
import React, { useRef, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { AmountField, Box, Button, CreateAction, Choice, Empty, Field, Muted, T, space } from "../ui/kit";
import { useHeaderAction } from "../app/headerAction";
import { DateField } from "../ui/DateTime";
import { DiscardDraftSheet, SheetModal } from "../ui/Sheet";
import AttachmentsField, { deleteAttachmentFiles } from "../ui/Attachments";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { visibleAccounts } from "../accountOrder.mjs";
import { brDate } from "../dates.mjs";
import { formatMoneyInput, parseMoney, today } from "../finance.mjs";
import { addReceivable, receiveDebt, receivableBalance, undoDebtPayment } from "../planning.mjs";


export default function ReceivablesScreen() {
  const { c } = useTheme();
  const { state, perform, show } = useStore();
  const debts: any[] = state.receivables || [];
  const [detail, setDetail] = useState("");
  const [creating, setCreating] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const current = debts.find((d) => d.id === detail);
  useHeaderAction(detail ? null : "Novo valor a receber", () => setCreating(true));
  const total = debts.reduce((n, d) => n + receivableBalance(d), 0);

  if (current) {
    const left = receivableBalance(current);
    return (
      <View style={{ gap: space.md }}>
        <T style={{ fontFamily: "SoraSemi", fontSize: 24 }}>{current.person}</T>
        <T>{current.description}</T>
        <Box style={{ gap: 4 }}>
          <Muted>Falta receber</Muted>
          <T accessibilityLabel={`Falta receber ${show(left)}`} style={{ fontFamily: "SoraBold", fontSize: 28 }}>{show(left)}</T>
          <Muted>
            {`Total registrado: ${show(current.amount)} · desde ${brDate(current.date)}`}
            {current.dueDate ? ` · vence ${brDate(current.dueDate)}` : ""}
          </Muted>
        </Box>
        {left > 0 && <Button title="Registrar recebimento" icon="dollar-sign" onPress={() => setReceiving(true)} />}
        <T style={{ fontFamily: "SoraSemi", marginTop: space.sm }}>Histórico de recebimentos</T>
        {!current.payments.length && <Muted>Nenhum recebimento registrado.</Muted>}
        {current.payments.map((p: any) => (
          <Box key={p.id} style={{ gap: 6 }}>
            <T>{`${show(p.amount)} · ${brDate(p.date)}`}</T>
            <Muted>{state.accounts.find((a: any) => a.id === p.accountId)?.name || ""}</Muted>
            <Button title="Desfazer recebimento" secondary icon="rotate-ccw" onPress={() =>
              Alert.alert("Desfazer recebimento?", "A receita sai da conta e o valor volta para o que falta receber.", [
                { text: "Cancelar", style: "cancel" },
                { text: "Desfazer", onPress: () => void perform((s: any) => undoDebtPayment(s, current.id, p.id), "recebimento desfeito") },
              ])} />
          </Box>
        ))}
        <AttachmentsField list="receivables" rowId={current.id} attachments={current.attachments} />
        {!current.payments.length && (
          <Button title="Excluir registro" secondary icon="trash-2" onPress={() =>
            Alert.alert("Excluir registro?", "O registro e os anexos serão apagados. Nenhuma conta é movimentada.", [
              { text: "Cancelar", style: "cancel" },
              { text: "Excluir", style: "destructive", onPress: async () => {
                const files = current.attachments;
                if (await perform((s: any) => ({ ...s, receivables: s.receivables.filter((d: any) => d.id !== current.id) }), "registro excluído")) {
                  void deleteAttachmentFiles(files);
                  setDetail("");
                }
              } },
            ])} />
        )}
        <Button title="Voltar para a lista" secondary onPress={() => setDetail("")} />
        {receiving && <ReceiveSheet debt={current} onClose={() => setReceiving(false)} />}
      </View>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <Box style={{ gap: 4 }}>
        <Muted>Total a receber</Muted>
        <T accessibilityLabel={`Total a receber ${show(total)}`} style={{ fontFamily: "SoraBold", fontSize: 28 }}>{show(total)}</T>
      </Box>
      {debts.length === 0 && <CreateAction title="Novo valor a receber" onPress={() => setCreating(true)} />}
      {debts.length === 0 && (
        <Empty icon="users" title="Ninguém te deve por aqui" body="Acompanhe empréstimos, vendas ou divisões de conta, com o print da conversa." />
      )}
      {debts.map((d) => {
        const left = receivableBalance(d);
        const late = !!d.dueDate && d.dueDate < today() && left > 0;
        return (
          <Box key={d.id} style={{ gap: 6 }}>
            <T style={{ fontFamily: "SoraSemi" }}>{d.person}</T>
            <T>{d.description}</T>
            <T>{left ? `A receber: ${show(left)}` : "Quitado"}</T>
            {!!d.dueDate && <Muted style={late ? { color: c.red } : undefined}>{`${late ? "Vencido em " : "Vencimento: "}${brDate(d.dueDate)}`}</Muted>}
            {!!d.attachments?.length && <Muted>{`${d.attachments.length} ${d.attachments.length === 1 ? "anexo" : "anexos"}`}</Muted>}
            <Button title="Ver dívida e recebimentos" secondary onPress={() => setDetail(d.id)} />
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
        const next = addReceivable(s, { ...form, amount });
        id = next.receivables[next.receivables.length - 1].id;
        return next;
      };
      change({ receivables: [] });
      if (await perform(change, "valor a receber registrado")) onCreated(id);
    } catch (e: any) {
      setError(e.message);
    }
  };
  if (discard) return <DiscardDraftSheet title="Descartar alterações?" onContinue={() => setDiscard(false)} onDiscard={onClose} />;
  return (
    <SheetModal title="Novo valor a receber" onClose={closeDraft} footer={<Button title="Salvar" onPress={() => void save()} />}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, paddingTop: space.xs, gap: space.md }}>
        <Field label="Quem te deve" value={form.person} onChange={(v) => set("person", v)} maxLength={80} />
        <Field label="Motivo / descrição" value={form.description} onChange={(v) => set("description", v)} maxLength={120} />
        <AmountField label="Valor" value={form.amount} onChange={(v) => set("amount", v)} />
        <DateField label="Data do registro" value={form.date} onChange={(v) => set("date", v)} />
        <DateField label="Vencimento" value={form.dueDate} onChange={(v) => set("dueDate", v)} optional />
        <Muted>Este cadastro acompanha um valor que você tem a receber. Não movimenta nenhuma conta até você registrar um recebimento.</Muted>
        {!!error && <Muted accessibilityLiveRegion="polite" style={{ color: c.red }}>{error}</Muted>}
      </ScrollView>
    </SheetModal>
  );
}

function ReceiveSheet({ debt, onClose }: { debt: any; onClose: () => void }) {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const accounts = visibleAccounts(state);
  const [form, setForm] = useState({ amount: formatMoneyInput(receivableBalance(debt)), date: today(), accountId: accounts[0]?.id || "" });
  const baseline = useRef(JSON.stringify(form));
  const [discard, setDiscard] = useState(false);
  const closeDraft = () => JSON.stringify(form) === baseline.current ? onClose() : setDiscard(true);
  const [error, setError] = useState("");
  const set = (key: string, value: string) => { setForm({ ...form, [key]: value }); setError(""); };
  const save = async () => {
    try {
      const amount = parseMoney(form.amount);
      receiveDebt({ ...state }, debt.id, amount, form.accountId, form.date);
      if (await perform((s: any) => receiveDebt(s, debt.id, amount, form.accountId, form.date), "recebimento registrado")) onClose();
    } catch (e: any) {
      setError(e.message);
    }
  };
  if (discard) return <DiscardDraftSheet title="Descartar alterações?" onContinue={() => setDiscard(false)} onDiscard={onClose} />;
  return (
    <SheetModal title="Registrar recebimento" onClose={closeDraft} footer={<Button title="Registrar" onPress={() => void save()} />}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, paddingTop: space.xs, gap: space.md }}>
        <AmountField label="Valor recebido" value={form.amount} onChange={(v) => set("amount", v)} />
        <DateField label="Data do recebimento" value={form.date} onChange={(v) => set("date", v)} />
        <Choice label="Conta de onde entrou" value={form.accountId} onChange={(v) => set("accountId", v)}
          values={accounts.map((a: any) => [a.id, a.name] as [string, string])} />
        <Muted>O recebimento vira uma receita na conta e pode ser desfeito no histórico do registro.</Muted>
        {!!error && <Muted accessibilityLiveRegion="polite" style={{ color: c.red }}>{error}</Muted>}
      </ScrollView>
    </SheetModal>
  );
}
