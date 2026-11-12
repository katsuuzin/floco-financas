// Ação principal da tela atual no cabeçalho (o "+" de Nova conta, Nova meta, Novo orçamento).
// A tela registra a ação enquanto está aberta; o cabeçalho do App só lê. Sem provedor: um pequeno estado global.
import { useEffect, useRef, useSyncExternalStore } from "react";

export type HeaderAction = { label: string; onPress: () => void } | null;

let current: HeaderAction = null;
const listeners = new Set<() => void>();
const set = (next: HeaderAction) => {
  current = next;
  listeners.forEach((fn) => fn());
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

// Cabeçalho: lê a ação registrada.
export const useHeaderActionValue = (): HeaderAction => useSyncExternalStore(subscribe, () => current);

// Tela: registra (ou, com null, não registra) a ação; sempre usa o onPress mais recente.
export function useHeaderAction(label: string | null, onPress: () => void) {
  const latest = useRef(onPress);
  latest.current = onPress;
  useEffect(() => {
    if (!label) return;
    const action = { label, onPress: () => latest.current() };
    set(action);
    return () => {
      if (current === action) set(null);
    };
  }, [label]);
}
