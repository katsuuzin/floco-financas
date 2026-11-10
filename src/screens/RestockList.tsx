import React from "react";
import { View } from "react-native";
import { Box, IconButton, Muted, T, styles as k } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { useStore } from "../app/store";
import { today } from "../finance.mjs";
import { addShoppingItem } from "../shopping.mjs";
import { displayName } from "../shoppingHistory.mjs";
import { restockCandidates } from "../shoppingRhythm.mjs";

const days = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

// "Já deve estar acabando": produtos que você costuma comprar de tempos em tempos e que já passaram da hora.
// Só lê o ritmo (shoppingRhythm.mjs). Quem entra na lista de compras sai daqui sozinho.
export default function RestockList({ limit = 5 }: { limit?: number }) {
  const { c } = useTheme();
  const { state, perform } = useStore();
  const items: any[] = restockCandidates(state, today(), { limit });
  if (!items.length) return null;

  const add = (name: string) => void perform((s: any) => addShoppingItem(s, displayName(name)), "");

  return (
    <Box style={{ padding: 0, overflow: "hidden" }}>
      {items.map((i, idx) => {
        const late = i.daysLate > 0 ? `atrasado ${days(i.daysLate)}` : i.status === "due" ? "na hora de comprar" : `daqui a ${days(Math.max(1, -i.daysLate))}`;
        return (
          <View key={i.productId} style={[k.row, idx < items.length - 1 && k.hairline, { borderBottomColor: c.line, paddingLeft: 16, paddingRight: 4, minHeight: 68, gap: 4 }]}>
            <View style={{ flex: 1, paddingVertical: 10, gap: 2 }}>
              <T numberOfLines={2}>{displayName(i.name)}</T>
              <Muted>{`${late} · compra a cada ${days(i.avgDays)}`}</Muted>
            </View>
            <IconButton name="plus" label={`Colocar ${displayName(i.name)} na lista de compras`} color={c.primary} onPress={() => add(i.name)} />
          </View>
        );
      })}
    </Box>
  );
}
