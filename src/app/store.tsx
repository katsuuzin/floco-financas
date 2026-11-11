import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { emptyState, migratePotState, money, today } from "../finance.mjs";
import { planPurge } from "../trashPurge.mjs";
import { migrateShoppingLists } from "../shopping.mjs";
import { describeUndo, pushUndo, redo, undo } from "../shoppingUndo.mjs";

const shoppingKeys = ["shoppingItems", "shoppingStaples", "shoppingLists", "shoppingListTemplates"];
const shoppingSnapshot = (state: any) => Object.fromEntries(shoppingKeys.map((key) => [key, state[key]]));
import { migrateProductKeys } from "../shoppingKeyMigration.mjs";
import { loadState, saveState, replaceState, LEGACY_KEY } from "../sqliteStore";
import { seedRules, upgradeBuiltInRules } from "../rules.mjs";

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
  undoLabel: string;
  redoLabel: string;
  rewindShopping: (direction: "undo" | "redo") => Promise<void>;
};
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<any>(emptyState());
  const ref = useRef<any>(state);
  const queue = useRef(Promise.resolve());
  const shoppingHistory = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { state: loadedState, fresh, migrated } = await loadState();
        // Regras de categorização sugeridas entram uma única vez (o campo passa a existir).
        // Chaves de produto do histórico de compras seguem a regra atual de nomes (uma vez; sem mudança = mesmo objeto).
        const rulesApplied = upgradeBuiltInRules(loadedState.rules === undefined ? seedRules(loadedState) : loadedState);
        let restored = migrateShoppingLists(migratePotState(migrateProductKeys(rulesApplied).state));
        const day = today();
        const purgeKey = "floco.trashPurgeDay";
        const lastPurge = await AsyncStorage.getItem(purgeKey).catch(() => null);
        if (lastPurge !== day) {
          const plan = planPurge(restored.trash, { now: Date.now() } as Parameters<typeof planPurge>[1]);
          if (plan.purge.length) restored = { ...restored, trash: plan.keep };
        }
        if (restored !== loadedState) saveState(loadedState, restored);
        if (lastPurge !== day) void AsyncStorage.setItem(purgeKey, day).catch(() => {});
        if (!fresh || restored !== loadedState) {
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
    (change: Change, shoppingLabel: string | false = "editar lista", onSaved?: () => void) => {
      const work = queue.current.then(async () => {
        if (storageError && typeof change === "function")
          throw Error("Reabra o app para recuperar o armazenamento antes de alterar dados.");
        if (storageError) {
          const original = await AsyncStorage.getItem(LEGACY_KEY);
          if (original) await AsyncStorage.setItem(LEGACY_KEY + "/recovery-" + Date.now(), original);
        }
        const previous = ref.current;
        const next = migrateShoppingLists(migratePotState(typeof change === "function" ? change(previous) : change));
        if (storageError) replaceState(next);
        else saveState(ref.current, next);
        if (typeof change !== "function" || shoppingLabel === "Backup restaurado") shoppingHistory.current = null;
        else if (shoppingLabel !== false && shoppingKeys.some((key) => previous[key] !== next[key])) {
          const baseline = shoppingHistory.current ?? pushUndo(null, shoppingSnapshot(previous));
          const history = pushUndo(baseline, shoppingSnapshot(next), shoppingLabel, { now: Date.now() } as Parameters<typeof pushUndo>[3]);
          shoppingHistory.current = { ...history, past: history.past.slice(-20) };
        }
        onSaved?.();
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
        await commit(change, message || "editar lista");
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

  const rewindShopping = async (direction: "undo" | "redo") => {
    let updated: any;
    try {
      await commit((current: any) => {
        const history = shoppingHistory.current;
        updated = direction === "undo" ? undo(history) : redo(history);
        if (!updated || updated === history) return current;
        const next = { ...current };
        for (const key of shoppingKeys) {
          if (updated.present[key] === undefined) delete next[key];
          else next[key] = updated.present[key];
        }
        return next;
      }, false, () => { shoppingHistory.current = updated; });
    } catch (error: any) { Alert.alert("Não foi possível alterar a lista", error.message); }
  };

  const value: Store = {
    undoLabel: describeUndo(shoppingHistory.current),
    redoLabel: shoppingHistory.current?.future[0] ? `Refazer: ${shoppingHistory.current.future[0].label}` : "",
    rewindShopping,
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
