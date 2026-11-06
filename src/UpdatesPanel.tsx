import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  NativeModules,
  DeviceEventEmitter,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Application from "expo-application";
import { normalizeRepository, checkRelease } from "./updates.mjs";
const KEY = "floco.github.updates";
export default function UpdatesPanel({ c, onBack }: any) {
  const [repository, setRepository] = useState("katsuuzin/floco-financas"),
    [token, setToken] = useState(""),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [release, setRelease] = useState<any>(null),
    [downloaded, setDownloaded] = useState(false),
    [progress, setProgress] = useState(0),
    [saved, setSaved] = useState(false);
  const version = Application.nativeApplicationVersion || "1.0.0";
  const native = NativeModules.FlocoUpdater;
  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((raw) => {
        if (raw) {
          const data = JSON.parse(raw);
          setRepository(data.repository);
          setToken(data.token);
          setSaved(true);
        }
      })
      .catch(() =>
        setError(
          "Não foi possível ler a configuração. Salve novamente seu acesso.",
        ),
      )
      .finally(() => setReady(true));
    const listener = DeviceEventEmitter.addListener(
      "FlocoUpdateProgress",
      (value: number) => setProgress(value),
    );
    return () => listener.remove();
  }, []);
  const run = async (label: string, work: () => Promise<void>) => {
    if (busy) return;
    setError("");
    setMessage("");
    setBusy(label);
    try {
      await work();
    } catch (e: any) {
      setError(
        e.message ||
          "Não foi possível concluir. Confira sua conexão e tente novamente.",
      );
    } finally {
      setBusy("");
    }
  };
  const save = () =>
    run("Salvando acesso…", async () => {
      const repo = normalizeRepository(repository);
      if (token.trim().length < 20 || /[\r\n]/.test(token.trim()))
        throw Error("Informe seu token GitHub de leitura.");
      await SecureStore.setItemAsync(
        KEY,
        JSON.stringify({ repository: repo, token: token.trim() }),
      );
      setRepository(repo);
      setSaved(true);
      setRelease(null);
      setDownloaded(false);
      setMessage("Acesso guardado de forma protegida neste Android.");
    });
  const check = () =>
    run("Consultando GitHub…", async () => {
      if (!saved) throw Error("Salve o repositório e o token primeiro.");
      const next = await checkRelease(repository, token, version);
      setRelease(next);
      setDownloaded(false);
      setMessage(
        next
          ? "Uma nova versão está disponível."
          : "Você já usa a versão estável mais recente.",
      );
    });
  const download = () =>
    run("Baixando e verificando APK…", async () => {
      if (!native)
        throw Error("Este recurso precisa do APK Android do Floco Finanças.");
      if (!saved || !release)
        throw Error("Consulte as atualizações antes de baixar.");
      setProgress(0);
      setDownloaded(false);
      await native.download(
        normalizeRepository(repository),
        release.assetId,
        token.trim(),
        release.sha256,
        release.size,
      );
      setDownloaded(true);
      setMessage(
        "APK verificado: tamanho, SHA-256, aplicativo, assinatura e versão.",
      );
    });
  const install = () =>
    run("Abrindo instalador…", async () => {
      if (!(await native.canInstall())) {
        await native.openInstallSettings();
        setMessage(
          "Ative “Permitir desta fonte”, volte ao Floco e toque em Instalar atualização novamente.",
        );
        return;
      }
      await native.install();
      setMessage(
        "Confirme a atualização no instalador do Android. Seus dados permanecem no aplicativo.",
      );
    });
  const button = (
    title: string,
    onPress: () => void,
    secondary = false,
    disabled = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!busy || disabled }}
      disabled={!!busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: secondary ? c.soft : c.primary,
          opacity: busy || disabled ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: secondary ? c.primary : c.onPrimary,
          fontFamily: "SoraSemi",
          fontSize: 14,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
  if (!ready)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[s.header, { borderColor: c.line }]}>
        <Pressable accessibilityRole="button" onPress={onBack} style={s.back}>
          <Text style={{ color: c.primary, fontFamily: "SoraSemi" }}>
            Voltar
          </Text>
        </Pressable>
        <Text style={{ color: c.text, fontFamily: "SoraBold", fontSize: 20 }}>
          Atualizações
        </Text>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 24,
          gap: 18,
          paddingBottom: 48,
          maxWidth: 640,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <Text style={{ fontFamily: "SoraBold", fontSize: 24, color: c.text }}>
          Seu Floco sempre em dia.
        </Text>
        <Text style={[s.body, { color: c.muted }]}>
          Versão instalada {version} ({Application.nativeBuildVersion}). Todos
          os recursos são livres. O GitHub é usado somente para buscar novas
          versões quando você solicitar.
        </Text>
        <View style={[s.box, { backgroundColor: c.surface }]}>
          <Text style={[s.label, { color: c.text }]}>Repositório privado</Text>
          <TextInput
            accessibilityLabel="Repositório GitHub"
            placeholder="usuario/floco-financas"
            placeholderTextColor={c.muted}
            value={repository}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(v) => {
              setRepository(v);
              setSaved(false);
              setRelease(null);
              setDownloaded(false);
            }}
            style={[s.input, { color: c.text, borderColor: c.line }]}
          />
          <Text style={[s.label, { color: c.text, marginTop: 18 }]}>
            Token pessoal de leitura
          </Text>
          <TextInput
            accessibilityLabel="Token GitHub de leitura"
            placeholder="github_pat_…"
            placeholderTextColor={c.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            value={token}
            onChangeText={(v) => {
              setToken(v);
              setSaved(false);
              setRelease(null);
              setDownloaded(false);
            }}
            style={[s.input, { color: c.text, borderColor: c.line }]}
          />
          <Text style={[s.body, { color: c.muted, marginVertical: 16 }]}>
            Crie um token fine-grained com acesso apenas a este repositório e
            Contents: Read-only. A credencial fica no armazenamento protegido do
            Android e não entra no backup financeiro.
          </Text>
          {button(
            saved ? "Acesso salvo · salvar novamente" : "Salvar acesso",
            save,
            true,
          )}
          <View style={{ height: 12 }} />
          {button("Verificar atualizações", check, false, !saved)}
        </View>
        {!!busy && (
          <View accessibilityRole="alert" style={{ gap: 10 }}>
            <ActivityIndicator color={c.primary} />
            <Text style={[s.body, { color: c.text, textAlign: "center" }]}>
              {busy}
              {busy.startsWith("Baixando") ? ` ${progress}%` : ""}
            </Text>
          </View>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={[s.body, { color: c.red }]}>
            {error}
          </Text>
        )}
        {!!message && (
          <Text accessibilityRole="alert" style={[s.body, { color: c.green }]}>
            {message}
          </Text>
        )}
        {release && (
          <View style={[s.box, { backgroundColor: c.surface }]}>
            <Text
              style={{ color: c.text, fontFamily: "SoraBold", fontSize: 21 }}
            >
              {release.version}
            </Text>
            <Text style={[s.body, { color: c.muted, marginVertical: 12 }]}>
              {(release.size / 1024 / 1024).toFixed(1)} MB · APK Android
            </Text>
            <Text style={[s.body, { color: c.text, marginBottom: 20 }]}>
              {release.notes}
            </Text>
            {downloaded
              ? button("Instalar atualização", install)
              : button("Baixar atualização", download)}
            <Text style={[s.body, { color: c.muted, marginTop: 14 }]}>
              O Android pedirá sua confirmação. Somente APKs mais recentes com a
              mesma assinatura do Floco podem ser instalados.
            </Text>
          </View>
        )}
        <Pressable
          disabled={!!busy}
          accessibilityRole="button"
          onPress={() =>
            run("Removendo acesso…", async () => {
              await SecureStore.deleteItemAsync(KEY);
              setToken("");
              setRepository("");
              setSaved(false);
              setRelease(null);
              setDownloaded(false);
              setMessage(
                "Acesso removido deste Android. Seus registros financeiros continuam disponíveis.",
              );
            })
          }
          style={s.back}
        >
          <Text style={{ color: c.red, fontFamily: "SoraSemi" }}>
            Remover acesso ao GitHub
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    gap: 16,
    padding: 16,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { minHeight: 48, justifyContent: "center", paddingHorizontal: 8 },
  body: { fontFamily: "Sora", fontSize: 13, lineHeight: 21 },
  label: { fontFamily: "SoraSemi", fontSize: 14, marginBottom: 10 },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontFamily: "Sora",
    fontSize: 14,
  },
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    padding: 14,
  },
  box: { padding: 20, borderRadius: 16 },
});
