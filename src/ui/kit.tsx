// Componentes de interface em escopo de módulo: nunca são recriados a cada render,
// então campos de texto não perdem o foco enquanto o usuário digita.
import React, { useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  findNodeHandle,
  useWindowDimensions,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  Switch,
  TextProps,
  ViewStyle,
  StyleProp,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MotionPressable, { useShake } from "./motion";
import { Reveal } from "./reveal";
import { useReducedMotion } from "react-native-reanimated";
import { useTheme } from "./theme";
import { money } from "../finance.mjs";
import { evaluateAmount, isExpression } from "../amountExpression.mjs";
import { maskMoney, normalizeMoneyText } from "../moneyInput.mjs";

export type ViewControl = React.ComponentRef<typeof View>;
export type TextControl = React.ComponentRef<typeof TextInput>;

export function focusAccessibility(target: ViewControl | TextControl | null | undefined) {
  if (!target) return;
  requestAnimationFrame(() => {
    const handle = findNodeHandle(target);
    if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle);
  });
}

export type Icon = React.ComponentProps<typeof Feather>["name"];

export function T({ style, ...props }: TextProps & { style?: any }) {
  const { c, fonts } = useTheme();
  return (
    <Text
      {...props}
      style={[
        styles.text,
        { color: c.text, fontFamily: fonts ? "Sora" : undefined },
        style,
      ]}
    />
  );
}

export const touch = { min: 48 } as const;
export const type = { caption: 12 } as const;

export const fitAmount = { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.7 } as const;

export function Muted({ style, ...props }: TextProps & { style?: any }) {
  const { c } = useTheme();
  return <T {...props} style={[styles.muted, { color: c.muted }, style]} />;
}

export function I({
  name,
  size = 21,
  color,
}: {
  name: Icon;
  size?: number;
  color?: string;
}) {
  const { c } = useTheme();
  return <Feather name={name} size={size} color={color || c.muted} />;
}

export function Button({
  title,
  onPress,
  icon,
  secondary = false,
  danger = false,
  disabled = false,
  accessibilityLiveRegion,
  controlRef,
}: {
  title: string;
  controlRef?: React.Ref<ViewControl>;
  onPress: () => void;
  icon?: Icon;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  accessibilityLiveRegion?: "none" | "polite" | "assertive";
}) {
  const { c } = useTheme();
  const fg = danger ? c.red : secondary ? c.primary : c.onPrimary;
  return (
    <MotionPressable kind="button"
      ref={controlRef}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityLiveRegion={accessibilityLiveRegion}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: danger
            ? "transparent"
            : secondary
              ? c.soft
              : c.primary,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {icon && <I name={icon} color={fg} />}
      <T style={{ flexShrink: 1, textAlign: "center", color: fg, fontFamily: "SoraSemi", fontSize: 14 }}>{title}</T>
    </MotionPressable>
  );
}

export function CreateAction({ title, onPress }: { title: string; onPress: () => void }) {
  return <View style={{ marginBottom: 12 }}><Button title={title} icon="plus" onPress={onPress} /></View>;
}

export function IconButton({
  name,
  label,
  onPress,
  color,
  disabled = false,
}: {
  name: Icon;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <MotionPressable kind="icon"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.iconButton,
        { backgroundColor: pressed && !disabled ? c.soft : "transparent", opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <I name={name} color={color || c.primary} />
    </MotionPressable>
  );
}

export function Section({
  title,
  action,
  onPress,
  icon,
  actionLabel,
  fixedHeight = false,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
  icon?: React.ReactNode; // ícone decorativo antes do título (o título continua sendo o texto lido)
  actionLabel?: string; // rótulo falado da ação (ex.: "Ver tudo, Contas"); por padrão, o texto visível
  fixedHeight?: boolean; // mantém 48 dp mesmo sem ação, para o título ficar na mesma posição com ou sem "Ver tudo"
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.section, fixedHeight && { minHeight: touch.min }]}>
      {icon ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
          {icon}
          <T accessibilityRole="header" style={styles.sectionTitle}>
            {title}
          </T>
        </View>
      ) : (
        <T accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </T>
      )}
      {action && onPress && (
        <MotionPressable
          kind="chip"
          accessibilityRole="button"
          accessibilityLabel={actionLabel || action}
          onPress={onPress}
          style={styles.smallAction}
        >
          <T style={{ color: c.primary, fontSize: 13, fontFamily: "SoraSemi" }}>
            {action}
          </T>
        </MotionPressable>
      )}
    </View>
  );
}

export function Box({
  children,
  style,
  enter,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  enter?: number; // posição na lista: o cartão entra em cascata
}) {
  const { c } = useTheme();
  const box = (
    <View style={[styles.box, { backgroundColor: c.surface }, style]}>
      {children}
    </View>
  );
  return enter === undefined ? box : <Reveal index={enter}>{box}</Reveal>;
}

export function Empty({
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
  const { c } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.soft }]}>
        <I name={icon} size={28} color={c.primary} />
      </View>
      <T style={styles.sectionTitle}>{title}</T>
      <Muted style={{ textAlign: "center" }}>{body}</Muted>
      {action && onPress && <Button title={action} onPress={onPress} />}
    </View>
  );
}

// Barra que enche até o valor ao aparecer (500 ms, desacelerando). Só nas telas que pedem (animate).
function FillingBar({ pct, color }: { pct: number; color: string }) {
  const reduce = useReducedMotion();
  const width = useRef(new Animated.Value(reduce ? pct : 0)).current;
  React.useEffect(() => {
    if (reduce) width.setValue(pct);
    else Animated.timing(width, { toValue: pct, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, reduce, width]);
  return <Animated.View style={{ height: 7, borderRadius: 4, backgroundColor: color, width: width.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }} />;
}

export function Progress({
  value,
  max,
  color,
  animate = false,
}: {
  value: number;
  max: number;
  color?: string;
  animate?: boolean;
}) {
  const { c } = useTheme();
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  if (animate) {
    return (
      <View accessibilityLabel={`${Math.round(pct)} por cento`} style={[styles.track, { backgroundColor: c.soft }]}>
        <FillingBar pct={pct} color={color || c.primary} />
      </View>
    );
  }
  return (
    <View
      accessibilityLabel={`${Math.round(pct)} por cento`}
      style={[styles.track, { backgroundColor: c.soft }]}
    >
      <View
        style={{
          height: 7,
          borderRadius: 4,
          width: `${pct}%`,
          backgroundColor: color || c.primary,
        }}
      />
    </View>
  );
}

export function Field({
  label,
  value,
  onChange,
  numeric = false,
  placeholder = "",
  autoFocus = false,
  multiline = false,
  secure = false,
  hint,
  maxLength,
  onSubmit,
  inputRef,
  error,
}: {
  label: string;
  inputRef?: React.Ref<TextControl>;
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  error?: string;
  numeric?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  multiline?: boolean;
  secure?: boolean;
  hint?: string;
  maxLength?: number;
}) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <T style={styles.label}>{label}</T>
      <TextInput
        ref={inputRef}
        selectionColor={c.accent}
        cursorColor={c.accent}
        secureTextEntry={secure}
        autoCorrect={!secure}
        accessibilityLabel={label}
        accessibilityHint={error || hint}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={numeric ? "decimal-pad" : "default"}
        autoFocus={autoFocus}
        multiline={multiline}
        returnKeyType={onSubmit ? "done" : undefined}
        onSubmitEditing={onSubmit}
        autoCapitalize={secure ? "none" : "sentences"}
        maxLength={maxLength ?? (numeric ? 16 : multiline ? 2000 : 180)}
        style={[
          styles.input,
          {
            backgroundColor: c.surface,
            color: c.text,
            borderColor: error ? c.red : c.muted,
            fontFamily: "Sora",
          },
          multiline && { minHeight: 96, textAlignVertical: "top" },
        ]}
      />
      {!!hint && <Muted>{hint}</Muted>}
      {!!error && <T accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: c.red }}>{error}</T>}
    </View>
  );
}

export function Choice<K extends string>({
  label,
  values,
  value,
  onChange,
  empty = "Nenhuma opção cadastrada.",
}: {
  label: string;
  values: [K, string][];
  value: K;
  onChange: (v: K) => void;
  empty?: string;
}) {
  const { c } = useTheme();
  return (
    <View
      style={{ gap: 8 }}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      <T style={styles.label}>{label}</T>
      <View style={styles.chips}>
        {values.length ? (
          values.map(([key, name]) => {
            const on = value === key;
            return (
              <MotionPressable kind="chip"
                accessibilityRole="radio"
                accessibilityLabel={name}
                accessibilityState={{ checked: on }}
                key={key}
                onPress={() => onChange(key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: on ? c.primary : c.surface,
                    borderWidth: 1,
                    borderColor: on ? c.primary : c.line,
                  },
                ]}
              >
                <T style={{ fontSize: 12, color: on ? c.onPrimary : c.text }}>
                  {name}
                </T>
              </MotionPressable>
            );
          })
        ) : (
          <Muted>{empty}</Muted>
        )}
      </View>
    </View>
  );
}

export function Toggle({
  label,
  value,
  onChange,
  hint,
  icon,
  leading,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  icon?: Icon;
  leading?: React.ReactNode;
  disabled?: boolean;
}) {
  const { c, dark } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      {/* A linha inteira alterna o valor (alvo de toque maior que a chave sozinha). */}
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled }}
        accessibilityHint={hint}
        disabled={disabled}
        onPress={() => onChange(!value)}
        android_ripple={{ color: c.soft }}
        style={[styles.setting, disabled && { opacity: 0.65 }]}
      >
        <View style={[styles.row, { flex: 1 }]}>
          {leading ?? (icon && <I name={icon} />)}
          <T style={{ flexShrink: 1 }}>{label}</T>
        </View>
        <Switch
          importantForAccessibility="no-hide-descendants"
          disabled={disabled}
          value={value}
          onValueChange={onChange}
          thumbColor={value ? c.accent : c.muted}
          trackColor={{ false: c.line, true: dark ? c.accent + "66" : c.primary }}
        />
      </Pressable>
      {!!hint && <Muted>{hint}</Muted>}
    </View>
  );
}

export function ListItem({
  icon,
  label,
  detail,
  onPress,
  right,
}: {
  icon?: Icon;
  label: string;
  detail?: string;
  onPress: () => void;
  right?: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <MotionPressable kind="row"
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={onPress}
      android_ripple={{ color: c.soft }}
      style={[
        styles.listItem,
        { backgroundColor: c.surface },
      ]}
    >
      {icon && (
        <View
          style={[styles.rowIcon, { backgroundColor: c.soft }]}
          importantForAccessibility="no"
        >
          <I name={icon} size={18} color={c.primary} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <T>{label}</T>
        {!!detail && <Muted>{detail}</Muted>}
      </View>
      {right ?? <I name="chevron-right" size={18} />}
    </MotionPressable>
  );
}

// Filtros em uma única linha rolável: chips compactos com área de toque de 48dp (via hitSlop).
export function Chips<K extends string>({
  values,
  value,
  onChange,
}: {
  values: [K, string][];
  value: K;
  onChange: (v: K) => void;
}) {
  const { c } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={{ gap: space.sm, paddingVertical: space.sm }}
      style={{ flexGrow: 0, marginHorizontal: -space.lg }}
    >
      <View style={{ width: space.lg - space.sm }} />
      {values.map(([key, label]) => {
        const on = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(key)}
            hitSlop={{ top: 4, bottom: 4 }}
            android_ripple={{ color: c.soft, borderless: false }}
            style={[
              styles.compactChip,
              {
                backgroundColor: on ? c.primary : c.surface,
                borderColor: on ? c.primary : c.line,
              },
            ]}
          >
            <T
              style={{
                fontSize: 13,
                fontFamily: on ? "SoraSemi" : "Sora",
                color: on ? c.onPrimary : c.text,
              }}
            >
              {label}
            </T>
          </Pressable>
        );
      })}
      <View style={{ width: space.lg - space.sm }} />
    </ScrollView>
  );
}

// Seletor segmentado. Com fonte ampliada, as opções ganham largura para quebrar.
export function Segmented<K extends string>({
  label,
  accessibilityLabel,
  values,
  value,
  onChange,
}: {
  label?: string;
  accessibilityLabel?: string;
  values: [K, string][];
  value: K;
  onChange: (v: K) => void;
}) {
  const { c } = useTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <View style={{ gap: space.sm }}>
      {!!label && <T style={styles.label}>{label}</T>}
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel ?? label}
        style={[styles.segmented, { backgroundColor: c.soft, flexDirection: fontScale >= 1.5 ? "column" : "row" }]}
      >
        {values.map(([key, name]) => {
          const on = key === value;
          return (
            <MotionPressable kind="chip"
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={name}
              onPress={() => onChange(key)}
              style={[styles.segment, { minHeight: 48 }, fontScale >= 1.5 && { flex: 0 }, on && { backgroundColor: c.primary }]}
            >
              <T
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  fontFamily: on ? "SoraSemi" : "Sora",
                  color: on ? c.onPrimary : c.muted,
                }}
              >
                {name}
              </T>
            </MotionPressable>
          );
        })}
      </View>
    </View>
  );
}

// Texto do campo de dinheiro: dígitos entram pela direita ("1500" -> "15,00"). Aviso rápido se passar do teto.
function useMoneyInput(value: string, onChange: (v: string) => void, allowZero = false) {
  const [tooBig, setTooBig] = useState(false);
  const shown = normalizeMoneyText(value, { allowZero });
  const onText = (text: string) => {
    const next = maskMoney(text, shown, { allowZero });
    setTooBig(next.tooBig);
    onChange(next.text);
  };
  return { shown, onText, tooBig, setTooBig };
}

const MAX_TEXT = "Valor máximo: R$ 999.999.999,99.";

// Valor em dinheiro de uso geral (limites, saldos, metas, orçamentos): mesma entrada "de caixa eletrônico".
export function MoneyField({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder = "0,00",
  autoFocus = false,
  allowZero = false,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
  autoFocus?: boolean;
  allowZero?: boolean;
  inputRef?: React.Ref<TextControl>;
}) {
  const { c } = useTheme();
  const { shown, onText, tooBig } = useMoneyInput(value, onChange, allowZero);
  const problem = error || (tooBig ? MAX_TEXT : "");
  const shake = useShake(problem);
  return (
    <View style={{ gap: 8 }}>
      <T style={styles.label}>{label.replace(/\s*\(R\$\)$/u, "")}</T>
      <Animated.View
        style={[
          styles.input,
          { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surface, borderColor: problem ? c.red : c.muted },
          { transform: [{ translateX: shake }] },
        ]}
      >
        <T style={{ fontFamily: "SoraSemi", fontSize: 15, color: c.muted }} importantForAccessibility="no">R$</T>
        <TextInput
          ref={inputRef}
          accessibilityLabel={`${label.replace(/\s*\(R\$\)$/u, "")} em reais`}
          accessibilityHint={problem || hint}
          selectionColor={c.accent}
          cursorColor={c.accent}
          value={shown}
          onChangeText={onText}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          maxLength={16}
          selection={{ start: shown.length, end: shown.length }}
          style={{ flex: 1, padding: 0, color: c.text, fontFamily: "SoraSemi", fontSize: 16, minHeight: 24 }}
        />
      </Animated.View>
      {!!hint && !problem && <Muted>{hint}</Muted>}
      {!!problem && <T accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: c.red }}>{problem}</T>}
    </View>
  );
}

const PAD_NAMES: Record<string, string> = { "÷": "dividir", "×": "multiplicar", "−": "menos", "+": "mais", "⌫": "apagar", C: "limpar", "=": "Calcular", ",": "vírgula", "(": "Abrir parênteses", ")": "Fechar parênteses" };

// Valor em destaque no topo dos formulários de lançamento. Os dígitos entram pela direita; a calculadora continua
// ao lado: ao usar um operador o campo vira uma conta, e "=" devolve o resultado já formatado.
export function AmountField({
  value,
  onChange,
  color,
  autoFocus,
  label = "Valor",
  error,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  color?: string;
  autoFocus?: boolean;
  label?: string;
  error?: string;
  inputRef?: React.Ref<TextControl>;
}) {
  const { c } = useTheme();
  const [pad, setPad] = useState(false);
  // Na calculadora os números entram como numa calculadora comum ("150" = 150), não pela direita; o texto cru fica aqui.
  const [raw, setRaw] = useState("");
  const expression = isExpression(value);
  const preview = expression ? evaluateAmount(value) : null;
  const money$ = useMoneyInput(value, onChange);
  const shown = pad ? raw : expression ? value : money$.shown;
  const problem = error || (money$.tooBig ? MAX_TEXT : "");
  const shake = useShake(problem);
  const calculate = () => {
    if (preview?.ok && preview.display !== undefined) {
      const text = normalizeMoneyText(preview.display);
      setRaw(text.replace(/\.(?=\d{3})/gu, "").replace(/,00$/u, ""));
      onChange(text);
    }
  };
  const togglePad = () => {
    if (!pad) setRaw(expression ? value : value.replace(/\.(?=\d{3})/gu, "").replace(/,00$/u, ""));
    setPad(!pad);
  };
  const press = (key: string) => {
    money$.setTooBig(false);
    if (key === "=") { calculate(); return; }
    let next = raw;
    if (key === "C") next = "";
    else if (key === "⌫") next = raw.slice(0, -1);
    else if (key === ",") {
      const last = raw.split(/[+−×÷()]/u).pop() ?? "";
      if (!last.includes(",")) next = raw + (last === "" ? "0," : ",");
    } else if (raw.length < 100) next = raw + key;
    setRaw(next);
    // Número simples vai direto para o campo (já formatado); com operador, o campo guarda a conta até o "=".
    onChange(isExpression(next) ? next : normalizeMoneyText(next.replace(/,$/u, "")));
  };
  const size = shown.length > 12 ? 26 : shown.length > 10 ? 30 : 34;
  return (
    <Animated.View
      style={[
        styles.amountBox,
        { backgroundColor: c.surface },
        problem && { borderWidth: 1, borderColor: c.red },
        { transform: [{ translateX: shake }] },
      ]}
    >
      <Muted>{label}</Muted>
      <View style={[styles.row, { gap: space.sm }]}>
        <T style={{ fontSize: 22, fontFamily: "SoraSemi", color: color || c.text }} importantForAccessibility="no">R$</T>
        <TextInput
          ref={inputRef}
          accessibilityLabel={`${label} em reais`}
          accessibilityHint={problem || "Os dígitos entram da direita para a esquerda. Digite 1500 para R$ 15,00."}
          maxFontSizeMultiplier={1.3}
          selectionColor={c.accent}
          cursorColor={c.accent}
          value={shown}
          editable={!pad}
          onChangeText={(text) => (expression ? onChange(text) : money$.onText(text))}
          placeholder="0,00"
          placeholderTextColor={c.muted}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          maxLength={100}
          selection={{ start: shown.length, end: shown.length }}
          style={{
            flex: 1,
            minHeight: 48,
            fontSize: size,
            fontFamily: "SoraBold",
            color: color || c.text,
            paddingVertical: space.xs,
          }}
        />
        <IconButton
          name={pad ? "x" : "divide"}
          label={pad ? "Fechar calculadora" : "Abrir calculadora"}
          onPress={togglePad}
        />
      </View>
      <View accessibilityLiveRegion="polite">
        {preview && <Muted style={{ color: preview.ok ? c.muted : c.red }}>
          {preview.ok ? "= " + money(preview.cents!) : preview.message}
        </Muted>}
        {!shown && !pad && !problem && <Muted importantForAccessibility="no">Digite os centavos: 1500 = R$ 15,00</Muted>}
      </View>
      {!!problem && <T accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: c.red }}>{problem}</T>}
      {!pad && expression && <Button title="Calcular" secondary disabled={!preview?.ok} onPress={calculate} />}
      {pad && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", ",", "0", "⌫", "+", "(", ")", "C",
            ...(expression ? ["="] : [])].map((key) => {
            const op = "÷×−+=".includes(key);
            const off = key === "=" && !preview?.ok;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={PAD_NAMES[key] || key}
                accessibilityState={{ disabled: off }}
                disabled={off}
                onPress={() => press(key)}
                android_ripple={{ color: c.soft }}
                style={{
                  width: key === "=" ? "48%" : "22.6%",
                  flexGrow: key === "=" ? 1 : 0,
                  minHeight: 48,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: off ? 0.4 : 1,
                  backgroundColor: key === "=" ? c.primary : op ? c.soft : c.bg,
                }}
              >
                <T style={{ fontSize: 20, fontFamily: "SoraSemi", color: key === "=" ? c.onPrimary : op ? c.primary : c.text }}>{key}</T>
              </Pressable>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}

// Grupo de itens num único cartão, com divisórias (listas de menu e configurações).
export function Group({
  title,
  children,
  flush = false,
}: {
  title?: string;
  children: React.ReactNode;
  flush?: boolean; // logo abaixo de um Section: sem margem acima e com 12 dp abaixo, como o Box
}) {
  const { c } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={flush ? { marginBottom: space.md } : { marginTop: space.lg }}>
      {!!title && (
        <Muted
          accessibilityRole="header"
          style={{
            fontFamily: "SoraSemi",
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginBottom: space.sm,
            marginLeft: space.xs,
          }}
        >
          {title}
        </Muted>
      )}
      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: 22,
          overflow: "hidden",
        }}
      >
        {items.map((child, i) => (
          <View
            key={i}
            style={
              i < items.length - 1
                ? {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: c.line,
                  }
                : null
            }
          >
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

// Linha de menu dentro de um Group.
export function Row({
  icon,
  label,
  detail,
  onPress,
  right,
  danger,
}: {
  icon?: Icon;
  label: string;
  detail?: string;
  onPress: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={onPress}
      android_ripple={{ color: c.soft }}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: 56,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          backgroundColor: pressed ? c.soft : "transparent",
        },
      ]}
    >
      {icon && (
        <View
          style={[styles.rowIcon, { backgroundColor: c.soft }]}
          importantForAccessibility="no"
        >
          <I name={icon} size={18} color={danger ? c.red : c.primary} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ color: danger ? c.red : c.text }}>{label}</T>
        {!!detail && <Muted numberOfLines={2}>{detail}</Muted>}
      </View>
      {right ?? <I name="chevron-right" size={18} />}
    </Pressable>
  );
}

// Escala de espaçamento (ritmo de 4/8dp) e raios.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 18, pill: 999 };

export const styles = StyleSheet.create({
  text: { fontSize: 15, lineHeight: 22 },
  muted: { fontSize: 12.5, lineHeight: 18 },
  compactChip: {
    minHeight: touch.min,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
  },
  segmented: { flexDirection: "row", borderRadius: 999, padding: 4, gap: 4 },
  segment: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  amountBox: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 2,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontFamily: "SoraSemi", fontSize: 13 },
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 24,
  },
  pageTitle: { fontSize: 22, lineHeight: 30, fontFamily: "SoraBold" },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 },
  box: { padding: 18, borderRadius: 22, marginBottom: 12 },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
    gap: 12,
  },
  sectionTitle: { fontSize: 17, lineHeight: 24, fontFamily: "SoraSemi" },
  balanceValue: {
    fontSize: 35,
    lineHeight: 48,
    fontFamily: "SoraBold",
    marginTop: 8,
    fontVariant: ["tabular-nums"],
  },
  button: {
    minHeight: 52,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
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
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 52,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 4 },
  chip: {
    minHeight: touch.min,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    justifyContent: "center",
  },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  setting: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 8,
    overflow: "hidden",
  },
  hairline: { borderBottomWidth: StyleSheet.hairlineWidth },
});
