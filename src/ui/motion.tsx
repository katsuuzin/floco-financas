import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { motionConfig, shouldReduce } from "../motion.mjs";

type Kind = "button" | "icon" | "row" | "chip" | "fab";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Preferência do Android "remover animações". Até saber a resposta, trata como ligada.
export function useReduceMotion(): boolean {
  const [value, setValue] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => alive && setValue(on))
      .catch(() => alive && setValue(true));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (on) => setValue(on));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return shouldReduce(value);
}

// "Tremida" curta quando aparece um erro no campo (3 vaivéns de 6 dp em 220 ms). Com "remover animações", fica parado.
export function useShake(problem: string | boolean | undefined) {
  const reduce = useReduceMotion();
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!problem || reduce) return;
    Animated.sequence([
      Animated.timing(x, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(x, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(x, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]).start();
  }, [problem, reduce, x]);
  return x;
}

// Número que corre do último valor mostrado até o novo (450 ms). A memória é por chave, então voltar a uma tela depois de
// lançar uma despesa mostra o saldo "andando" até o valor certo. Sem valor anterior ou com "remover animações": direto.
const lastShown = new Map<string, number>();
export function useCountUp(key: string, target: number, ms = 450): number {
  const reduce = useReducedMotion(); // síncrono (o useReduceMotion acima só responde depois de uma consulta)
  const [value, setValue] = useState(() => (reduce ? target : lastShown.get(key) ?? target));
  useEffect(() => {
    const from = lastShown.get(key) ?? target;
    if (reduce || from === target) {
      lastShown.set(key, target);
      setValue(target);
      return;
    }
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / ms);
      const now = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      setValue(now);
      if (t < 1) frame = requestAnimationFrame(tick);
      else lastShown.set(key, target);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [key, target, reduce]);
  return value;
}

type Props = Omit<PressableProps, "style"> & {
  kind?: Kind;
  ref?: React.ComponentPropsWithRef<typeof Pressable>["ref"];
  style?: StyleProp<ViewStyle>;
};

// Pressable que afunda ao toque e volta com mola curta. Mesma API do Pressable,
// exceto que `style` é um estilo comum (sem função de "pressed").
export default function MotionPressable({ kind = "button", style, onPressIn, onPressOut, disabled, children, ...rest }: Props) {
  const reduce = useReduceMotion();
  const cfg = motionConfig(kind, { reduceMotion: reduce, disabled: !!disabled });
  const scale = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduce || disabled) scale.setValue(1);
    if (disabled) fade.setValue(1);
  }, [reduce, disabled, scale, fade]);

  const down = useCallback(() => {
    if (disabled) return;
    Animated.parallel([
      Animated.timing(scale, { toValue: cfg.scale, duration: cfg.downMs, useNativeDriver: true }),
      Animated.timing(fade, { toValue: cfg.opacity, duration: cfg.downMs, useNativeDriver: true }),
    ]).start();
  }, [cfg.scale, cfg.opacity, cfg.downMs, disabled, scale, fade]);

  const up = useCallback(() => {
    if (disabled) return;
    const back = cfg.spring
      ? Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...cfg.spring })
      : Animated.timing(scale, { toValue: 1, duration: cfg.releaseMs, useNativeDriver: true });
    Animated.parallel([back, Animated.timing(fade, { toValue: 1, duration: cfg.releaseMs, useNativeDriver: true })]).start();
  }, [cfg.spring, cfg.releaseMs, disabled, scale, fade]);

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        down();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        up();
        onPressOut?.(e);
      }}
      style={disabled ? style : [style, { opacity: fade, transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
