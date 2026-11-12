// Entrada de cartões e linhas (1.14): sobe 12 dp esmaecendo, 240 ms, em cascata de 45 ms (no máximo 8 passos).
// Com "remover animações" ligado, aparece parado.
import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, FadeInDown, useReducedMotion } from "react-native-reanimated";

export function Reveal({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  if (reduce) return <View style={style}>{children}</View>;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(240).easing(Easing.out(Easing.cubic))} style={style}>
      {children}
    </Animated.View>
  );
}
