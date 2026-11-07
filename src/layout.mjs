// S2–S5 — personalização da Início, atalhos, Análise e quarto botão da barra.
export const HOME_BLOCKS = [
  ["inbox", "Pendentes das notificações"],
  ["firstSteps", "Primeiros passos"],
  ["pending", "Pendências do mês"],
  ["insights", "Destaques do assistente"],
  ["shortcuts", "Atalhos"],
  ["accounts", "Contas"],
  ["cards", "Cartões"],
  ["budgets", "Resumo de orçamentos"],
  ["goals", "Resumo de metas"],
  ["receivables", "Quem me deve"],
  ["installments", "Parcelamentos"],
  ["recurrences", "Recorrências do mês"],
  ["recent", "Despesas recentes"],
];
export const DEFAULT_HOME_HIDDEN = ["insights", "goals", "receivables", "installments", "recurrences"];

export const ANALYSIS_BLOCKS = [
  ["balance", "Balanço do mês"],
  ["categories", "Despesas por categoria"],
  ["flow", "Fluxo dos últimos 6 meses"],
  ["net", "Patrimônio em 12 meses"],
  ["pace", "Ritmo de gasto"],
  ["top", "Maiores gastos"],
  ["savings", "Taxa de poupança"],
  ["weekday", "Gastos por dia da semana"],
  ["fixed", "Fixas e variáveis"],
  ["links", "Relatórios e projeções"],
];
export const DEFAULT_ANALYSIS_HIDDEN = ["weekday", "fixed"];

// Destinos possíveis para atalhos e para o quarto botão.
export const DESTINATIONS = [
  ["analysis", "Análise", "bar-chart-2"],
  ["budgets", "Orçamento", "pie-chart"],
  ["goals", "Metas", "target"],
  ["projections", "Projeções", "trending-up"],
  ["recurrences", "Recorrências", "repeat"],
  ["installments", "Parcelamentos", "calendar"],
  ["financings", "Financiamentos", "home"],
  ["loans", "Empréstimos", "dollar-sign"],
  ["receivables", "Quem me deve", "users"],
  ["reports", "Relatórios", "file-text"],
  ["cashflow", "Fluxo de caixa", "activity"],
  ["accounts", "Contas", "briefcase"],
  ["cards", "Cartões", "credit-card"],
  ["assistant", "Assistente", "message-circle"],
  ["receipt", "Ler comprovante", "camera"],
];
export const DEFAULT_SHORTCUTS = ["budgets", "goals", "reports", "recurrences"];

// Ordem final de blocos: respeita a ordem salva e acrescenta blocos novos no fim.
export function orderedBlocks(all, saved, hiddenDefault) {
  const ids = all.map(([id]) => id);
  const list = (saved || []).filter((b) => ids.includes(b.id));
  for (const id of ids) if (!list.some((b) => b.id === id)) list.push({ id, visible: !hiddenDefault.includes(id) });
  return list.map((b) => ({ ...b, label: all.find(([id]) => id === b.id)[1] }));
}

export const layoutOf = (s) => ({
  home: orderedBlocks(HOME_BLOCKS, s.settings?.layout?.home, DEFAULT_HOME_HIDDEN),
  analysis: orderedBlocks(ANALYSIS_BLOCKS, s.settings?.layout?.analysis, DEFAULT_ANALYSIS_HIDDEN),
  shortcuts: s.settings?.layout?.shortcuts || DEFAULT_SHORTCUTS,
  tab4: s.settings?.layout?.tab4 || "analysis",
});

export function moveBlock(list, id, delta) {
  const i = list.findIndex((b) => b.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = list.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// H2 — primeiros passos derivados dos dados (nada a marcar à mão).
export function firstSteps(s) {
  const steps = [
    { id: "account", label: "Criar uma conta", done: s.accounts.length > 0 },
    { id: "expense", label: "Registrar o primeiro gasto", done: s.transactions.some((t) => t.type === "expense") },
    { id: "card", label: "Cadastrar um cartão (ou dizer que não usa)", done: s.cards.length > 0 || !!s.settings?.noCard },
    { id: "reminders", label: "Ligar lembretes de vencimento", done: !!s.settings?.reminders?.enabled },
  ];
  return { steps, done: steps.filter((x) => x.done).length, hidden: !!s.settings?.firstStepsHidden };
}
