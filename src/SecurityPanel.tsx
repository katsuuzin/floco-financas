import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  NativeModules,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { validateBackup } from "./finance.mjs";
import { keepShoppingOnRestore } from "./shopping.mjs";
const native = NativeModules.FlocoFinanceTools;
const folder = FileSystem.documentDirectory + "encrypted-backups/";
export default function SecurityPanel({
  state,
  c,
  onClose,
  onChange,
  onPinChange,
}: any) {
  const [old, setOld] = useState(""),
    [pin, setPin] = useState(""),
    [repeat, setRepeat] = useState(""),
    [password, setPassword] = useState(""),
    [files, setFiles] = useState<string[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [enabled, setEnabled] = useState(false);
  const refresh = async () => {
    try {
      const s = await native.pinStatus();
      setEnabled(s.enabled);
      await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
      setFiles(
        (await FileSystem.readDirectoryAsync(folder))
          .filter((n) => /^backup-[0-9]+\.floco$/.test(n))
          .sort()
          .reverse(),
      );
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
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
  const button = (label: string, fn: any) => (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={fn}
      style={({ pressed }) => ({
        minHeight: 48,
        padding: 14,
        marginVertical: 5,
        borderRadius: 14,
        backgroundColor: c.soft,
        opacity: busy || pressed ? 0.6 : 1,
      })}
    >
      {text(label, true)}
    </Pressable>
  );
  const field = (label: string, value: string, set: any, numeric = false) => (
    <View style={{ gap: 5, marginVertical: 8 }}>
      {text(label, true)}
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={set}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={numeric ? "number-pad" : "default"}
        style={{
          minHeight: 50,
          padding: 12,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 12,
          color: c.text,
          backgroundColor: c.surface,
        }}
      />
    </View>
  );
  const run = async (fn: any) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const snapshot = async () => {
    const encrypted = await native.encrypt(JSON.stringify(state), password);
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    const uri = folder + "backup-" + Date.now() + ".floco";
    await FileSystem.writeAsStringAsync(uri, encrypted);
    await refresh();
    return uri;
  };
  const restore = async (uri: string) => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || ("size" in info && info.size > 30 * 1024 * 1024))
        throw Error("Arquivo acima do limite de 30 MB.");
      const value = validateBackup(
        JSON.parse(
          await native.decrypt(
            await FileSystem.readAsStringAsync(uri),
            password,
          ),
        ),
      );
      Alert.alert(
        "Restaurar backup criptografado?",
        "Substitui os dados financeiros. Antes da troca, uma cópia criptografada dos dados atuais será salva no histórico com a senha informada.",
        [
          { text: "Cancelar" },
          {
            text: "Restaurar",
            onPress: () =>
              run(async () => {
                await snapshot();
                const ok = await onChange(
                  (s: any) => keepShoppingOnRestore(value, s),
                  "Backup criptografado restaurado",
                );
                if (ok) setPassword("");
              }),
          },
        ],
      );
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderColor: c.line }}>
        {button("Voltar", onClose)}
        {text("Segurança e backups", true)}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 50, gap: 10 }}
      >
        {text("PIN do Floco", true)}
        {text(
          enabled
            ? "PIN ativado. Ao sair do app, o acesso será bloqueado."
            : "Configure um PIN de 6 a 12 números. O bloqueio protege a abertura; use backup criptografado para proteger os arquivos exportados.",
        )}
        {enabled && field("PIN atual", old, setOld, true)}
        {field("Novo PIN", pin, setPin, true)}
        {field("Repita o novo PIN", repeat, setRepeat, true)}
        {button("Salvar PIN", () =>
          run(async () => {
            if (pin !== repeat) throw Error("Os PINs não coincidem.");
            if (!/^[0-9]{6,12}$/.test(pin))
              throw Error("Use de 6 a 12 números.");
            await native.setPin(old, pin);
            setOld("");
            setPin("");
            setRepeat("");
            await refresh();
            await onPinChange();
            setMessage("PIN salvo. Guarde-o em local seguro.");
          }),
        )}
        {enabled &&
          button("Desativar PIN", () =>
            run(async () => {
              await native.setPin(old, "");
              setOld("");
              await refresh();
              await onPinChange();
              setMessage("PIN desativado.");
            }),
          )}
        {text("Backup criptografado local", true)}
        {text(
          "AES-256-GCM com senha. Use pelo menos 12 caracteres e guarde essa senha: sem ela não é possível recuperar o arquivo. PIN, acesso biométrico e credenciais não entram no backup. O histórico fica neste aparelho; exporte uma cópia para se proteger de perda ou desinstalação.",
        )}
        {field("Senha do backup", password, setPassword)}
        {button("Criar ponto de restauração criptografado", () =>
          run(async () => {
            await snapshot();
            setMessage("Ponto salvo neste aparelho.");
          }),
        )}
        {button("Criar e exportar backup criptografado", () =>
          run(async () => {
            const uri = await snapshot();
            if (!(await Sharing.isAvailableAsync()))
              throw Error(
                "Compartilhamento indisponível. O ponto foi salvo no histórico.",
              );
            await Sharing.shareAsync(uri, {
              mimeType: "application/octet-stream",
              dialogTitle: "Exportar backup criptografado do Floco",
            });
          }),
        )}
        {button("Restaurar arquivo criptografado", () =>
          run(async () => {
            const r = await DocumentPicker.getDocumentAsync({
              type: "*/*",
              copyToCacheDirectory: true,
            });
            if (!r.canceled) await restore(r.assets[0].uri);
          }),
        )}
        {text("Histórico local", true)}
        {!files.length && text("Nenhum ponto salvo.")}
        {files.map((n) => (
          <View
            key={n}
            style={{
              padding: 14,
              borderRadius: 14,
              backgroundColor: c.surface,
            }}
          >
            {text(new Date(Number(n.slice(7, -6))).toLocaleString("pt-BR"))}
            {button("Restaurar este ponto", () =>
              run(() => restore(folder + n)),
            )}
            {button("Exportar este ponto", () =>
              run(() =>
                Sharing.shareAsync(folder + n, {
                  mimeType: "application/octet-stream",
                }),
              ),
            )}
          </View>
        ))}
        {!!message && text(message)}
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
