import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { BANK_APPS, nativeConfig, notifySettings } from "../bankCatalog.mjs";
import { suggestNotification } from "../notification-import.mjs";
import { useBankInbox } from "../app/inbox";
import { useStore } from "../app/store";
import { Box, Button, Field, Group, Muted, Row, Section, T, Toggle } from "../ui/kit";
import { ConfirmSheet, SheetModal } from "../ui/Sheet";
import { useTheme } from "../ui/theme";
import BankBadge from "../ui/BankBadge";
import InboxSheet from "./InboxSheet";

const MAIN_BANKS = new Set(["Nubank", "Inter", "Itaú", "Bradesco", "Santander", "Caixa", "Banco do Brasil", "C6 Bank", "Mercado Pago", "PicPay"]);
const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export default function NotificationsScreen() {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const { status, native, rows, hiddenRows, refresh, dismiss } = useBankInbox(state);
  const notify = notifySettings(state);
  const [ignored, setIgnored] = useState(notify.ignored.join(", "));
  const [catalog, setCatalog] = useState(false);
  const [query, setQuery] = useState("");
  const [review, setReview] = useState<any>(null);
  const [discard, setDiscard] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const permission = !!status?.permission;
  const available = !!status?.available;

  useEffect(() => {
    if (!native?.configure) return;
    const cfg = nativeConfig(state);
    void native.configure(cfg.packages, cfg.ignored, cfg.sms, cfg.smsSenders)
      .catch(() => setError("Não foi possível enviar as preferências ao Android."));
  }, [native, state.settings?.notify]);

  const run = async (operation: () => Promise<unknown>, message: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch {
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const setNotify = (patch: Record<string, unknown>) =>
    perform((s: any) => ({ ...s, settings: { ...s.settings, notify: { ...notifySettings(s), ...patch } } }), "Preferência salva");

  const bankToggle = ([pkg, label]: string[]) => (
    <View key={pkg} style={{ paddingHorizontal: 16 }}>
      <Toggle
        label={label}
        leading={<BankBadge name={label} size={26} />}
        value={notify.banks.includes(pkg)}
        onChange={(on) => {
          void perform((s: any) => {
            const current = notifySettings(s);
            const banks = on ? [...new Set([...current.banks, pkg])] : current.banks.filter((id: string) => id !== pkg);
            return { ...s, settings: { ...s.settings, notify: { ...current, banks } } };
          }, "Preferência salva");
        }}
      />
    </View>
  );

  const chosen = BANK_APPS.filter(([pkg]) => notify.banks.includes(pkg));
  const main = BANK_APPS.filter(([pkg, label]) => MAIN_BANKS.has(label) && !notify.banks.includes(pkg));
  const results = BANK_APPS.filter(([, label]) => normalize(label).includes(normalize(query)));
  const pending = [...rows, ...hiddenRows];
  const remove = (id: string) => run(() => dismiss(id), "Não foi possível remover a sugestão da fila.");

  return (
    <>
      <Box style={{ gap: 12 }}>
        <T style={{ fontFamily: "SoraSemi" }}>{permission ? "Acesso Android permitido" : "Acesso Android pendente"}</T>
        <Muted>O Floco guarda sugestões dos bancos selecionados neste aparelho. Códigos de acesso são descartados. Você confirma cada lançamento.</Muted>
        {!available && status && <Muted>Atualize o Floco para ler notificações.</Muted>}
        {!permission && (
          <Button title="Permitir acesso às notificações" disabled={!available || busy} onPress={() => {
            void run(() => native.openSettings(), "Não foi possível abrir o acesso às notificações.");
          }} />
        )}
        <Toggle label="Ler notificações dos bancos" value={permission && !!status?.enabled} disabled={!permission || busy}
          hint={!permission ? "Permita o acesso primeiro" : "Notificações antigas removidas pelo Android não são recuperadas."}
          onChange={(on) => {
            void run(async () => { await native.setEnabled(on); await refresh(); }, "Não foi possível alterar a leitura das notificações.");
          }}
        />
      </Box>
      <Section title={`Bancos monitorados (${chosen.length})`} />
      {chosen.length > 0 && <Group>{chosen.map(bankToggle)}</Group>}
      {main.length > 0 && <Group title="Principais">{main.map(bankToggle)}</Group>}
      <Group>
        <Row icon="search" label={`Ver todos (${BANK_APPS.length})`} onPress={() => { setQuery(""); setCatalog(true); }} />
      </Group>

      <Section title="Preferências de leitura" />
      <Box style={{ gap: 12 }}>
        <Toggle label="Ler SMS de compra dos bancos" value={!!notify.sms} onChange={(sms) => void setNotify({ sms })}
          hint="Lê os avisos do app de mensagens enviados pelos bancos selecionados." />
        <Toggle label="Não registrar compras negadas" value={notify.ignoreDenied !== false} onChange={(ignoreDenied) => void setNotify({ ignoreDenied })}
          hint="Avisos de compras recusadas saem da fila automaticamente." />
        <Field label="Palavras ignoradas" hint="Separe as palavras por vírgula." value={ignored}
          placeholder="Ex.: cashback, fatura fechada" onChange={setIgnored} maxLength={2000} />
        <Button title="Salvar palavras ignoradas" secondary onPress={() => {
          void setNotify({ ignored: ignored.split(",").map((word: string) => word.trim()).filter(Boolean).slice(0, 100) });
        }} />
      </Box>

      <Section title={`Sugestões pendentes (${pending.length})`} />
      {!!status?.overflow && <Muted>Fila cheia. {status.overflow} notificações ficaram de fora.</Muted>}
      {!!status?.storageError && <Muted>Houve uma falha ao guardar notificações. Confira o extrato do banco.</Muted>}
      {!!error && <T accessibilityLiveRegion="polite" style={{ color: c.red }}>{error}</T>}
      <Button title="Atualizar lista" secondary disabled={!available || busy} onPress={() => void run(refresh, "Não foi possível atualizar a lista.")} />
      {pending.map((row) => (
        <Box key={row.id} style={{ gap: 8 }}>
          <T style={{ fontFamily: "SoraSemi" }}>{row.bank}</T>
          <Muted>{state.settings.hide ? "Conteúdo oculto. Abra Revisar para conferir." : row.title + "\n" + row.text}</Muted>
          <Button title="Revisar e registrar" onPress={() => setReview(row)} />
          <Button title="Ignorar sugestão" secondary disabled={busy} onPress={() => setDiscard(row)} />
        </Box>
      ))}
      {catalog && (
        <SheetModal title="Todos os bancos" onClose={() => setCatalog(false)}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <Field label="Buscar banco" value={query} onChange={setQuery} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
            {results.length ? <Group>{results.map(bankToggle)}</Group> : <Muted>Nenhum banco encontrado.</Muted>}
          </ScrollView>
        </SheetModal>
      )}
      <InboxSheet row={review} editDate onClose={() => setReview(null)} onDone={(id) => {
        setReview(null);
        void remove(id);
      }} />
      {discard && <ConfirmSheet title="Ignorar notificação?" changes={[`Sugestão de ${suggestNotification(discard).description}`]}
        keeps={[]} action="Ignorar" onClose={() => setDiscard(null)} onConfirm={() => {
          setDiscard(null);
          void remove(discard.id);
        }} />}
    </>
  );
}
