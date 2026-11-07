// Navegação própria: abas fixas + pilha por cima. Sem dependências nativas novas.
// O botão voltar do Android desempilha; na raiz, volta para Início; em Início, sai.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BackHandler } from "react-native";

export type Tab = "home" | "transactions" | "analysis" | "more";
export type Route =
  | { name: "accounts" }
  | { name: "cards"; cardId?: string }
  | { name: "budgets" }
  | { name: "goals" }
  | { name: "settings" }
  | { name: "contracts"; type: "financing" | "loan" }
  | { name: "recurrences" }
  | { name: "installments" }
  | { name: "reports" }
  | { name: "report"; id: string }
  | { name: "projections" }
  | { name: "rules" }
  | { name: "reconcile" }
  | { name: "tool"; id: string }
  | { name: "imports" }
  | { name: "receipt" }
  | { name: "notifications" }
  | { name: "security" }
  | { name: "updates" }
  | { name: "form"; kind: string; initial?: any };

type Nav = {
  tab: Tab;
  stack: Route[];
  top: Route | null;
  setTab: (t: Tab) => void;
  push: (r: Route) => void;
  replace: (r: Route) => void;
  back: () => boolean;
  reset: () => void;
  month: string;
  setMonth: (m: string) => void;
};
const NavContext = createContext<Nav | null>(null);

export function NavProvider({ children, initialMonth }: { children: React.ReactNode; initialMonth: string }) {
  const [tab, setTabState] = useState<Tab>("home");
  const [stack, setStack] = useState<Route[]>([]);
  const [month, setMonth] = useState(initialMonth);

  const back = useCallback(() => {
    let handled = false;
    setStack((s) => {
      if (s.length) {
        handled = true;
        return s.slice(0, -1);
      }
      return s;
    });
    if (handled) return true;
    if (tab !== "home") {
      setTabState("home");
      return true;
    }
    return false;
  }, [tab]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length) {
        setStack((s) => s.slice(0, -1));
        return true;
      }
      if (tab !== "home") {
        setTabState("home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, tab]);

  const value = useMemo<Nav>(
    () => ({
      tab,
      stack,
      top: stack[stack.length - 1] || null,
      setTab: (t) => {
        setStack([]);
        setTabState(t);
      },
      push: (r) => setStack((s) => [...s, r]),
      replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
      back,
      reset: () => setStack([]),
      month,
      setMonth,
    }),
    [tab, stack, back, month],
  );
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const n = useContext(NavContext);
  if (!n) throw Error("NavProvider ausente");
  return n;
}
