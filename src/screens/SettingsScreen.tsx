import React from "react";
import { Alert, Linking } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import * as LocalAuthentication from "expo-local-authentication";
import * as Application from "expo-application";
import { Section, Box, Toggle, Button, ListItem, Muted, T } from "../ui/kit";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { today, validateBackup, emptyState, demoState } from "../finance.mjs";

export async function exportCSV(state: any) {
  const esc = (v: any) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const rows = [
    ["Data", "Hora", "Descrição", "Tipo", "Valor (R$)", "Categoria", "Conta", "Cartão", "Confirmado", "Estorno", "Ignorado", "Tags", "Observações"],
    ...state.transactions.map((t: any) => [
      t.date,
      t.time || "",
      t.description,
      t.type === "income" ? "Receita" : t.type === "transfer" ? "Transferência" : "Despesa",
      (t.amount / 100).toFixed(2).replace(".", ","),
      t.category,
      state.accounts.find((a: any) => a.id === t.accountId)?.name,
      state.cards.find((a: any) => a.id === t.cardId)?.name,
      t.confirmed ? "Sim" : "Não",
      t.refund ? "Sim" : "",
      t.ignored ? "Sim" : "",
      (t.tags || []).map((id: string) => state.tags?.find((x: any) => x.id === id)?.name).filter(Boolean).join(" "),
      t.notes || "",
    ]),
  ];
  const path = FileSystem.cacheDirectory + "floco-lancamentos.csv";
  await FileSystem.writeAsStringAsync(path, "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n"));
  await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Exportar lançamentos" });
}

export default function SettingsScreen() {
  const { state, perform, confirm, current } = useStore();
  const nav = useNav();

  const backup = async () => {
    try {
      const path = FileSystem.cacheDirectory + "floco-backup-" + today() + ".json";
      await FileSystem.writeAsStringAsync(path, JSON.stringify(current(), null, 2));
      await Sharing.shareAsync(path, { mimeType: "application/json", dialogTitle: "Guardar backup das finanças" });
      await perform((s: any) => ({ ...s, settings: { ...s.settings, lastBackup: today() } }), "Backup gerado");
    } catch (e: any) {
      Alert.alert("Falha ao exportar", e.message);
    }
  };
  const restore = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if ((asset.size || 0) > 20 * 1024 * 1024) throw Error("O backup deve ter no máximo 20 MB.");
      const data = validateBackup(JSON.parse(await FileSystem.readAsStringAsync(asset.uri)));
      confirm(
        "Restaurar backup?",
        `Substituir os dados deste aparelho por ${data.accounts.length} contas e ${data.transactions.length} lançamentos? Faça um backup dos dados atuais antes.`,
        () => perform(data, "Backup restaurado"),
        "Restaurar",
      );
    } catch (e: any) {
      Alert.alert("Backup inválido", e.message);
    }
  };
  const toggleBiometric = async (value: boolean) => {
    if (value) {
      try {
        if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync()))
          return Alert.alert("Configure a biometria", "Cadastre digital ou rosto nas configurações do Android antes de ativar.");
        const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Ativar proteção do app" });
        if (!r.success) return;
      } catch {
        return Alert.alert("Biometria indisponível");
      }
    }
    await perform((s: any) => ({ ...s, settings: { ...s.settings, biometric: value } }));
  };
  const setting = (key: string) => (value: any) =>
    perform((s: any) => ({ ...s, settings: { ...s.settings, [key]: value } }));

  return (
    <>
      <Section title="Personalização" />
      <Box>
        <Toggle icon="moon" label="Tema escuro" value={!!state.settings.dark} onChange={setting("dark")} />
        <Toggle icon="eye-off" label="Ocultar valores" value={!!state.settings.hide} onChange={setting("hide")} />
      </Box>
      <ListItem icon="layout" label="Personalizar início, análise e barra" onPress={() => nav.push({ name: "layout" })} />
      <ListItem icon="list" label="Preferências do extrato" onPress={() => nav.push({ name: "preferences" })} />
      <Section title="Notificações" />
      <ListItem icon="bell" label="Lembretes" detail={state.settings.reminders?.enabled ? "Ligados" : "Desligados"} onPress={() => nav.push({ name: "reminders" })} />
      <ListItem icon="radio" label="Notificações bancárias" detail="Bancos monitorados e SMS" onPress={() => nav.push({ name: "notifications" })} />
      <ListItem icon="zap" label="Categorização automática" onPress={() => nav.push({ name: "rules" })} />
      <Section title="Segurança" />
      <Box>
        <Toggle icon="lock" label="Bloqueio biométrico" value={!!state.settings.biometric} onChange={toggleBiometric} />
      </Box>
      <ListItem icon="shield" label="PIN e backup criptografado" onPress={() => nav.push({ name: "security" })} />
      <Section title="Seus dados" />
      <ListItem icon="file-text" label="Importar extrato" detail="CSV ou OFX; a importação soma" onPress={() => nav.push({ name: "imports" })} />
      <Box>
        <Button title="Salvar backup (JSON)" secondary icon="upload" onPress={backup} />
        <Muted> </Muted>
        <Button title="Restaurar backup (JSON)" secondary icon="download" onPress={restore} />
        <Muted> </Muted>
        <Button title="Exportar lançamentos (CSV)" secondary icon="file-text" onPress={() => exportCSV(current()).catch((e) => Alert.alert("Falha na exportação", e.message))} />
        <Muted style={{ marginTop: 14 }}>
          O backup JSON não é criptografado; para um arquivo protegido por senha use "PIN e backup criptografado". Restaurar substitui todos os dados.
        </Muted>
      </Box>
      <Section title="Atualizações" />
      <ListItem
        icon="download-cloud"
        label="Atualizações do aplicativo"
        detail={`Versão instalada ${Application.nativeApplicationVersion || "?"}`}
        onPress={() => nav.push({ name: "updates" })}
      />
      <Section title="Manutenção" />
      <Box style={{ gap: 8 }}>
        <Button
          title="Reabrir os primeiros passos"
          secondary
          onPress={() => perform((s: any) => ({ ...s, settings: { ...s.settings, firstStepsHidden: false } }), "Primeiros passos de volta na Início")}
        />
        <Button title="Reabrir a apresentação" secondary onPress={() => nav.push({ name: "welcome" })} />
        {!state.accounts.length && (
          <Button title="Carregar dados fictícios" secondary onPress={() => perform(demoState(), "Demonstração carregada")} />
        )}
        <Button
          title="Apagar todos os dados do Floco"
          danger
          icon="trash-2"
          onPress={() =>
            confirm(
              "Apagar todos os dados?",
              "Apaga contas, cartões, metas e lançamentos deste aparelho. Salve um backup antes. Esta ação não pode ser desfeita.",
              () => perform(emptyState(), "Dados do Floco apagados"),
              "Apagar tudo",
            )
          }
        />
      </Box>
      <Section title="Ajuda" />
      <ListItem
        icon="github"
        label="Enviar sugestão ou relatar problema"
        detail="Abre o GitHub do projeto"
        onPress={() =>
          Linking.openURL(
            `https://github.com/katsuuzin/floco-financas/issues/new?title=${encodeURIComponent("[" + (Application.nativeApplicationVersion || "") + "] ")}`,
          )
        }
      />
      <Section title="Sobre" />
      <Box>
        <T style={{ fontFamily: "SoraSemi" }}>Floco Finanças · Android · {Application.nativeApplicationVersion}</T>
        <Muted style={{ marginTop: 8 }}>
          Controle financeiro pessoal sem assinatura e sem limites comerciais. Os dados ficam neste aparelho, sem cadastro, anúncios ou conexão bancária.
        </Muted>
      </Box>
    </>
  );
}
