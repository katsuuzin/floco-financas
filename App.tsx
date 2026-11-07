import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  AppState,
  NativeModules,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Linking,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as LocalAuthentication from "expo-local-authentication";
import Feather from "@expo/vector-icons/Feather";
import { ThemeProvider, useTheme } from "./src/ui/theme";
import { T, I, Button, IconButton, Muted, styles as k } from "./src/ui/kit";
import type { Icon } from "./src/ui/kit";
import { StoreProvider, useStore } from "./src/app/store";
import { NavProvider, useNav, Route, Tab, destination } from "./src/app/nav";
import { monthKey, today } from "./src/finance.mjs";
import HomeScreen from "./src/screens/HomeScreen";
import TransactionsScreen from "./src/screens/TransactionsScreen";
import AnalysisScreen from "./src/screens/AnalysisScreen";
import MoreScreen from "./src/screens/MoreScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import FormScreen from "./src/screens/FormScreen";
import { AccountsScreen, CardsScreen, BudgetsScreen, GoalsScreen } from "./src/screens/OrganizeScreens";
import { ContractsScreen, RecurrencesScreen, InstallmentsScreen } from "./src/screens/CommitmentScreens";
import { ReportsScreen, ReportScreen, ProjectionsScreen } from "./src/screens/ReportScreens";
import { RulesScreen, ReconcileScreen } from "./src/screens/ToolScreens";
import RemindersScreen from "./src/screens/RemindersScreen";
import AssistantScreen from "./src/screens/AssistantScreen";
import { LayoutScreen, PreferencesScreen, WelcomeScreen } from "./src/screens/PersonalizeScreens";
import { layoutOf, DESTINATIONS } from "./src/layout.mjs";
import { reschedule, updateWidgets } from "./src/app/notify";
import PlanningPanel from "./src/PlanningPanel";
import ImportsPanel from "./src/ImportsPanel";
import ReceiptPanel from "./src/ReceiptPanel";
import NotificationsPanel from "./src/NotificationsPanel";
import SecurityPanel from "./src/SecurityPanel";
import UpdatesPanel from "./src/UpdatesPanel";
import usePublicUpdates from "./src/usePublicUpdates";

export default function App() {
  const [fonts] = useFonts({
    Sora: require("./assets/fonts/Sora_400Regular.ttf"),
    SoraSemi: require("./assets/fonts/Sora_600SemiBold.ttf"),
    SoraBold: require("./assets/fonts/Sora_700Bold.ttf"),
  });
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Themed fonts={fonts}>
          <NavProvider initialMonth={monthKey(today())}>
            <Gate />
          </NavProvider>
        </Themed>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function Themed({ fonts, children }: { fonts: boolean; children: React.ReactNode }) {
  const { state } = useStore();
  return (
    <ThemeProvider dark={!!state.settings.dark} fonts={fonts}>
      {children}
    </ThemeProvider>
  );
}

// Bloqueio por PIN (módulo nativo) ou biometria/credencial do Android.
function Gate() {
  const { c, dark } = useTheme();
  const { state, loaded } = useStore();
  const [pinReady, setPinReady] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const pinRef = useRef(false);
  const bioRef = useRef(false);
  bioRef.current = !!state.settings.biometric;

  const refreshPin = async (initial = false) => {
    try {
      const r = NativeModules.FlocoFinanceTools ? await NativeModules.FlocoFinanceTools.pinStatus() : { enabled: false };
      pinRef.current = !!r.enabled;
      setPinEnabled(!!r.enabled);
      if (initial && r.enabled) setLocked(true);
    } catch {
      /* sem módulo nativo: segue sem PIN */
    } finally {
      setPinReady(true);
    }
  };
  useEffect(() => {
    void refreshPin(true);
  }, []);
  useEffect(() => {
    if (loaded && !checked) {
      setChecked(true);
      if (state.settings.biometric) setLocked(true);
    }
  }, [loaded, checked, state.settings.biometric]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (status) => {
      if (status !== "active" && (bioRef.current || pinRef.current)) setLocked(true);
    });
    return () => sub.remove();
  }, []);

  if (!loaded || !pinReady)
    return (
      <SafeAreaView style={[k.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
        <T>Carregando finanças…</T>
      </SafeAreaView>
    );
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Shell onPinChange={() => refreshPin()} unlocked={!locked} protectedApp={pinEnabled} />
      <Modal visible={locked} animationType="fade" onRequestClose={() => {}}>
        <Lock pinEnabled={pinEnabled} onUnlock={() => setLocked(false)} />
      </Modal>
    </>
  );
}

function Lock({ pinEnabled, onUnlock }: { pinEnabled: boolean; onUnlock: () => void }) {
  const { c } = useTheme();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const system = async () => {
    setBusy(true);
    try {
      const r = await LocalAuthentication.authenticateAsync({
        promptMessage: "Desbloquear suas finanças",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });
      if (r.success) onUnlock();
      else setError("Desbloqueio cancelado. Tente novamente.");
    } catch {
      setError("Não foi possível autenticar. Confira o bloqueio do aparelho.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={[k.center, { backgroundColor: c.bg }]}>
      <I name="lock" size={42} color={c.primary} />
      <T style={k.pageTitle}>Suas finanças protegidas</T>
      <Muted style={{ textAlign: "center" }}>Use o PIN do Floco ou o bloqueio do Android para entrar.</Muted>
      {pinEnabled && (
        <View style={{ alignSelf: "stretch", gap: 12 }}>
          <TextInput
            accessibilityLabel="PIN do Floco"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={12}
            value={pin}
            onChangeText={setPin}
            style={[k.input, { borderColor: c.line, color: c.text, backgroundColor: c.surface }]}
          />
          <Button
            title="Entrar com PIN"
            disabled={busy || !pin}
            onPress={async () => {
              setBusy(true);
              try {
                const ok = await NativeModules.FlocoFinanceTools.verifyPin(pin);
                setPin("");
                if (ok) {
                  setError("");
                  onUnlock();
                } else setError("PIN incorreto.");
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </View>
      )}
      <Button title={busy ? "Autenticando…" : "Usar bloqueio do Android"} disabled={busy} onPress={system} icon="unlock" secondary={pinEnabled} />
      {!!error && <T style={{ color: c.red }}>{error}</T>}
    </SafeAreaView>
  );
}

const TABS: { key: Tab; label: string; icon: Icon }[] = [
  { key: "home", label: "Início", icon: "home" },
  { key: "transactions", label: "Transações", icon: "list" },
  { key: "analysis", label: "Análise", icon: "bar-chart-2" },
  { key: "more", label: "Mais", icon: "grid" },
];
const TITLES: Record<string, string> = {
  home: "Início",
  transactions: "Transações",
  analysis: "Análise",
  more: "Mais",
  accounts: "Contas",
  cards: "Cartões de crédito",
  budgets: "Orçamento",
  goals: "Metas e caixinhas",
  settings: "Configurações",
  recurrences: "Recorrências",
  installments: "Parcelamentos",
  reports: "Relatórios",
  projections: "Projeções",
  rules: "Categorização automática",
  reminders: "Lembretes",
  assistant: "Assistente",
  layout: "Personalizar",
  preferences: "Preferências",
  welcome: "Boas-vindas",
  reconcile: "Conferir fatura",
};
const REPORT_TITLES: Record<string, string> = {
  cashflow: "Fluxo de caixa",
  categories: "Resultado por categoria",
  compare: "Comparar períodos",
  invoices: "Relatório de faturas",
  budget: "Previsto × realizado",
  patterns: "Padrões de gasto",
  export: "Exportar",
};
const routeTitle = (r: Route) =>
  r.name === "contracts"
    ? r.type === "loan"
      ? "Empréstimos"
      : "Financiamentos"
    : r.name === "report"
      ? REPORT_TITLES[r.id] || "Relatório"
      : TITLES[r.name] || "";

function Shell({ onPinChange, unlocked, protectedApp }: { onPinChange: () => void; unlocked: boolean; protectedApp: boolean }) {
  const { c } = useTheme();
  const { state, perform, notice, setNotice, storageError } = useStore();
  const nav = useNav();
  const updates = usePublicUpdates(unlocked);
  const [adding, setAdding] = useState(false);
  // Reagenda os lembretes quando os dados mudam (com pequena espera para agrupar mudanças).
  useEffect(() => {
    const t = setTimeout(() => {
      void reschedule(state);
      void updateWidgets(state, !!state.settings.biometric || protectedApp);
    }, 1500);
    return () => clearTimeout(t);
  }, [state, protectedApp]);
  // Links floco:// vindos dos widgets.
  useEffect(() => {
    const handle = (url?: string | null) => {
      if (!url) return;
      const m = /^floco:\/\/([^/?#]+)(?:\/([^/?#]+))?/.exec(url);
      if (!m) return;
      if (m[1] === "add") nav.push({ name: "form", kind: "transaction", initial: { type: m[2] === "income" ? "income" : "expense" } });
      else if (m[1] === "bills") nav.push({ name: "reminders" });
      else nav.reset();
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, []);
  const top = nav.top;

  // Painéis que já trazem cabeçalho e rolagem próprios.
  if (top && ["tool", "imports", "receipt", "notifications", "security", "updates"].includes(top.name)) {
    const common = { state, c, onChange: perform, onClose: nav.back };
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        {top.name === "tool" && <PlanningPanel {...common} initial={(top as any).id} />}
        {top.name === "imports" && <ImportsPanel {...common} />}
        {top.name === "receipt" && <ReceiptPanel {...common} />}
        {top.name === "notifications" && <NotificationsPanel {...common} />}
        {top.name === "security" && <SecurityPanel {...common} onPinChange={onPinChange} />}
        {top.name === "updates" && <UpdatesPanel c={c} updates={updates} onBack={nav.back} />}
        <Snackbar notice={notice} onClose={() => setNotice("")} />
      </SafeAreaView>
    );
  }

  const firstRun = !state.settings.onboarded && !state.accounts.length && !state.transactions.length;
  const content = top ? renderRoute(top) : firstRun && nav.tab === "home" ? <WelcomeScreen /> : renderTab(nav.tab);
  const tab4 = layoutOf(state).tab4;
  const slot4 = DESTINATIONS.find(([id]: string[]) => id === tab4) || DESTINATIONS[0];
  const title = top ? routeTitle(top) : TITLES[nav.tab];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {top?.name !== "form" && (
          <View style={[s.header, { backgroundColor: c.surface }]}>
            {top ? (
              <IconButton name="arrow-left" label="Voltar" onPress={nav.back} />
            ) : (
              <Image source={require("./assets/icon.png")} accessibilityLabel="Mascote Floco" style={s.logo} />
            )}
            <View style={{ flex: 1 }}>
              {!top && <T style={{ fontSize: 12, fontFamily: "SoraSemi", color: c.primary }}>Floco Finanças</T>}
              <T accessibilityRole="header" style={k.pageTitle}>
                {title}
              </T>
            </View>
            {!top && <IconButton name="settings" label="Abrir configurações" onPress={() => nav.push({ name: "settings" })} />}
          </View>
        )}
        {!!updates.release && !top && (
          <Pressable
            accessibilityRole="button"
            onPress={() => nav.push({ name: "updates" })}
            style={({ pressed }) => [s.banner, { backgroundColor: c.soft, opacity: pressed ? 0.75 : 1 }]}
          >
            <T style={{ fontFamily: "SoraSemi" }}>Nova versão {updates.release.version} disponível · Atualizar</T>
          </Pressable>
        )}
        <ScrollView
          key={top ? `${top.name}-${nav.stack.length}` : nav.tab}
          contentContainerStyle={[k.content, { maxWidth: 900, width: "100%", alignSelf: "center" }]}
          keyboardShouldPersistTaps="handled"
        >
          {!!storageError && (
            <View style={[k.box, { backgroundColor: c.surface }]}>
              <T style={{ color: c.red }}>{storageError}</T>
            </View>
          )}
          {content}
        </ScrollView>
        {!top && (
          <View accessibilityRole="tablist" style={[s.bottomNav, { backgroundColor: c.surface, borderTopColor: c.line }]}>
            {TABS.slice(0, 2).map((t) => (
              <TabButton key={t.key} item={t} />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adicionar lançamento"
              onPress={() => setAdding(true)}
              style={({ pressed }) => [s.add, { backgroundColor: c.primary, opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="plus" size={28} color={c.onPrimary} />
            </Pressable>
            {tab4 === "analysis" ? (
              <TabButton item={TABS[2]} />
            ) : (
              <TabButton
                item={{ key: "analysis", label: slot4[1], icon: slot4[2] as Icon }}
                onPress={() => {
                  const d = destination(tab4);
                  if (d.route) nav.push(d.route);
                }}
              />
            )}
            <TabButton item={TABS[3]} />
          </View>
        )}
      </KeyboardAvoidingView>
      <Snackbar notice={notice} onClose={() => setNotice("")} />
      <AddSheet visible={adding} onClose={() => setAdding(false)} />
    </SafeAreaView>
  );
}

function renderTab(tab: Tab) {
  if (tab === "transactions") return <TransactionsScreen />;
  if (tab === "analysis") return <AnalysisScreen />;
  if (tab === "more") return <MoreScreen />;
  return <HomeScreen />;
}
function renderRoute(r: Route) {
  switch (r.name) {
    case "accounts":
      return <AccountsScreen />;
    case "cards":
      return <CardsScreen cardId={r.cardId} />;
    case "budgets":
      return <BudgetsScreen />;
    case "goals":
      return <GoalsScreen />;
    case "settings":
      return <SettingsScreen />;
    case "contracts":
      return <ContractsScreen type={r.type} />;
    case "recurrences":
      return <RecurrencesScreen />;
    case "installments":
      return <InstallmentsScreen />;
    case "reports":
      return <ReportsScreen />;
    case "report":
      return <ReportScreen id={r.id} />;
    case "projections":
      return <ProjectionsScreen />;
    case "rules":
      return <RulesScreen />;
    case "reminders":
      return <RemindersScreen />;
    case "assistant":
      return <AssistantScreen />;
    case "layout":
      return <LayoutScreen />;
    case "preferences":
      return <PreferencesScreen />;
    case "welcome":
      return <WelcomeScreen />;
    case "reconcile":
      return <ReconcileScreen />;
    case "form":
      return <FormScreen kind={r.kind} initial={r.initial} />;
  }
  return null;
}

function TabButton({ item, onPress }: { item: { key: Tab; label: string; icon: Icon }; onPress?: () => void }) {
  const { c } = useTheme();
  const nav = useNav();
  const on = !onPress && nav.tab === item.key;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: on }}
      onPress={onPress || (() => nav.setTab(item.key))}
      style={s.tab}
    >
      <View style={[s.indicator, { backgroundColor: on ? c.soft : "transparent" }]}>
        <I name={item.icon} color={on ? c.primary : c.muted} />
      </View>
      <T style={{ fontSize: 10, color: on ? c.primary : c.muted, fontFamily: on ? "SoraSemi" : "Sora" }}>{item.label}</T>
    </Pressable>
  );
}

function AddSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { state } = useStore();
  const nav = useNav();
  const hasAccount = state.accounts.some((a: any) => !a.archived);
  const card = state.cards.find((x: any) => !x.archived);
  const go = (initial: any) => {
    onClose();
    nav.push(hasAccount || initial.cardId ? { name: "form", kind: "transaction", initial } : { name: "form", kind: "account" });
  };
  const options: { label: string; icon: Icon; color: string; initial: any; hidden?: boolean }[] = [
    { label: "Receita", icon: "arrow-down-left", color: c.green, initial: { type: "income" } },
    { label: "Despesa", icon: "arrow-up-right", color: c.red, initial: { type: "expense" } },
    { label: "Despesa no cartão", icon: "credit-card", color: c.primary, initial: { type: "expense", cardId: card?.id }, hidden: !card },
    { label: "Transferir", icon: "repeat", color: c.primary, initial: { type: "transfer" } },
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Fechar" onPress={onClose} style={s.backdrop}>
        <Pressable style={[s.sheet, { backgroundColor: c.surface }]}>
          <T style={k.sectionTitle}>Adicionar</T>
          <View style={s.sheetGrid}>
            {options
              .filter((o) => !o.hidden)
              .map((o) => (
                <Pressable
                  key={o.label}
                  accessibilityRole="button"
                  accessibilityLabel={o.label}
                  onPress={() => go(o.initial)}
                  style={({ pressed }) => [s.sheetItem, { backgroundColor: c.soft, opacity: pressed ? 0.75 : 1 }]}
                >
                  <I name={o.icon} size={26} color={o.color} />
                  <T style={{ fontFamily: "SoraSemi", fontSize: 13, textAlign: "center" }}>{o.label}</T>
                </Pressable>
              ))}
          </View>
          {!hasAccount && <Muted>Cadastre uma conta primeiro: tocar em uma opção abre o cadastro.</Muted>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Snackbar({ notice, onClose }: { notice: string; onClose: () => void }) {
  const { c } = useTheme();
  if (!notice) return null;
  return (
    <Pressable onPress={onClose} accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.snackbar, { backgroundColor: c.text }]}>
      <T style={{ color: c.bg, fontSize: 12, flex: 1 }}>{notice}</T>
      <Feather name="x" size={18} color={c.bg} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 12 },
  banner: { padding: 14, marginHorizontal: 20, marginTop: 8, borderRadius: 14 },
  bottomNav: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6, paddingBottom: 4, alignItems: "center" },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 60, gap: 2 },
  indicator: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: 16 },
  add: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginHorizontal: 6, elevation: 3 },
  snackbar: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 96,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { padding: 20, paddingBottom: 32, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 16 },
  sheetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sheetItem: { flexGrow: 1, flexBasis: "45%", minHeight: 96, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 8, padding: 12 },
});
