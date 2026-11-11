import React, { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Box, Button, Empty, Field, I, Muted, Section, T, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import CategoryIcon from "../ui/ShoppingIcons";
import { useStore } from "../app/store";
import { useNav } from "../app/nav";
import { itemsOf, lineTotal, purchaseDraft, toggleCart } from "../shopping.mjs";
import { formatElapsed, pendingByCategory, tripSummary } from "../shoppingTrip.mjs";
import { sortByAisles } from "../shoppingAisles.mjs";
import { budgetStatus } from "../shoppingBudget.mjs";
import { endSession, parseSession, resumeSession, serializeSession, startSession } from "../shoppingTripSession.mjs";
import { describeItem, describeProgress } from "../shoppingSpeech.mjs";
import { parseMoney } from "../finance.mjs";

const SESSION_KEY = "floco.tripSession";
const BUDGET_KEY = "floco.tripBudgetCents";

const qtyText = (i: any) => (i.unit ? `${String(i.qty).replace(".", ",")} ${i.unit}` : i.qty > 1 ? `${i.qty}x` : "");

// Modo compra: tela para usar no mercado. Total do carrinho, progresso, tempo e o que falta pegar.
export default function ShoppingTripScreen() {
  const { c } = useTheme();
  const { state, perform, show } = useStore();
  const nav = useNav();
  // O horário de início fica guardado: sair e voltar (até 3 h) não zera o tempo.
  const [session, setSession] = useState<{ startedAt: number; lastSeenAt: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [limitCents, setLimitCents] = useState(0);
  const [limitText, setLimitText] = useState("");
  const [editLimit, setEditLimit] = useState(false);
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
    const cents = limitText.trim() ? parseMoney(limitText) : 0;
    const ok = Number.isSafeInteger(cents) && cents >= 0;
    const value = ok ? cents : 0;
    setLimitCents(value);
    setEditLimit(false);
    (value > 0 ? AsyncStorage.setItem(BUDGET_KEY, String(value)) : AsyncStorage.removeItem(BUDGET_KEY)).catch(() => {});
  };
  const finish = () => {
    setSession(endSession());
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  };

  const sum = tripSummary(state, { startedAt: session?.startedAt ?? now, now });
  const budget = budgetStatus({ limitCents, cartCents: sum.cartCents, pendingEstimateCents: sum.pendingEstimateCents });
  const groups = sortByAisles(pendingByCategory(state)); // na ordem do caminho no mercado
  const inCart: any[] = itemsOf(state).filter((i: any) => i.inCart);
  const draft = purchaseDraft(state);
  const pct = Math.round(sum.progress * 100);

  if (sum.total === 0) {
    return <Empty icon="shopping-cart" title="Nenhum item na lista" body="Adicione itens na lista de compras para usar o Modo compra." />;
  }

  const toggle = (id: string) => void perform((s: any) => toggleCart(s, id), "");
  const cartLabel = `No carrinho: ${show(sum.cartCents)}${sum.cartUnpriced ? `, ${sum.cartUnpriced} sem preço` : ""}`;

  return (
    <>
      <View accessible accessibilityLabel={`${cartLabel}. ${describeProgress(sum)} Tempo ${formatElapsed(sum.elapsedMinutes)}.${limitCents > 0 ? " " + budget.message : ""}`}>
        <Box style={{ gap: 8 }}>
          <Muted>No carrinho</Muted>
          <T style={{ fontFamily: "SoraBold", fontSize: 32, lineHeight: 40 }}>{show(sum.cartCents)}</T>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ height: 8, borderRadius: 4, backgroundColor: c.soft, overflow: "hidden" }}
          >
            <View style={{ width: `${pct}%`, height: 8, backgroundColor: c.primary }} />
          </View>
          <Muted>
            {`${sum.inCartCount} de ${sum.total} ${sum.total === 1 ? "item" : "itens"} · ${formatElapsed(sum.elapsedMinutes)}`}
          </Muted>
          {(sum.cartUnpriced > 0 || sum.pendingCount > 0) && (
            <Muted>
              {sum.cartUnpriced > 0 ? `${sum.cartUnpriced} no carrinho sem preço. ` : ""}
              {sum.pendingCount > 0 && sum.pendingEstimateCents > 0
                ? `Falta pegar cerca de ${show(sum.pendingEstimateCents)}${sum.pendingUnpriced ? ` (+${sum.pendingUnpriced} sem preço)` : ""}. Total estimado ${show(sum.grandEstimateCents)}.`
                : ""}
            </Muted>
          )}
          {limitCents > 0 && (
            <T style={{ color: budget.level === "over" ? c.red : budget.level === "near" ? c.amber : c.muted }}>
              {`Limite ${show(limitCents)} · ${budget.message}`}
            </T>
          )}
        </Box>
      </View>

      <View style={{ marginTop: 12, gap: 8 }}>
        {editLimit ? (
          <>
            <Field label="Limite da compra (R$)" value={limitText} onChange={setLimitText} numeric placeholder="Ex.: 250,00" hint="Deixe vazio para tirar o limite." />
            <Button title="Salvar limite" onPress={saveLimit} />
          </>
        ) : (
          <Button
            title={limitCents > 0 ? "Alterar limite" : "Definir limite de gasto"}
            icon="target"
            secondary
            onPress={() => {
              setLimitText(limitCents > 0 ? (limitCents / 100).toFixed(2).replace(".", ",") : "");
              setEditLimit(true);
            }}
          />
        )}
      </View>

      {sum.pendingCount === 0 ? (
        <View style={{ marginTop: 16 }}>
          <Box>
            <T style={{ fontFamily: "SoraSemi" }}>Tudo no carrinho</T>
            <Muted>Confira o total e finalize a compra.</Muted>
          </Box>
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.category}>
            <Section title={`${g.category} (${g.count})`} icon={<CategoryIcon category={g.category} />} />
            <Box style={{ padding: 0, overflow: "hidden" }}>
              {g.items.map((i: any, idx: number) => (
                <View key={i.id} style={idx < g.items.length - 1 && [k.hairline, { borderBottomColor: c.line }]}>
                  <TripRow item={i} checked={false} onToggle={() => toggle(i.id)} show={show} />
                </View>
              ))}
            </Box>
          </View>
        ))
      )}

      {inCart.length > 0 && (
        <View>
          <Section title={`No carrinho (${inCart.length})`} />
          <Box style={{ padding: 0, overflow: "hidden" }}>
            {inCart.map((i: any, idx: number) => (
              <View key={i.id} style={idx < inCart.length - 1 && [k.hairline, { borderBottomColor: c.line }]}>
                <TripRow item={i} checked onToggle={() => toggle(i.id)} show={show} />
              </View>
            ))}
          </Box>
        </View>
      )}

      <View style={{ marginTop: 16, gap: 8 }}>
        {draft.items > 0 && (
          <Button
            title="Finalizar e registrar despesa"
            icon="dollar-sign"
            onPress={() => {
              finish();
              nav.push({
                name: "form",
                kind: "transaction",
                initial: { type: "expense", amount: draft.amountText, description: draft.description },
              });
            }}
          />
        )}
        <Button title="Ler nota fiscal" icon="camera" secondary onPress={() => nav.push({ name: "scanNota" })} />
      </View>
    </>
  );
}

function TripRow({ item, checked, onToggle, show }: any) {
  const { c } = useTheme();
  const lt = lineTotal(item);
  const total = lt == null ? null : Math.round(lt);
  const q = qtyText(item);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={describeItem({ ...item, inCart: checked })}
      accessibilityHint="Toque duas vezes para alternar"
      onPress={onToggle}
      style={[k.row, { minHeight: 60, paddingHorizontal: 8, gap: 0 }]}
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
      <View style={{ flex: 1, paddingVertical: 6 }}>
        <T numberOfLines={2} style={checked ? { color: c.muted, textDecorationLine: "line-through" } : undefined}>
          {item.name}
        </T>
        {(q !== "" || total != null) && (
          <Muted>
            {q}
            {q !== "" && total != null ? " · " : ""}
            {total != null ? show(total) : ""}
          </Muted>
        )}
      </View>
    </Pressable>
  );
}
