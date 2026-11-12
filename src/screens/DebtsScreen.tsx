// Dívidas e contratos: reúne Parcelamentos, Financiamentos e Empréstimos numa só tela, com abas.
import React, { useState } from "react";
import { View } from "react-native";
import { Segmented, space } from "../ui/kit";
import { useNav } from "../app/nav";
import { ContractsScreen, InstallmentsScreen } from "./CommitmentScreens";

type DebtsTab = "installments" | "financing" | "loan";

export default function DebtsScreen() {
  const nav = useNav();
  const initial = nav.top && (nav.top as any).name === "debts" ? ((nav.top as any).tab as DebtsTab) : undefined;
  const [tab, setTab] = useState<DebtsTab>(initial || "installments");
  return (
    <View style={{ gap: space.md }}>
      <Segmented
        value={tab}
        onChange={setTab}
        values={[
          ["installments", "Parcelamentos"],
          ["financing", "Financiamentos"],
          ["loan", "Empréstimos"],
        ]}
      />
      {tab === "installments" && <InstallmentsScreen />}
      {tab === "financing" && <ContractsScreen type="financing" />}
      {tab === "loan" && <ContractsScreen type="loan" />}
    </View>
  );
}
