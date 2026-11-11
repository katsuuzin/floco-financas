import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
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
