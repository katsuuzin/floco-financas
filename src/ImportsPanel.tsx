import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  parseCSV,
  parseOFX,
  importRows,
  possibleDuplicate,
} from "./imports.mjs";
import { money } from "./finance.mjs";
export default function ImportsPanel({ state, c, onChange, onClose }: any) {
  const [rows, setRows] = useState<any[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [account, setAccount] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(0),
    [separator, setSeparator] = useState(";"),
    [raw, setRaw] = useState("");
  const text = (v: any, bold = false) => (
    <Text
      style={{
        fontFamily: bold ? "SoraSemi" : "Sora",
        fontSize: 15,
        lineHeight: 23,
        color: c.text,
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
        opacity: busy || pressed ? 0.6 : 1,
        marginVertical: 5,
      })}
    >
      {text(label, true)}
    </Pressable>
  );
  const parse = (value: string) => {
    try {
      const result = /<OFX[>\s]/i.test(value)
        ? parseOFX(value)
        : parseCSV(value, separator);
      setRows(result);
      setSelected([]);
      setPage(0);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };
  const pick = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (r.canceled) return;
      if ((r.assets[0].size || 0) > 10 * 1024 * 1024)
        throw Error("Limite de 10 MB.");
      const value = await FileSystem.readAsStringAsync(r.assets[0].uri);
      setRaw(value);
      parse(value);
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderColor: c.line }}>
        {button("Voltar", onClose)}
        {text("Importar extrato", true)}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 50 }}
      >
        {text(
          "Importar soma lançamentos realizados a uma conta existente. Não substitui os dados. Confira conta, datas, valores e possíveis duplicatas antes de confirmar.",
        )}
        {text("Conta de destino", true)}
        {state.accounts.map((a: any) =>
          button((account === a.id ? "✓ " : "") + a.name, () => {
            setAccount(a.id);
            setSelected([]);
          }),
        )}
        {text(
          "CSV: Data;Descrição;Valor (R$);Tipo;Categoria. Datas AAAA-MM-DD ou DD/MM/AAAA, valores brasileiros. OFX: lançamentos bancários e FITID. Transferências CSV devem ser lançadas entre duas contas no Floco.",
        )}
        {button(
          "Separador CSV: " +
            (separator === ";" ? "ponto e vírgula" : "vírgula"),
          () => {
            setSeparator(separator === ";" ? "," : ";");
            setRows([]);
            setSelected([]);
          },
        )}
        {button("Escolher arquivo CSV ou OFX", pick)}
        {text("Ou cole o conteúdo", true)}
        <TextInput
          accessibilityLabel="Conteúdo CSV ou OFX"
          multiline
          value={raw}
          onChangeText={setRaw}
          style={{
            padding: 12,
            minHeight: 120,
            maxHeight: 260,
            color: c.text,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 12,
            backgroundColor: c.surface,
          }}
        />
        {button("Ler conteúdo e revisar", () => parse(raw))}
        {!!rows.length && (
          <>
            {text(
              `${rows.length} linhas · ${selected.length} selecionadas`,
              true,
            )}
            {button("Selecionar válidas sem possíveis duplicatas", () => {
              if (!account) {
                setError("Escolha a conta primeiro.");
                return;
              }
              setSelected(
                rows.flatMap((r, i) =>
                  !r.error && !possibleDuplicate(state, r, account) ? [i] : [],
                ),
              );
            })}
            {button("Limpar seleção", () => setSelected([]))}
            {rows.slice(page * 50, page * 50 + 50).map((r, i) => {
              const index = page * 50 + i;
              return (
                <View
                  key={index}
                  style={{
                    padding: 14,
                    backgroundColor: c.surface,
                    borderRadius: 14,
                    gap: 6,
                  }}
                >
                  {text("Linha " + r.sourceLine, true)}
                  {r.error ? (
                    text(r.error)
                  ) : (
                    <>
                      {text(`${r.date} · ${r.description}`)}
                      {text(state.settings.hide ? "R$ ••••" : money(r.amount))}
                      {text(r.type === "income" ? "Receita" : "Despesa")}
                      {possibleDuplicate(state, r, account) &&
                        text(
                          "Possível duplicata: já existe valor igual nesta conta e data. Confira o extrato.",
                        )}
                      {button(
                        selected.includes(index)
                          ? "✓ Selecionada — remover"
                          : "Selecionar linha",
                        () =>
                          setSelected(
                            selected.includes(index)
                              ? selected.filter((i) => i !== index)
                              : [...selected, index],
                          ),
                      )}
                    </>
                  )}
                </View>
              );
            })}
            {page > 0 && button("Página anterior", () => setPage(page - 1))}
            {(page + 1) * 50 < rows.length &&
              button("Próxima página", () => setPage(page + 1))}
            {button("Importar selecionadas", () => {
              if (!selected.length) {
                setError("Selecione as linhas revisadas.");
                return;
              }
              Alert.alert(
                "Confirmar importação?",
                `Somar ${selected.length} lançamentos à conta escolhida?`,
                [
                  { text: "Cancelar" },
                  {
                    text: "Importar",
                    onPress: async () => {
                      setBusy(true);
                      try {
                        const ok = await onChange(
                          (s: any) =>
                            importRows(
                              s,
                              selected.map((i) => rows[i]),
                              account,
                            ),
                          "Extrato importado",
                        );
                        if (ok) {
                          setRows([]);
                          setSelected([]);
                          setRaw("");
                          setError("");
                        }
                      } catch (e: any) {
                        setError(e.message);
                      } finally {
                        setBusy(false);
                      }
                    },
                  },
                ],
              );
            })}
          </>
        )}
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={{ fontFamily: "Sora", color: c.red }}
          >
            {error}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
