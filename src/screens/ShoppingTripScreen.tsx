import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Box, Button, Empty, Field, I, Muted, Section, T, focusAccessibility, type ViewControl, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import CategoryIcon, { CategoryBadge } from "../ui/ShoppingIcons";
import { useStore } from "../app/store";
import { reviewExpenses, useNav } from "../app/nav";
import { itemsOf, setItemStatus, toggleCart, tripScopeState } from "../shopping.mjs";
import { endSession, parseSession, resumeSession, serializeSession, startSession } from "../shoppingTripSession.mjs";
import { finishPlan, parseLimitInput, tripViewModel } from "../shoppingTripView.mjs";

const SESSION_KEY = "floco.tripSession";
const BUDGET_KEY = "floco.tripBudgetCents";

// Modo compra: tela para usar no mercado. Total do carrinho, progresso, tempo e o que falta pegar.
export default function ShoppingTripScreen({ lists }: { lists?: string[] }) {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const nav = useNav();
  // O horário de início fica guardado: sair e voltar (até 3 h) não zera o tempo.
  const [session, setSession] = useState<{ startedAt: number; lastSeenAt: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [limitCents, setLimitCents] = useState(0);
  const [limitText, setLimitText] = useState("");
  const [editLimit, setEditLimit] = useState(false);
  const [limitError, setLimitError] = useState("");
  const limitButton = useRef<ViewControl>(null);
  const cartControls = useRef(new Map<string, ViewControl>());
  const [cartFocus, setCartFocus] = useState("");
  const [cartStatus, setCartStatus] = useState("");
  useEffect(() => {
    if (!cartFocus) return;
    focusAccessibility(cartControls.current.get(cartFocus));
    setCartFocus("");
  }, [cartFocus, state.shoppingItems]);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  useEffect(() => {
    let alive = true;
    (async () => {
      const t = Date.now();
      let saved = null;
      let budget = 0;
      try {
        saved = parseSession((await AsyncStorage.getItem(SESSION_KEY)) ?? "", t);
        budget = Number(await AsyncStorage.getItem(BUDGET_KEY)) || 0;
      } catch {}
      if (!alive) return;
      const s = resumeSession(saved, t) ?? startSession(t);
      setSession(s);
      setLimitCents(Number.isSafeInteger(budget) && budget > 0 ? budget : 0);
      try {
        await AsyncStorage.setItem(SESSION_KEY, serializeSession(s));
      } catch {}
    })();
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const cur = sessionRef.current;
      if (cur) AsyncStorage.setItem(SESSION_KEY, serializeSession({ ...cur, lastSeenAt: t })).catch(() => {});
    }, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  const saveLimit = () => {
    const result = parseLimitInput(limitText);
    if (!result.ok) {
      setLimitError(result.message ?? "Confira o limite da compra.");
      return;
    }
    const value = result.cents ?? 0;
    setLimitError("");
    setLimitCents(value);
    setEditLimit(false);
    requestAnimationFrame(() => focusAccessibility(limitButton.current));
    (value > 0 ? AsyncStorage.setItem(BUDGET_KEY, String(value)) : AsyncStorage.removeItem(BUDGET_KEY)).catch(() => {});
  };
  const finish = () => {
    sessionRef.current = endSession();
    setSession(sessionRef.current);
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  };

  const selectedState = tripScopeState(state, lists);
  const view = tripViewModel(selectedState, { session, limitCents, now });
  const { cart, progress, elapsed, budget, groups, missing, inCart, estimate, spoken } = view;
  const pct = progress.percent;

  if (view.empty) {
    return <Empty icon="shopping-cart" title="Nenhum item na lista" body="Adicione itens na lista de compras para usar o Modo compra." />;
  }

  const toggle = async (item: any) => {
    const action = item.inCart ? "item tirado do carrinho" : "item colocado no carrinho";
    if (await perform((s: any) => toggleCart(s, item.id), action)) {
      setCartStatus(`${item.name} ${item.inCart ? "voltou aos pendentes" : "foi para o carrinho"}.`);
      setCartFocus(item.id);
    }
  };
  const markMissing = async (item: any, status: "missing" | null) => {
    if (await perform((s: any) => setItemStatus(s, item.id, status), status ? "item marcado em falta" : "item voltou à lista")) {
      setCartStatus(status ? `${item.name} marcado em falta.` : `${item.name} voltou à lista.`);
    }
  };
  const bindCartControl = (id: string, node: ViewControl | null) => {
    if (node) cartControls.current.set(id, node);
    else cartControls.current.delete(id);
  };

  return (
    <>
      <Muted accessibilityLiveRegion="polite">{cartStatus}</Muted>
      <View accessible accessibilityLabel={[spoken.header, estimate.text, budget.visible ? budget.text.split(" · ")[0] : ""].filter(Boolean).join(" ")}>
        <Box style={{ gap: 8 }}>
          <Muted>No carrinho</Muted>
          <T style={{ fontFamily: "SoraBold", fontSize: 32, lineHeight: 40 }}>{cart.text}</T>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ height: 8, borderRadius: 4, backgroundColor: c.soft, overflow: "hidden" }}
          >
            <View style={{ width: `${pct}%`, height: 8, backgroundColor: c.primary }} />
          </View>
          <Muted>
            {`${progress.items} de ${progress.total} ${progress.total === 1 ? "item" : "itens"} · ${elapsed.text}`}
          </Muted>
          {(cart.unpriced > 0 || estimate.text) && (
            <Muted>
              {cart.unpriced > 0 ? `${cart.unpriced} no carrinho sem preço. ` : ""}
              {estimate.text}
            </Muted>
          )}
          {budget.visible && (
            <T style={{ color: budget.color === "over" ? c.red : budget.color === "near" ? c.amber : c.muted }}>
              {budget.text}
            </T>
          )}
        </Box>
      </View>

      <View style={{ marginTop: 12, gap: 8 }}>
        {editLimit ? (
          <>
            <Field label="Limite da compra (R$)" value={limitText} onChange={(text) => { setLimitText(text); setLimitError(""); }} numeric autoFocus placeholder="Ex.: 250,00" hint="Deixe vazio para tirar o limite." />
            <View accessibilityLiveRegion="polite">{!!limitError && <Muted style={{ color: c.red }}>{limitError}</Muted>}</View>
            <Button title="Salvar limite" onPress={saveLimit} />
          </>
        ) : (
          <Button
            title={budget.action}
            controlRef={limitButton}
            icon="target"
            secondary
            onPress={() => {
              setLimitText(limitCents > 0 ? (limitCents / 100).toFixed(2).replace(".", ",") : "");
              setEditLimit(true);
            }}
          />
        )}
      </View>

      {progress.pending === 0 ? (
        <View style={{ marginTop: 16 }}>
          <Box>
            <T style={{ fontFamily: "SoraSemi" }}>Tudo no carrinho</T>
            <Muted>Confira o total e finalize a compra.</Muted>
          </Box>
        </View>
      ) : (
        groups.map((g: any) => (
          <View key={g.category}>
            <Section title={`${g.category} (${g.count})`} icon={<CategoryIcon category={g.category} />} />
            <Box style={{ padding: 0, overflow: "hidden" }}>
              {g.items.map((i: any, idx: number) => (
                <View key={i.id} style={idx < g.items.length - 1 && [k.hairline, { borderBottomColor: c.line }]}>
                  <TripRow item={i} bindControl={(node: ViewControl | null) => bindCartControl(i.id, node)} onToggle={() => void toggle(i)} onMissing={() => void markMissing(i, "missing")} />
                </View>
              ))}
            </Box>
          </View>
        ))
      )}

      {missing.length > 0 && (
        <View>
          <Section title={`Em falta (${missing.length})`} />
          <Box style={{ padding: 0, overflow: "hidden" }}>
            {missing.map((i: any, idx: number) => (
              <View key={i.id} style={idx < missing.length - 1 && [k.hairline, { borderBottomColor: c.line }]}>
                <TripRow item={i} bindControl={(node: ViewControl | null) => bindCartControl(i.id, node)} onToggle={() => void toggle(i)} onMissing={() => void markMissing(i, null)} missingNow />
              </View>
            ))}
          </Box>
        </View>
      )}

      {inCart.length > 0 && (
        <View>
          <Section title={`No carrinho (${inCart.length})`} />
          <Box style={{ padding: 0, overflow: "hidden" }}>
            {inCart.map((i: any, idx: number) => (
              <View key={i.id} style={idx < inCart.length - 1 && [k.hairline, { borderBottomColor: c.line }]}>
                <TripRow item={i} bindControl={(node: ViewControl | null) => bindCartControl(i.id, node)} onToggle={() => void toggle(i)} />
              </View>
            ))}
          </Box>
        </View>
      )}

      <View style={{ marginTop: 16, gap: 8 }}>
        {view.canFinish && (
          <Button
            title="Registrar despesa"
            icon="dollar-sign"
            onPress={() => {
              const plan = finishPlan(selectedState);
              if (!plan.ok || !plan.expense) return;
              const expense = plan.expense;
              const open = () => {
                finish();
                nav.push({
                  name: "form",
                  kind: "transaction",
                  initial: { type: "expense", amount: expense.amount, description: expense.description },
                });
              };
              const single = () => {
                if (view.duplicateWarning) {
                  Alert.alert("Já existe uma despesa parecida", "Há uma despesa de mercado com valor e data próximos. Registrar mesmo assim?", [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Registrar", onPress: open },
                  ]);
                } else open();
              };
              Alert.alert("Registrar compra", plan.warning || "Escolha como registrar o total.", [
                { text: "Cancelar", style: "cancel" },
                { text: "Uma despesa", onPress: single },
                { text: "Dividir por categoria", onPress: () => nav.push(reviewExpenses(itemsOf(selectedState))) },
              ]);
            }}
          />
        )}
        <Button title="Ler nota fiscal" icon="camera" secondary onPress={() => nav.push({ name: "scanNota" })} />
      </View>
    </>
  );
}

function TripRow({ item, onToggle, onMissing, missingNow = false, bindControl }: any) {
  const { c } = useTheme();
  const { inCart: checked, totalText, quantityText: q } = item;
  return (
    <View style={[k.row, { gap: 0 }]}>
    <Pressable
      ref={bindControl}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={item.spoken}
      accessibilityHint="Toque duas vezes para alternar"
      onPress={onToggle}
      style={[k.row, { flex: 1, minHeight: 60, paddingHorizontal: 8, gap: 0 }]}
    >
      <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: checked ? c.primary : c.muted,
            backgroundColor: checked ? c.primary : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {checked && <I name="check" size={18} color={c.onPrimary} />}
        </View>
      </View>
      <View style={{ marginRight: 8 }}><CategoryBadge category={item.category || "Outros"} size={32} /></View>
      <View style={{ flex: 1, paddingVertical: 6 }}>
        <T style={checked ? { color: c.muted, textDecorationLine: "line-through" } : undefined}>
          {item.name}
        </T>
        {(q || totalText) && (
          <Muted>
            {q}
            {q && totalText ? " · " : ""}
            {totalText}
          </Muted>
        )}
      </View>
    </Pressable>
      {onMissing && !checked && (
        <Pressable accessibilityRole="button" accessibilityLabel={missingNow ? `Tirar ${item.name} de em falta` : `Marcar ${item.name} em falta`}
          onPress={onMissing} style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
          <I name={missingNow ? "rotate-ccw" : "x-circle"} size={20} color={c.muted} />
        </Pressable>
      )}
    </View>
  );
}
