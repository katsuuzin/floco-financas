// Navegação de mês no padrão do Calen: setas redondas e o mês no meio.
import React from "react";
import { View, Pressable } from "react-native";
import { useNav } from "../../app/nav";
import { monthKey, addMonths, today } from "../../finance.mjs";
import { useCalen, CText, CIconButton } from "../../ui/calen";

export const monthLabel = (m: string) => new Date(m + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase());

export default function MonthNav({ children }: { children?: React.ReactNode }) {
  const { month, setMonth } = useNav();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 6, marginBottom: 4 }}>
      <CIconButton name="chevron-left" label="Mês anterior" onPress={() => setMonth(monthKey(addMonths(month + "-01", -1)))} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${monthLabel(month)}. Voltar ao mês atual`} onPress={() => setMonth(monthKey(today()))} style={{ minHeight: 44, minWidth: 150, alignItems: "center", justifyContent: "center" }}>
        <CText semi>{monthLabel(month)}</CText>
      </Pressable>
      <CIconButton name="chevron-right" label="Próximo mês" onPress={() => setMonth(monthKey(addMonths(month + "-01", 1)))} />
      {children}
    </View>
  );
}
