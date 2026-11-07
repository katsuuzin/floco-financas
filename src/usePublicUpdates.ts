import { useEffect, useRef, useState } from "react";
import { AppState, NativeModules, DeviceEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Application from "expo-application";
import {
  checkRelease,
  PUBLIC_REPOSITORY,
  shouldAutoCheck,
} from "./updates.mjs";
const KEY = "@floco/public-updates/v1";
export default function usePublicUpdates(enabled: boolean) {
  const [ready, setReady] = useState(false),
    [autoCheck, setAutoCheck] = useState(true),
    [lastCheck, setLastCheck] = useState(0);
  const [release, setRelease] = useState<any>(null),
    [busy, setBusy] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(0),
    [downloaded, setDownloaded] = useState("");
  const running = useRef(false),
    lastAttempt = useRef(0),
    auto = useRef(true),
    lastSuccess = useRef(0);
  const version = Application.nativeApplicationVersion || "1.1.1";
  const native = NativeModules.FlocoUpdater;
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          auto.current = saved.autoCheck !== false;
          lastAttempt.current = Number(saved.lastAttempt) || 0;
          lastSuccess.current = Number(saved.lastCheck) || 0;
          if (alive) {
            setAutoCheck(auto.current);
            setLastCheck(lastSuccess.current);
          }
        }
        await SecureStore.deleteItemAsync("floco.github.updates");
      } catch {
        if (alive)
          setError(
            "Não foi possível carregar as preferências de atualização. A verificação manual continua disponível.",
          );
      } finally {
        if (alive) setReady(true);
      }
    })();
    const subscription = DeviceEventEmitter.addListener(
      "FlocoUpdateProgress",
      (n: number) => setProgress(n),
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  const persist = async (last = lastSuccess.current) =>
    AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        autoCheck: auto.current,
        lastAttempt: lastAttempt.current,
        lastCheck: last,
      }),
    );
  const check = async (automatic = false) => {
    if (running.current) return null;
    if (automatic && (!auto.current || !shouldAutoCheck(lastAttempt.current)))
      return null;
    running.current = true;
    setBusy("Verificando atualizações…");
    setError("");
    setMessage("");
    lastAttempt.current = Date.now();
    try {
      const next = await checkRelease(PUBLIC_REPOSITORY, version);
      setRelease(next);
      const now = Date.now();
      lastSuccess.current = now;
      setLastCheck(now);
      await persist(now);
      setMessage(
        next
          ? "Uma atualização está disponível."
          : "Você já usa a versão mais recente.",
      );
      return next;
    } catch (e: any) {
      setError(
        e.message || "Não foi possível verificar agora. Tente novamente.",
      );
      await persist().catch(() => {});
      return null;
    } finally {
      running.current = false;
      setBusy("");
    }
  };
  const setAutomatic = async (value: boolean) => {
    const previous = auto.current;
    auto.current = value;
    setAutoCheck(value);
    try {
      await persist();
      setError("");
    } catch {
      auto.current = previous;
      setAutoCheck(previous);
      setError("Não foi possível salvar a preferência. Tente novamente.");
    }
  };
  useEffect(() => {
    if (!ready || !enabled) return;
    const attempt = () => {
      if (AppState.currentState === "active") void check(true);
    };
    attempt();
    const listener = AppState.addEventListener("change", (s) => {
      if (s === "active") attempt();
    });
    const timer = setInterval(attempt, 60000);
    return () => {
      listener.remove();
      clearInterval(timer);
    };
  }, [ready, enabled, autoCheck]);
  const update = async () => {
    if (running.current) return;
    const next = release || (await check());
    if (!next) return;
    running.current = true;
    setError("");
    setMessage("");
    try {
      if (!native)
        throw Error("Instale o APK Android do Floco para usar este recurso.");
      if (downloaded !== next.sha256) {
        setBusy("Baixando e verificando atualização…");
        setProgress(0);
        await native.download(next.version, next.sha256, next.size);
        setDownloaded(next.sha256);
      }
      setBusy("Abrindo instalador…");
      if (!(await native.canInstall())) {
        await native.openInstallSettings();
        setMessage(
          "Ative “Permitir desta fonte”, volte ao Floco e toque em Instalar atualização. O APK já foi baixado e verificado.",
        );
        return;
      }
      await native.install();
      setMessage(
        "Confirme a atualização no instalador do Android. Seus dados serão preservados.",
      );
    } catch (e: any) {
      setError(e.message || "Não foi possível atualizar. Tente novamente.");
    } finally {
      running.current = false;
      setBusy("");
    }
  };
  return {
    ready,
    autoCheck,
    setAutomatic,
    lastCheck,
    release,
    busy,
    message,
    error,
    progress,
    downloaded,
    version,
    check,
    update,
  };
}
