import React from "react";
import { Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Section, Box, Muted, Button, ListItem } from "../ui/kit";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { validateBackup, today } from "../finance.mjs";
import { exportCSV } from "./SettingsScreen";
export default function DataToolsScreen() {
  const nav = useNav();
  const { current, perform, confirm } = useStore();
  const run = async (fn: any) => {
    try {
      await fn();
    } catch (e: any) {
      Alert.alert("Não foi possível concluir", e.message);
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
      const state = validateBackup(
        JSON.parse(await FileSystem.readAsStringAsync(a.uri)),
      );
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
            await perform(state, "Backup restaurado");
          }),
        "Restaurar",
      );
    });
  return (
    <>
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
        label="Extrato PDF do banco"
        detail="Conferência de movimentações e saldos"
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
              "\uFEFFData;Descrição;Valor (R$);Tipo;Categoria\r\n2026-01-01;Compra de exemplo;12,34;Despesa;Mercado\r\n",
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
