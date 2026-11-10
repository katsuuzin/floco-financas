import React, { useRef, useState } from "react";
import { Linking, View } from "react-native";
import { CameraView, scanFromURLAsync, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import { Box, Button, Field, I, IconButton, Muted, Section, T, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { formatCnpj, parseNfceInput } from "../nfce.mjs";
import { consultSupported } from "../nfceParse.mjs";
import { useNav } from "../app/nav";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// Ler nota fiscal: QR pela câmera, link ou chave colados, ou foto da galeria.
// Etapa 3: só lê e valida o QR/chave. A consulta dos itens na SEFAZ vem na etapa seguinte.
export default function ScanNotaScreen() {
  const { c } = useTheme();
  const nav = useNav();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(0);

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
    if (result || now - lock.current < 1500) return;
    lock.current = now;
    accept(data);
  };

  const pickPhoto = async () => {
    try {
      setBusy(true);
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
      setBusy(false);
    }
  };

  const again = () => {
    setResult(null);
    setError("");
    setPaste("");
    lock.current = 0;
  };

  if (result) {
    const when = `${MONTHS[result.month - 1] || result.month} de ${result.year}`;
    return (
      <>
        <View accessibilityLiveRegion="polite">
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
          <Muted style={{ color: c.amber, marginBottom: 12 }}>Esta nota é de teste (homologação) e não tem valor fiscal.</Muted>
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
  return (
    <>
      {permission == null ? (
        <Muted>Verificando a permissão da câmera…</Muted>
      ) : granted ? (
        <>
          <View
            accessible
            accessibilityLabel="Visor da câmera. Aponte para o QR do cupom."
            style={{ borderRadius: 22, overflow: "hidden", aspectRatio: 1, backgroundColor: "#000" }}
          >
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={onScan}
            />
            <View pointerEvents="none" style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: "62%", aspectRatio: 1, borderRadius: 24, borderWidth: 3, borderColor: c.accent }} />
            </View>
          </View>
          <View style={[k.row, { justifyContent: "space-between", marginTop: 8 }]}>
            <Muted style={{ flex: 1 }}>Aponte para o QR do cupom, com boa luz.</Muted>
            <IconButton name="zap" label={torch ? "Desligar a lanterna" : "Ligar a lanterna"} color={torch ? c.accent : c.muted} onPress={() => setTorch((v) => !v)} />
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

      {!!error && (
        <Muted accessibilityLiveRegion="polite" style={{ color: c.red, marginTop: 12 }}>
          {error}
        </Muted>
      )}

      <Section title="Sem câmera?" />
      <Field
        label="Colar link do QR ou chave de 44 dígitos"
        value={paste}
        onChange={(v) => {
          setPaste(v);
          setError("");
        }}
        placeholder="Cole aqui"
        maxLength={2000}
        onSubmit={() => paste.trim() && accept(paste)}
      />
      <View style={{ marginTop: 8, gap: 8 }}>
        <Button title="Usar o que colei" disabled={!paste.trim()} onPress={() => accept(paste)} />
        <Button title={busy ? "Lendo a foto…" : "Escolher foto da galeria"} icon="image" secondary disabled={busy} onPress={() => void pickPhoto()} />
      </View>
    </>
  );
}
