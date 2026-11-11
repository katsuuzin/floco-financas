import React, { useMemo, useRef, useState } from "react";
import { Linking, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Box, Button, Field, I, Muted, T, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { addShoppingItem } from "../shopping.mjs";
import { createOpenFoodFactsLookup, duplicateOf, resolveScan, suggestItemName } from "../scanProduct.mjs";

type Phase = { kind: "scan" } | { kind: "loading"; code: string } | { kind: "result"; res: any };

// Escanear produto: lê o código de barras (EAN) e busca o nome no Open Food Facts.
// A pessoa confere e edita o nome antes de adicionar. O código é a única coisa enviada à internet.
export default function ScanProductScreen() {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>({ kind: "scan" });
  const [manual, setManual] = useState("");
  const [name, setName] = useState("");
  const [torch, setTorch] = useState(false);
  const lock = useRef(0);
  const lookup = useMemo(() => createOpenFoodFactsLookup((url: string, options: any) => fetch(url, options)), []);

  const run = async (raw: string) => {
    setPhase({ kind: "loading", code: raw });
    const res: any = await resolveScan({ raw, lookup });
    setName(res.status === "found" ? suggestItemName(res) : "");
    setPhase({ kind: "result", res });
  };

  const onScan = ({ data }: { data: string }) => {
    const t = Date.now();
    if (phase.kind !== "scan" || t - lock.current < 1500) return;
    lock.current = t;
    void run(data);
  };

  const again = () => {
    setPhase({ kind: "scan" });
    setName("");
    setManual("");
    lock.current = 0;
  };

  const add = async () => {
    const text = name.trim();
    if (!text) return;
    const ok = await perform((s: any) => addShoppingItem(s, text), "Item adicionado");
    if (ok) again();
  };

  if (phase.kind === "loading") {
    return (
      <View accessibilityLiveRegion="polite">
        <Box>
          <T style={{ fontFamily: "SoraSemi" }}>Buscando o produto…</T>
          <Muted>{`Código ${phase.code}`}</Muted>
        </Box>
      </View>
    );
  }

  if (phase.kind === "result") {
    const res = phase.res;
    const dup = res.status === "invalid" ? null : duplicateOf(state, res.code, name);
    return (
      <>
        <View accessibilityLiveRegion="polite">
          <Box style={{ gap: 6 }}>
            {res.status === "found" && (
              <View style={[k.row, { gap: 8 }]}>
                <I name="check-circle" color={c.green} />
                <T style={{ fontFamily: "SoraSemi", flex: 1 }}>Produto encontrado</T>
              </View>
            )}
            {res.status === "not_found" && <T style={{ fontFamily: "SoraSemi" }}>Não achei esse código no catálogo. Digite o nome.</T>}
            {res.status === "offline" && <T style={{ fontFamily: "SoraSemi" }}>Sem conexão com o catálogo agora. Digite o nome.</T>}
            {res.status === "invalid" && <T style={{ fontFamily: "SoraSemi" }}>{res.reason}</T>}
            {dup && <Muted style={{ color: c.amber }}>{`Já existe na lista: ${dup.name}.`}</Muted>}
          </Box>
        </View>
        {res.status !== "invalid" && (
          <View style={{ marginTop: 12, gap: 8 }}>
            <Field label="Nome do item" value={name} onChange={setName} maxLength={80} />
            <Button title="Adicionar à lista" icon="plus" disabled={!name.trim()} onPress={() => void add()} />
          </View>
        )}
        <View style={{ marginTop: 8 }}>
          <Button title="Ler outro produto" icon="camera" secondary onPress={again} />
        </View>
      </>
    );
  }

  const granted = !!permission?.granted;
  return (
    <>
      {permission == null ? (
        <Muted accessibilityLiveRegion="polite">Verificando a permissão da câmera…</Muted>
      ) : granted ? (
        <>
          <View
            accessible
            accessibilityLabel="Visor da câmera. Aponte para o código de barras do produto."
            style={{ borderRadius: 22, overflow: "hidden", aspectRatio: 1, backgroundColor: "#000" }}
          >
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a"] }}
              onBarcodeScanned={onScan}
            />
          </View>
          <View style={{ marginTop: 8 }}>
            <Button title={torch ? "Desligar lanterna" : "Ligar lanterna"} icon="zap" secondary onPress={() => setTorch(!torch)} />
          </View>
        </>
      ) : (
        <Box style={{ gap: 8 }}>
          <T style={{ fontFamily: "SoraSemi" }}>A câmera está desligada</T>
          <Muted>Permita a câmera para ler o código de barras, ou digite o código abaixo.</Muted>
          {permission?.canAskAgain === false ? (
            <Button title="Abrir configurações" icon="settings" onPress={() => void Linking.openSettings()} />
          ) : (
            <Button title="Permitir a câmera" icon="camera" onPress={() => void requestPermission()} />
          )}
        </Box>
      )}
      <View style={{ marginTop: 16, gap: 8 }}>
        <Field label="Ou digite o código de barras" value={manual} onChange={setManual} numeric maxLength={20} />
        <Button title="Buscar produto" icon="search" secondary disabled={!manual.trim()} onPress={() => void run(manual)} />
        <Muted>O código de barras é consultado no Open Food Facts, pela internet. Nada mais sai do aparelho.</Muted>
      </View>
    </>
  );
}
