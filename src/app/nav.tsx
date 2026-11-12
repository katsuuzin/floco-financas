// Navegação própria: abas fixas + pilha por cima. Sem dependências nativas novas.
// O botão voltar do Android desempilha; na raiz, volta para Início; em Início, sai.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BackHandler } from "react-native";
import { trackUse } from "../usageTracker";

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
  | { name: "reminders" }
  | { name: "assistant" }
  | { name: "layout" }
  | { name: "preferences" }
  | { name: "welcome" }
  | { name: "reconcile" }
  | { name: "tool"; id: "categories" | "tags" | "reports" }
  | { name: "people"; tab?: "receivables" | "payables" }
  | { name: "debts"; tab?: "installments" | "financing" | "loan" }
  | { name: "usage" }
  | { name: "dataTools" }
  | { name: "imports" }
  | { name: "receipt" }
  | { name: "notifications" }
  | { name: "security"; section?: "backup" }
  | { name: "updates" }
  | { name: "trash" }
  | { name: "shopping"; add?: boolean }
  | { name: "shoppingList"; add?: boolean }
  | { name: "shoppingTrip"; lists?: string[] }
  | { name: "scanProduct" }
  | { name: "scanNota" }
  | { name: "nfceConsulta"; info: any }
  | { name: "purchases" }
  | { name: "purchaseDetail"; id: string }
  | { name: "productDetail"; id: string }
  | { name: "form"; kind: string; initial?: any };

export function reviewExpenses(shoppingItems: any[]): Route {
  return { name: "form", kind: "expenseBatch", initial: { shoppingItems } };
}

type Nav = {
  tab: Tab;
  stack: Route[];
  top: Route | null;
  setTab: (t: Tab) => void;
  push: (r: Route) => void;
  replace: (r: Route) => void;
  back: () => boolean;
  dismiss: () => boolean;
  registerBackGuard: (guard: () => boolean) => () => void;
  reset: () => void;
  month: string;
  setMonth: (m: string) => void;
};
const NavContext = createContext<Nav | null>(null);

export function NavProvider({
  children,
  initialMonth,
}: {
  children: React.ReactNode;
  initialMonth: string;
}) {
  const [tab, setTabState] = useState<Tab>("home");
  const [stack, setStack] = useState<Route[]>([]);
  const [month, setMonth] = useState(initialMonth);
  const backGuard = useRef<(() => boolean) | null>(null);
  const registerBackGuard = useCallback((guard: () => boolean) => {
    backGuard.current = guard;
    return () => { if (backGuard.current === guard) backGuard.current = null; };
  }, []);

  // Voltar: desempilha a tela aberta; sem pilha, volta para Início; em Início devolve false (sair).
  // Usa a pilha atual (não um flag dentro do setState, que o React pode executar depois).
  const dismiss = useCallback(() => {
    if (stack.length) {
      setStack((s) => s.slice(0, -1));
      return true;
    }
    if (tab !== "home") {
      setTabState("home");
      return true;
    }
    return false;
  }, [stack.length, tab]);

  const back = useCallback(() => backGuard.current?.() || dismiss(), [dismiss]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", back);
    return () => sub.remove();
  }, [back]);

  const value = useMemo<Nav>(
    () => ({
      tab,
      stack,
      top: stack[stack.length - 1] || null,
      setTab: (t) => {
        trackUse(t);
        setStack([]);
        setTabState(t);
      },
      push: (r) => {
        trackUse(r);
        setStack((s) => [...s, r]);
      },
      replace: (r) => {
        trackUse(r);
        setStack((s) => [...s.slice(0, -1), r]);
      },
      back,
      dismiss,
      registerBackGuard,
      reset: () => setStack([]),
      month,
      setMonth,
    }),
    [tab, stack, back, dismiss, registerBackGuard, month],
  );
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

// Destino configurável (atalhos e quarto botão) → aba ou rota.
export function destination(id: string): { tab?: Tab; route?: Route } {
  const map: Record<string, Route> = {
    budgets: { name: "budgets" },
    goals: { name: "goals" },
    projections: { name: "projections" },
    recurrences: { name: "recurrences" },
    installments: { name: "debts", tab: "installments" },
    financings: { name: "debts", tab: "financing" },
    loans: { name: "debts", tab: "loan" },
    receivables: { name: "people", tab: "receivables" },
    payables: { name: "people", tab: "payables" },
    reports: { name: "reports" },
    cashflow: { name: "report", id: "cashflow" },
    accounts: { name: "accounts" },
    cards: { name: "cards" },
    assistant: { name: "assistant" },
    receipt: { name: "receipt" },
    shopping: { name: "shoppingList" },
  };
  return id === "analysis" ? { tab: "analysis" } : { route: map[id] };
}

export function useNav() {
  const n = useContext(NavContext);
  if (!n) throw Error("NavProvider ausente");
  return n;
}
