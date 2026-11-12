// Foto do item da lista de compras (1.12, passo 11). Fica só no aparelho, em documentDirectory/shopping-photos/,
// e não entra no backup. A miniatura aparece só na folha do item. Arquivos sem item são apagados ao abrir as Listas.
import { useStore } from "../app/store";
import React, { useRef, useState } from "react";
import { Image, Linking, Modal, Pressable, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import { Button, I, Muted, T, radius, space, styles as k } from "./kit";
import { useTheme } from "./theme";

const DIR = () => `${FileSystem.documentDirectory}shopping-photos/`;
export const photoUri = (name: string) => `${DIR()}${name}`;

export async function savePhoto(tempUri: string, itemId: string): Promise<string> {
  await FileSystem.makeDirectoryAsync(DIR(), { intermediates: true });
  const name = `${itemId.replace(/[^A-Za-z0-9_-]/gu, "").slice(0, 60) || "item"}-${Date.now().toString(36)}.jpg`;
  await FileSystem.copyAsync({ from: tempUri, to: photoUri(name) });
  return name;
}

export async function removePhoto(name?: string | null) {
  if (name) await FileSystem.deleteAsync(photoUri(name), { idempotent: true });
}

// Apaga fotos que nenhum item usa mais.
let cleaned = false;
export async function cleanupPhotos(used: Set<string>) {
  if (cleaned) return; // uma vez por abertura do app: um Desfazer recente ainda pode precisar da foto
  cleaned = true;
  try {
    const names = await FileSystem.readDirectoryAsync(DIR());
    await Promise.all(names.filter((name) => !used.has(name)).map((name) => removePhoto(name).catch(() => {})));
  } catch {}
}

// Miniatura de 88 dp com "Pôr foto" ou "Trocar" e "Tirar foto".
export function PhotoField({ itemId, itemName, photo, onChange }: { itemId: string; itemName: string; photo?: string; onChange: (name: string | null, old?: string) => void; }) {
  const { c } = useTheme();
  const { softFail } = useStore();
  const [shooting, setShooting] = useState(false);
  return (
    <View style={[k.row, { gap: space.md }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={photo ? `Foto de ${itemName}, trocar` : `Pôr foto de ${itemName}`}
        onPress={() => setShooting(true)}
        style={{ width: 88, height: 88, borderRadius: radius.md, overflow: "hidden", backgroundColor: c.soft, alignItems: "center", justifyContent: "center" }}>
        {photo ? <Image source={{ uri: photoUri(photo) }} accessibilityIgnoresInvertColors style={{ width: 88, height: 88 }} /> : <I name="camera" color={c.muted} />}
      </Pressable>
      <View style={{ flex: 1, gap: space.xs }}>
        <T style={{ fontFamily: "SoraSemi", fontSize: 14 }}>Foto</T>
        <Pressable accessibilityRole="button" onPress={() => setShooting(true)} style={{ minHeight: 48, justifyContent: "center" }}>
          <T style={{ color: c.primary, fontFamily: "SoraSemi" }}>{photo ? "Trocar" : "Pôr foto"}</T>
        </Pressable>
        {!!photo && (
          <Pressable accessibilityRole="button" accessibilityLabel={`Remover a foto de ${itemName}`} onPress={() => onChange(null, photo)}
            style={{ minHeight: 48, justifyContent: "center" }}>
            <T style={{ color: c.red, fontFamily: "SoraSemi" }}>Remover foto</T>
          </Pressable>
        )}
      </View>
      {shooting && <CaptureModal onClose={() => setShooting(false)} onTaken={(uri) => { setShooting(false); void savePhoto(uri, itemId).then((name) => onChange(name, photo)).catch(() => softFail("Não foi possível salvar a foto.")); }} itemName={itemName} />}
    </View>
  );
}

function CaptureModal({ itemName, onClose, onTaken }: { itemName: string; onClose: () => void; onTaken: (tempUri: string) => void; }) {
  const { c } = useTheme();
  const { softFail } = useStore();
  const [permission, ask] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const snap = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const shot = await camera.current?.takePictureAsync({ quality: 0.5, skipProcessing: false });
      if (!shot?.uri) throw Error("sem foto");
      onTaken(shot.uri);
    } catch {
      setError("Não deu para tirar a foto. Tente de novo.");
      setBusy(false);
    }
  };
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, padding: space.lg, gap: space.md, justifyContent: "center" }}>
        <T style={{ fontFamily: "SoraSemi", fontSize: 22 }}>{`Foto de ${itemName}`}</T>
        {permission?.granted ? (
          <View accessible accessibilityLabel="Visor da câmera" style={{ borderRadius: radius.lg, overflow: "hidden", aspectRatio: 3 / 4, backgroundColor: "#000" }}>
            <CameraView ref={camera} style={{ flex: 1 }} facing="back" />
          </View>
        ) : (
          <View style={{ gap: space.sm }}>
            <Muted>Permita a câmera para fotografar o item.</Muted>
            {permission?.canAskAgain === false
              ? <Button title="Abrir configurações" icon="settings" onPress={() => void Linking.openSettings().catch(() => softFail("Não foi possível abrir as configurações do Android."))} />
              : <Button title="Permitir câmera" icon="camera" onPress={() => void ask().catch(() => softFail("Não foi possível pedir acesso à câmera."))} />}
          </View>
        )}
        {!!error && <Muted accessibilityLiveRegion="polite" style={{ color: c.red }}>{error}</Muted>}
        <View style={[k.row, { gap: space.sm }]}>
          <View style={{ flex: 1 }}><Button title="Cancelar" secondary onPress={onClose} /></View>
          {permission?.granted && <View style={{ flex: 1 }}><Button title={busy ? "Salvando…" : "Tirar foto"} icon="camera" disabled={busy} onPress={() => void snap()} /></View>}
        </View>
      </View>
    </Modal>
  );
}
