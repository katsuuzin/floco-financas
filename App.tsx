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
  Keyboard,
  Animated as RNAnimated,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BlurTargetView } from "expo-blur";
import { BlurTargetContext, SheetModal } from "./src/ui/Sheet";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as LocalAuthentication from "expo-local-authentication";
import Feather from "@expo/vector-icons/Feather";
import { ThemeProvider, useTheme } from "./src/ui/theme";
import { T, I, Button, IconButton, Muted, styles as k } from "./src/ui/kit";
import type { Icon } from "./src/ui/kit";
import MotionPressable, { useShake, useReduceMotion } from "./src/ui/motion";
import { StoreProvider, useStore, type NoticeAction } from "./src/app/store";
import Animated, { Easing as Ease, FadeIn, FadeInDown, FadeOutDown, ZoomIn, SlideInDown, useReducedMotion, withTiming, useSharedValue, useAnimatedStyle } from "react-native-reanimated";

// Entrar numa lista: desliza 40 dp da direita esmaecendo, 300 ms com desaceleração (A7).
const listEnter = () => {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ translateX: 40 }] },
    animations: {
      opacity: withTiming(1, { duration: 300 }),
      transform: [{ translateX: withTiming(0, { duration: 300, easing: Ease.out(Ease.cubic) }) }],
    },
  };
};
import { NavProvider, useNav, Route, Tab, destination } from "./src/app/nav";
import { monthKey, today } from "./src/finance.mjs";
import HomeScreen from "./src/screens/HomeScreen";
import TransactionsScreen from "./src/screens/TransactionsScreen";
import AnalysisScreen from "./src/screens/AnalysisScreen";
import { calenTokens } from "./src/calenTheme.mjs";
import MoreScreen from "./src/screens/MoreScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import DataToolsScreen from "./src/screens/DataToolsScreen";
import { useHeaderActionValue } from "./src/app/headerAction";
import FormScreen from "./src/screens/FormScreen";
import {
  AccountsScreen,
  CardsScreen,
  BudgetsScreen,
  GoalsScreen,
} from "./src/screens/OrganizeScreens";
import {
  ContractsScreen,
  RecurrencesScreen,
  InstallmentsScreen,
} from "./src/screens/CommitmentScreens";
import {
  ReportsScreen,
  ReportScreen,
  ProjectionsScreen,
} from "./src/screens/ReportScreens";
import { RulesScreen, ReconcileScreen } from "./src/screens/ToolScreens";
import TrashScreen from "./src/screens/TrashScreen";
import ShoppingScreen from "./src/screens/ShoppingScreen";
import PeopleScreen from "./src/screens/PeopleScreen";
import DebtsScreen from "./src/screens/DebtsScreen";
import UsageScreen from "./src/screens/UsageScreen";
import ShoppingListsScreen from "./src/screens/ShoppingListsScreen";
import ShoppingTripScreen from "./src/screens/ShoppingTripScreen";
import ScanProductScreen from "./src/screens/ScanProductScreen";
import ScanNotaScreen from "./src/screens/ScanNotaScreen";
import NfceConsultaScreen from "./src/screens/NfceConsultaScreen";
import { PurchasesScreen, PurchaseDetailScreen, ProductDetailScreen } from "./src/screens/PurchasesScreens";
import RemindersScreen from "./src/screens/RemindersScreen";
import AssistantScreen from "./src/screens/AssistantScreen";
import {
  LayoutScreen,
  PreferencesScreen,
  WelcomeScreen,
} from "./src/screens/PersonalizeScreens";
import { layoutOf, DESTINATIONS } from "./src/layout.mjs";
import { reschedule, updateWidgets } from "./src/app/notify";
import PlanningPanel from "./src/PlanningPanel";
import ImportsPanel from "./src/ImportsPanel";
import ReceiptPanel from "./src/ReceiptPanel";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import SecurityPanel from "./src/SecurityPanel";
import UpdatesPanel from "./src/UpdatesPanel";
import usePublicUpdates from "./src/usePublicUpdates";

export default function App() {
  const [fonts] = useFonts({
    Sora: require("./assets/fonts/Sora_400Regular.ttf"),
    SoraSemi: require("./assets/fonts/Sora_600SemiBold.ttf"),
    SoraBold: require("./assets/fonts/Sora_700Bold.ttf"),
  });
  // Raiz que a folha desfoca por trás (expo-blur no Android).
  const blurTarget = useRef<React.ComponentRef<typeof View>>(null);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <BlurTargetContext.Provider value={blurTarget}>
    <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
    <SafeAreaProvider>
      <StoreProvider>
        <Themed fonts={fonts}>
          <NavProvider initialMonth={monthKey(today())}>
            <Gate />
          </NavProvider>
        </Themed>
      </StoreProvider>
    </SafeAreaProvider>
    </BlurTargetView>
    </BlurTargetContext.Provider>
    </GestureHandlerRootView>
  );
}

function Themed({
  fonts,
  children,
}: {
  fonts: boolean;
  children: React.ReactNode;
}) {
  const { state } = useStore();
  return (
    <ThemeProvider dark={!!state.settings.dark} fonts={fonts} accent={state.settings.accent}>
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
      const r = NativeModules.FlocoFinanceTools
        ? await NativeModules.FlocoFinanceTools.pinStatus()
        : { enabled: false };
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
      if (status !== "active" && (bioRef.current || pinRef.current))
        setLocked(true);
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
      <Shell
        onPinChange={() => refreshPin()}
        unlocked={!locked}
        protectedApp={pinEnabled}
      />
      <Modal visible={locked} animationType="fade" onRequestClose={() => {}}>
        <Lock pinEnabled={pinEnabled} onUnlock={() => setLocked(false)} />
      </Modal>
    </>
  );
}

function Lock({
  pinEnabled,
  onUnlock,
}: {
  pinEnabled: boolean;
  onUnlock: () => void;
}) {
  const { c } = useTheme();
  const reduce = useReduceMotion();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [tries, setTries] = useState(0);
  const [mode, setMode] = useState<"pin" | "system" | null>(null);
  const busy = mode !== null;
  // Foco do campo: a borda muda de cor em 120 ms (sem animação com "remover animações").
  const focus = useRef(new RNAnimated.Value(0)).current;
  const fade = useRef(new RNAnimated.Value(0)).current;
  const shake = useShake(error && tries ? String(tries) : "");
  const setFocus = (on: boolean) =>
    RNAnimated.timing(focus, { toValue: on ? 1 : 0, duration: reduce ? 0 : 120, useNativeDriver: false }).start();
  useEffect(() => {
    fade.setValue(error && !reduce ? 0 : 1);
    if (error && !reduce) RNAnimated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [error, reduce, fade]);
  const fail = (msg: string) => {
    setError(msg);
    setTries((n) => n + 1);
  };
  const system = async () => {
    Keyboard.dismiss();
    setMode("system");
    try {
      const r = await LocalAuthentication.authenticateAsync({
        promptMessage: "Desbloquear suas finanças",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });
      if (r.success) onUnlock();
      else fail("Desbloqueio cancelado. Tente novamente.");
    } catch {
      fail("Não foi possível autenticar. Confira o bloqueio do aparelho.");
    } finally {
      setMode(null);
    }
  };
  const enterWithPin = async () => {
    if (busy || !pin) return;
    setMode("pin");
    try {
      const ok = await NativeModules.FlocoFinanceTools.verifyPin(pin);
      setPin("");
      if (ok) {
        setError("");
        onUnlock();
      } else fail("PIN incorreto.");
    } catch (e: any) {
      fail(e.message);
    } finally {
      setMode(null);
    }
  };
  // Linha de erro com altura reservada: não empurra a tela e fica acima do teclado.
  const errorLine = (
    <View style={{ minHeight: 22 }} accessibilityLiveRegion="assertive">
      {!!error && (
        <RNAnimated.View style={{ opacity: fade }}>
          <T style={{ color: c.red, textAlign: "center" }}>{error}</T>
        </RNAnimated.View>
      )}
    </View>
  );
  return (
    <SafeAreaView style={[k.flex, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView style={k.flex} behavior="padding">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 24 }}
        >
          <I name="lock" size={42} color={c.primary} />
          <T style={k.pageTitle}>Suas finanças protegidas</T>
          <Muted style={{ textAlign: "center" }}>
            Use o PIN do Floco ou o bloqueio do Android para entrar.
          </Muted>
          {pinEnabled && (
            <View style={{ alignSelf: "stretch", gap: 8 }}>
              <Muted style={{ fontFamily: "SoraSemi" }}>PIN do Floco</Muted>
              <RNAnimated.View style={{ transform: [{ translateX: shake }] }}>
                <AnimatedInput
                  accessibilityLabel="PIN do Floco"
                  secureTextEntry
                  keyboardType="number-pad"
                  returnKeyType="done"
                  submitBehavior="submit"
                  importantForAutofill="no"
                  maxLength={12}
                  value={pin}
                  onChangeText={setPin}
                  onSubmitEditing={enterWithPin}
                  onFocus={() => setFocus(true)}
                  onBlur={() => setFocus(false)}
                  style={[
                    k.input,
                    {
                      borderColor: error ? c.red : focus.interpolate({ inputRange: [0, 1], outputRange: [c.line, c.primary] }),
                      color: c.text,
                      backgroundColor: c.surface,
                    },
                  ]}
                />
              </RNAnimated.View>
              {errorLine}
              <Button
                title={mode === "pin" ? "Verificando…" : "Entrar com PIN"}
                disabled={busy || !pin}
                onPress={enterWithPin}
              />
            </View>
          )}
          <View style={{ alignSelf: "stretch" }}>
            <Button
              title={mode === "system" ? "Autenticando…" : "Usar bloqueio do Android"}
              disabled={busy}
              onPress={system}
              icon="unlock"
              secondary={pinEnabled}
            />
          </View>
          {!pinEnabled && errorLine}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const AnimatedInput = RNAnimated.createAnimatedComponent(TextInput);

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
  dataTools: "Importar e exportar",
  imports: "Importar extrato",
  receipt: "Foto ou comprovante",
  security: "PIN do Floco",
  updates: "Atualizações",
  recurrences: "Recorrências",
  installments: "Parcelamentos",
  reports: "Relatórios",
  projections: "Projeções",
  rules: "Categorização automática",
  reminders: "Lembretes",
  notifications: "Notificações bancárias",
  assistant: "Assistente",
  layout: "Personalizar",
  preferences: "Preferências",
  welcome: "Boas-vindas",
  reconcile: "Conferir fatura",
  trash: "Lixeira",
  shopping: "Listas de compras",
  people: "Entre pessoas",
  debts: "Dívidas e contratos",
  usage: "Uso dos botões",
  shoppingList: "Lista de compras",
  shoppingTrip: "Modo compra",
  scanProduct: "Escanear produto",
  scanNota: "Ler nota fiscal",
  nfceConsulta: "Consultar nota",
  purchases: "Histórico de compras",
  purchaseDetail: "Compra",
  productDetail: "Produto",
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
      : r.name === "tool" ? (r.id === "reports" ? "Relatório personalizado" : "Categorias e tags")
        : r.name === "security" && r.section === "backup" ? "Backup criptografado"
        : TITLES[r.name] || "";

function Shell({
  onPinChange,
  unlocked,
  protectedApp,
}: {
  onPinChange: () => void;
  unlocked: boolean;
  protectedApp: boolean;
}) {
  const { c, dark } = useTheme();
  const { state, perform, notice, noticeAction, setNotice, storageError } = useStore();
  // Estado atual para os links dos widgets (o efeito é registrado uma vez).
  const stateRef = useRef(state);
  stateRef.current = state;
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
      if (m[1] === "add") {
        const card = stateRef.current.cards.find((x: any) => !x.archived);
        nav.push({
          name: "form",
          kind: "transaction",
          initial:
            m[2] === "income"
              ? { type: "income" }
              : m[2] === "transfer"
                ? { type: "transfer" }
                : m[2] === "card" && card
                  ? { type: "expense", cardId: card.id }
                  : { type: "expense" },
        });
      } else if (m[1] === "bills") nav.push({ name: "reminders" });
      else if (m[1] === "cards") nav.push({ name: "cards" });
      else if (m[1] === "budgets") nav.push({ name: "budgets" });
      else nav.reset();
    };
    Linking.getInitialURL()
      .then(handle)
      .catch(() => {});
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, []);
  const top = nav.top;
  const pageScroll = React.useRef<React.ComponentRef<typeof ScrollView>>(null);
  const headerAction = useHeaderActionValue();
  const reduceMotion = useReducedMotion();
  const [navHeight, setNavHeight] = useState(70);
  // Com o teclado aberto, a barra inferior sai da frente e a tela encolhe até o topo do teclado.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const firstRun =
    !state.settings.onboarded &&
    !state.accounts.length &&
    !state.transactions.length;
  const content = top ? (
    renderRoute(top, { state, c, onChange: perform, onPinChange, updates, storageError, scrollTo: (y) => pageScroll.current?.scrollTo({ y: Math.max(0, y), animated: true }) })
  ) : firstRun && nav.tab === "home" ? (
    <WelcomeScreen />
  ) : (
    nav.tab === "transactions" ? null : renderTab(nav.tab)
  );
  const tab4 = layoutOf(state).tab4;
  const slot4 =
    DESTINATIONS.find(([id]: string[]) => id === tab4) || DESTINATIONS[0];
  const title = top ? routeTitle(top) : TITLES[nav.tab];
  // A Análise usa o fundo do tema do Calen (claro e escuro); o resto do app segue o Floco.
  const pageBg = !top && nav.tab === "analysis" ? calenTokens(dark).bg : c.bg;
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: pageBg }}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        // Android com borda a borda não redimensiona a janela: a tela sempre encolhe até o topo do teclado.
        behavior="padding"
      >
        {top?.name !== "form" && (
          <View style={[s.header, { backgroundColor: pageBg }]}>
            {top ? (
              <IconButton name="arrow-left" label="Voltar" onPress={nav.back} />
            ) : nav.tab === "home" ? (
              <Image
                source={require("./assets/icon.png")}
                accessibilityLabel="Mascote Floco"
                style={s.logo}
              />
            ) : null}
            <View
              style={{
                flex: 1,
                paddingLeft: top || nav.tab === "home" ? 0 : 4,
              }}
            >
              <T
                accessibilityRole="header"
                style={[k.pageTitle, { fontSize: top ? 19 : 22 }]}
              >
                {!top && nav.tab === "home" ? "Floco Finanças" : title}
              </T>
            </View>
            {!!top && !!headerAction && (
              <IconButton name="plus" label={headerAction.label} onPress={headerAction.onPress} />
            )}
            {!!top && !headerAction && <View style={{ width: 48 }} />}
            {!top && (
              <View>
                <IconButton
                  name="settings"
                  label={updates.release && nav.tab !== "home" ? "Abrir configurações, atualização disponível" : "Abrir configurações"}
                  onPress={() => nav.push({ name: "settings" })}
                />
                {!!updates.release && nav.tab !== "home" && (
                  <Animated.View pointerEvents="none" entering={reduceMotion ? undefined : ZoomIn.duration(160)} style={{ position: "absolute", top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: c.red, borderWidth: 2, borderColor: pageBg }} />
                )}
              </View>
            )}
          </View>
        )}
        {!!updates.release && !top && nav.tab === "home" && (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(200)}>
            <MotionPressable
              kind="row"
              accessibilityRole="button"
              accessibilityLabel={`Nova versão ${updates.release.version} disponível`}
              accessibilityHint="Abre a tela de atualizações"
              onPress={() => nav.push({ name: "updates" })}
              style={[s.banner, { backgroundColor: c.soft }]}
            >
              <T numberOfLines={2} style={{ fontFamily: "SoraSemi" }}>
                Nova versão {updates.release.version} disponível · Ver atualização
              </T>
            </MotionPressable>
          </Animated.View>
        )}
        {!top && nav.tab === "transactions" ? (
          <TransactionsScreen storageError={storageError} />
        ) : top?.name === "trash" || top?.name === "imports" || (top?.name === "form" && top.kind !== "expenseBatch") ? content : (
        <ScrollView
          ref={pageScroll}
          key={top ? `${top.name}-${nav.stack.length}` : nav.tab}
          contentContainerStyle={[
            k.content,
            { maxWidth: 900, width: "100%", alignSelf: "center" },
          ]}
          style={{ backgroundColor: pageBg }}
          keyboardShouldPersistTaps="handled"
        >
          {!!storageError && (
            <View style={[k.box, { backgroundColor: c.surface }]}>
              <T style={{ color: c.red }}>{storageError}</T>
            </View>
          )}
          {(top && top.name !== "shoppingList") || (!top && nav.tab !== "home") ? (
            <Animated.View key={top ? `${top.name}-${nav.stack.length}` : nav.tab} entering={reduceMotion ? undefined : FadeIn.duration(200)}>
              {content}
            </Animated.View>
          ) : content}
        </ScrollView>
        )}
        {!top && !keyboardOpen && (
          <View
            accessibilityRole="tablist"
            onLayout={(e) => setNavHeight(e.nativeEvent.layout.height)}
            style={[
              s.bottomNav,
              { backgroundColor: c.surface, borderTopColor: c.line },
            ]}
          >
            {TABS.slice(0, 2).map((t) => (
              <TabButton key={t.key} item={t} />
            ))}
            <MotionPressable kind="fab"
              accessibilityRole="button"
              accessibilityLabel="Adicionar lançamento"
              onPress={() => setAdding(true)}
              style={[
                s.add,
                { backgroundColor: c.accent },
              ]}
            >
              <Feather name="plus" size={28} color={c.heroText} />
            </MotionPressable>
            {tab4 === "analysis" ? (
              <TabButton item={TABS[2]} />
            ) : (
              <TabButton
                item={{
                  key: "analysis",
                  label: slot4[1],
                  icon: slot4[2] as Icon,
                }}
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
      <Snackbar notice={notice} action={noticeAction} onClose={() => setNotice("")} hasNav={!top && !keyboardOpen} navHeight={navHeight} />
      <AddSheet visible={adding} onClose={() => setAdding(false)} />
    </SafeAreaView>
  );
}

function renderTab(tab: Tab) {
  if (tab === "analysis") return <AnalysisScreen />;
  if (tab === "more") return <MoreScreen />;
  return <HomeScreen />;
}
function renderRoute(r: Route, { state, c, onChange, onPinChange, updates, storageError, scrollTo }: {
  state: any;
  c: ReturnType<typeof useTheme>["c"];
  onChange: ReturnType<typeof useStore>["perform"];
  onPinChange: () => void;
  updates: ReturnType<typeof usePublicUpdates>;
  storageError: string;
  scrollTo: (y: number) => void;
}) {
  switch (r.name) {
    case "accounts":
      return <AccountsScreen />;
    case "cards":
      return <CardsScreen cardId={r.cardId} />;
    case "budgets":
      return <BudgetsScreen />;
    case "goals":
      return <GoalsScreen />;
    case "dataTools":
      return <DataToolsScreen />;
    case "updates":
      return <UpdatesPanel c={c} updates={updates} />;
    case "security":
      return <SecurityPanel state={state} c={c} onChange={onChange} onPinChange={onPinChange} section={r.section} />;
    case "imports":
      return <ImportsPanel state={state} c={c} onChange={onChange} storageError={storageError} />;
    case "receipt":
      return <ReceiptPanel state={state} c={c} onChange={onChange} />;
    case "tool":
      return <PlanningPanel state={state} c={c} onChange={onChange} initial={r.id} />;
    case "settings":
      return <SettingsScreen />;
    case "contracts":
      return <ContractsScreen type={r.type} />;
    case "people":
      return <PeopleScreen />;
    case "debts":
      return <DebtsScreen />;
    case "usage":
      return <UsageScreen />;
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
    case "notifications":
      return <NotificationsScreen />;
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
    case "trash":
      return <TrashScreen storageError={storageError} />;
    case "shopping":
      return <ShoppingListsScreen />;
    case "shoppingList":
      return <Animated.View entering={listEnter}><ShoppingScreen add={r.add} /></Animated.View>;
    case "shoppingTrip":
      return <ShoppingTripScreen lists={r.lists} />;
    case "scanProduct":
      return <ScanProductScreen />;
    case "scanNota":
      return <ScanNotaScreen />;
    case "nfceConsulta":
      return <NfceConsultaScreen info={r.info} />;
    case "purchases":
      return <PurchasesScreen />;
    case "purchaseDetail":
      return <PurchaseDetailScreen id={r.id} />;
    case "productDetail":
      return <ProductDetailScreen id={r.id} />;
    case "form":
      return <FormScreen kind={r.kind} initial={r.initial} />;
  }
  return null;
}

const SHORT_TAB: Record<string, string> = {
  "Lista de compras": "Compras",
  Financiamentos: "Financ.",
  Parcelamentos: "Parcelas",
  Recorrências: "Recorrentes",
  Empréstimos: "Empréstimos",
  "Fluxo de caixa": "Fluxo",
  "Cartões de crédito": "Cartões",
};
function shortTabLabel(label: string) {
  if (label.includes("›")) return label.split("›").pop()!.trim();
  return SHORT_TAB[label] || label;
}

function TabButton({
  item,
  onPress,
}: {
  item: { key: Tab; label: string; icon: Icon };
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const nav = useNav();
  const on = !onPress && nav.tab === item.key;
  const reduce = useReducedMotion();
  const grow = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    grow.value = reduce ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: 160 });
  }, [on, reduce, grow]);
  const barStyle = useAnimatedStyle(() => ({ opacity: grow.value, transform: [{ scaleX: 0.6 + 0.4 * grow.value }] }));
  // Rótulo curto na barra; o falado (accessibilityLabel) continua completo.
  const shown = shortTabLabel(item.label);
  return (
    <MotionPressable
      kind="chip"
      accessibilityRole={onPress ? "button" : "tab"}
      accessibilityLabel={item.label}
      accessibilityHint={onPress ? "Abre a tela" : undefined}
      accessibilityState={{ selected: on }}
      onPress={onPress || (() => nav.setTab(item.key))}
      style={s.tab}
    >
      <View style={s.indicator}>
        <Animated.View style={[s.pill, { backgroundColor: c.soft }, barStyle]} />
        <I name={item.icon} color={on ? c.primary : c.muted} />
      </View>
      <T
        maxFontSizeMultiplier={1.15}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{
          width: "100%",
          paddingHorizontal: 4,
          textAlign: "center",
          fontSize: 11,
          color: on ? c.primary : c.muted,
          fontFamily: on ? "SoraSemi" : "Sora",
        }}
      >
        {shown}
      </T>
    </MotionPressable>
  );
}

function AddSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const { state } = useStore();
  const nav = useNav();
  const hasAccount = state.accounts.some((a: any) => !a.archived);
  const card = state.cards.find((x: any) => !x.archived);
  const go = (initial: any) => {
    onClose();
    nav.push(
      hasAccount || initial.cardId
        ? { name: "form", kind: "transaction", initial }
        : { name: "form", kind: "account" },
    );
  };
  const options: {
    label: string;
    icon: Icon;
    color: string;
    initial: any;
    hidden?: boolean;
  }[] = [
    {
      label: "Receita",
      icon: "arrow-down-left",
      color: c.green,
      initial: { type: "income" },
    },
    {
      label: "Despesa",
      icon: "arrow-up-right",
      color: c.red,
      initial: { type: "expense" },
    },
    {
      label: "Despesa no cartão",
      icon: "credit-card",
      color: c.primary,
      initial: { type: "expense", cardId: card?.id },
      hidden: !card,
    },
    {
      label: "Transferir",
      icon: "repeat",
      color: c.primary,
      initial: { type: "transfer" },
    },
  ];
  if (!visible) return null;
  return (
    <SheetModal title="Adicionar" onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={s.sheetGrid}>
          {(() => {
            const list = options.filter((option) => !option.hidden);
            return list.map((option, i) => {
              // Número ímpar de ações: a última ocupa a linha toda, com ícone ao lado do rótulo.
              const wide = list.length % 2 === 1 && i === list.length - 1;
              return (
                <MotionPressable key={option.label} kind="row" accessibilityRole="button" accessibilityLabel={option.label}
                  accessibilityHint={`Abre o formulário: ${option.label.toLowerCase()}`}
                  onPress={() => go(option.initial)}
                  style={[s.sheetItem, { backgroundColor: c.soft }, wide && { flexBasis: "100%", flexDirection: "row", minHeight: 72 }]}>
                  <I name={option.icon} size={26} color={option.color} />
                  <T numberOfLines={2} maxFontSizeMultiplier={1.3} style={{ fontFamily: "SoraSemi", fontSize: 13, textAlign: "center" }}>{option.label}</T>
                </MotionPressable>
              );
            });
          })()}
        </View>
        {!hasAccount && <Muted>Cadastre uma conta para começar a lançar.</Muted>}
      </ScrollView>
    </SheetModal>
  );
}

function Snackbar({
  notice,
  action,
  onClose,
  hasNav,
  navHeight,
}: {
  notice: string;
  action?: NoticeAction | null;
  onClose: () => void;
  hasNav: boolean;
  navHeight: number;
}) {
  const { c } = useTheme();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  // 12 dp acima da barra inferior (altura medida) ou 16 dp da base quando não há barra.
  const bottom = insets.bottom + (hasNav ? navHeight + 12 : 16);
  if (!notice) return null;
  return (
    <Animated.View
      key={notice}
      entering={reduceMotion ? undefined : FadeInDown.duration(180)}
      exiting={reduceMotion ? undefined : FadeOutDown.duration(120)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[s.snackbar, { backgroundColor: c.text, bottom }]}
    >
      <T style={{ color: c.bg, fontSize: 13, flex: 1 }}>{notice}</T>
      {action && (
        <MotionPressable
          kind="chip"
          accessibilityRole="button"
          accessibilityLabel={`${action.label}: ${notice}`}
          onPress={() => { onClose(); action.onPress(); }}
          style={{ minHeight: 48, minWidth: 48, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1.5, borderColor: c.bg, alignItems: "center", justifyContent: "center" }}
        >
          <T style={{ color: c.bg, fontFamily: "SoraSemi", fontSize: 14 }}>{action.label}</T>
        </MotionPressable>
      )}
      <MotionPressable kind="icon" accessibilityRole="button" accessibilityLabel="Fechar aviso" onPress={onClose} hitSlop={4}
        style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", marginRight: -12 }}>
        <Feather name="x" size={18} color={c.bg} />
      </MotionPressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 12,
    minHeight: 60,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: { width: 36, height: 36, borderRadius: 10, marginLeft: 6 },
  banner: { padding: 14, minHeight: 56, justifyContent: "center", marginHorizontal: 16, marginTop: 8, borderRadius: 14 },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    paddingBottom: 4,
    alignItems: "center",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
    gap: 2,
  },
  indicator: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  pill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 16 },
  add: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
    elevation: 4,
  },
  snackbar: {
    position: "absolute",
    left: 16,
    right: 16,
    paddingVertical: 4,
    paddingLeft: 16,
    paddingRight: 12,
    minHeight: 56,
    borderRadius: 12,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  sheetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sheetItem: {
    flexGrow: 1,
    flexBasis: "45%",
    minHeight: 96,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
  },
});
