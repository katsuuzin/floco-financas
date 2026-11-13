import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { T, IconButton } from "../ui/kit";
import MotionPressable, { useReduceMotion } from "../ui/motion";
import { useTheme } from "../ui/theme";
import { useNav } from "../app/nav";
import { monthKey, addMonths, today } from "../finance.mjs";

export const monthLabel = (month: string) => {
  const s = new Date(month + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Barra de mês. As setas usam a forma funcional do setMonth: toques rápidos somam um mês cada,
// sem repetir o mês do render anterior. O nome do mês desliza 8 dp e aparece em 160 ms ao trocar
// (parado com "remover animações").
export default function MonthBar() {
  const { month, setMonth } = useNav();
  const { c } = useTheme();
  const reduce = useReduceMotion();
  const step = (d: number) => setMonth((m) => monthKey(addMonths(m + "-01", d)));
  const current = monthKey(today());
  const x = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const prev = useRef({ month, dir: 0 });
  if (prev.current.month !== month) prev.current = { month, dir: month > prev.current.month ? 1 : -1 };
  useEffect(() => {
    if (reduce || !prev.current.dir) return;
    x.setValue(8 * prev.current.dir);
    fade.setValue(0.4);
    Animated.parallel([
      Animated.timing(x, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [month, reduce, x, fade]);
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 18 }}>
      <IconButton name="chevron-left" label="Mês anterior" onPress={() => step(-1)} />
      <MotionPressable
        kind="chip"
        accessibilityRole="button"
        accessibilityLabel={`${monthLabel(month)}. Voltar ao mês atual`}
        accessibilityHint={month === current ? undefined : "Toque para voltar ao mês atual"}
        onPress={() => setMonth(current)}
        style={{ minHeight: 48, justifyContent: "center", minWidth: 150, alignItems: "center" }}
      >
        <Animated.View style={{ transform: [{ translateX: x }], opacity: fade }}>
          <T style={{ fontFamily: "SoraSemi", color: month === current ? c.text : c.primary }}>{monthLabel(month)}</T>
        </Animated.View>
      </MotionPressable>
      <IconButton name="chevron-right" label="Próximo mês" onPress={() => step(1)} />
    </View>
  );
}
