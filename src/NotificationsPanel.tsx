import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  NativeModules,
  AppState,
  Alert,
} from "react-native";
import {
  suggestNotification,
  importNotification,
  isDenied,
} from "./notification-import.mjs";
import { categoryNames } from "./planning.mjs";
import { BANK_APPS, notifySettings, nativeConfig } from "./bankCatalog.mjs";
import { categorize } from "./rules.mjs";
import BankBadge from "./ui/BankBadge";
const native = NativeModules.FlocoBankNotifications;
export default function NotificationsPanel({
  state,
  c,
  onChange,
  onClose,
}: any) {
  const [status, setStatus] = useState<any>(null),
    [rows, setRows] = useState<any[]>([]),
    [form, setForm] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const refresh = async () => {
    try {
      if (!native)
        throw Error("Instale a nova versão Android para usar notificações.");
      const s = await native.status();
      setStatus(s);
      setRows(JSON.parse(s.pending).filter((r: any) => !(notifySettings(stateRef.current).ignoreDenied !== false && isDenied(r))));
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };
  const notify = notifySettings(state);
  const [ignoredText, setIgnoredText] = useState(notify.ignored.join(", "));
  // Envia ao serviço nativo os bancos escolhidos, as palavras ignoradas e a opção de SMS.
  useEffect(() => {
    if (!native?.configure) return;
    const cfg = nativeConfig(state);
    native.configure(cfg.packages, cfg.ignored, cfg.sms, cfg.smsSenders).catch((e: any) => setError(e.message));
  }, [state.settings?.notify]);
  const setNotify = (patch: any) =>
    onChange(
      (s: any) => ({ ...s, settings: { ...s.settings, notify: { ...notifySettings(s), ...patch } } }),
      "Preferência salva",
    );
  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void refresh();
    });
    const timer = setInterval(refresh, 10000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  const text = (v: any, bold = false) => (
    <Text
      style={{
        color: c.text,
        fontFamily: bold ? "SoraSemi" : "Sora",
        fontSize: 15,
        lineHeight: 23,
      }}
    >
      {v}
    </Text>
  );
  const button = (label: string, fn: any) => (
    <Pressable
      disabled={busy}
      accessibilityRole="button"
      onPress={fn}
      style={({ pressed }) => ({
        minHeight: 48,
        padding: 14,
        borderRadius: 14,
        backgroundColor: c.soft,
        opacity: pressed || busy ? 0.6 : 1,
        marginVertical: 5,
      })}
    >
      {text(label, true)}
    </Pressable>
  );
  const run = async (fn: any) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const choose = (label: string, key: string, values: any[]) => (
    <View style={{ gap: 6, marginVertical: 8 }}>
      {text(label, true)}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {values.map(([id, name]) => (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: form[key] === id }}
            onPress={() => setForm({ ...form, [key]: id })}
            style={{
              minHeight: 48,
              padding: 12,
              borderRadius: 12,
              backgroundColor: form[key] === id ? c.soft : c.surface,
              borderWidth: 1,
              borderColor: c.line,
            }}
          >
            {text((form[key] === id ? "✓ " : "") + name)}
          </Pressable>
        ))}
      </View>
    </View>
  );
  const field = (key: string, label: string) => (
    <View style={{ marginVertical: 8 }}>
      {text(label, true)}
      <TextInput
        accessibilityLabel={label}
        value={form[key]}
        onChangeText={(v) => setForm({ ...form, [key]: v })}
        style={{
          minHeight: 50,
          padding: 12,
          color: c.text,
          fontFamily: "Sora",
          backgroundColor: c.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.line,
        }}
      />
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderColor: c.line }}>
        {button("Voltar", () => (form ? setForm(null) : onClose()))}
        {text("Notificações bancárias", true)}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 50 }}
      >
        {form ? (
          <>
            {text(form.row.bank, true)}
            {text(form.row.title + "\n" + form.row.text)}
            {text(
              "Confira os dados. PF e PJ não podem ser identificados com segurança apenas pelo aplicativo do banco.",
            )}
            {field("description", "Descrição")}
            {field("amount", "Valor (R$)")}
            {field("date", "Data (AAAA-MM-DD)")}
            {choose("Tipo", "type", [
              ["expense", "Despesa"],
              ["income", "Receita"],
            ])}
            {choose(
              "Conta",
              "accountId",
              state.accounts.map((a: any) => [a.id, a.name]),
            )}
            {choose("Cartão (se for compra a crédito)", "cardId", [
              ["", "Débito / conta"],
              ...state.cards.map((a: any) => [a.id, a.name]),
            ])}
            {choose(
              "Categoria",
              "category",
              categoryNames(state).map((n) => [n, n]),
            )}
            {button(busy ? "Registrando…" : "Confirmar lançamento", () =>
              run(async () => {
                const ok = await onChange(
                  (s: any) => importNotification(s, form.row, form),
                  "Notificação registrada",
                );
                if (!ok) return;
                await native.acknowledge(form.row.id);
                setForm(null);
                await refresh();
              }),
            )}
          </>
        ) : (
          <>
            {text(
              "O Android exige acesso especial às notificações. O Floco guarda localmente só sugestões de movimentações com valor em reais dos bancos que você ligar abaixo. Códigos de acesso são descartados. Cada sugestão precisa da sua confirmação.",
            )}
            {text(
              status?.permission
                ? "Acesso Android: permitido"
                : "Acesso Android: não permitido",
              true,
            )}
            {button("Permitir acesso às notificações", () =>
              run(() => native.openSettings()),
            )}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View style={{ flex: 1 }}>
                {text("Ler notificações dos bancos", true)}
              </View>
              <Switch
                accessibilityLabel="Capturar notificações bancárias"
                value={!!status?.enabled}
                onValueChange={(v) =>
                  run(async () => {
                    await native.setEnabled(v);
                    await refresh();
                  })
                }
              />
            </View>
            {text(
              "A captura só funciona com o acesso Android permitido e a chave acima ligada. Notificações antigas já removidas não são recuperadas. Se o banco não emitir a notificação ou ocultar seu conteúdo, registre manualmente.",
            )}
            {!!status?.overflow &&
              text(
                `Fila cheia: ${status.overflow} notificações não foram guardadas. Revise os pendentes.`,
              )}
            {!!status?.storageError &&
              text(
                "Houve uma falha de armazenamento na captura. Confira os registros com o extrato do banco.",
              )}
            {text(`Bancos monitorados (${notify.banks.length} de ${BANK_APPS.length})`, true)}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {BANK_APPS.map(([pkg, label]: string[]) => {
                const on = notify.banks.includes(pkg);
                return (
                  <Pressable
                    key={pkg}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => setNotify({ banks: on ? notify.banks.filter((x: string) => x !== pkg) : [...notify.banks, pkg] })}
                    style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderRadius: 22, borderWidth: 1, borderColor: on ? c.primary : c.line, backgroundColor: on ? c.soft : c.surface }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <BankBadge name={label} size={24} />
                      {text((on ? "✓ " : "") + label)}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1 }}>
                {text("Ler SMS de compra dos bancos", true)}
                {text("Lê a notificação do app de mensagens, nunca a caixa de SMS, e só de remetentes dos bancos ligados acima.")}
              </View>
              <Switch accessibilityLabel="Ler SMS de compra" value={!!notify.sms} onValueChange={(v) => setNotify({ sms: v })} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1 }}>
                {text("Não registrar compras negadas", true)}
                {text("Avisos de compra recusada ou não aprovada saem da fila sozinhos, pois nada foi cobrado.")}
              </View>
              <Switch accessibilityLabel="Não registrar compras negadas" value={notify.ignoreDenied !== false} onValueChange={(v) => setNotify({ ignoreDenied: v })} />
            </View>
            <View style={{ marginVertical: 8 }}>
              {text("Palavras ignoradas (separe por vírgula)", true)}
              <TextInput
                accessibilityLabel="Palavras ignoradas"
                value={ignoredText}
                onChangeText={setIgnoredText}
                onEndEditing={() => setNotify({ ignored: ignoredText.split(",").map((x: string) => x.trim()).filter(Boolean) })}
                placeholder="Ex.: cashback, fatura fechada"
                placeholderTextColor={c.muted}
                style={{ minHeight: 50, padding: 12, color: c.text, fontFamily: "Sora", backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.line }}
              />
            </View>
            {button("Atualizar lista", refresh)}
            {text(`${rows.length} sugestões pendentes`, true)}
            {rows.map((row) => (
              <View
                key={row.id}
                style={{
                  padding: 16,
                  backgroundColor: c.surface,
                  borderRadius: 16,
                  gap: 8,
                }}
              >
                {text(row.bank, true)}
                {text(row.title)}
                {text(
                  state.settings.hide
                    ? "Conteúdo oculto. Abra Revisar para conferir."
                    : row.text,
                )}
                {button(
                  state.transactions.some(
                    (t: any) => t.notificationId === row.id,
                  )
                    ? "Já registrada · remover da fila"
                    : "Revisar e registrar",
                  () => {
                    if (
                      state.transactions.some(
                        (t: any) => t.notificationId === row.id,
                      )
                    ) {
                      void run(async () => {
                        await native.acknowledge(row.id);
                        await refresh();
                      });
                      return;
                    }
                    const suggestion = suggestNotification(row);
                    setForm({
                      ...suggestion,
                      row,
                      accountId: "",
                      cardId: "",
                      category: categorize(state, suggestion.description || row.text, suggestion.type)?.category || "Outros",
                    });
                  },
                )}
                {button("Ignorar sugestão", () =>
                  Alert.alert(
                    "Ignorar notificação?",
                    "Nenhum lançamento será criado.",
                    [
                      { text: "Cancelar" },
                      {
                        text: "Ignorar",
                        onPress: () =>
                          run(async () => {
                            await native.acknowledge(row.id);
                            await refresh();
                          }),
                      },
                    ],
                  ),
                )}
              </View>
            ))}
          </>
        )}
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={{ color: c.red, fontFamily: "Sora" }}
          >
            {error}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
