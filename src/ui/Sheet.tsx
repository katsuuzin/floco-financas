// Folha que sobe de baixo (kit do Floco, 1.12). Movimento próprio, medido na auditoria (A6) e recriado aqui:
// abre em 380 ms com desaceleração forte, fecha em 200 ms acelerando para baixo; o fundo escurece e desfoca.
// Com "remover animações" ligado: só esmaece (150 ms) e não desfoca.
import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureDetector, GestureHandlerRootView, usePanGesture } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { focusAccessibility, IconButton, T, Muted, type ViewControl, space } from "./kit";
import { useTheme } from "./theme";

// Referência ao BlurTargetView da raiz do app (o que fica atrás da folha). Sem ela, não há desfoque.
export const BlurTargetContext = createContext<React.RefObject<ViewControl | null> | null>(null);

const OPEN = { duration: 380, easing: Easing.bezier(0.2, 0.9, 0.1, 1) };
const CLOSE = { duration: 200, easing: Easing.in(Easing.cubic) };
const FADE = { duration: 150 };
const DRAG_CLOSE = 120; // dp arrastados para baixo que fecham a folha
const FLING_CLOSE = 900; // velocidade (dp/s) que fecha mesmo com pouco arraste

export function SheetModal({ title, onClose, children, footer }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { c, dark } = useTheme();
  const reduce = useReducedMotion();
  const target = useContext(BlurTargetContext);
  const { height } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const heading = useRef<ViewControl>(null);
  const offset = useSharedValue(reduce ? 0 : height);
  const shade = useSharedValue(0);
  const appear = useSharedValue(reduce ? 0 : 1);
  const closing = useRef(false);
  const done = useRef(onClose);
  done.current = onClose;

  useEffect(() => {
    if (reduce) {
      appear.value = withTiming(1, FADE);
      shade.value = withTiming(1, FADE);
    } else {
      offset.value = withTiming(0, OPEN);
      shade.value = withTiming(1, OPEN);
    }
  }, []);

  const finish = useCallback(() => done.current(), []);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const end = (finished?: boolean) => {
      "worklet";
      if (finished) runOnJS(finish)();
    };
    if (reduce) {
      shade.value = withTiming(0, FADE);
      appear.value = withTiming(0, FADE, end);
    } else {
      shade.value = withTiming(0, CLOSE);
      offset.value = withTiming(height, CLOSE, end);
    }
  }, [reduce, height]);

  // Arrastar a alça (ou o título) para baixo fecha; soltar antes do limite volta com mola curta.
  const drag = usePanGesture({
    activeOffsetY: [-8, 8],
    onUpdate: (e) => {
      "worklet";
      offset.value = Math.max(0, e.translationY);
    },
    onDeactivate: (e) => {
      "worklet";
      if (e.translationY > DRAG_CLOSE || e.velocityY > FLING_CLOSE) runOnJS(close)();
      else offset.value = withSpring(0, { damping: 24, stiffness: 320 });
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }], opacity: appear.value }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} onShow={() => focusAccessibility(heading.current)}>
      <GestureHandlerRootView style={s.fill}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, shadeStyle]}>
          {target && !reduce && (
            <BlurView blurTarget={target} blurMethod="dimezisBlurViewSdk31Plus" intensity={40}
              tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          )}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} />
        </Animated.View>
        <Pressable style={s.fill} onPress={close} accessibilityRole="button" accessibilityLabel="Fechar" />
        <Animated.View accessibilityViewIsModal style={[s.sheet, { backgroundColor: c.bg }, sheetStyle]}>
          <GestureDetector gesture={drag}>
            <View>
              <View style={[s.handle, { backgroundColor: c.line }]} />
              <View style={s.header}>
                <View ref={heading} accessible accessibilityRole="header" accessibilityLabel={title} style={{ flex: 1 }}>
                  <T style={s.title} maxFontSizeMultiplier={1.6}>{title}</T>
                </View>
                <IconButton name="x" label="Fechar" color={c.text} onPress={close} />
              </View>
            </View>
          </GestureDetector>
          <View style={{ flexShrink: 1 }}>{children}</View>
          {footer ? <View style={[s.footer, { borderTopColor: c.line, paddingBottom: 16 + bottom }]}>{footer}</View>
            : <View style={{ height: bottom }} />}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// Confirmação com o que muda e o que fica (substitui o Alert simples em ações que tiram dados).
export function ConfirmSheet({ title, changes, keeps, action, destructive = true, onConfirm, onClose }: {
  title: string;
  changes: string[];
  keeps: string[];
  action: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { c, dark } = useTheme();
  const fill = destructive ? c.red : c.primary;
  const onFill = destructive ? (dark ? "#311E0D" : "#FFFFFF") : c.onPrimary;
  const list = (heading: string, rows: string[]) => rows.length > 0 && (
    <View style={{ gap: space.xs }}>
      <T accessibilityRole="header" style={s.caps}>{heading}</T>
      {rows.map((row) => (
        <View key={row} style={{ flexDirection: "row", gap: space.sm }}>
          <Muted importantForAccessibility="no">•</Muted>
          <T style={{ flex: 1 }}>{row}</T>
        </View>
      ))}
    </View>
  );
  return (
    <SheetModal title={title} onClose={onClose} footer={
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onClose}
          style={[s.footerButton, { backgroundColor: c.soft }]}>
          <T style={{ fontFamily: "SoraSemi", color: c.primary }}>Voltar</T>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onConfirm}
          style={[s.footerButton, { backgroundColor: fill, flex: 1.4 }]}>
          <T style={{ fontFamily: "SoraSemi", color: onFill }}>{action}</T>
        </Pressable>
      </View>
    }>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.lg }}>
        {list("Vai sair", changes)}
        {list("Continua", keeps)}
      </View>
    </SheetModal>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  sheet: { maxHeight: "90%", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 8 },
  header: { flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 4, paddingTop: 4, paddingBottom: 4, gap: 8 },
  title: { fontFamily: "SoraSemi", fontSize: 22 },
  caps: { fontFamily: "SoraSemi", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  footerButton: { flex: 1, minHeight: 56, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
});
