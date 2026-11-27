// Ler a nota fiscal (QR) dentro de "Itens da compra": a compra já foi feita, só registra o que veio na nota.
// Câmera → chave → consulta na SEFAZ (WebView, só hosts oficiais) → devolve a nota lida.
import React, { useEffect, useRef, useState } from "react";
import { Linking, View } from "react-native";
import { CameraView, scanFromURLAsync, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import { WebView } from "react-native-webview";
import { SheetModal } from "../ui/Sheet";
import { Box, Button, Field, I, Muted, T, Toggle } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { parseNfceInput } from "../nfce.mjs";
import { MAX_HTML_CHARS, allowedHosts, consultSupported, consultUrl, hrefMatchesKey, isAllowedUrl, parseNfceHtml } from "../nfceParse.mjs";
import { PAGE_SCRIPT } from "./NfceConsultaScreen";

const TIMEOUT_MS = 45000;
const MAX_RAW = MAX_HTML_CHARS + 10_000;

export default function NotaImportSheet({ onParsed, onClose }: { onParsed: (nota: any, info: any) => void; onClose: () => void }) {
  const { c } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState("");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(0);
  const done = useRef(false);

  const accept = (text: string) => {
    try {
      const r = parseNfceInput(text);
      if (r.homolog) throw Error("Esta é uma nota de teste. Use um cupom válido.");
      if (!consultSupported(r.uf)) throw Error(`Ainda não leio notas de ${r.uf}. Por enquanto só SP.`);
      setError("");
      setInfo(r);
    } catch (e: any) {
      setError(e.message);
    }
  };
  const onScan = ({ data }: { data: string }) => {
    const now = Date.now();
    if (info || busy || now - lock.current < 1500) return;
    lock.current = now;
    accept(data);
  };
  const pickPhoto = async () => {
    setBusy(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ["image/*"], copyToCacheDirectory: true });
      if (picked.canceled) return;
      const found: any[] = await Promise.race([
        scanFromURLAsync(picked.assets[0].uri, ["qr"]),
        new Promise<any[]>((_, rej) => setTimeout(() => rej(new Error("tempo")), 10000)),
      ]);
      if (!found.length) return setError("Não achei um QR nessa foto. Tente uma foto mais nítida ou use a câmera.");
      accept(found[0].data);
    } catch {
      setError("Não consegui ler a foto. Use a câmera ou cole a chave.");
    } finally {
      setBusy(false);
    }
  };

  const fail = (msg: string) => {
    if (done.current) return;
    done.current = true;
    setError(msg);
    setInfo(null);
  };
  const url = (() => { try { return info ? consultUrl(info) : ""; } catch { return ""; } })();
  useEffect(() => {
    if (!info) return;
    done.current = false;
    if (!url || !isAllowedUrl(url, info.uf)) { fail("Endereço de consulta inválido para esta nota."); return; }
    const t = setTimeout(() => fail("A SEFAZ demorou para responder. Tente de novo."), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [info, attempt, url]);

  const onMessage = (e: any) => {
    if (done.current || !info) return;
    try {
      const raw = e.nativeEvent.data;
      if (typeof raw !== "string" || raw.length > MAX_RAW) return fail("Resposta inesperada da SEFAZ.");
      const msg = JSON.parse(raw);
      if (!msg || !isAllowedUrl(msg.href, info.uf) || !hrefMatchesKey(msg.href, info.chave)) return fail("A resposta não veio da consulta desta nota.");
      if (msg.type === "rejected") return fail("A SEFAZ recusou a consulta. Tente de novo em alguns minutos.");
      if (msg.type !== "html" || typeof msg.html !== "string" || msg.html.length > MAX_HTML_CHARS) return fail("Resposta inesperada da SEFAZ.");
      const nota = parseNfceHtml(msg.html, { uf: info.uf });
      if (nota.chave !== info.chave) return fail("A nota consultada não é a que você leu. Tente ler o QR de novo.");
      done.current = true;
      onParsed(nota, info);
    } catch (err: any) {
      fail(err?.message || "Não consegui ler a nota.");
    }
  };

  const granted = !!permission?.granted;
  return (
    <SheetModal title="Ler nota fiscal" onClose={onClose}>
      <View style={{ padding: 16, gap: 12 }}>
        <Muted accessibilityLiveRegion="polite" style={error ? { color: c.red } : undefined}>
          {error || (info ? "Consultando a nota no site da SEFAZ…" : "Aponte para o QR da nota fiscal, com boa luz.")}
        </Muted>
        {info ? (
          <View accessible accessibilityLabel="Página da SEFAZ carregando" style={{ height: 300, borderRadius: 18, overflow: "hidden", backgroundColor: c.surface }}>
            <WebView
              key={attempt}
              source={{ uri: url }}
              originWhitelist={allowedHosts(info.uf).map((h: string) => `https://${h}`)}
              onShouldStartLoadWithRequest={(req) => isAllowedUrl(req.url, info.uf)}
              injectedJavaScript={PAGE_SCRIPT}
              onMessage={onMessage}
              onError={() => fail("Sem conexão com a SEFAZ. Verifique a internet e tente de novo.")}
              onHttpError={(e) => e.nativeEvent.statusCode >= 500 && fail("O site da SEFAZ está fora do ar. Tente mais tarde.")}
              javaScriptEnabled
              domStorageEnabled
              incognito
              cacheEnabled={false}
              thirdPartyCookiesEnabled={false}
              sharedCookiesEnabled={false}
              setSupportMultipleWindows={false}
              allowFileAccess={false}
              allowFileAccessFromFileURLs={false}
              allowUniversalAccessFromFileURLs={false}
              mixedContentMode="never"
              geolocationEnabled={false}
            />
          </View>
        ) : granted ? (
          <>
            <View accessible accessibilityLabel="Visor da câmera. Aponte para o QR do cupom." style={{ borderRadius: 22, overflow: "hidden", aspectRatio: 1, backgroundColor: c.heroText }}>
              <CameraView style={{ flex: 1 }} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onScan} />
              <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: "62%", aspectRatio: 1, borderRadius: 24, borderWidth: 3, borderColor: c.accent }} />
              </View>
            </View>
            <Toggle label="Lanterna" icon="zap" value={torch} onChange={setTorch} />
          </>
        ) : permission ? (
          <Box>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <I name="camera" color={c.primary} />
              <T style={{ fontFamily: "SoraSemi", flex: 1 }}>Câmera para ler o QR</T>
            </View>
            <Muted style={{ marginVertical: 8 }}>A câmera só lê o QR do cupom. A imagem fica no aparelho.</Muted>
            {permission.canAskAgain
              ? <Button title="Permitir câmera" onPress={() => void requestPermission()} />
              : <Button title="Abrir ajustes do Android" secondary onPress={() => void Linking.openSettings()} />}
          </Box>
        ) : null}
        {info ? (
          <Button title="Tentar de novo" icon="refresh-cw" secondary onPress={() => { done.current = false; setError(""); setAttempt((n) => n + 1); }} />
        ) : (
          <>
            <Field label="Chave ou link da nota fiscal" value={paste} onChange={(v) => { setPaste(v); setError(""); }} placeholder="44 dígitos ou link do QR" maxLength={2000} onSubmit={() => paste.trim() && accept(paste)} />
            <Button title="Ler nota fiscal" disabled={busy || !paste.trim()} onPress={() => accept(paste)} />
            <Button title={busy ? "Lendo a foto…" : "Escolher foto da galeria"} icon="image" secondary disabled={busy} onPress={() => void pickPhoto()} />
          </>
        )}
      </View>
    </SheetModal>
  );
}
