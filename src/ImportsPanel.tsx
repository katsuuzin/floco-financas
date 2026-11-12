import { brDate } from "./dates.mjs";
import { visibleAccounts } from "./accountOrder.mjs";
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  NativeModules,
  Switch,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  parseCSV,
  parseOFX,
  importRows,
  possibleDuplicate,
} from "./imports.mjs";
import { parsePDFStatement } from "./statement-pdf.mjs";
import { money } from "./finance.mjs";
export default function ImportsPanel({ state, c, onChange, onClose }: any) {
  const [rows, setRows] = useState<any[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [account, setAccount] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(0),
    [separator, setSeparator] = useState<string | undefined>(undefined),
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
  const button = (
    label: string,
    fn: any,
    selectedState?: boolean,
    role: any = "button",
  ) => (
    <Pressable
      disabled={busy}
      accessibilityRole={role}
      accessibilityState={{
        disabled: busy,
        ...(selectedState === undefined
          ? {}
          : role === "radio"
            ? { checked: selectedState }
            : { checked: selectedState }),
      }}
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
  const [showRaw, setShowRaw] = useState(false);
  const [message, setMessage] = useState("");
  const [pdfSummary, setPdfSummary] = useState<any>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const parse = (value: string, pdf = false) => {
    setRows([]);
    setSelected([]);
    setPdfSummary(null);
    try {
      const parsedPdf = pdf ? parsePDFStatement(value) : null;
      setPdfSummary(parsedPdf?.summary || null);
      const result = parsedPdf
        ? parsedPdf.rows
        : /<OFX[>\s]/i.test(value)
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
  const [sheets, setSheets] = useState<any[]>([]);
  const loadSheet = (sheet: any) => {
    setPdfSummary(null);
    const csv = sheet.rows
      .map((r: any[]) =>
        r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(";"),
      )
      .join("\n");
    setRaw(csv);
    setSeparator(";");
    try {
      setRows(parseCSV(csv, ";"));
      setSelected([]);
      setPage(0);
      setError("");
    } catch (e: any) {
      setRows([]);
      setError(e.message);
    }
  };
  const pick = async () => {
    if (busy) return;
    setBusy(true);
    let cacheUri: string | undefined;
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (r.canceled) return;
      cacheUri = r.assets[0].uri;
      setRows([]);
      setSelected([]);
      setSheets([]);
      setPdfSummary(null);
      setMessage("");
      setError("");
      if ((r.assets[0].size || 0) > 10 * 1024 * 1024)
        throw Error("Limite de 10 MB.");
      if (/\.xlsx$/i.test(r.assets[0].name)) {
        if (!NativeModules.FlocoReceiptReader?.spreadsheet)
          throw Error("Atualize o APK para ler XLSX.");
        const book = JSON.parse(
          await NativeModules.FlocoReceiptReader.spreadsheet(r.assets[0].uri),
        );
        setSheets(book.sheets);
        if (book.sheets.length === 1) loadSheet(book.sheets[0]);
        return;
      }
      const pdf =
        /\.pdf$/i.test(r.assets[0].name) ||
        r.assets[0].mimeType === "application/pdf";
      if (!pdf && !/\.(csv|ofx|txt)$/i.test(r.assets[0].name))
        throw Error("Escolha um arquivo CSV, OFX, PDF ou Excel XLSX.");
      if (pdf && !NativeModules.FlocoReceiptReader)
        throw Error("Atualize o APK para importar PDF.");
      const value = pdf
        ? await NativeModules.FlocoReceiptReader.recognize(r.assets[0].uri)
        : await FileSystem.readAsStringAsync(r.assets[0].uri);
      setRaw(value);
      parse(value, pdf);
    } catch (e: any) {
      setRows([]);
      setSelected([]);
      setError(e.message);
    } finally {
      if (cacheUri?.startsWith(FileSystem.cacheDirectory || "file://invalid/"))
        await FileSystem.deleteAsync(cacheUri, { idempotent: true }).catch(
          () => {},
        );
      setBusy(false);
    }
  };
  const confirmImport = () => {
    if (!visibleAccounts(state).some((a: any) => a.id === account)) {
      Alert.alert(
        "Escolha a conta",
        "Selecione uma conta de destino antes de importar.",
      );
      setError("Escolha uma conta de destino antes de importar.");
      return;
    }
    if (!selected.length) {
      Alert.alert(
        "Selecione os lan�amentos",
        "Marque as linhas revisadas antes de importar.",
      );
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
              let added = 0;
              const ok = await onChange((s: any) => {
                const next = importRows(
                  s,
                  selected.map((i) => rows[i]),
                  account,
                  { skipPossibleDuplicates: skipDuplicates },
                );
                added = next.transactions.length - s.transactions.length;
                return next;
              }, "Extrato importado");
              if (ok) {
                setMessage(
                  `${added} lançamentos adicionados; ${selected.length - added} registros já existentes ignorados.`,
                );
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
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 4,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          borderBottomWidth: 1,
          borderColor: c.line,
        }}
      >
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
        {button("Escolher arquivo CSV, OFX, PDF ou XLSX", pick)}
        {text("Conta de destino", true)}
        {!visibleAccounts(state).length &&
          text("Cadastre uma conta em Mais → Contas antes de importar.")}
        {visibleAccounts(state).map((a: any) =>
          button(
            (account === a.id ? "✓ " : "") + a.name,
            () => {
              setAccount(a.id);
              setSelected([]);
            },
            account === a.id,
            "radio",
          ),
        )}
        {text(
          "CSV: Data;Descrição;Valor (R$);Tipo;Categoria. Datas DD/MM/AAAA (também aceita AAAA-MM-DD), valores brasileiros. OFX: lançamentos bancários e FITID. Transferências CSV devem ser lançadas entre duas contas no Floco.",
        )}
        {button(
          "Separador CSV: " +
            (!separator
              ? "automático"
              : separator === ";"
                ? "ponto e vírgula"
                : "vírgula"),
          () => {
            setSeparator(
              !separator ? ";" : separator === ";" ? "," : undefined,
            );
            setRows([]);
            setSelected([]);
          },
        )}
        {busy && (
          <ActivityIndicator
            color={c.primary}
            accessibilityLabel="Processando arquivo"
          />
        )}
        {!!pdfSummary &&
          text(
            "PDF conferido: as movimentações conciliam com os saldos e totais do extrato.",
            true,
          )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            {text("Evitar possíveis duplicatas", true)}
          </View>
          <Switch
            accessibilityLabel="Evitar possíveis duplicatas"
            value={skipDuplicates}
            onValueChange={setSkipDuplicates}
          />
        </View>
        {text(
          "Identificadores repetidos sempre são ignorados. Sem identificador, comparamos conta, data, tipo e valor, respeitando a quantidade de ocorrências. Confira compras legítimas de mesmo valor.",
        )}
        {!!sheets.length && (
          <View>
            {text("Abas da planilha", true)}
            {sheets.map((sheet, i) => (
              <View key={i}>{button(sheet.name, () => loadSheet(sheet))}</View>
            ))}
          </View>
        )}
        {button(
          showRaw
            ? "Ocultar conteúdo do arquivo"
            : "Colar ou editar conteúdo CSV/OFX",
          () => setShowRaw(!showRaw),
        )}
        {showRaw && (
          <>
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
          </>
        )}
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
            {button("Selecionar todas válidas", () =>
              setSelected(rows.flatMap((r, i) => (r.error ? [] : [i]))),
            )}
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
                      {text(`${brDate(r.date)} · ${r.description}`)}
                      {text(state.settings.hide ? "R$ ••••" : money(r.amount))}
                      {text(r.type === "income" ? "Receita" : "Despesa")}
                      {possibleDuplicate(state, r, account) &&
                        text(
                          "Possível duplicata: já existe valor igual nesta conta e data. Confira o extrato.",
                        )}
                      {button(
                        selected.includes(index)
                          ? "✓ Selecionada — remover"
                          : `Selecionar ${r.date}, ${r.description}, ${r.type === "income" ? "receita" : "despesa"}, ${state.settings.hide ? "valor oculto" : money(r.amount)}`,
                        () =>
                          setSelected(
                            selected.includes(index)
                              ? selected.filter((i) => i !== index)
                              : [...selected, index],
                          ),
                        selected.includes(index),
                        "checkbox",
                      )}
                    </>
                  )}
                </View>
              );
            })}
            {page > 0 && button("Página anterior", () => setPage(page - 1))}
            {(page + 1) * 50 < rows.length &&
              button("Próxima página", () => setPage(page + 1))}
          </>
        )}
        {!!message && text(message, true)}
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={{ fontFamily: "Sora", color: c.red }}
          >
            {error}
          </Text>
        )}
      </ScrollView>
      {!!rows.length && (
        <View
          style={{
            padding: 12,
            borderTopWidth: 1,
            borderColor: c.line,
            backgroundColor: c.surface,
          }}
        >
          {!!error && (
            <Text accessibilityLiveRegion="assertive" style={{ color: c.red }}>
              {error}
            </Text>
          )}
          {text(`${selected.length} selecionadas de ${rows.length}`)}
          {button("Importar selecionadas", confirmImport)}
        </View>
      )}
    </View>
  );
}
