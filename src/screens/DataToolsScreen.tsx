import React, { useState, useRef } from "react";
import { Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Section, Box, Muted, Button, ListItem } from "../ui/kit";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { validateBackup, today } from "../finance.mjs";
import { keepShoppingOnRestore } from "../shopping.mjs";
import { checkShoppingBackup } from "../shoppingBackupCheck.mjs";
import { repairShoppingBackup } from "../shoppingBackupRepair.mjs";
import { summarizeBackupIssues } from "../shoppingBackupMessages.mjs";
import { exportCSV } from "./SettingsScreen";

const NL = String.fromCharCode(10);
export default function DataToolsScreen() {
  const nav = useNav();
  const { current, perform, confirm } = useStore();
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const run = async (fn: any) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      Alert.alert("Não foi possível concluir", e.message);
    } finally {
      // Sem isto o trava ficava preso: a confirmação de "Restaurar" chama run() de novo e nunca executava.
      locked.current = false;
      setBusy(false);
    }
  };
  const backup = () =>
    run(async () => {
      const uri =
        FileSystem.cacheDirectory + "floco-backup-" + today() + ".json";
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(current()));
      await Sharing.shareAsync(uri, { mimeType: "application/json" });
    });
  const restore = () =>
    run(async () => {
      const selected = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain", "application/octet-stream"],
        copyToCacheDirectory: true,
      });
      if (selected.canceled) return;
      const a = selected.assets[0];
      if ((a.size || 0) > 20 * 1024 * 1024)
        throw Error("Limite de 20 MB para backup JSON.");
      const raw = JSON.parse(await FileSystem.readAsStringAsync(a.uri));
      const check = checkShoppingBackup(raw);
      if (!check.ok) {
        // Lista de compras com defeito no backup: mostra o problema em português e oferece reparo.
        const fixed = repairShoppingBackup(raw);
        const shown = summarizeBackupIssues(check.errors, { max: 3 }).text;
        const more = "";
        if (!checkShoppingBackup(fixed.data).ok)
          throw Error("A lista de compras do backup tem erros sem reparo:" + NL + shown + more);
        Alert.alert(
          "Backup com problemas na lista de compras",
          shown + more + NL + NL + "O reparo corrige ou remove só esses itens da lista de compras. O restante do backup não muda.",
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Reparar e continuar", onPress: () => void run(async () => proceed(fixed.data)) },
          ],
        );
        return;
      }
      proceed(raw);
    });
  const proceed = (raw: any) => {
      const state = validateBackup(raw);
      confirm(
        "Restaurar backup do Floco?",
        "Esta ação substitui os registros. Uma cópia dos dados atuais será guardada localmente antes da troca.",
        () =>
          void run(async () => {
            const dir = FileSystem.documentDirectory + "recovery/";
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
            await FileSystem.writeAsStringAsync(
              dir + "before-restore-" + Date.now() + ".json",
              JSON.stringify(current()),
            );
            await perform((s: any) => keepShoppingOnRestore(state, s), "Backup restaurado");
          }),
        "Restaurar",
      );
  };
  return (
    <>
      {busy && (
        <Muted accessibilityLiveRegion="polite">Preparando arquivo�</Muted>
      )}
      <Box>
        <Muted>
          A importação soma lançamentos sem apagar o que já existe. Restaurar um
          backup substitui os dados. Tudo é processado no aparelho.
        </Muted>
      </Box>
      <Section title="Importar" />
      <ListItem
        icon="file-text"
        label="Extrato OFX"
        detail="Identificador do banco e valores exatos"
        onPress={() => nav.push({ name: "imports" })}
      />
      <ListItem
        icon="file"
        label="Extrato em PDF"
        detail="Nubank, Inter, Itaú e outros, com conferência dos saldos"
        onPress={() => nav.push({ name: "imports" })}
      />
      <ListItem
        icon="grid"
        label="Planilha CSV ou Excel (XLSX)"
        detail="Nubank ou modelo do Floco; revisão antes de gravar"
        onPress={() => nav.push({ name: "imports" })}
      />
      <ListItem
        icon="camera"
        label="Foto ou comprovante"
        detail="Câmera, galeria ou PDF; OCR com revisão"
        onPress={() => nav.push({ name: "receipt" })}
      />
      <Button
        title="Baixar modelo CSV"
        secondary
        onPress={() =>
          void run(async () => {
            const uri = FileSystem.cacheDirectory + "modelo-floco.csv";
            await FileSystem.writeAsStringAsync(
              uri,
              "\uFEFFData;Descrição;Valor (R$);Tipo;Categoria\r\n01/01/2026;Compra de exemplo;12,34;Despesa;Mercado\r\n",
            );
            await Sharing.shareAsync(uri, { mimeType: "text/csv" });
          })
        }
      />
      <Section title="Restaurar" />
      <Button
        title="Restaurar backup JSON do Floco"
        secondary
        onPress={restore}
      />
      <Button
        title="Backups criptografados e histórico"
        secondary
        onPress={() => nav.push({ name: "security" })}
      />
      <Muted>
        Backups do Kontto têm outro formato e não são tratados como backups do
        Floco. Use extratos OFX/CSV/PDF para trazer movimentações.
      </Muted>
      <Section title="Exportar" />
      <Button title="Backup completo JSON" secondary onPress={backup} />
      <Button
        title="Backup completo criptografado"
        secondary
        onPress={() => nav.push({ name: "security" })}
      />
      <Button
        title="Transações em CSV"
        secondary
        onPress={() => void run(() => exportCSV(current()))}
      />
      <Button
        title="Relatório em PDF"
        secondary
        onPress={() => nav.push({ name: "reports" })}
      />
      <Muted>
        JSON e CSV sem senha não são criptografados. Para um backup protegido,
        escolha a opção criptografada.
      </Muted>
    </>
  );
}
