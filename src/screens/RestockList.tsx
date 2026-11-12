import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Box, Button, I, Muted, T, Toggle, space, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { today } from "../finance.mjs";
import { activeShoppingState, addShoppingItem, itemsOf } from "../shopping.mjs";
import { displayName } from "../shoppingHistory.mjs";
import { restockCandidates } from "../shoppingRhythm.mjs";
import { runningLow } from "../shoppingRunOut.mjs";
import { basketInflation } from "../shoppingInflation.mjs";
import { cheapestStore } from "../shoppingStores.mjs";
import { productKey } from "../shoppingPurchases.mjs";
import { permission } from "../app/notify";

const days = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

// "Já deve estar acabando": produtos que você costuma comprar de tempos em tempos e que já passaram da hora.
// Só lê o ritmo (shoppingRhythm.mjs). Quem entra na lista de compras sai daqui sozinho.
export default function RestockList({ limit = 5, alerts = false }: { limit?: number; alerts?: boolean }) {
  const { c } = useTheme();
  const { state, perform, show } = useStore();
  const [expanded, setExpanded] = React.useState(false);
  const [alertStatus, setAlertStatus] = React.useState("");
  const date = today();
  const { items, store, inflation } = useMemo(() => {
    const scope = activeShoppingState(state);
    const products = new Map((state.shoppingProducts || []).map((product: any) => [product.id, product]));
    const existing = new Set(itemsOf(scope).map((item: any) => productKey(item.name, item.unit)));
    const low = runningLow(scope, date).map((row: any) => ({ ...row, unit: (products.get(row.productId) as any)?.unit || "" }))
      .filter((row: any) => !existing.has(productKey(row.name, row.unit)));
    const rows: any[] = alerts ? low.slice(0, limit) : restockCandidates(scope, date, { limit });
    return { items: rows, store: alerts ? cheapestStore(state, rows) : null,
      inflation: alerts && rows.length ? basketInflation(state, { now: date } as Parameters<typeof basketInflation>[1]) : null };
  }, [state, date, alerts, limit]);
  const toggleAlerts = async (enabled: boolean) => {
    if (enabled && !(await permission(true).catch(() => false))) {
      setAlertStatus("Permita notificações nos ajustes do aparelho para receber os avisos.");
      return;
    }
    setAlertStatus("");
    await perform((s: any) => {
      const next = { ...s };
      if (enabled) next.shoppingRunOutAlerts = true;
      else delete next.shoppingRunOutAlerts;
      return next;
    }, enabled ? "Avisos de reposição ligados" : "Avisos de reposição desligados");
  };
  if (!items.length && !alerts) return null;

  const add = (name: string) => void perform((s: any) => addShoppingItem(s, displayName(name)), "Item adicionado à lista", { undoable: true });

  return (
    <Box style={{ padding: 0, overflow: "hidden" }}>
      {alerts && <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
        style={[k.row, { minHeight: 48, paddingHorizontal: space.sm, gap: space.sm }]}>
        <T style={{ flex: 1 }}>Está acabando</T>
        <Muted>{items.length} {items.length === 1 ? "sugestão" : "sugestões"}</Muted>
        <I name={expanded ? "chevron-up" : "chevron-down"} color={c.text} />
      </Pressable>}
      {alerts && expanded && <View style={{ padding: space.lg, gap: space.sm }}>
        <Toggle label="Avisar quando estiver acabando" value={state.shoppingRunOutAlerts === true} onChange={(enabled) => void toggleAlerts(enabled)} />
        {!!alertStatus && <Muted accessibilityLiveRegion="polite">{alertStatus}</Muted>}
        {!items.length && <Muted>Nenhum produto para repor segundo o histórico.</Muted>}
        {store && <Muted>Menor estimativa no histórico: {store.store} · {show(store.totalCents)}{store.missing.length ? " · comparação parcial" : ""}</Muted>}
        {inflation && <Muted>Variação dos preços nas compras dos últimos 3 meses: {String(inflation.percent).replace(".", ",")}%.</Muted>}
      </View>}
      {(!alerts || expanded) && items.map((i, idx) => {
        return (
          <View key={i.productId} style={[k.row, { flexWrap: "wrap" }, idx < items.length - 1 && k.hairline, { borderBottomColor: c.line, paddingLeft: 16, paddingRight: 4, minHeight: 68, gap: 4 }]}>
            <View style={{ flex: 1, paddingVertical: 10, gap: 2 }}>
              <T>{displayName(i.name)}</T>
              <Muted>{alerts ? i.reason : `Há ${days(i.daysSinceLast)} sem comprar`}</Muted>
            </View>
            <Button icon="plus" title="Adicionar à lista" secondary onPress={() => add(i.name)} />
          </View>
        );
      })}
    </Box>
  );
}
