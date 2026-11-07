import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { emptyState, money } from "../finance.mjs";
import { loadState, saveState, replaceState, LEGACY_KEY } from "../sqliteStore";

type Change = any | ((s: any) => any);
type Store = {
  state: any;
  loaded: boolean;
  storageError: string;
  notice: string;
  setNotice: (m: string) => void;
  commit: (change: Change) => Promise<void>;
  perform: (change: Change, message?: string) => Promise<boolean>;
  confirm: (title: string, message: string, action: () => void, label?: string) => void;
  show: (cents: number, hidden?: boolean) => string;
  current: () => any;
};
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<any>(emptyState());
  const ref = useRef<any>(state);
  const queue = useRef(Promise.resolve());
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { state: restored, fresh, migrated } = await loadState();
        if (!fresh) {
          ref.current = restored;
          setState(restored);
        }
        if (migrated) setNotice("Seus dados foram migrados para o novo armazenamento");
      } catch (e: any) {
        setStorageError(
          e?.message ||
            "Não foi possível ler seus dados. O arquivo original foi preservado. Tente reabrir o aplicativo.",
        );
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // Escritas serializadas: cada mudança parte do estado gravado mais recente.
  const commit = useCallback(
    (change: Change) => {
      const work = queue.current.then(async () => {
        if (storageError && typeof change === "function")
          throw Error("Reabra o app para recuperar o armazenamento antes de alterar dados.");
        if (storageError) {
          const original = await AsyncStorage.getItem(LEGACY_KEY);
          if (original) await AsyncStorage.setItem(LEGACY_KEY + "/recovery-" + Date.now(), original);
        }
        const next = typeof change === "function" ? change(ref.current) : change;
        if (storageError) replaceState(next);
        else saveState(ref.current, next);
        ref.current = next;
        setState(next);
        if (storageError) setStorageError("");
      });
      queue.current = work.catch(() => {});
      return work;
    },
    [storageError],
  );

  const perform = useCallback(
    async (change: Change, message = "Salvo no aparelho") => {
      try {
        await commit(change);
        setNotice(message);
        return true;
      } catch (e: any) {
        Alert.alert("Não foi possível salvar", e?.message || String(e));
        return false;
      }
    },
    [commit],
  );

  const confirm = useCallback(
    (title: string, message: string, action: () => void, label = "Confirmar") =>
      Alert.alert(title, message, [
        { text: "Cancelar", style: "cancel" },
        { text: label, onPress: action },
      ]),
    [],
  );

  const show = useCallback(
    (cents: number, hidden = false) => (state.settings.hide || hidden ? "R$ ••••" : money(cents)),
    [state.settings.hide],
  );

  const value: Store = {
    state,
    loaded,
    storageError,
    notice,
    setNotice,
    commit,
    perform,
    confirm,
    show,
    current: () => ref.current,
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw Error("StoreProvider ausente");
  return s;
}
