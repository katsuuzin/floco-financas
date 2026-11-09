// Rosca de gastos: arcos grossos com folga, ícone de cada categoria sobre o arco, total no
// centro. O desenho entra por traço (arco a arco) e o total sobe contando; com "reduzir
// animações" ligado no Android, aparece pronto.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Animated, Easing, Pressable, AccessibilityInfo } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { T, Muted } from "./kit";
import { useTheme } from "./theme";
import CategoryIcon from "./CategoryIcon";
import { donutArcs, arcPath } from "../spending.mjs";

export type DonutSlice = { name: string; fraction: number; color: string; look: { icon: string; color: string; image?: string } };

const AnimatedPath = Animated.createAnimatedComponent(Path);

function Arc({ d, color, width, cap, length, delay, instant }: { d: string; color: string; width: number; cap: "round" | "butt"; length: number; delay: number; instant: boolean }) {
  const progress = useRef(new Animated.Value(instant ? 1 : 0)).current;
  useEffect(() => {
    if (instant) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const run = Animated.timing(progress, { toValue: 1, duration: 700, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [d, instant]);
  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: [length, 0] });
  return <AnimatedPath d={d} stroke={color} strokeWidth={width} strokeLinecap={cap} fill="none" strokeDasharray={`${length} ${length}`} strokeDashoffset={offset as any} />;
}

export default function Donut({
  slices,
  total,
  size = 280,
  stroke = 40,
  center,
  caption,
  onPress,
  label,
}: {
  slices: DonutSlice[];
  total: number;
  size?: number;
  stroke?: number;
  center: (cents: number) => string;
  caption: string;
  onPress?: (name: string) => void;
  label: string;
}) {
  const { c } = useTheme();
  const [instant, setInstant] = useState(false);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setInstant).catch(() => {});
  }, []);
  // Total sobe contando até o valor novo.
  const last = useRef(0);
  useEffect(() => {
    if (instant || !total) {
      last.current = total;
      setShown(total);
      return;
    }
    const from = last.current;
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setShown(Math.round(from + (total - from) * value)));
    Animated.timing(v, { toValue: 1, duration: 800, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
      last.current = total;
    });
    return () => v.removeListener(id);
  }, [total, instant]);
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const arcs = useMemo(() => donutArcs(slices.map((s) => s.fraction), slices.length > 1 ? 0.05 : 0), [slices]);
  const bubble = Math.min(34, stroke - 6);
  const text = center(shown);
  return (
    <View accessible accessibilityLabel={label} style={{ width: size, height: size, alignSelf: "center" }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cx} r={r} stroke={c.soft} strokeWidth={stroke} fill="none" />
        {slices.map((s, i) => {
          const a = arcs[i];
          if (!a) return null;
          // Ponta arredondada avança meia espessura: encolhe o arco para a folga ficar visível.
          const cap = slices.length > 1 ? stroke / 2 / r : 0;
          let from = a.start + cap;
          let to = a.end - cap;
          if (to <= from) {
            from = a.mid - 0.0005;
            to = a.mid + 0.0005;
          }
          return <Arc key={s.name} d={arcPath(cx, cx, r, from, to)} color={s.color} width={stroke} cap={slices.length > 1 ? "round" : "butt"} length={r * (to - from) + 2} delay={i * 80} instant={instant} />;
        })}
      </Svg>
      <View pointerEvents="none" style={{ position: "absolute", left: stroke + 8, right: stroke + 8, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <T numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: "SoraBold", fontSize: text.length > 12 ? 20 : 26, fontVariant: ["tabular-nums"] }}>
          {text}
        </T>
        <Muted style={{ textAlign: "center", fontSize: 12 }}>{caption}</Muted>
      </View>
      {slices.map((s, i) => {
        const a = arcs[i];
        if (!a || (a.end - a.start) * r < bubble * 0.9) return null;
        const x = cx + Math.cos(a.mid) * r - bubble / 2;
        const y = cx + Math.sin(a.mid) * r - bubble / 2;
        return (
          <Pressable
            key={"b" + s.name}
            accessibilityRole="button"
            accessibilityLabel={`${s.name}, ${Math.round(s.fraction * 100)}%. Ver detalhes`}
            disabled={!onPress}
            onPress={() => onPress?.(s.name)}
            style={{ position: "absolute", left: x, top: y, width: bubble, height: bubble, borderRadius: bubble / 2, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.85)" }}
          >
            <CategoryIcon look={s.look} size={bubble - 4} />
          </Pressable>
        );
      })}
    </View>
  );
}
