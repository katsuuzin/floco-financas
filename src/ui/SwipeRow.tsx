// Deslizar a linha do item (1.12). Movimento próprio, medido na auditoria (A2, A3) e recriado aqui:
// - direita, passando de 35% da largura: marca (ou desmarca) ao soltar; o fundo cresce da esquerda com o dedo;
// - esquerda, curto: revela Editar e Apagar (a linha fica aberta em -120 dp);
// - esquerda, longo (passa de 60%): a faixa vermelha toma a linha, "Solte para apagar" e vibração curta;
//   ao soltar, a linha sai e encolhe na altura (200 ms), e o aviso com Desfazer aparece.
// O gesto só começa depois de 12 dp na horizontal (não briga com a rolagem). Com "remover animações", a linha segue
// o dedo, mas soltar não tem mola: muda em 100 ms. As mesmas ações existem sem gesto (círculo, folha do item e
// ações de acessibilidade da linha); os botões revelados ficam fora do leitor de tela.
import React, { useCallback, useEffect, useRef } from "react";
import { Pressable, StyleSheet, Vibration, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Extrapolation, interpolate, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming,
} from "react-native-reanimated";
import { I, T, radius } from "./kit";
import { useTheme } from "./theme";

export const SWIPE = Object.freeze({ mark: 0.35, remove: 0.6, open: -120, slop: 12 });

export default function SwipeRow({ id, openId, onOpen, inCart, onToggle, onEdit, onRemove, children }: {
  id: string;
  openId: string | null;
  onOpen: (id: string | null) => void;
  inCart: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { c, dark } = useTheme();
  const reduce = useReducedMotion();
  const tx = useSharedValue(0);
  const start = useSharedValue(0);
  const width = useSharedValue(360);
  const measured = useSharedValue(0);
  const height = useSharedValue(-1); // -1 = altura natural
  const crossed = useSharedValue(false);
  const handlers = useRef({ onToggle, onEdit, onRemove, onOpen });
  handlers.current = { onToggle, onEdit, onRemove, onOpen };
  const toggle = useCallback(() => handlers.current.onToggle(), []);
  const remove = useCallback(() => handlers.current.onRemove(), []);
  const open = useCallback(() => handlers.current.onOpen(id), [id]);
  const close = useCallback(() => handlers.current.onOpen(null), []);
  const buzz = useCallback(() => Vibration.vibrate(10), []);

  // Outra linha abriu (ou a lista pediu para fechar): esta volta ao lugar.
  useEffect(() => {
    if (openId !== id) tx.value = reduce ? withTiming(0, { duration: 100 }) : withSpring(0, { damping: 22, stiffness: 260 });
  }, [openId]);

  const pan = usePanGesture({
    activeOffsetX: [-SWIPE.slop, SWIPE.slop],
    failOffsetY: [-10, 10],
    onActivate: () => {
      "worklet";
      start.value = tx.value;
      runOnJS(open)();
    },
    onUpdate: (e) => {
      "worklet";
      const x = start.value + e.translationX;
      tx.value = x;
      const past = x < -SWIPE.remove * width.value;
      if (past !== crossed.value) {
        crossed.value = past;
        if (past) runOnJS(buzz)();
      }
    },
    onDeactivate: () => {
      "worklet";
      const x = tx.value;
      const w = width.value;
      crossed.value = false;
      const settle = (to: number) => {
        tx.value = reduce ? withTiming(to, { duration: 100 }) : withSpring(to, { damping: 22, stiffness: 260 });
      };
      if (x > SWIPE.mark * w) {
        settle(0);
        runOnJS(toggle)();
        runOnJS(close)();
      } else if (x < -SWIPE.remove * w) {
        tx.value = withTiming(-w, { duration: reduce ? 0 : 150 }, () => {
          height.value = measured.value;
          height.value = withTiming(0, { duration: reduce ? 0 : 200 }, (done) => {
            if (done) runOnJS(remove)();
          });
        });
      } else if (x < SWIPE.open / 2) {
        settle(SWIPE.open);
      } else {
        settle(0);
        runOnJS(close)();
      }
    },
  });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const outerStyle = useAnimatedStyle(() => (height.value < 0 ? {} : { height: height.value, opacity: height.value / Math.max(1, measured.value) }));
  const markStyle = useAnimatedStyle(() => ({ width: Math.max(0, tx.value) }));
  const markIcon = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(tx.value, [0, SWIPE.mark * width.value], [0.8, 1], Extrapolation.CLAMP) }],
    opacity: interpolate(tx.value, [0, 24], [0, 1], Extrapolation.CLAMP),
  }));
  const removeStyle = useAnimatedStyle(() => ({
    width: Math.max(0, -tx.value),
    opacity: tx.value < -SWIPE.remove * width.value ? 1 : 0,
  }));
  const actionsStyle = useAnimatedStyle(() => ({
    opacity: tx.value < -SWIPE.remove * width.value ? 0 : interpolate(-tx.value, [0, -SWIPE.open], [0, 1], Extrapolation.CLAMP),
  }));
  const onRed = dark ? "#311E0D" : "#FFFFFF";

  return (
    <Animated.View style={[{ overflow: "hidden", borderRadius: radius.lg }, outerStyle]}
      onLayout={(e) => {
        width.value = e.nativeEvent.layout.width;
        if (height.value < 0) measured.value = e.nativeEvent.layout.height;
      }}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={StyleSheet.absoluteFill}>
        <Animated.View style={[s.mark, { backgroundColor: c.primary }, markStyle]}>
          <Animated.View style={markIcon}>
            <I name={inCart ? "rotate-ccw" : "check"} color={c.onPrimary} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[s.actions, actionsStyle]}>
          <Pressable accessible={false} onPress={() => { close(); onEdit(); }} style={[s.circle, { backgroundColor: c.soft }]}>
            <I name="edit-2" color={c.text} />
          </Pressable>
          <Pressable accessible={false} onPress={() => { close(); onRemove(); }} style={[s.circle, { backgroundColor: c.red }]}>
            <I name="trash-2" color={onRed} />
          </Pressable>
        </Animated.View>
        <Animated.View style={[s.remove, { backgroundColor: c.red }, removeStyle]}>
          <I name="trash-2" color={onRed} />
          <T numberOfLines={1} style={{ color: onRed, fontFamily: "SoraSemi" }}>Solte para apagar</T>
        </Animated.View>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  mark: { position: "absolute", left: 0, top: 0, bottom: 0, alignItems: "flex-start", justifyContent: "center", paddingLeft: 20, overflow: "hidden" },
  actions: { position: "absolute", right: 0, top: 0, bottom: 0, width: 120, flexDirection: "row", alignItems: "center", justifyContent: "space-evenly" },
  circle: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  remove: { position: "absolute", right: 0, top: 0, bottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingRight: 20, overflow: "hidden" },
});
