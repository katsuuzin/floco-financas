import React from "react";
import { Group, Row } from "../ui/kit";
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
      {
        label: "Cartões de crédito",
        icon: "credit-card",
        route: { name: "cards" },
      },
      {
        label: "Categorias e tags",
        icon: "layers",
        route: { name: "tool", id: "categories" },
      },
    ],
  ],
  [
    "Planejar",
    [
      { label: "Orçamento", icon: "pie-chart", route: { name: "budgets" } },
      { label: "Metas e caixinhas", icon: "target", route: { name: "goals" } },
      { label: "Lista de compras", icon: "shopping-cart", route: { name: "shopping" } },
      {
        label: "Projeções",
        icon: "trending-up",
        route: { name: "projections" },
      },
    ],
  ],
  [
    "Acompanhar",
    [
      { label: "Recorrências", icon: "repeat", route: { name: "recurrences" } },
      {
        label: "Dívidas e contratos",
        icon: "calendar",
        detail: "Parcelamentos, financiamentos e empréstimos",
        route: { name: "debts" },
      },
      {
        label: "Entre pessoas",
        icon: "users",
        detail: "Quem me deve e quem eu devo",
        route: { name: "people" },
      },
    ],
  ],
  [
    "Analisar",
    [
      {
        label: "Relatórios",
        icon: "bar-chart-2",
        route: { name: "reports" },
        detail: "Personalizado, fluxo de caixa, comparações, PDF",
      },
    ],
  ],
  [
    "Ferramentas",
    [
      {
        label: "Importar e exportar",
        icon: "file-text",
        route: { name: "dataTools" },
      },
      {
        label: "Conferir fatura",
        icon: "check-square",
        route: { name: "reconcile" },
      },
      {
        label: "Categorização automática",
        icon: "zap",
        route: { name: "rules" },
      },
      {
        label: "Notificações bancárias",
        icon: "bell",
        route: { name: "notifications" },
      },
      {
        label: "Lixeira",
        icon: "trash-2",
        detail: "Lançamentos excluídos nos últimos 30 dias",
        route: { name: "trash" },
      },
    ],
  ],
];

export default function MoreScreen() {
  const nav = useNav();
  const { state } = useStore();
  return (
    <>
      <Group>
        <Row
          icon="message-circle"
          label="Assistente"
          detail="Saúde financeira, destaques e plano de ação"
          onPress={() => nav.push({ name: "assistant" })}
        />
        {layoutOf(state).tab4 !== "analysis" && (
          <Row
            icon="bar-chart-2"
            label="Análise"
            onPress={() => nav.setTab("analysis")}
          />
        )}
      </Group>
      {groups.map(([title, items]) => (
        <Group key={title} title={title}>
          {items.map((item) => (
            <Row
              key={item.label}
              icon={item.icon}
              label={item.label}
              detail={item.detail}
              onPress={() => nav.push(item.route)}
            />
          ))}
        </Group>
      ))}
    </>
  );
}
