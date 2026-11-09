// Componentes de interface em escopo de módulo: nunca são recriados a cada render,
// então campos de texto não perdem o foco enquanto o usuário digita.
import React, { useState } from "react";
import {
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
import { useTheme } from "./theme";
import { evaluate, hasOperator, toAmountText } from "../calc.mjs";

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
}: {
  title: string;
  onPress: () => void;
  icon?: Icon;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const fg = danger ? c.red : secondary ? c.primary : c.onPrimary;
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: danger
            ? "transparent"
            : secondary
              ? c.soft
              : c.primary,
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon && <I name={icon} color={fg} />}
      <T style={{ color: fg, fontFamily: "SoraSemi", fontSize: 14 }}>{title}</T>
    </Pressable>
  );
}

export function IconButton({
  name,
  label,
  onPress,
  color,
}: {
  name: Icon;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: pressed ? c.soft : "transparent" },
      ]}
    >
      <I name={name} color={color || c.primary} />
    </Pressable>
  );
}

export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.section}>
      <T accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </T>
      {action && onPress && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={styles.smallAction}
        >
          <T style={{ color: c.primary, fontSize: 13, fontFamily: "SoraSemi" }}>
            {action}
          </T>
        </Pressable>
      )}
    </View>
  );
}

export function Box({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: c.surface }, style]}>
      {children}
    </View>
  );
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

export function Progress({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const { c } = useTheme();
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
        secureTextEntry={secure}
        autoCorrect={!secure}
        accessibilityLabel={label}
        accessibilityHint={hint}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={numeric ? "decimal-pad" : "default"}
        autoFocus={autoFocus}
        multiline={multiline}
        autoCapitalize={secure ? "none" : "sentences"}
        maxLength={maxLength ?? (numeric ? 16 : multiline ? 2000 : 180)}
        style={[
          styles.input,
          {
            backgroundColor: c.surface,
            color: c.text,
            borderColor: c.line,
            fontFamily: "Sora",
          },
          multiline && { minHeight: 96, textAlignVertical: "top" },
        ]}
      />
      {!!hint && <Muted>{hint}</Muted>}
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
              <Pressable
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
              </Pressable>
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
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  icon?: Icon;
}) {
  const { c, dark } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      {/* A linha inteira alterna o valor (alvo de toque maior que a chave sozinha). */}
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        accessibilityHint={hint}
        onPress={() => onChange(!value)}
        android_ripple={{ color: c.soft }}
        style={styles.setting}
      >
        <View style={[styles.row, { flex: 1 }]}>
          {icon && <I name={icon} />}
          <T style={{ flexShrink: 1 }}>{label}</T>
        </View>
        <Switch
          importantForAccessibility="no-hide-descendants"
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={onPress}
      android_ripple={{ color: c.soft }}
      style={({ pressed }) => [
        styles.listItem,
        { backgroundColor: pressed ? c.soft : c.surface },
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
    </Pressable>
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

// Seletor segmentado (2 a 4 opções curtas) — uma linha, sem quebra.
export function Segmented<K extends string>({
  label,
  values,
  value,
  onChange,
}: {
  label?: string;
  values: [K, string][];
  value: K;
  onChange: (v: K) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      {!!label && <T style={styles.label}>{label}</T>}
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={[styles.segmented, { backgroundColor: c.soft }]}
      >
        {values.map(([key, name]) => {
          const on = key === value;
          return (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={name}
              onPress={() => onChange(key)}
              style={[styles.segment, on && { backgroundColor: c.primary }]}
            >
              <T
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  fontSize: 12,
                  fontFamily: on ? "SoraSemi" : "Sora",
                  color: on ? c.onPrimary : c.muted,
                }}
              >
                {name}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Valor em destaque no topo dos formulários de lançamento.
export function AmountField({
  value,
  onChange,
  color,
  autoFocus,
  label = "Valor",
}: {
  value: string;
  onChange: (v: string) => void;
  color?: string;
  autoFocus?: boolean;
  label?: string;
}) {
  const { c } = useTheme();
  // L1: teclado de cálculo. A conta fica visível; o valor do formulário recebe o resultado.
  const [pad, setPad] = useState(false);
  const [expr, setExpr] = useState("");
  const press = (key: string) => {
    const next = key === "C" ? "" : key === "⌫" ? expr.slice(0, -1) : key === "=" ? expr : expr + key;
    const result = evaluate(next);
    const shown = key === "=" && result != null && result > 0 ? toAmountText(result) : next;
    setExpr(shown);
    if (result != null && result > 0) onChange(toAmountText(result));
    else if (!next) onChange("");
  };
  const preview = pad && hasOperator(expr) ? evaluate(expr) : null;
  return (
    <View style={[styles.amountBox, { backgroundColor: c.surface }]}>
      <Muted>{label}</Muted>
      <View style={[styles.row, { gap: space.sm }]}>
        <T
          style={{
            fontSize: 22,
            fontFamily: "SoraSemi",
            color: color || c.text,
          }}
        >
          R$
        </T>
        <TextInput
          accessibilityLabel={`${label} em reais`}
          value={pad ? expr : value}
          editable={!pad}
          onChangeText={onChange}
          placeholder="0,00"
          placeholderTextColor={c.muted}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          maxLength={16}
          style={{
            flex: 1,
            fontSize: 34,
            fontFamily: "SoraBold",
            color: color || c.text,
            paddingVertical: space.xs,
          }}
        />
        <IconButton
          name={pad ? "x" : "divide"}
          label={pad ? "Fechar calculadora" : "Abrir calculadora"}
          onPress={() => {
            if (!pad) setExpr(value);
            setPad(!pad);
          }}
        />
      </View>
      {pad && (
        <>
          <Muted accessibilityLiveRegion="polite" style={{ minHeight: 18 }}>
            {preview != null ? "= R$ " + toAmountText(preview) : hasOperator(expr) ? "Conta incompleta" : " "}
          </Muted>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", ",", "0", "⌫", "+", "C", "="].map((key) => {
              const op = "÷×−+=".includes(key);
              const names: Record<string, string> = { "÷": "dividir", "×": "multiplicar", "−": "menos", "+": "mais", "⌫": "apagar", C: "limpar", "=": "igual", ",": "vírgula" };
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={names[key] || key}
                  onPress={() => press(key)}
                  android_ripple={{ color: c.soft }}
                  style={{
                    width: key === "=" ? "48%" : "22.6%",
                    flexGrow: key === "=" ? 1 : 0,
                    minHeight: 48,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: key === "=" ? c.primary : op ? c.soft : c.bg,
                  }}
                >
                  <T style={{ fontSize: 20, fontFamily: "SoraSemi", color: key === "=" ? c.onPrimary : op ? c.primary : c.text }}>{key}</T>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

// Grupo de itens num único cartão, com divisórias (listas de menu e configurações).
export function Group({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ marginTop: space.lg }}>
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
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
  },
  segmented: { flexDirection: "row", borderRadius: 999, padding: 4, gap: 4 },
  segment: {
    flex: 1,
    minHeight: 44,
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
    minHeight: 44,
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
