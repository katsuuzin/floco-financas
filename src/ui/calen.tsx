// Peças visuais da aba Análise no padrão do Calen (cores do Calen, amarelo Solar no lugar do
// roxo). Só a Análise usa estas peças; o resto do app segue o tema do Floco.
import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { fitAmount, touch, type } from "./kit";
import { useTheme } from "./theme";
import { calenTokens, tint, alpha } from "../calenTheme.mjs";

export type CalenTokens = ReturnType<typeof calenTokens>;

export function useCalen() {
  const { dark, fonts } = useTheme();
  const k = React.useMemo(() => calenTokens(dark) as CalenTokens, [dark]);
  return { k, dark, fonts, tint: (color: string) => tint(color, dark) as string, alpha: alpha as (hex: string, a: number) => string };
}

// Texto no padrão do Calen: fonte Sora do Floco, cor do tema da Análise.
export function CText({ style, bold, semi, muted, subtle, color, ...props }: any) {
  const { k, fonts } = useCalen();
  const family = fonts ? (bold ? "SoraBold" : semi ? "SoraSemi" : "Sora") : undefined;
  return <Text {...props} style={[{ fontSize: 15, lineHeight: 22, color: color || (muted ? k.muted : subtle ? k.subtle : k.text), fontFamily: family }, style]} />;
}

export function CCard({ children, style, padded = true }: { children: React.ReactNode; style?: any; padded?: boolean }) {
  const { k } = useCalen();
  return <View style={[{ backgroundColor: k.card, borderRadius: 20, borderWidth: 1, borderColor: k.line, padding: padded ? 16 : 0, overflow: "hidden" }, style]}>{children}</View>;
}

// Título de seção ("Top categorias") com ação à direita ("Ver todas ›").
export function CSection({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children?: React.ReactNode }) {
  const { k } = useCalen();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 10 }}>
      <CText accessibilityRole="header" semi style={{ fontSize: 17, flex: 1, paddingRight: 8 }}>
        {title}
      </CText>
      {children}
      {!!action && (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={{ minHeight: touch.min, justifyContent: "center", flexDirection: "row", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <CText muted style={{ fontSize: 13 }}>
            {action}
          </CText>
          <Feather name="chevron-right" size={14} color={k.muted} />
        </Pressable>
      )}
    </View>
  );
}

// Abas do topo com sublinhado (Resumo, Categorias, Tipo de gasto, Fluxo, Mais): ícone em cima,
// nome embaixo, todas visíveis ao mesmo tempo.
export function CTopTabs<K extends string>({ items, value, onChange }: { items: { key: K; label: string; icon: any; full?: string }[]; value: K; onChange: (k: K) => void }) {
  const { k } = useCalen();
  const { fontScale } = useWindowDimensions();
  const scroll = fontScale >= 1.5;
  const tabs = (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: k.line, marginBottom: 6 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable
            key={it.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={it.full || it.label}
            onPress={() => onChange(it.key)}
            style={{ flex: scroll ? undefined : it.label.length > 12 ? 1.2 : 1, minWidth: scroll ? 76 : 0, minHeight: 58, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 2, borderBottomWidth: 3, borderBottomColor: on ? k.primary : "transparent" }}
          >
            <Feather name={it.icon} size={18} color={on ? k.primaryText : k.muted} />
            <CText semi={on} numberOfLines={it.label.length > 12 ? 2 : 1} maxFontSizeMultiplier={1.3} adjustsFontSizeToFit minimumFontScale={0.8} style={{ maxWidth: "100%", textAlign: "center", fontSize: 12, lineHeight: 16, color: on ? k.text : k.muted }}>
              {it.label}
            </CText>
          </Pressable>
        );
      })}
    </View>
  );
  return scroll ? <ScrollView horizontal>{tabs}</ScrollView> : tabs;
}

// Pílula segmentada (Receitas | Despesas | Caixa | Projeção; R$ | %).
export function CPills<K extends string>({ items, value, onChange, small }: { items: [K, string][]; value: K; onChange: (v: K) => void; small?: boolean }) {
  const { k } = useCalen();
  const column = useWindowDimensions().fontScale >= 1.5;
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: column ? "column" : "row", backgroundColor: k.soft, borderRadius: column ? 20 : 999, padding: 4, gap: 2 }}>
      {items.map(([key, label]) => {
        const on = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(key)}
            style={{ flex: column ? 0 : 1, minHeight: 48, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, backgroundColor: on ? k.card : "transparent", borderWidth: on ? 1 : 0, borderColor: k.line }}
          >
            <CText semi={on} maxFontSizeMultiplier={column ? undefined : 1.3} style={{ textAlign: "center", fontSize: small ? 12.5 : 14, color: on ? k.text : k.muted }}>
              {label}
            </CText>
          </Pressable>
        );
      })}
    </View>
  );
}

// Botão redondo de ícone (filtro, busca, ordem).
export function CIconButton({ name, label, onPress, active }: { name: any; label: string; onPress: () => void; active?: boolean }) {
  const { k } = useCalen();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: touch.min, height: touch.min, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: active ? k.primary : k.soft }}
    >
      <Feather name={name} size={18} color={active ? k.onPrimary : k.muted} />
    </Pressable>
  );
}

// Selo pequeno com ponto colorido ("● ENTRADA").
export function CDotLabel({ color, label, value, valueColor }: { color: string; label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
        <CText muted style={{ fontSize: type.caption, lineHeight: 16, letterSpacing: 0.4 }}>
          {label}
        </CText>
      </View>
      <CText {...fitAmount} semi color={valueColor} style={{ fontSize: 14 }}>
        {value}
      </CText>
    </View>
  );
}

// Barra de progresso fina.
export function CBar({ value, max, color, height = 6 }: { value: number; max: number; color: string; height?: number }) {
  const { k } = useCalen();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: k.track, overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

// Botão primário (amarelo Solar) e selo "pill" de variação (↓ 97% vs outubro).
export function CButton({ title, onPress, icon }: { title: string; onPress: () => void; icon?: any }) {
  const { k } = useCalen();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 48, borderRadius: 16, backgroundColor: k.primary, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 }}>
      {!!icon && <Feather name={icon} size={17} color={k.onPrimary} />}
      <CText semi style={{ color: k.onPrimary }}>
        {title}
      </CText>
    </Pressable>
  );
}

export function CPill({ text, tone }: { text: string; tone: "danger" | "success" | "warning" | "neutral" }) {
  const { k, tint: t } = useCalen();
  const color = tone === "danger" ? k.dangerText : tone === "success" ? k.successText : tone === "warning" ? k.warningText : k.muted;
  const bg = tone === "danger" ? t(k.danger) : tone === "success" ? t(k.success) : tone === "warning" ? t(k.warning) : k.soft;
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <CText semi style={{ fontSize: 12, lineHeight: 16, color }}>
        {text}
      </CText>
    </View>
  );
}
