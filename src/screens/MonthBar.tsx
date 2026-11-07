import React from "react";
import { View, Pressable } from "react-native";
import { T, IconButton } from "../ui/kit";
import { useNav } from "../app/nav";
import { monthKey, addMonths, today } from "../finance.mjs";

export const monthLabel = (month: string) => {
  const s = new Date(month + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function MonthBar() {
  const { month, setMonth } = useNav();
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 18 }}>
      <IconButton
        name="chevron-left"
        label="Mês anterior"
        onPress={() => setMonth(monthKey(addMonths(month + "-01", -1)))}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${monthLabel(month)}. Voltar ao mês atual`}
        onPress={() => setMonth(monthKey(today()))}
        style={{ minHeight: 48, justifyContent: "center", minWidth: 150, alignItems: "center" }}
      >
        <T style={{ fontFamily: "SoraSemi" }}>{monthLabel(month)}</T>
      </Pressable>
      <IconButton
        name="chevron-right"
        label="Próximo mês"
        onPress={() => setMonth(monthKey(addMonths(month + "-01", 1)))}
      />
    </View>
  );
}
