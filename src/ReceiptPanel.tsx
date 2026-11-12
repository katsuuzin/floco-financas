import { visibleAccounts } from "./accountOrder.mjs";
import { Button, DateField } from "./ui/kit";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  NativeModules,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { receiptAmounts, receiptDates } from "./receipt-suggestions.mjs";
import { today, parseMoney, addTransaction } from "./finance.mjs";
import { categoryNames } from "./planning.mjs";
export default function ReceiptPanel({ state, c, onChange }: any) {
  const [raw, setRaw] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [values, setValues] = useState<string[]>([]);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    date: today(),
    accountId: "",
    cardId: "",
    category: "Outros",
    type: "expense",
  });
  const native = NativeModules.FlocoReceiptReader;
  const text = (v: any, bold = false) => (
    <Text
      style={{
        fontFamily: bold ? "SoraSemi" : "Sora",
        color: c.text,
        fontSize: 15,
        lineHeight: 23,
      }}
    >
      {v}
    </Text>
  );
  const button = (label: string, fn: () => void) =>
    <Button title={label} onPress={fn} disabled={busy} secondary={label === "Fotografar comprovante"} />;
  const read = async (camera = false) => {
    if (busy) return;
    setBusy(true);
    setError("");
    let uri = "";
    try {
      if (!native) throw Error("Instale o APK com o leitor de comprovantes.");
      let content;
      if (camera) content = await native.camera();
      else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ["image/*", "application/pdf"],
          copyToCacheDirectory: true,
        });
        if (result.canceled) return;
        if ((result.assets[0].size || 0) > 20 * 1024 * 1024)
          throw Error("Limite de 20 MB.");
        uri = result.assets[0].uri;
        content = await native.recognize(uri);
      }
      if (!content) return;
      setRaw(content);
      const candidates = receiptAmounts(content);
      const dates = receiptDates(content);
      setValues(candidates.slice(0, 100));
      setForm({
        ...form,
        amount: candidates.length === 1 ? candidates[0] : "",
        date: dates.length === 1 ? dates[0] : today(),
        description:
          content
            .split("\n")
            .find((s: string) => s.trim())
            ?.slice(0, 100) || "Comprovante",
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (
        uri &&
        FileSystem.cacheDirectory &&
        uri.startsWith(FileSystem.cacheDirectory)
      )
        await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      setBusy(false);
    }
  };
  const field = (key: "amount" | "description" | "date", label: string) =>
    key === "date" ? (
      <DateField label={label} value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
    ) : (
    <View style={{ gap: 6, marginVertical: 8 }}>
      {text(label, true)}
      <TextInput
        accessibilityLabel={label}
        keyboardType={key === "amount" ? "decimal-pad" : "default"}
        maxLength={key === "amount" ? 16 : 100}
        value={form[key]}
        onChangeText={(v) => setForm({ ...form, [key]: v })}
        style={{
          minHeight: 50,
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.surface,
          color: c.text,
          fontFamily: "Sora",
        }}
      />
    </View>
    );
  const choices = (
    key: "accountId" | "cardId" | "category" | "type",
    label: string,
    options: any[],
  ) => (
    <View style={{ gap: 6, marginVertical: 8 }}>
      {text(label, true)}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map(([id, name]) => (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: form[key] === id }}
            onPress={() => setForm({ ...form, [key]: id })}
            style={{
              minHeight: 48,
              padding: 12,
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 12,
              backgroundColor: form[key] === id ? c.soft : c.surface,
            }}
          >
            {text((form[key] === id ? "✓ " : "") + name)}
          </Pressable>
        ))}
      </View>
    </View>
  );
  return (
    <View style={{ gap: 12 }}>
        {text(
          "Reconhecimento no aparelho, sem Google Cloud. PDFs com até 15 páginas e arquivos de até 20 MB. OCR pode errar: confira o valor, a data e a origem antes de registrar. Não identifica sozinho PF/PJ, débito/crédito ou parcelas.",
        )}
        {button("Escolher foto ou PDF", () => read())}
        {button("Fotografar comprovante", () => read(true))}
        {busy && <ActivityIndicator color={c.primary} />}
        {!!raw && (
          <>
            {text("Texto reconhecido", true)}
            <TextInput
              accessibilityLabel="Texto reconhecido"
              multiline
              value={raw}
              editable={false}
              style={{
                minHeight: 100,
                maxHeight: 280,
                padding: 12,
                color: c.text,
                backgroundColor: c.surface,
                borderRadius: 12,
              }}
            />
            {text("Escolha um valor encontrado ou digite o correto", true)}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {values.map((v) => (
                <Pressable
                  key={v}
                  accessibilityRole="button"
                  onPress={() => setForm({ ...form, amount: v })}
                  style={{
                    minHeight: 48,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: c.soft,
                  }}
                >
                  {text(state.settings.hide ? "R$ ••••" : "R$ " + v)}
                </Pressable>
              ))}
            </View>
            {field("description", "Descrição")}
            {field("amount", "Valor confirmado (R$)")}
            {field("date", "Data confirmada")}
            {choices("type", "Tipo", [
              ["expense", "Despesa"],
              ["income", "Receita"],
            ])}
            {choices(
              "accountId",
              "Conta",
              visibleAccounts(state).map((a: any) => [a.id, a.name]),
            )}
            {choices("cardId", "Pagamento", [
              ["", "Conta / débito"],
              ...state.cards.map((a: any) => [a.id, a.name]),
            ])}
            {choices(
              "category",
              "Categoria",
              categoryNames(state).map((n) => [n, n]),
            )}
            {button("Registrar lançamento revisado", async () => {
              setBusy(true);
              try {
                const amount = parseMoney(form.amount);
                const ok = await onChange(
                  (s: any) =>
                    addTransaction(s, { ...form, amount, confirmed: true }),
                  "Comprovante registrado",
                );
                if (ok) {
                  setRaw("");
                  setValues([]);
                  setForm({ ...form, description: "", amount: "" });
                }
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            })}
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
    </View>
  );
}
