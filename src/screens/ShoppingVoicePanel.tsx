// Falar a lista (1.12, passo 12). Botão grande "Toque e fale", texto ao vivo e Parar; no fim, o texto falado passa por
// `parseSpoken` e vai para o Colar lista, com prévia editável e adicionar. Reconhece no aparelho quando o Android oferece;
// sem isso, avisa que o áudio pode ir ao serviço de voz do Google.
import React, { useEffect, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Button, I, Muted, T, space } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { parseSpoken } from "../spokenList.mjs";
import ShoppingPastePanel from "./ShoppingPastePanel";

export default function ShoppingVoicePanel({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "listening" | "done">("idle");
  const [heard, setHeard] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(false);
  const [onDevice, setOnDevice] = useState(true);
  const pulse = useSharedValue(0);
  const spoken = React.useRef("");
  const failed = React.useRef(false);

  useEffect(() => {
    try { setOnDevice(ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()); } catch { setOnDevice(false); }
    return () => { try { ExpoSpeechRecognitionModule.abort(); } catch {} };
  }, []);
  useEffect(() => {
    if (phase === "listening" && !reduce) pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    else { cancelAnimation(pulse); pulse.value = 0; }
  }, [phase, reduce]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.18 }], opacity: 0.35 + (1 - pulse.value) * 0.3 }));

  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results?.[0]?.transcript ?? "";
    spoken.current = text;
    setHeard(text);
  });
  useSpeechRecognitionEvent("error", (event) => {
    failed.current = true;
    setPhase("idle");
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      setError("Sem acesso ao microfone. Libere em Configurações > Apps > Floco.");
      setSettings(true);
    } else if (event.error === "no-speech" || event.error === "speech-timeout") setError("Não ouvi nada. Tente de novo.");
    else if (event.error === "aborted") setError("");
    else if (event.error === "language-not-supported") setError("Este aparelho não tem reconhecimento de voz.");
    else setError("Não consegui entender. Tente de novo.");
  });
  useSpeechRecognitionEvent("end", () => {
    if (failed.current) return;
    if (spoken.current.trim()) setPhase("done");
    else { setPhase("idle"); setError("Não ouvi nada. Tente de novo."); }
  });

  const start = async () => {
    setError(""); setSettings(false); setHeard(""); spoken.current = ""; failed.current = false;
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) { setError("Este aparelho não tem reconhecimento de voz."); return; }
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) { setError("Sem acesso ao microfone. Libere em Configurações > Apps > Floco."); setSettings(true); return; }
      setPhase("listening");
      ExpoSpeechRecognitionModule.start({ lang: "pt-BR", interimResults: true, requiresOnDeviceRecognition: onDevice, addsPunctuation: false });
    } catch {
      setPhase("idle");
      setError("Este aparelho não tem reconhecimento de voz.");
    }
  };

  if (phase === "done") return <ShoppingPastePanel onClose={onClose} initialText={parseSpoken(spoken.current)} />;

  const listening = phase === "listening";
  return (
    <View style={{ gap: space.md, alignItems: "center" }}>
      <View style={{ width: 140, height: 140, alignItems: "center", justifyContent: "center" }}>
        {listening && <Animated.View importantForAccessibility="no-hide-descendants" style={[{ position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: c.primary }, ring]} />}
        <Pressable accessibilityRole="button" accessibilityLabel={listening ? "Ouvindo. Toque para parar" : "Toque e fale"}
          onPress={() => (listening ? ExpoSpeechRecognitionModule.stop() : void start())}
          style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
          <I name={listening ? "square" : "mic"} size={36} color={c.onPrimary} />
        </Pressable>
      </View>
      <T style={{ fontFamily: "SoraSemi" }}>{listening ? "Ouvindo…" : "Toque e fale"}</T>
      <Muted accessibilityLiveRegion="polite" style={{ textAlign: "center", minHeight: 24 }}>
        {listening ? heard || "Diga, por exemplo: dois leites, pão e arroz" : "Diga os itens separados por \"e\", \"mais\" ou pausas."}
      </Muted>
      {listening && <Button title="Parar" secondary onPress={() => ExpoSpeechRecognitionModule.stop()} />}
      {!onDevice && !listening && <Muted style={{ textAlign: "center" }}>O áudio pode ser processado pelo serviço de voz do Google.</Muted>}
      {!!error && <Muted accessibilityLiveRegion="polite" style={{ color: c.red, textAlign: "center" }}>{error}</Muted>}
      {settings && <Button title="Abrir configurações" icon="settings" onPress={() => void Linking.openSettings()} />}
    </View>
  );
}
