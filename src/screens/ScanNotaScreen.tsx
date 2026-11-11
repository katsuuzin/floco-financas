import React, { useEffect, useRef, useState } from "react";
import { Linking, View } from "react-native";
import { CameraView, scanFromURLAsync, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { parseNfceXml } from "../nfceXml.mjs";
import { purchasesOf, recordPurchase } from "../shoppingPurchases.mjs";
import { useStore } from "../app/store";
import { Box, Button, Field, I, Muted, Section, T, Toggle, focusAccessibility, type ViewControl, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { formatCnpj, parseNfceInput } from "../nfce.mjs";
import { consultSupported, nfceToPurchase } from "../nfceParse.mjs";
import { useNav } from "../app/nav";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// Ler nota fiscal: QR pela câmera, link ou chave colados, ou foto da galeria.
// Etapa 3: só lê e valida o QR/chave. A consulta dos itens na SEFAZ vem na etapa seguinte.
export default function ScanNotaScreen() {
  const { c } = useTheme();
  const nav = useNav();
  const { state, perform, show } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState<"photo" | "xml" | null>(null);
  const [xml, setXml] = useState<ReturnType<typeof parseNfceXml> | null>(null);
  const [xmlPage, setXmlPage] = useState(20);
  const xmlLock = useRef(false);
  const lock = useRef(0);
  const resultHeading = useRef<ViewControl>(null);
  useEffect(() => { if (result || xml) focusAccessibility(resultHeading.current); }, [result, xml]);
  const status = busy === "xml" ? "Lendo XML…" : busy === "photo" ? "Lendo a foto…" :
    error || (permission == null && !result && !xml ? "Verificando a permissão da câmera…" : "");
  const frame = (content: React.ReactNode) => <View>
    <Muted accessibilityLiveRegion="polite" style={error && !busy ? { color: c.red } : undefined}>{status}</Muted>
    {content}
  </View>;

  const accept = (text: string) => {
    try {
      const r = parseNfceInput(text);
      setError("");
      setResult(r);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  // A câmera lê vários quadros por segundo: trata um a cada 1,5 s e para ao achar uma nota válida.
  const onScan = ({ data }: { data: string }) => {
    const now = Date.now();
    if (busy || result || now - lock.current < 1500) return;
    lock.current = now;
    accept(data);
  };

  const pickPhoto = async () => {
    try {
      setBusy("photo");
      const picked = await DocumentPicker.getDocumentAsync({ type: ["image/*"], copyToCacheDirectory: true });
      if (picked.canceled) return;
      // Limite de 10 s: se a leitura da imagem travar, a tela não fica presa em "Lendo a foto…".
      const found: any[] = await Promise.race([
        scanFromURLAsync(picked.assets[0].uri, ["qr"]),
        new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error("tempo")), 10000)),
      ]);
      if (!found.length) return setError("Não achei um QR nessa foto. Tente uma foto mais nítida ou use a câmera.");
      accept(found[0].data);
    } catch (e: any) {
      setError("Não consegui ler a foto. Use a câmera ou cole a chave.");
    } finally {
      setBusy(null);
    }
  };

  const again = () => {
    setResult(null);
    setError("");
    setPaste("");
    lock.current = 0;
  };

  const pickXml = async () => {
    if (xmlLock.current) return;
    xmlLock.current = true;
    setBusy("xml");
    setError("");
    let cachedUri = "";
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ["text/xml", "application/xml", "application/octet-stream", "text/plain"], copyToCacheDirectory: true });
      if (picked.canceled) return;
      const file = picked.assets[0];
      cachedUri = file.uri;
      const info = await FileSystem.getInfoAsync(file.uri);
      if (!info.exists || info.isDirectory) throw Error("Não consegui abrir o XML.");
      if (info.size > 1_500_000) throw Error("O XML precisa ter até 1,5 MB.");
      setXml(parseNfceXml(await FileSystem.readAsStringAsync(file.uri)));
      setXmlPage(20);
    } catch (failure: any) {
      setError(failure.message || "Não consegui ler o XML.");
    } finally {
      if (FileSystem.cacheDirectory && cachedUri.startsWith(FileSystem.cacheDirectory))
        void FileSystem.deleteAsync(cachedUri, { idempotent: true }).catch(() => {});
      xmlLock.current = false;
      setBusy(null);
    }
  };

  const saveXml = async () => {
    if (!xml || xmlLock.current) return;
    xmlLock.current = true;
    setBusy("xml");
    try {
      const purchase = nfceToPurchase(xml);
      await perform((current: any) => recordPurchase(current, purchase), "Compra salva");
    } catch (failure: any) {
      setError(failure.message || "Não consegui salvar a nota.");
    } finally {
      xmlLock.current = false;
      setBusy(null);
    }
  };

  if (xml) {
    const saved = purchasesOf(state).some((purchase: any) => purchase.chave === xml.chave);
    return frame(
      <View style={{ gap: 12 }}>
        <View ref={resultHeading} accessible accessibilityRole="header">
          <T style={k.pageTitle}>{saved ? "Nota no histórico" : "Confira a nota do XML"}</T>
        </View>
        <T>{xml.marketName || "Mercado"} · {xml.issuedDate.split("-").reverse().join("/")}</T>
        <T>{xml.itemCount} {xml.itemCount === 1 ? "item" : "itens"} · Total {show(xml.totalCents)}</T>
        {!xml.totalMatchesItems && <Muted>O total da nota difere da soma dos itens.</Muted>}
        {xml.items.slice(0, xmlPage).map((item: { name: string; qty: number; unit: string; totalCents: number }, index: number) => (
          <Box key={index}><T>{item.name}</T><Muted>{item.qty} {item.unit || "un."} · {show(item.totalCents)}</Muted></Box>
        ))}
        {xmlPage < xml.items.length && <Button title="Ver mais itens" secondary onPress={() => setXmlPage(xmlPage + 20)} />}
        {saved
          ? <Button title="Abrir histórico de compras" onPress={() => nav.push({ name: "purchases" })} />
          : <Button title={busy ? "Salvando…" : "Salvar compra"} disabled={!!busy} accessibilityLiveRegion="polite" onPress={() => void saveXml()} />}
        <Button title="Ler outra nota" secondary disabled={!!busy} onPress={() => { setXml(null); setError(""); }} />
      </View>
    );
  }

  if (result) {
    const when = `${MONTHS[result.month - 1] || result.month} de ${result.year}`;
    return frame(
      <>
        <View ref={resultHeading} accessible accessibilityRole="header">
        <Box>
          <View style={[k.row, { gap: 8 }]}>
            <I name="check-circle" color={c.green} />
            <T style={{ fontFamily: "SoraSemi", flex: 1 }}>{`Nota de ${result.uf} reconhecida`}</T>
          </View>
          <Muted style={{ marginTop: 8 }}>{`Emitida em ${when}`}</Muted>
          <Muted>{`CNPJ ${formatCnpj(result.cnpj)}`}</Muted>
          <Muted>{`Nota nº ${result.number}, série ${result.series}`}</Muted>
        </Box>
        </View>
        {result.homolog && (
          <Muted style={{ color: c.amber, marginBottom: 12 }}>Esta é uma nota fiscal de teste. Use um cupom válido para consultar os itens.</Muted>
        )}
        {!consultSupported(result.uf) && (
          <Muted style={{ color: c.amber, marginBottom: 12 }}>
            {result.supported
              ? `Reconheci a nota de ${result.uf}, mas a leitura dos itens deste estado ainda não está pronta.`
              : `Ainda não leio notas de ${result.uf}. Por enquanto: SP, PR, SC e RS.`}
          </Muted>
        )}
        <View style={{ gap: 8 }}>
          {consultSupported(result.uf) && !result.homolog && (
            <Button title="Consultar itens na SEFAZ" icon="search" onPress={() => nav.push({ name: "nfceConsulta", info: result })} />
          )}
          <Button title="Ler outra nota" icon="camera" secondary onPress={again} />
        </View>
      </>
    );
  }

  const granted = !!permission?.granted;
  return frame(
    <>
      {permission == null ? null : granted ? (
        <>
          <View
            accessible
            accessibilityLabel="Visor da câmera. Aponte para o QR do cupom."
            style={{ borderRadius: 22, overflow: "hidden", aspectRatio: 1, backgroundColor: c.heroText }}
          >
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={onScan}
            />
            <View pointerEvents="none" style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: "62%", aspectRatio: 1, borderRadius: 24, borderWidth: 3, borderColor: c.heroText, padding: 2 }}>
                <View style={{ flex: 1, borderRadius: 18, borderWidth: 3, borderColor: c.accent }} />
              </View>
            </View>
          </View>
          <View style={{ gap: 8, marginTop: 8 }}>
            <Muted>Aponte para o QR da nota fiscal, com boa luz.</Muted>
            <Toggle label="Lanterna" icon="zap" value={torch} onChange={setTorch} />
          </View>
        </>
      ) : (
        <Box>
          <View style={[k.row, { gap: 8 }]}>
            <I name="camera" color={c.primary} />
            <T style={{ fontFamily: "SoraSemi", flex: 1 }}>Câmera para ler o QR</T>
          </View>
          <Muted style={{ marginVertical: 8 }}>
            O Floco usa a câmera só para ler o QR do cupom. Nada é gravado nem enviado: a imagem fica no aparelho.
          </Muted>
          {permission.canAskAgain ? (
            <Button title="Permitir câmera" onPress={() => void requestPermission()} />
          ) : (
            <Button title="Abrir ajustes do Android" secondary onPress={() => void Linking.openSettings()} />
          )}
        </Box>
      )}


      <Section title="Sem câmera?" />
      <Field
        label="Chave ou link da nota fiscal"
        value={paste}
        onChange={(v) => {
          setPaste(v);
          setError("");
        }}
        placeholder="44 dígitos ou link do QR"
        maxLength={2000}
        onSubmit={() => paste.trim() && accept(paste)}
      />
      <View style={{ marginTop: 8, gap: 8 }}>
        <Button title="Ler nota fiscal" disabled={!!busy || !paste.trim()} onPress={() => accept(paste)} />
        <Button title={busy === "photo" ? "Lendo a foto…" : "Escolher foto da galeria"} icon="image" secondary accessibilityLiveRegion="polite" disabled={!!busy} onPress={() => void pickPhoto()} />
        <Button title={busy === "xml" ? "Lendo XML…" : "Escolher arquivo XML"} icon="file-text" secondary accessibilityLiveRegion="polite" disabled={!!busy} onPress={() => void pickXml()} />
      </View>
    </>
  );
}
