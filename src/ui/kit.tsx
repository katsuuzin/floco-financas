// Componentes de interface em escopo de módulo: nunca são recriados a cada render,
// então campos de texto não perdem o foco enquanto o usuário digita.
import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Switch,
  TextProps,
  ViewStyle,
  StyleProp,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useTheme } from "./theme";

export type Icon = React.ComponentProps<typeof Feather>["name"];

export function T({ style, ...props }: TextProps & { style?: any }) {
  const { c, fonts } = useTheme();
  return (
    <Text
      {...props}
      style={[styles.text, { color: c.text, fontFamily: fonts ? "Sora" : undefined }, style]}
    />
  );
}

export function Muted({ style, ...props }: TextProps & { style?: any }) {
  const { c } = useTheme();
  return <T {...props} style={[styles.muted, { color: c.muted }, style]} />;
}

export function I({ name, size = 21, color }: { name: Icon; size?: number; color?: string }) {
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
          backgroundColor: danger ? "transparent" : secondary ? c.soft : c.primary,
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
      style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? c.soft : "transparent" }]}
    >
      <I name={name} color={color || c.primary} />
    </Pressable>
  );
}

export function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.section}>
      <T accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </T>
      {action && onPress && (
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.smallAction}>
          <T style={{ color: c.primary, fontSize: 13, fontFamily: "SoraSemi" }}>{action}</T>
        </Pressable>
      )}
    </View>
  );
}

export function Box({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[styles.box, { backgroundColor: c.surface }, style]}>{children}</View>;
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

export function Progress({ value, max, color }: { value: number; max: number; color?: string }) {
  const { c } = useTheme();
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <View
      accessibilityLabel={`${Math.round(pct)} por cento`}
      style={[styles.track, { backgroundColor: c.soft }]}
    >
      <View style={{ height: 7, borderRadius: 4, width: `${pct}%`, backgroundColor: color || c.primary }} />
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
  hint?: string;
  maxLength?: number;
}) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <T style={styles.label}>{label}</T>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={numeric ? "decimal-pad" : "default"}
        autoFocus={autoFocus}
        multiline={multiline}
        autoCapitalize="sentences"
        maxLength={maxLength ?? (numeric ? 16 : multiline ? 2000 : 180)}
        style={[
          styles.input,
          { backgroundColor: c.surface, color: c.text, borderColor: c.line, fontFamily: "Sora" },
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
    <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
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
                  { backgroundColor: on ? c.primary : c.surface, borderWidth: 1, borderColor: on ? c.primary : c.line },
                ]}
              >
                <T style={{ fontSize: 12, color: on ? c.onPrimary : c.text }}>{name}</T>
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
  const { c } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.setting}>
        <View style={[styles.row, { flex: 1 }]}>
          {icon && <I name={icon} />}
          <T style={{ flexShrink: 1 }}>{label}</T>
        </View>
        <Switch
          accessibilityLabel={label}
          value={value}
          onValueChange={onChange}
          thumbColor={value ? c.accent : c.muted}
          trackColor={{ false: c.line, true: c.primary }}
        />
      </View>
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
      style={({ pressed }) => [styles.listItem, { backgroundColor: c.surface, opacity: pressed ? 0.75 : 1 }]}
    >
      {icon && <I name={icon} />}
      <View style={{ flex: 1, gap: 2 }}>
        <T>{label}</T>
        {!!detail && <Muted>{detail}</Muted>}
      </View>
      {right ?? <I name="chevron-right" size={18} />}
    </Pressable>
  );
}

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
    <View style={styles.chips} accessibilityRole="tablist">
      {values.map(([key, label]) => {
        const on = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(key)}
            style={[styles.chip, { backgroundColor: on ? c.primary : c.surface }]}
          >
            <T style={{ fontSize: 12, color: on ? c.onPrimary : c.muted }}>{label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export const styles = StyleSheet.create({
  text: { fontSize: 14, lineHeight: 21 },
  muted: { fontSize: 12, lineHeight: 19 },
  label: { fontFamily: "SoraSemi", fontSize: 13 },
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 24 },
  pageTitle: { fontSize: 22, lineHeight: 30, fontFamily: "SoraBold" },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },
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
  balanceValue: { fontSize: 35, lineHeight: 48, fontFamily: "SoraBold", marginTop: 8, fontVariant: ["tabular-nums"] },
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
  iconButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 24 },
  smallAction: { minHeight: 48, justifyContent: "center", paddingHorizontal: 6 },
  empty: { paddingVertical: 30, paddingHorizontal: 12, alignItems: "center", gap: 16 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, minHeight: 52 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 4 },
  chip: { minHeight: 48, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 24, justifyContent: "center" },
  track: { height: 7, borderRadius: 4, overflow: "hidden" },
  setting: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 60,
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  hairline: { borderBottomWidth: StyleSheet.hairlineWidth },
});
