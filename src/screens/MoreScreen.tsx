import React from "react";
import { Section, ListItem, Muted, Box, T } from "../ui/kit";
import type { Icon } from "../ui/kit";
import { useNav, Route } from "../app/nav";

type Item = { label: string; icon: Icon; route: Route };
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
      { label: "Projeções", icon: "trending-up", route: { name: "tool", id: "projections" } },
    ],
  ],
  [
    "Acompanhar",
    [
      { label: "Recorrências", icon: "repeat", route: { name: "tool", id: "recurrences" } },
      { label: "Parcelamentos", icon: "calendar", route: { name: "tool", id: "installments" } },
      { label: "Financiamentos e empréstimos", icon: "home", route: { name: "tool", id: "financings" } },
      { label: "Quem me deve", icon: "users", route: { name: "tool", id: "receivables" } },
    ],
  ],
  [
    "Analisar",
    [{ label: "Relatório personalizado", icon: "bar-chart-2", route: { name: "tool", id: "reports" } }],
  ],
  [
    "Ferramentas",
    [
      { label: "Importar comprovante", icon: "camera", route: { name: "receipt" } },
      { label: "Importar extrato", icon: "file-text", route: { name: "imports" } },
      { label: "Notificações bancárias", icon: "bell", route: { name: "notifications" } },
    ],
  ],
];

export default function MoreScreen() {
  const nav = useNav();
  return (
    <>
      <ListItem icon="settings" label="Configurações" detail="Aparência, segurança, backup e dados" onPress={() => nav.push({ name: "settings" })} />
      {groups.map(([title, items]) => (
        <React.Fragment key={title}>
          <Section title={title} />
          {items.map((item) => (
            <ListItem key={item.label} icon={item.icon} label={item.label} onPress={() => nav.push(item.route)} />
          ))}
        </React.Fragment>
      ))}
      <Box style={{ marginTop: 20 }}>
        <T style={{ fontFamily: "SoraSemi" }}>Sempre livre</T>
        <Muted style={{ marginTop: 6 }}>Todas as funções do Floco, sem plano pago e sem limite comercial.</Muted>
      </Box>
    </>
  );
}
