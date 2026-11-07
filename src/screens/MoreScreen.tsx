import React from "react";
import { Group, Row, Muted, Box, T } from "../ui/kit";
import type { Icon } from "../ui/kit";
import { useNav, Route } from "../app/nav";
import { useStore } from "../app/store";
import { layoutOf } from "../layout.mjs";

type Item = { label: string; icon: Icon; route: Route; detail?: string };
const groups: [string, Item[]][] = [
  [
    "Organizar",
    [
      { label: "Contas", icon: "briefcase", route: { name: "accounts" } },
      { label: "Cartões de crédito", icon: "credit-card", route: { name: "cards" } },
      { label: "Categorias", icon: "layers", route: { name: "tool", id: "categories" } },
      { label: "Tags", icon: "tag", route: { name: "tool", id: "tags" } },
    ],
  ],
  [
    "Planejar",
    [
      { label: "Orçamento", icon: "pie-chart", route: { name: "budgets" } },
      { label: "Metas e caixinhas", icon: "target", route: { name: "goals" } },
      { label: "Projeções", icon: "trending-up", route: { name: "projections" } },
    ],
  ],
  [
    "Acompanhar",
    [
      { label: "Recorrências", icon: "repeat", route: { name: "recurrences" } },
      { label: "Parcelamentos", icon: "calendar", route: { name: "installments" } },
      { label: "Financiamentos", icon: "home", route: { name: "contracts", type: "financing" } },
      { label: "Empréstimos", icon: "dollar-sign", route: { name: "contracts", type: "loan" } },
      { label: "Quem me deve", icon: "users", route: { name: "tool", id: "receivables" } },
    ],
  ],
  [
    "Analisar",
    [
      { label: "Relatório personalizado", icon: "sliders", route: { name: "tool", id: "reports" } },
      { label: "Relatórios avançados", icon: "bar-chart-2", route: { name: "reports" }, detail: "Fluxo de caixa, comparações, PDF" },
    ],
  ],
  [
    "Ferramentas",
    [
      { label: "Importar comprovante", icon: "camera", route: { name: "receipt" } },
      { label: "Importar extrato", icon: "file-text", route: { name: "imports" } },
      { label: "Conferir fatura", icon: "check-square", route: { name: "reconcile" } },
      { label: "Categorização automática", icon: "zap", route: { name: "rules" } },
      { label: "Notificações bancárias", icon: "bell", route: { name: "notifications" } },
    ],
  ],
];

export default function MoreScreen() {
  const nav = useNav();
  const { state } = useStore();
  return (
    <>
      <Group>
        <Row icon="message-circle" label="Assistente" detail="Saúde financeira, destaques e plano de ação" onPress={() => nav.push({ name: "assistant" })} />
        {layoutOf(state).tab4 !== "analysis" && <Row icon="bar-chart-2" label="Análise" onPress={() => nav.setTab("analysis")} />}
        <Row icon="settings" label="Configurações" detail="Aparência, segurança, backup e dados" onPress={() => nav.push({ name: "settings" })} />
      </Group>
      {groups.map(([title, items]) => (
        <Group key={title} title={title}>
          {items.map((item) => (
            <Row key={item.label} icon={item.icon} label={item.label} detail={item.detail} onPress={() => nav.push(item.route)} />
          ))}
        </Group>
      ))}
      <Box style={{ marginTop: 24 }}>
        <T style={{ fontFamily: "SoraSemi" }}>Sempre livre</T>
        <Muted style={{ marginTop: 4 }}>Todas as funções do Floco, sem plano pago e sem limite comercial.</Muted>
      </Box>
    </>
  );
}
