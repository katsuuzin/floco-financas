// Aba Análise no padrão do Calen: Resumo, Categorias, Tipo de gasto, Fluxo e Mais (relatórios
// de antes). Cores do Calen, amarelo Solar no lugar do roxo; claro e escuro.
import React, { useState } from "react";
import { View } from "react-native";
import { CTopTabs } from "../ui/calen";
import MonthNav from "./analysis/MonthNav";
import SummaryTab from "./analysis/SummaryTab";
import CategoriesTab from "./analysis/CategoriesTab";
import SpendTypeTab from "./analysis/SpendTypeTab";
import FlowTab from "./analysis/FlowTab";
import LegacyBlocks from "./analysis/LegacyBlocks";

export { categoryBreakdown } from "./analysis/LegacyBlocks";

type Tab = "summary" | "categories" | "spend" | "flow" | "more";
const ITEMS: { key: Tab; label: string; full?: string; icon: any }[] = [
  { key: "summary", label: "Resumo", icon: "home" },
  { key: "categories", label: "Categorias", icon: "pie-chart" },
  { key: "spend", label: "Tipos", full: "Tipo de gasto", icon: "layers" },
  { key: "flow", label: "Fluxo", icon: "repeat" },
  { key: "more", label: "Mais", icon: "more-horizontal" },
];

export default function AnalysisScreen() {
  const [tab, setTab] = useState<Tab>("summary");
  return (
    <>
      <CTopTabs items={ITEMS} value={tab} onChange={setTab} />
      {tab === "more" ? (
        <LegacyBlocks />
      ) : (
        <>
          {tab !== "summary" && <MonthNav />}
          <View style={{ paddingBottom: 8 }}>
            {tab === "summary" && <SummaryTab goTab={(t) => setTab(t)} />}
            {tab === "categories" && <CategoriesTab />}
            {tab === "spend" && <SpendTypeTab />}
            {tab === "flow" && <FlowTab />}
          </View>
        </>
      )}
    </>
  );
}
