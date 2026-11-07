import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Switch,
  ActivityIndicator,
  AppState,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import Feather from "@expo/vector-icons/Feather";
import UpdatesPanel from "./src/UpdatesPanel";
import PlanningPanel, { planningOptions } from "./src/PlanningPanel";
import { categoryNames } from "./src/planning.mjs";
import * as Application from "expo-application";
import { bankProfiles, bankProfile } from "./src/banks.mjs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import * as LocalAuthentication from "expo-local-authentication";
import {
  uid,
  today,
  money,
  parseMoney,
  monthKey,
  addMonths,
  emptyState,
  demoState,
  categories,
  balance,
  totals,
  invoice,
  addTransaction,
  payInvoice,
  deleteTransaction,
  spent,
  contribute,
  reserved,
  validateBackup,
} from "./src/finance.mjs";

type Icon = React.ComponentProps<typeof Feather>["name"];
type Screen =
  "home" | "transactions" | "cards" | "planning" | "more" | "accounts";
const STORAGE = "@kat/floco-financas/v1";
const palette = {
  light: {
    bg: "#FAF5EF",
    surface: "#FFFFFF",
    text: "#311E0D",
    muted: "#705C4B",
    line: "#E4D6C8",
    soft: "#F0E3D4",
    primary: "#311E0D",
    onPrimary: "#FFFFFF",
    accent: "#FFCB45",
    heroText: "#311E0D",
    green: "#704723",
    red: "#B53846",
    amber: "#94621C",
  },
  dark: {
    bg: "#311E0D",
    surface: "#402A17",
    text: "#FFF5E8",
    muted: "#D8C0A8",
    line: "#735840",
    soft: "#553B25",
    primary: "#F0C998",
    onPrimary: "#311E0D",
    accent: "#EAC15B",
    heroText: "#311E0D",
    green: "#E8BD8F",
    red: "#FFADB3",
    amber: "#E3BE7F",
  },
};
const nav: { key: Screen; label: string; icon: Icon }[] = [
  { key: "home", label: "Início", icon: "home" },
  { key: "transactions", label: "Transações", icon: "repeat" },
  { key: "cards", label: "Cartões", icon: "credit-card" },
  { key: "planning", label: "Planejar", icon: "pie-chart" },
  { key: "more", label: "Mais", icon: "grid" },
];
export default function App() {
  return (
    <SafeAreaProvider>
      <FinanceApp />
    </SafeAreaProvider>
  );
}
function FinanceApp() {
  const [state, setState] = useState<any>(emptyState());
  const ref = useRef<any>(state);
  const queue = useRef(Promise.resolve());
  const [showUpdates, setShowUpdates] = useState(false);
  const [tool, setTool] = useState("");
  const [loaded, setLoaded] = useState(false),
    [storageError, setStorageError] = useState(""),
    [screen, setScreen] = useState<Screen>("home");
  const [month, setMonth] = useState(monthKey(today())),
    [form, setForm] = useState<any>(null),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [planning, setPlanning] = useState("budgets"),
    [cardId, setCardId] = useState("");
  const [locked, setLocked] = useState(false),
    [authBusy, setAuthBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [saving, setSaving] = useState(false),
    [formError, setFormError] = useState("");
  const [fontsLoaded] = useFonts({
    Sora: require("./assets/fonts/Sora_400Regular.ttf"),
    SoraSemi: require("./assets/fonts/Sora_600SemiBold.ttf"),
    SoraBold: require("./assets/fonts/Sora_700Bold.ttf"),
  });
  const c = state.settings.dark ? palette.dark : palette.light;
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE);
        if (stored) {
          const parsed = JSON.parse(stored);
          const restored = validateBackup(parsed);
          restored.settings.biometric = !!parsed.settings?.biometric;
          ref.current = restored;
          setState(restored);
          setLocked(restored.settings.biometric);
        }
      } catch (e) {
        setStorageError(
          "Não foi possível ler seus dados. O arquivo original foi preservado. Tente reabrir o aplicativo.",
        );
      } finally {
        setLoaded(true);
      }
    })();
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (status) => {
      if (status !== "active" && ref.current.settings.biometric)
        setLocked(true);
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (form) {
        setForm(null);
        return true;
      }
      if (screen !== "home") {
        setScreen("home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen, form]);
  useEffect(() => {
    if (notice) {
      const timeout = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(timeout);
    }
  }, [notice]);
  const commit = (change: any) => {
    const work = queue.current.then(async () => {
      if (storageError && typeof change === "function")
        throw Error(
          "Reabra o app para recuperar o armazenamento antes de alterar dados.",
        );
      if (storageError) {
        const original = await AsyncStorage.getItem(STORAGE);
        if (original)
          await AsyncStorage.setItem(
            STORAGE + "/recovery-" + Date.now(),
            original,
          );
      }
      const next = typeof change === "function" ? change(ref.current) : change;
      await AsyncStorage.setItem(STORAGE, JSON.stringify(next));
      ref.current = next;
      setState(next);
      if (storageError) setStorageError("");
    });
    queue.current = work.catch(() => {});
    return work;
  };
  const perform = async (change: any, message = "Salvo no aparelho") => {
    try {
      await commit(change);
      setNotice(message);
      return true;
    } catch (e: any) {
      Alert.alert("Não foi possível salvar", e.message);
      return false;
    }
  };
  const unlock = async () => {
    setAuthBusy(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Desbloquear suas finanças",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });
      if (result.success) setLocked(false);
      else setNotice("Desbloqueio cancelado. Tente novamente.");
    } catch {
      setNotice("Não foi possível autenticar. Confira o bloqueio do aparelho.");
    } finally {
      setAuthBusy(false);
    }
  };
  const open = (kind: string, initial: any = {}) => {
    setFormError("");
    setForm({
      kind,
      type: "expense",
      date: today(),
      amount: "",
      description: "",
      category: "Alimentação",
      accountId: state.accounts[0]?.id || "",
      destinationId: state.accounts[1]?.id || "",
      cardId: "",
      installments: "1",
      confirmed: true,
      name: "",
      institution: "",
      initial: "",
      limit: "",
      closingDay: "3",
      dueDay: "10",
      lastFour: "",
      target: "",
      goalId: state.goals[0]?.id || "",
      ...initial,
    });
  };
  const update = (key: string, value: any) =>
    setForm((f: any) => ({ ...f, [key]: value }));
  const confirm = (title: string, message: string, action: () => void) =>
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: action },
    ]);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setFormError("");
    try {
      const f = form;
      await commit((s: any) => {
        if (f.kind === "transaction")
          return addTransaction(f.editId ? deleteTransaction(s, f.editId) : s, {
            ...f,
            amount: parseMoney(f.amount),
            installments: Number(f.installments),
          });
        if (f.kind === "account") {
          if (!f.name.trim()) throw Error("Informe o nome da conta.");
          const initial =
            !f.initial.trim() || /^0(?:,0{1,2})?$/.test(f.initial.trim())
              ? 0
              : parseMoney(f.initial);
          const row = {
            id: f.id || uid(),
            name: f.name.trim(),
            institution:
              bankProfile(f.profileId)?.institution ||
              f.institution.trim() ||
              "Carteira",
            profileId: bankProfile(f.profileId)?.id || "custom",
            holderType:
              bankProfile(f.profileId)?.holderType || f.holderType || "PF",
            initial,
            color: f.color || "#311E0D",
          };
          return {
            ...s,
            accounts: f.id
              ? s.accounts.map((a: any) => (a.id === f.id ? row : a))
              : [...s.accounts, row],
          };
        }
        if (f.kind === "card") {
          if (!f.name.trim()) throw Error("Informe o nome do cartão.");
          const closingDay = Number(f.closingDay),
            dueDay = Number(f.dueDay);
          if (
            ![closingDay, dueDay].every(
              (n) => Number.isInteger(n) && n >= 1 && n <= 28,
            )
          )
            throw Error("Fechamento e vencimento devem estar entre 1 e 28.");
          if (f.lastFour && !/^\d{4}$/.test(f.lastFour))
            throw Error("Informe os 4 últimos dígitos ou deixe em branco.");
          const row = {
            id: f.id || uid(),
            name: f.name.trim(),
            limit: parseMoney(f.limit),
            closingDay,
            dueDay,
            lastFour: f.lastFour,
            color: f.color || "#311E0D",
            accountId: f.accountId,
          };
          return {
            ...s,
            cards: f.id
              ? s.cards.map((a: any) => (a.id === f.id ? row : a))
              : [...s.cards, row],
          };
        }
        if (f.kind === "budget") {
          const amount = parseMoney(f.amount);
          const exists = s.budgets.find((b: any) => b.category === f.category);
          return {
            ...s,
            budgets: exists
              ? s.budgets.map((b: any) =>
                  b.id === exists.id ? { ...b, amount } : b,
                )
              : [...s.budgets, { id: uid(), category: f.category, amount }],
          };
        }
        if (f.kind === "goal") {
          if (!f.name.trim()) throw Error("Dê um nome à sua meta.");
          return {
            ...s,
            goals: [
              ...s.goals,
              {
                id: uid(),
                name: f.name.trim(),
                target: parseMoney(f.target),
                saved: 0,
                deposits: [],
              },
            ],
          };
        }
        if (f.kind === "deposit")
          return contribute(
            s,
            f.goalId,
            parseMoney(f.amount),
            f.accountId,
            f.date,
          );
        if (f.kind === "payment")
          return payInvoice(
            s,
            f.cardId,
            month,
            f.accountId,
            f.date,
            f.amount.trim() ? parseMoney(f.amount) : undefined,
          );
        throw Error("Operação não reconhecida.");
      });
      setForm(null);
      setNotice("Salvo no aparelho");
    } catch (e: any) {
      setFormError(e.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };
  const backup = async () => {
    try {
      const path =
        FileSystem.cacheDirectory + "floco-backup-" + today() + ".json";
      await FileSystem.writeAsStringAsync(
        path,
        JSON.stringify(ref.current, null, 2),
      );
      await Sharing.shareAsync(path, {
        mimeType: "application/json",
        dialogTitle: "Guardar backup das finanças",
      });
    } catch (e: any) {
      Alert.alert("Falha ao exportar", e.message);
    }
  };
  const restore = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if ((asset.size || 0) > 20 * 1024 * 1024)
        throw Error("O backup deve ter no máximo 20 MB.");
      const data = validateBackup(
        JSON.parse(await FileSystem.readAsStringAsync(asset.uri)),
      );
      confirm(
        "Restaurar backup?",
        `Substituir os dados deste app por ${data.accounts.length} contas e ${data.transactions.length} lançamentos? Faça um backup dos dados atuais antes de continuar.`,
        () => {
          perform(data, "Backup restaurado");
        },
      );
    } catch (e: any) {
      Alert.alert("Backup inválido", e.message);
    }
  };
  const exportCSV = async () => {
    try {
      const esc = (v: any) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
      const rows = [
        [
          "Data",
          "Descrição",
          "Tipo",
          "Valor (R$)",
          "Categoria",
          "Conta",
          "Cartão",
          "Confirmado",
        ],
        ...state.transactions.map((t: any) => [
          t.date,
          t.description,
          t.type,
          (t.amount / 100).toFixed(2).replace(".", ","),
          t.category,
          state.accounts.find((a: any) => a.id === t.accountId)?.name,
          state.cards.find((a: any) => a.id === t.cardId)?.name,
          t.confirmed ? "Sim" : "Não",
        ]),
      ];
      const path = FileSystem.cacheDirectory + "floco-lancamentos.csv";
      await FileSystem.writeAsStringAsync(
        path,
        "\uFEFF" + rows.map((r) => r.map(esc).join(";")).join("\r\n"),
      );
      await Sharing.shareAsync(path, {
        mimeType: "text/csv",
        dialogTitle: "Exportar lançamentos",
      });
    } catch (e: any) {
      Alert.alert("Falha na exportação", e.message);
    }
  };
  const toggleBiometric = async (value: boolean) => {
    if (value) {
      try {
        if (
          !(await LocalAuthentication.hasHardwareAsync()) ||
          !(await LocalAuthentication.isEnrolledAsync())
        ) {
          Alert.alert(
            "Configure a biometria",
            "Cadastre sua digital ou rosto nas configurações do Android antes de ativar.",
          );
          return;
        }
        const r = await LocalAuthentication.authenticateAsync({
          promptMessage: "Ativar proteção do app",
        });
        if (!r.success) return;
      } catch {
        Alert.alert("Biometria indisponível");
        return;
      }
    }
    await perform((s: any) => ({
      ...s,
      settings: { ...s.settings, biometric: value },
    }));
  };
  function T({ children, style, ...props }: any) {
    const flat = StyleSheet.flatten(style) || {};
    return (
      <Text
        {...props}
        style={[
          styles.text,
          { color: c.text, fontFamily: fontsLoaded ? "Sora" : undefined },
          style,
          flat.color === "#52666B" ? { color: c.muted } : null,
        ]}
      >
        {children}
      </Text>
    );
  }
  function I({
    name,
    size = 21,
    color = c.muted,
  }: {
    name: Icon;
    size?: number;
    color?: string;
  }) {
    return <Feather name={name} size={size} color={color} />;
  }
  function Button({
    title,
    onPress,
    icon,
    secondary = false,
    disabled = false,
  }: {
    title: string;
    onPress: () => void;
    icon?: Icon;
    secondary?: boolean;
    disabled?: boolean;
  }) {
    return (
      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: secondary ? c.soft : c.primary,
            opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
          },
        ]}
      >
        {icon && (
          <I
            name={icon}
            color={
              secondary
                ? c.primary
                : state.settings.dark
                  ? "#311E0D"
                  : "#FFFFFF"
            }
          />
        )}
        <T
          style={{
            color: secondary
              ? c.primary
              : state.settings.dark
                ? "#311E0D"
                : "#FFFFFF",
            fontFamily: "SoraSemi",
            fontSize: 14,
          }}
        >
          {title}
        </T>
      </Pressable>
    );
  }
  function IconButton({
    name,
    label,
    onPress,
  }: {
    name: Icon;
    label: string;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.iconButton,
          { backgroundColor: pressed ? c.soft : "transparent" },
        ]}
      >
        <I name={name} color={c.primary} />
      </Pressable>
    );
  }
  function Section({ title, action, onPress }: any) {
    return (
      <View style={styles.section}>
        <T style={styles.sectionTitle}>{title}</T>
        {action && (
          <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={styles.smallAction}
          >
            <T
              style={{ color: c.primary, fontSize: 13, fontFamily: "SoraSemi" }}
            >
              {action}
            </T>
          </Pressable>
        )}
      </View>
    );
  }
  function Box({ children, style }: any) {
    return (
      <View style={[styles.box, { backgroundColor: c.surface }, style]}>
        {children}
      </View>
    );
  }
  function Empty({
    icon = "inbox",
    title,
    body,
    action,
    onPress,
  }: {
    icon?: Icon;
    title: string;
    body: string;
    action?: string;
    onPress?: () => void;
  }) {
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: c.soft }]}>
          <I name={icon} size={28} color={c.primary} />
        </View>
        <T style={styles.sectionTitle}>{title}</T>
        <T style={[styles.muted, { textAlign: "center" }]}>{body}</T>
        {action && onPress && <Button title={action} onPress={onPress} />}
      </View>
    );
  }
  const showMoney = (n: number) => (state.settings.hide ? "R$ ••••" : money(n));
  function Progress({
    value,
    max,
    color = c.primary,
  }: {
    value: number;
    max: number;
    color?: string;
  }) {
    return (
      <View
        accessibilityLabel={`${Math.round((value / max) * 100)} por cento`}
        style={[styles.track, { backgroundColor: c.soft }]}
      >
        <View
          style={{
            height: 7,
            borderRadius: 4,
            width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`,
            backgroundColor: color,
          }}
        />
      </View>
    );
  }
  function Transaction({ t }: any) {
    const account = state.accounts.find((a: any) => a.id === t.accountId);
    const card = state.cards.find((a: any) => a.id === t.cardId);
    const edit = () => {
      const group = state.transactions
        .filter((x: any) =>
          t.groupId ? x.groupId === t.groupId : x.id === t.id,
        )
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      const first = group[0];
      open("transaction", {
        ...first,
        editId: t.id,
        amount: (group.reduce((n: number, x: any) => n + x.amount, 0) / 100)
          .toFixed(2)
          .replace(".", ","),
        installments: String(first.installments || 1),
        confirmed: true,
        cardId: first.cardId || "",
        accountId: first.accountId || state.accounts[0]?.id || "",
      });
    };
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t.description}, ${money(t.amount)}. Abrir opções`}
        onPress={() =>
          Alert.alert(
            t.description,
            `${money(t.amount)} · ${t.date.split("-").reverse().join("/")}\n${t.category || "Outros"}${t.installments > 1 ? ` · ${t.installment}/${t.installments}` : ""}`,
            [
              { text: "Fechar", style: "cancel" },
              ...(t.loanSettlement
                ? [
                    {
                      text: "Ver dívida e recebimentos",
                      onPress: () => setTool("receivables"),
                    },
                  ]
                : []),
              ...(t.financingId
                ? [
                    {
                      text: t.confirmed
                        ? "Desfazer pagamento"
                        : "Confirmar pagamento",
                      onPress: () =>
                        confirm(
                          "Alterar pagamento?",
                          "O saldo da conta será recalculado.",
                          () => {
                            perform((s: any) => ({
                              ...s,
                              transactions: s.transactions.map((x: any) =>
                                x.id === t.id
                                  ? { ...x, confirmed: !x.confirmed }
                                  : x,
                              ),
                            }));
                          },
                        ),
                    },
                  ]
                : []),
              ...(!t.invoicePayment && !t.loanSettlement && !t.financingId
                ? [
                    {
                      text: t.confirmed ? "Editar" : "Revisar / confirmar",
                      onPress: edit,
                    },
                  ]
                : []),
              ...(!t.loanSettlement && !t.financingId
                ? [
                    {
                      text: "Excluir",
                      style: "destructive" as const,
                      onPress: () =>
                        confirm(
                          "Excluir lançamento?",
                          t.installments > 1
                            ? "Todas as parcelas desta compra serão excluídas."
                            : "Esta ação remove o lançamento e recalcula o saldo.",
                          () => {
                            perform(
                              (s: any) => deleteTransaction(s, t.id),
                              "Lançamento excluído",
                            );
                          },
                        ),
                    },
                  ]
                : []),
            ],
          )
        }
        style={[styles.transaction, { borderBottomColor: c.line }]}
      >
        <View style={[styles.txIcon, { backgroundColor: c.soft }]}>
          <I
            name={
              t.type === "income"
                ? "arrow-down-left"
                : t.type === "transfer"
                  ? "repeat"
                  : t.cardId
                    ? "credit-card"
                    : "arrow-up-right"
            }
            color={t.type === "income" ? c.green : c.primary}
          />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T numberOfLines={2} style={{ fontFamily: "SoraSemi", fontSize: 13 }}>
            {t.description}
          </T>
          <T style={{ color: c.muted, fontSize: 11 }}>
            {t.category} · {card?.name || account?.name}
            {t.installments > 1 ? ` · ${t.installment}/${t.installments}` : ""}
          </T>
          <T style={{ color: c.muted, fontSize: 10 }}>
            {t.date.split("-").reverse().join("/")}
            {!t.confirmed ? " · Pendente" : t.cardId ? " · Na fatura" : ""}
          </T>
        </View>
        <T
          style={{
            fontFamily: "SoraSemi",
            fontSize: 13,
            color:
              t.type === "income"
                ? c.green
                : t.type === "transfer"
                  ? c.muted
                  : c.text,
          }}
        >
          {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
          {showMoney(t.amount)}
        </T>
      </Pressable>
    );
  }
  const summary = totals(state, month);
  const accountTotal = state.accounts.reduce(
    (n: number, a: any) => n + balance(state, a.id),
    0,
  );
  const monthly = state.transactions
    .filter((t: any) => monthKey(t.date) === month)
    .sort((a: any, b: any) => b.date.localeCompare(a.date));
  const monthLabel = new Date(month + "-15T12:00:00").toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric" },
  );
  const currentCard =
    state.cards.find((card: any) => card.id === cardId) || state.cards[0];
  const bill = currentCard ? invoice(state, currentCard.id, month) : null;
  const accountsContent = (
    <>
      <Section
        title="Contas"
        action="Adicionar"
        onPress={() => open("account")}
      />
      {!state.accounts.length ? (
        <Empty
          icon="credit-card"
          title="Seu dinheiro, no seu controle"
          body="Cadastre uma conta ou carteira para começar. Nenhuma conexão com seu banco é necessária."
          action="Adicionar conta"
          onPress={() => open("account")}
        />
      ) : (
        <Box style={{ paddingVertical: 0 }}>
          {state.accounts.map((a: any) => (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${a.name}`}
              onPress={() =>
                open("account", {
                  ...a,
                  initial: (a.initial / 100).toFixed(2).replace(".", ","),
                })
              }
              style={[styles.accountRow, { borderBottomColor: c.line }]}
            >
              <View style={[styles.bank, { backgroundColor: a.color }]}>
                <I name="briefcase" color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <T style={{ fontFamily: "SoraSemi", fontSize: 13 }}>{a.name}</T>
                <T style={{ fontSize: 11, color: c.muted }}>
                  {a.institution || "Carteira"}
                </T>
              </View>
              <View style={{ alignItems: "flex-end", gap: 5 }}>
                <T style={{ fontFamily: "SoraSemi", fontSize: 14 }}>
                  {showMoney(balance(state, a.id))}
                </T>
                <T style={{ fontSize: 10, color: c.muted }}>
                  Disponível{" "}
                  {showMoney(balance(state, a.id) - reserved(state, a.id))}
                </T>
              </View>
            </Pressable>
          ))}
        </Box>
      )}
    </>
  );
  const titles: Record<Screen, string> = {
    accounts: "Contas",
    home: "Visão geral",
    transactions: "Transações",
    cards: "Cartões",
    planning: "Planejamento",
    more: "Seu Floco",
  };
  const menu = (key: Screen) => {
    setScreen(key);
    setSearch("");
  };
  const navContent = nav.map((item) => (
    <Pressable
      key={item.key}
      accessibilityRole="tab"
      accessibilityState={{ selected: screen === item.key }}
      onPress={() => menu(item.key)}
      style={[styles.navItem, wide && styles.railItem]}
    >
      <View
        style={[
          styles.navIndicator,
          { backgroundColor: screen === item.key ? c.soft : "transparent" },
        ]}
      >
        <I name={item.icon} color={screen === item.key ? c.primary : c.muted} />
      </View>
      <T
        style={{
          fontSize: 10,
          color: screen === item.key ? c.primary : c.muted,
          fontFamily: screen === item.key ? "SoraSemi" : "Sora",
        }}
      >
        {item.label}
      </T>
    </Pressable>
  ));
  if (!loaded)
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
        <Text>Carregando finanças…</Text>
      </SafeAreaView>
    );
  if (locked)
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: c.bg }]}>
        <StatusBar style={state.settings.dark ? "light" : "dark"} />
        <I name="lock" size={42} color={c.primary} />
        <T style={styles.pageTitle}>Suas finanças protegidas</T>
        <T style={{ color: c.muted, textAlign: "center" }}>
          Use a biometria ou o bloqueio do Android para entrar.
        </T>
        <Button
          title={authBusy ? "Autenticando…" : "Desbloquear"}
          disabled={authBusy}
          onPress={unlock}
          icon="unlock"
        />
      </SafeAreaView>
    );
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "bottom"]}
    >
      <StatusBar style={state.settings.dark ? "light" : "dark"} />
      <View style={{ flex: 1, flexDirection: wide ? "row" : "column" }}>
        {wide && (
          <View style={[styles.rail, { backgroundColor: c.surface }]}>
            <Image
              source={require("./assets/icon.png")}
              accessibilityLabel="Floco Finanças"
              style={{ width: 48, height: 48, borderRadius: 14 }}
            />
            {navContent}
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={[styles.header, { backgroundColor: c.surface }]}>
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
                flex: 1,
              }}
            >
              <Image
                source={require("./assets/icon.png")}
                accessibilityLabel="Mascote Floco"
                style={{ width: 48, height: 48, borderRadius: 14 }}
              />
              <View style={{ flexShrink: 1 }}>
                <T style={[styles.brand, { color: c.primary }]}>
                  Floco Finanças
                </T>
                <T style={styles.pageTitle}>{titles[screen]}</T>
              </View>
            </View>
            <View style={{ flexDirection: "row" }}>
              <IconButton
                name={state.settings.hide ? "eye-off" : "eye"}
                label="Ocultar ou mostrar valores"
                onPress={() => {
                  perform(
                    (s: any) => ({
                      ...s,
                      settings: { ...s.settings, hide: !s.settings.hide },
                    }),
                    "Visibilidade alterada",
                  );
                }}
              />
              <IconButton
                name="settings"
                label="Abrir configurações"
                onPress={() => setScreen("more")}
              />
            </View>
          </View>
          {screen !== "more" && (
            <View style={styles.month}>
              <IconButton
                name="chevron-left"
                label="Mês anterior"
                onPress={() => setMonth(monthKey(addMonths(month + "-01", -1)))}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar ao mês atual"
                onPress={() => setMonth(monthKey(today()))}
              >
                <T
                  style={{
                    fontFamily: "SoraSemi",
                    textTransform: "capitalize",
                  }}
                >
                  {monthLabel}
                </T>
              </Pressable>
              <IconButton
                name="chevron-right"
                label="Próximo mês"
                onPress={() => setMonth(monthKey(addMonths(month + "-01", 1)))}
              />
            </View>
          )}
          <ScrollView
            key={`${screen}-${month}`}
            contentContainerStyle={[
              styles.content,
              {
                maxWidth: 900,
                width: "100%",
                alignSelf: "center",
                paddingBottom: 110,
              },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {!!storageError && (
              <Box>
                <T style={{ color: c.red }}>{storageError}</T>
              </Box>
            )}
            {screen === "home" && (
              <>
                <View style={[styles.balance, { backgroundColor: c.accent }]}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <T
                      style={{
                        color: c.heroText,
                        fontFamily: "SoraSemi",
                        fontSize: 14,
                      }}
                    >
                      Seu saldo, sem complicar.
                    </T>
                    <Feather
                      name="sun"
                      size={24}
                      color={c.heroText}
                      importantForAccessibility="no"
                    />
                  </View>
                  <T style={[styles.balanceValue, { color: c.heroText }]}>
                    {showMoney(accountTotal)}
                  </T>
                  <T style={{ color: c.heroText, fontSize: 12, marginTop: 4 }}>
                    Saldo atual de todas as contas
                  </T>
                </View>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                  <Box style={{ flex: 1, marginBottom: 0 }}>
                    <View style={styles.row}>
                      <I name="arrow-down-left" color={c.green} />
                      <T style={{ color: c.muted, fontSize: 12 }}>
                        Entrou no mês
                      </T>
                    </View>
                    <T
                      style={{
                        fontFamily: "SoraSemi",
                        fontSize: 17,
                        color: c.green,
                        marginTop: 8,
                      }}
                    >
                      {showMoney(summary.income)}
                    </T>
                  </Box>
                  <Box style={{ flex: 1, marginBottom: 0 }}>
                    <View style={styles.row}>
                      <I name="arrow-up-right" color={c.red} />
                      <T style={{ color: c.muted, fontSize: 12 }}>
                        Saiu no mês
                      </T>
                    </View>
                    <T
                      style={{
                        fontFamily: "SoraSemi",
                        fontSize: 17,
                        marginTop: 8,
                      }}
                    >
                      {showMoney(summary.expense)}
                    </T>
                  </Box>
                </View>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                  {[
                    {
                      label: "Entrada",
                      type: "income",
                      icon: "arrow-down-left",
                    },
                    { label: "Saída", type: "expense", icon: "arrow-up-right" },
                    { label: "Transferir", type: "transfer", icon: "repeat" },
                  ].map((action) => (
                    <Pressable
                      key={action.type}
                      accessibilityRole="button"
                      accessibilityLabel={action.label}
                      onPress={() =>
                        state.accounts.length
                          ? open("transaction", { type: action.type })
                          : open("account")
                      }
                      style={({ pressed }) => ({
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 7,
                        minHeight: 76,
                        borderRadius: 14,
                        backgroundColor: c.surface,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <I name={action.icon as Icon} color={c.primary} />
                      <T style={{ fontSize: 12, fontFamily: "SoraSemi" }}>
                        {action.label}
                      </T>
                    </Pressable>
                  ))}
                </View>
                <Section title="Para ficar de olho" />
                <Box>
                  <View style={styles.row}>
                    <View style={styles.flex}>
                      <T style={styles.muted}>A pagar</T>
                      <T
                        style={{
                          color: c.red,
                          fontFamily: "SoraSemi",
                          marginTop: 6,
                        }}
                      >
                        {showMoney(summary.pay)}
                      </T>
                    </View>
                    <View style={styles.flex}>
                      <T style={styles.muted}>A receber</T>
                      <T
                        style={{
                          color: c.green,
                          fontFamily: "SoraSemi",
                          marginTop: 6,
                        }}
                      >
                        {showMoney(summary.receive)}
                      </T>
                    </View>
                    <View style={styles.flex}>
                      <T style={styles.muted}>Faturas</T>
                      <T style={{ fontFamily: "SoraSemi", marginTop: 6 }}>
                        {showMoney(
                          state.cards.reduce(
                            (n: number, card: any) =>
                              n + invoice(state, card.id, month).due,
                            0,
                          ),
                        )}
                      </T>
                    </View>
                  </View>
                </Box>
                {accountsContent}
                <Section
                  title="Últimos lançamentos"
                  action="Ver todos"
                  onPress={() => setScreen("transactions")}
                />
                {monthly.length ? (
                  <Box style={{ paddingVertical: 0 }}>
                    {monthly.slice(0, 4).map((t: any) => (
                      <Transaction key={t.id} t={t} />
                    ))}
                  </Box>
                ) : (
                  <Box>
                    <T style={styles.muted}>Nenhum lançamento neste mês.</T>
                  </Box>
                )}
                {!state.accounts.length && (
                  <Button
                    title="Explorar com dados de demonstração"
                    secondary
                    onPress={() =>
                      confirm(
                        "Carregar demonstração?",
                        "Estes são valores fictícios. Você poderá apagar a demonstração em Mais.",
                        () => {
                          perform(
                            demoState(),
                            "Demonstração carregada · valores fictícios",
                          );
                        },
                      )
                    }
                  />
                )}
                <View style={styles.privacy}>
                  <I name="shield" size={15} />
                  <T style={{ fontSize: 11, color: c.muted }}>
                    Sem cadastro. Seus registros ficam neste aparelho.
                  </T>
                </View>
              </>
            )}
            {screen === "transactions" && (
              <>
                <TextInput
                  accessibilityLabel="Buscar transações"
                  placeholder="Buscar transações"
                  placeholderTextColor={c.muted}
                  value={search}
                  onChangeText={setSearch}
                  style={[
                    styles.input,
                    {
                      backgroundColor: c.surface,
                      color: c.text,
                      borderColor: c.line,
                    },
                  ]}
                />
                <View style={styles.chips}>
                  {[
                    ["all", "Todas"],
                    ["income", "Receitas"],
                    ["expense", "Despesas"],
                    ["pending", "Pendentes"],
                  ].map(([key, label]) => (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: filter === key }}
                      onPress={() => setFilter(key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            filter === key ? c.primary : c.surface,
                        },
                      ]}
                    >
                      <T
                        style={{
                          fontSize: 12,
                          color:
                            filter === key
                              ? state.settings.dark
                                ? "#311E0D"
                                : "#FFFFFF"
                              : c.muted,
                        }}
                      >
                        {label}
                      </T>
                    </Pressable>
                  ))}
                </View>
                <Box style={{ paddingVertical: 0 }}>
                  {monthly
                    .filter(
                      (t: any) =>
                        (filter === "all" || filter === "pending"
                          ? !t.confirmed || filter === "all"
                          : t.type === filter) &&
                        t.description
                          .toLocaleLowerCase("pt-BR")
                          .includes(search.toLocaleLowerCase("pt-BR")),
                    )
                    .map((t: any) => (
                      <Transaction key={t.id} t={t} />
                    ))}
                  {!monthly.some(
                    (t: any) =>
                      (filter === "all" || filter === "pending"
                        ? !t.confirmed || filter === "all"
                        : t.type === filter) &&
                      t.description
                        .toLocaleLowerCase("pt-BR")
                        .includes(search.toLocaleLowerCase("pt-BR")),
                  ) && (
                    <Empty
                      title="Nenhum lançamento encontrado"
                      body="Tente outra busca, escolha outro mês ou registre sua primeira movimentação."
                    />
                  )}
                </Box>
              </>
            )}
            {screen === "cards" &&
              (!currentCard ? (
                <Empty
                  icon="credit-card"
                  title="Sua fatura sem surpresas"
                  body="Cadastre um cartão para acompanhar limite, fechamento e compras parceladas."
                  action="Adicionar cartão"
                  onPress={() => open("card")}
                />
              ) : (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chips}
                  >
                    {state.cards.map((card: any) => (
                      <Pressable
                        key={card.id}
                        accessibilityRole="button"
                        onPress={() => setCardId(card.id)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor:
                              card.id === currentCard.id
                                ? c.primary
                                : c.surface,
                          },
                        ]}
                      >
                        <T
                          style={{
                            color:
                              card.id === currentCard.id
                                ? state.settings.dark
                                  ? "#311E0D"
                                  : "#FFFFFF"
                                : c.text,
                            fontSize: 12,
                          }}
                        >
                          {card.name}
                        </T>
                      </Pressable>
                    ))}
                    <IconButton
                      name="plus"
                      label="Adicionar cartão"
                      onPress={() => open("card")}
                    />
                  </ScrollView>
                  <View
                    style={[styles.creditCard, { backgroundColor: "#311E0D" }]}
                  >
                    <View style={styles.row}>
                      <I name="credit-card" color="#FFFFFF" size={28} />
                      <View style={{ flex: 1 }} />
                      <Pressable
                        onPress={() =>
                          open("card", {
                            ...currentCard,
                            limit: (currentCard.limit / 100)
                              .toFixed(2)
                              .replace(".", ","),
                            closingDay: String(currentCard.closingDay),
                            dueDay: String(currentCard.dueDay),
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Editar cartão"
                        style={styles.iconButton}
                      >
                        <I name="edit-2" color="#FFFFFF" />
                      </Pressable>
                    </View>
                    <T
                      style={{
                        color: "#FFFFFF",
                        fontFamily: "SoraSemi",
                        fontSize: 19,
                      }}
                    >
                      {currentCard.name}
                    </T>
                    <T style={{ color: "#F5E4D1", marginTop: 8 }}>
                      •••• {currentCard.lastFour || "••••"}
                    </T>
                    <View
                      style={[
                        styles.row,
                        { marginTop: 25, justifyContent: "space-between" },
                      ]}
                    >
                      <T style={{ color: "#F5E4D1", fontSize: 11 }}>
                        Fecha dia {currentCard.closingDay}
                      </T>
                      <T style={{ color: "#F5E4D1", fontSize: 11 }}>
                        Vence dia {currentCard.dueDay}
                      </T>
                    </View>
                  </View>
                  <Section title="Fatura do mês" />
                  <Box>
                    <T style={styles.muted}>Valor em aberto</T>
                    <T
                      style={[
                        styles.balanceValue,
                        { color: c.text, fontSize: 30 },
                      ]}
                    >
                      {showMoney(bill!.due)}
                    </T>
                    <View
                      style={[
                        styles.row,
                        { justifyContent: "space-between", marginVertical: 12 },
                      ]}
                    >
                      <T style={styles.muted}>Pago {showMoney(bill!.paid)}</T>
                      <T style={styles.muted}>Total {showMoney(bill!.total)}</T>
                    </View>
                    <Progress
                      value={
                        state.transactions
                          .filter((t: any) => t.cardId === currentCard.id)
                          .reduce((n: number, t: any) => n + t.amount, 0) -
                        state.transactions
                          .filter((t: any) =>
                            t.invoicePayment?.startsWith(currentCard.id + ":"),
                          )
                          .reduce((n: number, t: any) => n + t.amount, 0)
                      }
                      max={currentCard.limit}
                    />
                    <T
                      style={[
                        styles.muted,
                        { marginTop: 10, marginBottom: 18 },
                      ]}
                    >
                      Limite total {showMoney(currentCard.limit)}
                    </T>
                    <Button
                      title={
                        bill!.due ? "Pagar fatura" : "Fatura sem saldo a pagar"
                      }
                      disabled={!bill!.due}
                      onPress={() =>
                        open("payment", { cardId: currentCard.id })
                      }
                      icon="check"
                    />
                  </Box>
                  <Section title="Compras desta fatura" />
                  <Box style={{ paddingVertical: 0 }}>
                    {bill!.purchases.length ? (
                      bill!.purchases.map((t: any) => (
                        <Transaction key={t.id} t={t} />
                      ))
                    ) : (
                      <Empty
                        title="Nenhuma compra nesta fatura"
                        body="Compras entram no mês de vencimento conforme o fechamento do cartão."
                      />
                    )}
                  </Box>
                </>
              ))}
            {screen === "planning" && (
              <>
                <View style={styles.chips}>
                  {[
                    ["budgets", "Orçamentos"],
                    ["goals", "Metas e caixinhas"],
                  ].map(([key, label]) => (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      onPress={() => setPlanning(key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            planning === key ? c.primary : c.surface,
                        },
                      ]}
                    >
                      <T
                        style={{
                          fontSize: 13,
                          color:
                            planning === key
                              ? state.settings.dark
                                ? "#311E0D"
                                : "#FFFFFF"
                              : c.text,
                        }}
                      >
                        {label}
                      </T>
                    </Pressable>
                  ))}
                </View>
                {planning === "budgets" ? (
                  <>
                    <Section
                      title="Orçamento por categoria"
                      action="Adicionar"
                      onPress={() => open("budget")}
                    />
                    {state.budgets.length ? (
                      state.budgets.map((b: any) => {
                        const used = spent(state, b.category, month);
                        return (
                          <Box key={b.id}>
                            <View
                              style={[
                                styles.row,
                                { justifyContent: "space-between" },
                              ]}
                            >
                              <T style={{ fontFamily: "SoraSemi" }}>
                                {b.category}
                              </T>
                              <IconButton
                                name="edit-2"
                                label={`Editar orçamento de ${b.category}`}
                                onPress={() =>
                                  open("budget", {
                                    category: b.category,
                                    amount: (b.amount / 100)
                                      .toFixed(2)
                                      .replace(".", ","),
                                  })
                                }
                              />
                            </View>
                            <T style={[styles.muted, { marginBottom: 14 }]}>
                              {showMoney(used)} de {showMoney(b.amount)}
                            </T>
                            <Progress
                              value={used}
                              max={b.amount}
                              color={
                                used > b.amount
                                  ? c.red
                                  : used / b.amount >= 0.8
                                    ? c.amber
                                    : c.primary
                              }
                            />
                            <View
                              style={[
                                styles.row,
                                {
                                  justifyContent: "space-between",
                                  marginTop: 8,
                                },
                              ]}
                            >
                              <T
                                style={{
                                  color: used > b.amount ? c.red : c.green,
                                  fontSize: 12,
                                }}
                              >
                                {showMoney(Math.abs(b.amount - used))}{" "}
                                {used > b.amount
                                  ? "acima do limite"
                                  : "restante"}
                              </T>
                              <IconButton
                                name="trash-2"
                                label="Excluir orçamento"
                                onPress={() =>
                                  confirm(
                                    "Excluir orçamento?",
                                    b.category,
                                    () => {
                                      perform((s: any) => ({
                                        ...s,
                                        budgets: s.budgets.filter(
                                          (x: any) => x.id !== b.id,
                                        ),
                                      }));
                                    },
                                  )
                                }
                              />
                            </View>
                          </Box>
                        );
                      })
                    ) : (
                      <Empty
                        icon="pie-chart"
                        title="Um limite que você decide"
                        body="Defina quanto quer gastar por categoria. Os gastos confirmados aparecem automaticamente."
                        action="Criar orçamento"
                        onPress={() => open("budget")}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Section
                      title="Metas e caixinhas"
                      action="Criar meta"
                      onPress={() => open("goal")}
                    />
                    <T style={[styles.muted, { marginBottom: 16 }]}>
                      Os depósitos reservam dinheiro da conta. O saldo total
                      continua o mesmo; o disponível diminui.
                    </T>
                    {state.goals.length ? (
                      state.goals.map((g: any) => (
                        <Box key={g.id}>
                          <View
                            style={[
                              styles.row,
                              { justifyContent: "space-between" },
                            ]}
                          >
                            <View style={{ flex: 1 }}>
                              <T style={{ fontFamily: "SoraSemi" }}>{g.name}</T>
                              <T style={[styles.muted, { marginTop: 6 }]}>
                                {showMoney(g.saved)} de {showMoney(g.target)}
                              </T>
                            </View>
                            <I
                              name={
                                g.saved >= g.target ? "check-circle" : "target"
                              }
                              color={c.primary}
                              size={26}
                            />
                          </View>
                          <View style={{ marginVertical: 18 }}>
                            <Progress value={g.saved} max={g.target} />
                          </View>
                          <View
                            style={[
                              styles.row,
                              { justifyContent: "space-between" },
                            ]}
                          >
                            <Button
                              title={
                                g.saved >= g.target
                                  ? "Guardar mais"
                                  : "Guardar dinheiro"
                              }
                              secondary
                              onPress={() => open("deposit", { goalId: g.id })}
                            />
                            <IconButton
                              name="trash-2"
                              label={`Excluir meta ${g.name}`}
                              onPress={() =>
                                confirm(
                                  "Excluir meta e liberar reserva?",
                                  "Os valores reservados voltarão a ficar disponíveis nas contas. O saldo total não muda.",
                                  () => {
                                    perform((s: any) => ({
                                      ...s,
                                      goals: s.goals.filter(
                                        (x: any) => x.id !== g.id,
                                      ),
                                    }));
                                  },
                                )
                              }
                            />
                          </View>
                        </Box>
                      ))
                    ) : (
                      <Empty
                        icon="target"
                        title="Um plano para chegar lá"
                        body="Crie uma reserva ou dê um nome ao seu próximo objetivo."
                        action="Criar meta"
                        onPress={() => open("goal")}
                      />
                    )}
                  </>
                )}
              </>
            )}
            {screen === "accounts" && accountsContent}
            {screen === "more" && (
              <>
                {["Organizar", "Planejar", "Acompanhar", "Analisar"].map(
                  (group) => (
                    <View key={group}>
                      <Section title={group} />
                      {[
                        {
                          id: "accounts",
                          label: "Contas",
                          icon: "briefcase",
                          group: "Organizar",
                        },
                        {
                          id: "cards",
                          label: "Cartões de crédito",
                          icon: "credit-card",
                          group: "Organizar",
                        },
                        {
                          id: "budgets",
                          label: "Orçamento",
                          icon: "pie-chart",
                          group: "Planejar",
                        },
                        {
                          id: "goals",
                          label: "Metas e caixinhas",
                          icon: "target",
                          group: "Planejar",
                        },
                        ...planningOptions,
                      ]
                        .filter((option) => option.group === group)
                        .map((option) => (
                          <Pressable
                            key={option.id}
                            accessibilityRole="button"
                            onPress={() => {
                              if (
                                option.id === "accounts" ||
                                option.id === "cards"
                              )
                                setScreen(option.id);
                              else if (
                                option.id === "budgets" ||
                                option.id === "goals"
                              ) {
                                setPlanning(option.id);
                                setScreen("planning");
                              } else setTool(option.id);
                            }}
                            style={({ pressed }) => ({
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 14,
                              minHeight: 60,
                              padding: 16,
                              borderRadius: 16,
                              backgroundColor: c.surface,
                              marginBottom: 8,
                              opacity: pressed ? 0.75 : 1,
                            })}
                          >
                            <I name={option.icon as Icon} />
                            <T style={{ flex: 1 }}>{option.label}</T>
                            <I name="chevron-right" size={18} />
                          </Pressable>
                        ))}
                    </View>
                  ),
                )}
                <Section title="Preferências" />
                <Box>
                  <View style={styles.setting}>
                    <View style={styles.row}>
                      <I name="moon" />
                      <T>Tema escuro</T>
                    </View>
                    <Switch
                      accessibilityLabel="Tema escuro"
                      value={state.settings.dark}
                      thumbColor={state.settings.dark ? c.accent : c.muted}
                      onValueChange={(value) => {
                        perform((s: any) => ({
                          ...s,
                          settings: { ...s.settings, dark: value },
                        }));
                      }}
                      trackColor={{ false: c.line, true: c.primary }}
                    />
                  </View>
                  <View style={styles.setting}>
                    <View style={[styles.row, { flex: 1 }]}>
                      <I name="lock" />
                      <T style={{ flexShrink: 1 }}>Bloqueio biométrico</T>
                    </View>
                    <Switch
                      accessibilityLabel="Bloqueio biométrico"
                      value={state.settings.biometric}
                      thumbColor={state.settings.biometric ? c.accent : c.muted}
                      onValueChange={toggleBiometric}
                      trackColor={{ false: c.line, true: c.primary }}
                    />
                  </View>
                </Box>
                <Section title="Sempre livre" />
                <Box>
                  <View style={styles.row}>
                    <I name="heart" color={c.primary} />
                    <View style={{ flex: 1 }}>
                      <T style={{ fontFamily: "SoraSemi" }}>
                        Seu dinheiro. Sem plano PRO.
                      </T>
                      <T style={{ color: c.muted, fontSize: 12, marginTop: 5 }}>
                        Contas, cartões, metas e orçamentos sem limites
                        comerciais.
                      </T>
                    </View>
                  </View>
                </Box>
                <Section title="Atualizações do aplicativo" />
                <Box>
                  <T style={{ color: c.muted, fontSize: 13, marginBottom: 16 }}>
                    Novas versões pelo seu GitHub privado. Seu token fica
                    protegido neste Android.
                  </T>
                  <Button
                    title="Abrir atualizações"
                    icon="download-cloud"
                    onPress={() => setShowUpdates(true)}
                  />
                </Box>
                <Section title="Seus dados" />
                <Box>
                  <Button
                    title="Salvar backup JSON"
                    secondary
                    icon="upload"
                    onPress={backup}
                  />
                  <View style={{ height: 12 }} />
                  <Button
                    title="Restaurar backup JSON"
                    secondary
                    icon="download"
                    onPress={restore}
                  />
                  <View style={{ height: 12 }} />
                  <Button
                    title="Exportar lançamentos CSV"
                    secondary
                    icon="file-text"
                    onPress={exportCSV}
                  />
                  <T style={[styles.muted, { marginTop: 16 }]}>
                    Backups e CSV não são criptografados. Guarde-os em um lugar
                    privado. A restauração substitui os dados atuais.
                  </T>
                </Box>
                <Section title="Sobre esta versão" />
                <Box>
                  <T style={{ fontFamily: "SoraSemi" }}>
                    Floco Finanças · Android ·{" "}
                    {Application.nativeApplicationVersion || "1.0.0"}
                  </T>
                  <T style={[styles.muted, { marginTop: 12 }]}>
                    Seu controle financeiro pessoal, sem assinatura e sem
                    limites comerciais. Os registros financeiros são locais, sem
                    cadastro, anúncios ou conexão bancária.
                  </T>
                  <T style={[styles.muted, { marginTop: 12 }]}>
                    Inclui contas, transferências, cartões, parcelas, faturas,
                    orçamentos, metas e backup. OCR, leitura de notificações
                    bancárias, sincronização e importação de PDF/OFX não estão
                    implementados nesta versão.
                  </T>
                </Box>
                <Section title="Demonstração e limpeza" />
                <Box>
                  {!state.accounts.length && (
                    <Button
                      title="Carregar dados fictícios"
                      secondary
                      onPress={() => {
                        perform(demoState(), "Demonstração carregada");
                      }}
                    />
                  )}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      confirm(
                        "Apagar todos os dados?",
                        "Esta ação apaga contas, cartões, metas e lançamentos do Floco. Salve um backup antes. Esta ação não afeta outros aplicativos.",
                        () => {
                          perform(emptyState(), "Dados do Floco apagados");
                        },
                      )
                    }
                    style={styles.button}
                  >
                    <I name="trash-2" color={c.red} />
                    <T style={{ color: c.red, fontSize: 13 }}>
                      Apagar todos os dados do Floco
                    </T>
                  </Pressable>
                </Box>
              </>
            )}
          </ScrollView>
          {["home", "transactions", "cards"].includes(screen) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Novo lançamento"
              onPress={() =>
                state.accounts.length || state.cards.length
                  ? open(
                      "transaction",
                      screen === "cards" && currentCard
                        ? { cardId: currentCard.id }
                        : {},
                    )
                  : open("account")
              }
              style={({ pressed }) => [
                styles.fab,
                { backgroundColor: c.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <I name="plus" color={c.onPrimary} size={28} />
            </Pressable>
          )}
          {notice && (
            <Pressable
              onPress={() => setNotice("")}
              accessibilityRole="alert"
              style={[styles.snackbar, { backgroundColor: c.text }]}
            >
              <T style={{ color: c.bg, fontSize: 12, flex: 1 }}>{notice}</T>
              <Feather name="x" size={18} color={c.bg} />
            </Pressable>
          )}
          {!wide && (
            <View
              accessibilityRole="tablist"
              style={[
                styles.bottomNav,
                { backgroundColor: c.surface, borderTopColor: c.line },
              ]}
            >
              {navContent}
            </View>
          )}
        </View>
      </View>
      {!!tool && !locked && (
        <PlanningPanel
          state={state}
          c={c}
          initial={tool}
          onClose={() => setTool("")}
          onChange={perform}
        />
      )}
      <Modal
        visible={showUpdates}
        animationType="slide"
        onRequestClose={() => setShowUpdates(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <UpdatesPanel c={c} onBack={() => setShowUpdates(false)} />
        </SafeAreaView>
      </Modal>
      <Modal
        visible={!!form}
        animationType="slide"
        onRequestClose={() => {
          if (!saving) setForm(null);
        }}
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <View style={[styles.formHeader, { borderBottomColor: c.line }]}>
              <T style={[styles.sectionTitle, { flex: 1 }]}>
                {
                  (
                    {
                      transaction: form?.editId
                        ? "Editar lançamento"
                        : "Novo lançamento",
                      account: form?.id ? "Editar conta" : "Nova conta",
                      card: form?.id ? "Editar cartão" : "Novo cartão",
                      budget: "Orçamento mensal",
                      goal: "Nova meta",
                      deposit: "Guardar dinheiro",
                      payment: "Pagar fatura",
                    } as any
                  )[form?.kind]
                }
              </T>
              <IconButton
                name="x"
                label="Cancelar e fechar"
                onPress={() => !saving && setForm(null)}
              />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.content,
                { gap: 18, maxWidth: 600, width: "100%", alignSelf: "center" },
              ]}
            >
              {form && (
                <>
                  {form.kind === "transaction" && (
                    <>
                      <Choice
                        label="Tipo de lançamento"
                        values={[
                          ["expense", "Despesa"],
                          ["income", "Receita"],
                          ["transfer", "Transferência"],
                        ]}
                        value={form.type}
                        onChange={(value: string) =>
                          setForm((f: any) => ({
                            ...f,
                            type: value,
                            cardId: "",
                            installments: "1",
                          }))
                        }
                        c={c}
                      />
                      <Field
                        label="Descrição"
                        value={form.description}
                        onChange={(v: string) => update("description", v)}
                        c={c}
                        autoFocus
                      />
                      <Field
                        label="Valor total (R$)"
                        value={form.amount}
                        onChange={(v: string) => update("amount", v)}
                        c={c}
                        numeric
                        placeholder="0,00"
                      />
                      {form.type === "expense" && state.cards.length > 0 && (
                        <Choice
                          label="Forma de pagamento"
                          values={[
                            ["", "Conta / débito"],
                            ...state.cards.map((a: any) => [a.id, a.name]),
                          ]}
                          value={form.cardId}
                          onChange={(value: string) => {
                            update("cardId", value);
                            update("installments", "1");
                          }}
                          c={c}
                        />
                      )}{" "}
                      {!form.cardId && (
                        <Choice
                          label="Conta de origem"
                          values={state.accounts.map((a: any) => [
                            a.id,
                            a.name,
                          ])}
                          value={form.accountId}
                          onChange={(v: string) => update("accountId", v)}
                          c={c}
                        />
                      )}{" "}
                      {form.type === "transfer" ? (
                        <Choice
                          label="Conta de destino"
                          values={state.accounts.map((a: any) => [
                            a.id,
                            a.name,
                          ])}
                          value={form.destinationId}
                          onChange={(v: string) => update("destinationId", v)}
                          c={c}
                        />
                      ) : (
                        <Choice
                          label="Categoria"
                          values={categoryNames(state).map((x) => [x, x])}
                          value={form.category}
                          onChange={(v: string) => update("category", v)}
                          c={c}
                        />
                      )}
                      {form.type !== "transfer" && !!state.tags?.length && (
                        <View style={{ marginVertical: 12 }}>
                          <T
                            style={{ fontFamily: "SoraSemi", marginBottom: 8 }}
                          >
                            Tags (opcional)
                          </T>
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            {state.tags.map((tag: any) => {
                              const selected = (form.tags || []).includes(
                                tag.id,
                              );
                              return (
                                <Pressable
                                  key={tag.id}
                                  accessibilityRole="checkbox"
                                  accessibilityState={{ checked: selected }}
                                  onPress={() =>
                                    update(
                                      "tags",
                                      selected
                                        ? (form.tags || []).filter(
                                            (id: string) => id !== tag.id,
                                          )
                                        : [...(form.tags || []), tag.id],
                                    )
                                  }
                                  style={({ pressed }) => ({
                                    minHeight: 48,
                                    padding: 12,
                                    borderRadius: 12,
                                    backgroundColor: selected
                                      ? c.soft
                                      : c.surface,
                                    borderWidth: 1,
                                    borderColor: c.line,
                                    opacity: pressed ? 0.7 : 1,
                                  })}
                                >
                                  <T>
                                    {selected ? "✓ " : ""}
                                    {tag.name}
                                  </T>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      )}
                      <Field
                        label="Data (AAAA-MM-DD)"
                        value={form.date}
                        onChange={(v: string) => update("date", v)}
                        c={c}
                        placeholder="2026-11-06"
                      />
                      {form.cardId ? (
                        <>
                          <Field
                            label="Quantidade de parcelas"
                            value={form.installments}
                            onChange={(v: string) => update("installments", v)}
                            c={c}
                            numeric
                          />
                          <Text style={{ color: c.muted, fontSize: 12 }}>
                            O valor total é dividido em parcelas; cada uma entra
                            na fatura conforme fechamento e vencimento. O dia de
                            fechamento ainda pertence ao ciclo atual.
                          </Text>
                        </>
                      ) : (
                        <View style={styles.setting}>
                          <Text style={{ color: c.text }}>
                            Já{" "}
                            {form.type === "income"
                              ? "recebido"
                              : "pago / realizado"}
                          </Text>
                          <Switch
                            accessibilityLabel="Lançamento confirmado"
                            value={form.confirmed}
                            thumbColor={form.confirmed ? c.accent : c.muted}
                            onValueChange={(v) => update("confirmed", v)}
                            trackColor={{ false: c.line, true: c.primary }}
                          />
                        </View>
                      )}
                    </>
                  )}
                  {form.kind === "account" && (
                    <>
                      <Choice
                        label="Banco e perfil"
                        values={[
                          ...bankProfiles.map((p) => [p.id, p.label]),
                          ["custom", "Outro banco / carteira"],
                        ]}
                        value={form.profileId || "custom"}
                        onChange={(id: string) => {
                          const profile = bankProfile(id);
                          setForm((f: any) => ({
                            ...f,
                            profileId: id,
                            holderType:
                              profile?.holderType || f.holderType || "PF",
                            institution: profile?.institution || f.institution,
                            name:
                              !f.name ||
                              f.name === bankProfile(f.profileId)?.label
                                ? profile?.label || f.name
                                : f.name,
                            color: profile?.color || f.color,
                          }));
                        }}
                        c={c}
                      />
                      <Field
                        label="Nome da conta"
                        value={form.name}
                        onChange={(v: string) => update("name", v)}
                        c={c}
                        autoFocus
                      />
                      {bankProfile(form.profileId) ? (
                        <T style={styles.muted}>
                          {bankProfile(form.profileId)?.institution} ·{" "}
                          {bankProfile(form.profileId)?.holderType === "PJ"
                            ? "Pessoa jurídica"
                            : "Pessoa física"}
                          . Conta independente, sem conexão automática com o
                          banco.
                        </T>
                      ) : (
                        <Field
                          label="Instituição"
                          value={form.institution}
                          onChange={(v: string) => update("institution", v)}
                          c={c}
                          placeholder="Nubank, Itaú, Dinheiro…"
                        />
                      )}
                      <Field
                        label="Saldo inicial (R$)"
                        value={form.initial}
                        onChange={(v: string) => update("initial", v)}
                        c={c}
                        numeric
                        placeholder="0,00"
                      />
                      <T style={styles.muted}>
                        O saldo atual é calculado a partir deste valor e dos
                        lançamentos confirmados. Deixe vazio para começar com
                        zero.
                      </T>
                      <Choice
                        label="Cor da conta"
                        values={[
                          "#311E0D",
                          "#820AD1",
                          "#E67E22",
                          "#335E9A",
                          "#B53846",
                        ].map((x) => [
                          x,
                          x === "#311E0D"
                            ? "Marrom"
                            : x === "#820AD1"
                              ? "Roxo"
                              : x === "#E67E22"
                                ? "Laranja"
                                : x === "#335E9A"
                                  ? "Azul"
                                  : "Vermelho",
                        ])}
                        value={form.color || "#311E0D"}
                        onChange={(v: string) => update("color", v)}
                        c={c}
                      />
                      {form.id && (
                        <Button
                          title="Excluir conta sem movimentações"
                          secondary
                          onPress={() => {
                            if (
                              state.transactions.some(
                                (t: any) =>
                                  t.accountId === form.id ||
                                  t.destinationId === form.id,
                              ) ||
                              state.goals.some((g: any) =>
                                g.deposits.some(
                                  (d: any) => d.accountId === form.id,
                                ),
                              ) ||
                              (state.recurrences || []).some(
                                (r: any) => r.accountId === form.id,
                              ) ||
                              (state.financings || []).some(
                                (r: any) => r.accountId === form.id,
                              ) ||
                              state.cards.some(
                                (card: any) => card.accountId === form.id,
                              )
                            ) {
                              setFormError(
                                "Esta conta tem movimentações, reservas ou um cartão vinculado. Preserve o histórico.",
                              );
                              return;
                            }
                            confirm("Excluir conta?", form.name, () => {
                              perform((s: any) => ({
                                ...s,
                                accounts: s.accounts.filter(
                                  (a: any) => a.id !== form.id,
                                ),
                              })).then((ok) => ok && setForm(null));
                            });
                          }}
                        />
                      )}
                    </>
                  )}
                  {form.kind === "card" && (
                    <>
                      <Field
                        label="Nome do cartão"
                        value={form.name}
                        onChange={(v: string) => update("name", v)}
                        c={c}
                        autoFocus
                      />
                      <Field
                        label="Limite total (R$)"
                        value={form.limit}
                        onChange={(v: string) => update("limit", v)}
                        c={c}
                        numeric
                      />
                      <Field
                        label="Últimos 4 dígitos (opcional)"
                        value={form.lastFour}
                        onChange={(v: string) => update("lastFour", v)}
                        c={c}
                        numeric
                      />
                      <Field
                        label="Dia do fechamento (1 a 28)"
                        value={form.closingDay}
                        onChange={(v: string) => update("closingDay", v)}
                        c={c}
                        numeric
                      />
                      <Field
                        label="Dia do vencimento (1 a 28)"
                        value={form.dueDay}
                        onChange={(v: string) => update("dueDay", v)}
                        c={c}
                        numeric
                      />
                      <Choice
                        label="Conta preferida para pagar"
                        values={state.accounts.map((a: any) => [a.id, a.name])}
                        value={form.accountId}
                        onChange={(v: string) => update("accountId", v)}
                        c={c}
                      />
                      <T style={styles.muted}>
                        Alterar as datas não muda as faturas de compras já
                        registradas.
                      </T>
                      {form.id && (
                        <Button
                          title="Excluir cartão sem compras"
                          secondary
                          onPress={() => {
                            if (
                              state.transactions.some(
                                (t: any) =>
                                  t.cardId === form.id ||
                                  t.invoicePayment?.startsWith(form.id + ":"),
                              )
                            ) {
                              setFormError(
                                "O cartão tem compras ou pagamentos. Preserve o histórico.",
                              );
                              return;
                            }
                            confirm("Excluir cartão?", form.name, () => {
                              perform((s: any) => ({
                                ...s,
                                cards: s.cards.filter(
                                  (a: any) => a.id !== form.id,
                                ),
                              })).then((ok) => ok && setForm(null));
                            });
                          }}
                        />
                      )}
                    </>
                  )}
                  {form.kind === "budget" && (
                    <>
                      <Choice
                        label="Categoria"
                        values={categoryNames(state)
                          .filter((x) => x !== "Salário")
                          .map((x) => [x, x])}
                        value={form.category}
                        onChange={(v: string) => update("category", v)}
                        c={c}
                      />
                      <Field
                        label="Limite mensal (R$)"
                        value={form.amount}
                        onChange={(v: string) => update("amount", v)}
                        c={c}
                        numeric
                      />
                      <T style={styles.muted}>
                        Se já houver orçamento para a categoria, o limite será
                        atualizado. O mesmo limite se aplica a todos os meses.
                      </T>
                    </>
                  )}
                  {form.kind === "goal" && (
                    <>
                      <Field
                        label="Nome da meta"
                        value={form.name}
                        onChange={(v: string) => update("name", v)}
                        c={c}
                        autoFocus
                      />
                      <Field
                        label="Quanto quer guardar? (R$)"
                        value={form.target}
                        onChange={(v: string) => update("target", v)}
                        c={c}
                        numeric
                      />
                    </>
                  )}
                  {form.kind === "deposit" && (
                    <>
                      <Choice
                        label="Meta"
                        values={state.goals.map((g: any) => [g.id, g.name])}
                        value={form.goalId}
                        onChange={(v: string) => update("goalId", v)}
                        c={c}
                      />
                      <Field
                        label="Valor para reservar (R$)"
                        value={form.amount}
                        onChange={(v: string) => update("amount", v)}
                        c={c}
                        numeric
                      />
                      <Choice
                        label="Reservar de qual conta?"
                        values={state.accounts.map((a: any) => [
                          a.id,
                          `${a.name} · ${showMoney(balance(state, a.id) - reserved(state, a.id))} disponível`,
                        ])}
                        value={form.accountId}
                        onChange={(v: string) => update("accountId", v)}
                        c={c}
                      />
                    </>
                  )}
                  {form.kind === "payment" && (
                    <>
                      <T style={{ fontSize: 30, fontFamily: "SoraBold" }}>
                        {showMoney(invoice(state, form.cardId, month).due)}
                      </T>
                      <T style={styles.muted}>
                        O pagamento reduz o saldo da conta e abate o valor da
                        fatura selecionada. Não duplica a despesa nos totais do
                        mês.
                      </T>
                      <Field
                        label="Valor a pagar (R$)"
                        value={form.amount}
                        onChange={(v: string) => update("amount", v)}
                        c={c}
                        numeric
                      />
                      <T style={styles.muted}>
                        Deixe vazio para pagar todo o saldo aberto. Informe um
                        valor para pagamento parcial.
                      </T>
                      <Choice
                        label="Pagar usando"
                        values={state.accounts.map((a: any) => [a.id, a.name])}
                        value={form.accountId}
                        onChange={(v: string) => update("accountId", v)}
                        c={c}
                      />
                    </>
                  )}
                  {!!formError && (
                    <T accessibilityRole="alert" style={{ color: c.red }}>
                      {formError}
                    </T>
                  )}
                  <Button
                    title={
                      saving
                        ? "Salvando…"
                        : form.kind === "payment"
                          ? "Confirmar pagamento"
                          : "Salvar"
                    }
                    disabled={saving}
                    onPress={save}
                    icon="check"
                  />
                  <View style={{ height: 24 }} />
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
// These inputs live outside FinanceApp so typing never remounts a focused field.
function Field({
  label,
  value,
  onChange,
  c,
  numeric = false,
  placeholder = "",
  autoFocus = false,
}: any) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: "SoraSemi", fontSize: 13, color: c.text }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={numeric ? "decimal-pad" : "default"}
        autoFocus={autoFocus}
        autoCapitalize="sentences"
        maxLength={numeric ? 16 : 180}
        style={[
          styles.input,
          {
            backgroundColor: c.surface,
            color: c.text,
            borderColor: c.line,
            fontFamily: "Sora",
          },
        ]}
      />
    </View>
  );
}
function Choice({ label, values, value, onChange, c }: any) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: "SoraSemi", fontSize: 13, color: c.text }}>
        {label}
      </Text>
      <View style={styles.chips}>
        {values.length ? (
          values.map(([key, name]: string[]) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={name}
              accessibilityState={{ checked: value === key }}
              key={key}
              onPress={() => onChange(key)}
              style={[
                styles.chip,
                {
                  backgroundColor: value === key ? c.primary : c.surface,
                  borderWidth: 1,
                  borderColor: value === key ? c.primary : c.line,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: "Sora",
                  fontSize: 12,
                  color:
                    value === key
                      ? c.bg === "#311E0D"
                        ? "#311E0D"
                        : "#FFFFFF"
                      : c.text,
                }}
              >
                {name}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={{ color: c.muted }}>
            Nenhuma opção cadastrada. Volte e adicione uma conta primeiro.
          </Text>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  text: { fontSize: 14, lineHeight: 21 },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 24,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  header: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { fontSize: 12, fontFamily: "SoraSemi", marginBottom: 5 },
  pageTitle: { fontSize: 25, lineHeight: 33, fontFamily: "SoraBold" },
  month: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    paddingVertical: 3,
  },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  box: { padding: 18, borderRadius: 14, marginBottom: 12 },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
    gap: 12,
  },
  sectionTitle: { fontSize: 17, lineHeight: 24, fontFamily: "SoraSemi" },
  muted: { fontSize: 12, lineHeight: 19, color: "#52666B" },
  balance: { borderRadius: 16, padding: 24, marginTop: 4 },
  balanceValue: {
    fontSize: 35,
    lineHeight: 48,
    fontFamily: "SoraBold",
    marginTop: 8,
    fontVariant: ["tabular-nums"],
  },
  balanceDetails: { flexDirection: "row", marginTop: 23, gap: 20 },
  balanceDivider: { width: 1, backgroundColor: "#D8BD67" },
  button: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  smallAction: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 88,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  bank: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  transaction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 17,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 88,
  },
  txIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  privacy: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginVertical: 26,
    alignItems: "center",
  },
  empty: {
    paddingVertical: 30,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 16,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 52,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 4 },
  chip: {
    minHeight: 48,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 24,
    justifyContent: "center",
  },
  track: { height: 7, borderRadius: 4, overflow: "hidden" },
  creditCard: { padding: 24, borderRadius: 16, minHeight: 212, marginTop: 12 },
  setting: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    paddingBottom: 4,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
    gap: 2,
  },
  navIndicator: { paddingHorizontal: 17, paddingVertical: 5, borderRadius: 18 },
  rail: { width: 105, paddingTop: 30, alignItems: "center", gap: 20 },
  railItem: { flex: 0, width: "100%", minHeight: 75 },
  fab: {
    position: "absolute",
    bottom: 91,
    right: 23,
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  snackbar: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 160,
    padding: 17,
    borderRadius: 12,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  formHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
  },
});
