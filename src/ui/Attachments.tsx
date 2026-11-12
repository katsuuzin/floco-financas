// Anexos de uma dívida (Quem eu devo e Quem me deve): print, foto ou documento. O arquivo é copiado para a pasta do app
// (documentDirectory/attachments), fica só no aparelho e não entra no backup. Toque para abrir; "Remover" apaga o arquivo.
import React, { useState } from "react";
import { Alert, Image, Pressable, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Button, I, Muted, T, radius, space, styles as k } from "./kit";
import { useTheme } from "./theme";
import { useStore } from "../app/store";
import { uid } from "../finance.mjs";
import { MAX_ATTACHMENTS, addAttachment, removeAttachment } from "../planning.mjs";

const DIR = () => `${FileSystem.documentDirectory}attachments/`;
const MAX_BYTES = 15 * 1024 * 1024;
export const attachmentUri = (file: string) => `${DIR()}${file}`;
const sizeText = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Apaga os arquivos de uma lista de anexos (ao excluir a dívida).
export async function deleteAttachmentFiles(attachments: any[] | undefined) {
  await Promise.all((attachments || []).map((a) => FileSystem.deleteAsync(attachmentUri(a.file), { idempotent: true }).catch(() => {})));
}

export default function AttachmentsField({ list, rowId, attachments = [] }: { list: "receivables" | "payables"; rowId: string; attachments?: any[] }) {
  const { c } = useTheme();
  const { perform, softFail } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const add = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf", "*/*"], copyToCacheDirectory: true, multiple: false });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      const info: any = await FileSystem.getInfoAsync(asset.uri);
      const size = Number(asset.size ?? info?.size ?? 0);
      if (size > MAX_BYTES) { setMessage("O arquivo passa de 15 MB. Escolha um menor."); return; }
      const id = uid();
      const safe = (asset.name || "anexo").replace(/[^A-Za-z0-9._-]/gu, "_").replace(/^[._-]+/u, "").slice(-60) || "anexo";
      const file = `${id.replace(/[^A-Za-z0-9_-]/gu, "")}-${safe}`;
      await FileSystem.makeDirectoryAsync(DIR(), { intermediates: true });
      await FileSystem.copyAsync({ from: asset.uri, to: attachmentUri(file) });
      const record = { id, name: (asset.name || "Anexo").slice(0, 120), file, mime: (asset.mimeType || "application/octet-stream").slice(0, 80), size };
      const ok = await perform((s: any) => addAttachment(s, list, rowId, record), "anexo salvo");
      if (!ok) await FileSystem.deleteAsync(attachmentUri(file), { idempotent: true });
      else setMessage("Anexo salvo neste aparelho.");
    } catch (e: any) {
      setMessage(e?.message || "Não consegui salvar o anexo.");
    } finally {
      setBusy(false);
    }
  };

  const open = async (a: any) => {
    try {
      if (!(await Sharing.isAvailableAsync())) { setMessage("Este aparelho não consegue abrir o anexo."); return; }
      await Sharing.shareAsync(attachmentUri(a.file), { mimeType: a.mime, dialogTitle: a.name });
    } catch {
      setMessage("Não consegui abrir o anexo. O arquivo pode ter sido apagado.");
    }
  };

  const remove = (a: any) =>
    Alert.alert("Remover anexo?", `${a.name} será apagado deste aparelho.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => {
        void perform((s: any) => removeAttachment(s, list, rowId, a.id), "anexo removido").then((ok: boolean) => {
          if (ok) void FileSystem.deleteAsync(attachmentUri(a.file), { idempotent: true }).catch(() => softFail("O anexo saiu do registro, mas o arquivo não pôde ser apagado."));
        });
      } },
    ]);

  return (
    <View style={{ gap: space.sm }}>
      <T style={{ fontFamily: "SoraSemi" }}>Anexos</T>
      {attachments.length === 0 && <Muted>Guarde aqui o print da conversa, um comprovante ou um documento.</Muted>}
      {attachments.map((a) => (
        <View key={a.id} style={[k.row, { gap: space.sm, borderRadius: radius.md, backgroundColor: c.surface, paddingLeft: space.sm }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Abrir anexo ${a.name}, ${sizeText(a.size)}`} onPress={() => void open(a)}
            style={[k.row, { flex: 1, gap: space.sm, minHeight: 64 }]}>
            {a.mime.startsWith("image/")
              ? <Image source={{ uri: attachmentUri(a.file) }} accessibilityIgnoresInvertColors style={{ width: 48, height: 48, borderRadius: radius.sm ?? 8 }} />
              : <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" }}><I name="file-text" color={c.muted} /></View>}
            <View style={{ flex: 1 }}>
              <T>{a.name}</T>
              <Muted>{sizeText(a.size)}</Muted>
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remover anexo ${a.name}`} onPress={() => remove(a)}
            style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
            <I name="trash-2" size={18} color={c.red} />
          </Pressable>
        </View>
      ))}
      {attachments.length < MAX_ATTACHMENTS && (
        <Button title={busy ? "Salvando…" : "Anexar imagem ou documento"} icon="paperclip" secondary disabled={busy} onPress={() => void add()} />
      )}
      {!!message && <Muted accessibilityLiveRegion="polite">{message}</Muted>}
    </View>
  );
}
