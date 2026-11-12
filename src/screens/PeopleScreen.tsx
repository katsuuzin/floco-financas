// Entre pessoas: reúne "Quem me deve" e "Quem eu devo" numa só tela, com duas abas.
import React, { useState } from "react";
import { View } from "react-native";
import { Segmented, space } from "../ui/kit";
import { useNav } from "../app/nav";
import ReceivablesScreen from "./ReceivablesScreen";
import PayablesScreen from "./PayablesScreen";

export default function PeopleScreen() {
  const nav = useNav();
  const initial = nav.top && (nav.top as any).name === "people" ? (nav.top as any).tab : undefined;
  const [tab, setTab] = useState<"receivables" | "payables">(initial === "payables" ? "payables" : "receivables");
  return (
    <View style={{ gap: space.md }}>
      <Segmented
        value={tab}
        onChange={setTab}
        values={[
          ["receivables", "Me devem"],
          ["payables", "Eu devo"],
        ]}
      />
      {tab === "receivables" ? <ReceivablesScreen /> : <PayablesScreen />}
    </View>
  );
}
