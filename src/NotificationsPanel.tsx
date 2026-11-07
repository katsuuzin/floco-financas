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
} from "./notification-import.mjs";
import { categoryNames } from "./planning.mjs";
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
  const refresh = async () => {
    try {
      if (!native)
        throw Error("Instale a nova versão Android para usar notificações.");
      const s = await native.status();
      setStatus(s);
      setRows(JSON.parse(s.pending));
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };
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
              "O Android exige acesso especial às notificações. O Floco guarda localmente apenas sugestões de movimentações do Nubank e Inter com valor em reais; não lê sua caixa de SMS e não guarda códigos de acesso. Outros bancos serão adicionados após validar seus formatos.",
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
                {text("Capturar Nubank e Inter", true)}
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
                    setForm({
                      ...suggestNotification(row),
                      row,
                      accountId: "",
                      cardId: "",
                      category: "Outros",
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
