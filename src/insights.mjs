// F8 — insights e saúde financeira calculados no aparelho (sem rede).
// Cada fator explica de onde vem a nota; nada é "caixa-preta".
import {
  money,
  monthKey,
  addMonths,
  totals,
  totalBalance,
  analysisAmount,
  today,
} from "./finance.mjs";
import { normalizeBudget, budgetUsage, counts } from "./analysis.mjs";
import { contractStatus } from "./contracts.mjs";
import { projection } from "./planning.mjs";
import { reserved, includedAccounts } from "./finance.mjs";

export const LOCAL_QUESTIONS = [
  "Onde mais gastei este mês?",
  "Gastei mais que no mês passado?",
  "Quanto ainda posso gastar?",
  "Qual o resultado do mês?",
  "Como está minha poupança?",
  "Como está minha reserva de emergência?",
];
export function localSummary(s, ref = today()) {
  const month = monthKey(ref),
    t = totals(s, month);
  const count = s.transactions.filter(
    (x) => monthKey(x.date) === month && !x.ignored,
  ).length;
  if (!count)
    return `Não há lançamentos em ${month}. Registre ou importe movimentações para gerar o resumo.`;
  const categories = [...byCategory(s, month).entries()].sort(
    (a, b) => b[1] - a[1],
  );
  return `Em ${month}, as receitas confirmadas foram ${money(t.income)} e as despesas confirmadas ${money(t.expense)}. O resultado registrado é ${money(t.income - t.expense)}. Há ${money(t.pay)} a pagar e ${money(t.receive)} a receber nos registros do mês.${categories[0] ? ` A maior despesa por categoria foi ${categories[0][0]}, com ${money(categories[0][1])}.` : ""} Transferências e pagamentos de fatura não são somados novamente às despesas.`;
}
export function answerLocal(s, question, ref = today()) {
  const q = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const month = monthKey(ref),
    t = totals(s, month);
  if (/mes passado|gastei mais|compar/.test(q)) {
    const previous = totals(s, prev(month));
    const difference = t.expense - previous.expense;
    return `Despesas confirmadas em ${month}: ${money(t.expense)}. Em ${prev(month)}: ${money(previous.expense)}. ${difference === 0 ? "Os totais são iguais." : `${difference > 0 ? "Aumento" : "Redução"} de ${money(Math.abs(difference))}.`}${previous.expense === 0 ? " O período anterior não tem despesas confirmadas para uma comparação percentual." : ""}`;
  }
  if (/onde|categoria|mais gastei/.test(q)) {
    const top = [...byCategory(s, month).entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return top.length
      ? `Maiores despesas em ${month}: ${top.map(([name, value]) => `${name}: ${money(value)}`).join("; ")}.`
      : `Não há despesas confirmadas por categoria em ${month}.`;
  }
  if (/ainda posso|posso gastar|disponivel/.test(q)) {
    const next = addMonths(month + "-01", 1);
    const d = new Date(next + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    const end = d.toISOString().slice(0, 10);
    const conservative = {
      ...s,
      transactions: s.transactions.filter(
        (x) => x.confirmed || x.type !== "income",
      ),
      recurrences: (s.recurrences || []).filter((x) => x.type !== "income"),
    };
    const future = projection(conservative, end, { from: ref });
    const saved = includedAccounts(s).reduce(
        (n, a) => n + reserved(s, a.id),
        0,
      ),
      available = future.min - saved;
    return `Até o fim de ${month}, a menor folga estimada é ${money(available)}, descontando reservas e compromissos cadastrados nas contas incluídas, sem contar receitas ainda não confirmadas. ${available < 0 ? "Os registros indicam falta de saldo." : "Novos gastos ainda não registrados reduzem essa folga."}`;
  }
  if (/emergencia|reserva/.test(q)) {
    const goals = s.goals.filter((g) => /reserva|emerg[eê]ncia/i.test(g.name));
    return goals.length
      ? goals
          .map(
            (g) =>
              `${g.name}: ${money(g.saved)} de ${money(g.target)} (${Math.round((g.saved / g.target) * 100)}%).`,
          )
          .join(" ")
      : "Não há caixinha identificada como reserva ou emergência. Crie uma em Metas e caixinhas para acompanhar esse objetivo.";
  }
  if (/poupanca|econom|lucro|resultado|sobrou/.test(q))
    return `O resultado confirmado de ${month} é ${money(t.income - t.expense)}: receitas de ${money(t.income)} menos despesas de ${money(t.expense)}. Reservar em caixinhas não cria uma nova despesa.`;
  if (/resumo|mes|gasto|receita|despesa/.test(q)) return localSummary(s, ref);
  return "O assistente local responde pelos cálculos dos seus registros. Pergunte onde mais gastou, compare com o mês passado, consulte sua folga, resultado ou reserva. Para perguntas abertas, a IA online é opcional.";
}

const prev = (m, n = 1) => monthKey(addMonths(m + "-01", -n));
const pct = (n) => `${Math.round(n * 100)}%`;

function byCategory(s, month) {
  const map = new Map();
  for (const t of s.transactions)
    if (
      counts(t) &&
      t.confirmed &&
      t.type === "expense" &&
      monthKey(t.date) === month
    )
      map.set(t.category, (map.get(t.category) || 0) + analysisAmount(t));
  return map;
}

// Destaques do mês comparados com a média dos 3 meses anteriores.
export function monthInsights(s, month = monthKey(today())) {
  const out = [];
  const now = byCategory(s, month);
  const avg = new Map();
  for (let i = 1; i <= 3; i++)
    for (const [k, v] of byCategory(s, prev(month, i)))
      avg.set(k, (avg.get(k) || 0) + v / 3);
  for (const [cat, value] of now) {
    const base = avg.get(cat) || 0;
    if (!base && value >= 5000)
      out.push({
        kind: "new",
        weight: value,
        text: `${cat}: ${money(value)} neste mês, sem gastos nos 3 meses anteriores.`,
      });
    else if (base && value > base * 1.3 && value - base >= 5000)
      out.push({
        kind: "up",
        weight: value - base,
        text: `${cat} subiu ${pct(value / base - 1)} contra a média recente (${money(Math.round(base))}).`,
      });
  }
  for (const [cat, base] of avg) {
    const value = now.get(cat) || 0;
    if (base >= 5000 && value < base * 0.7)
      out.push({
        kind: "down",
        weight: base - value,
        text: `${cat} caiu ${pct(1 - value / base)} contra a média recente.`,
      });
  }
  const t = totals(s, month);
  if (t.income && t.expense > t.income)
    out.push({
      kind: "alert",
      weight: 1e12,
      text: `As despesas do mês (${money(t.expense)}) já passaram das receitas (${money(t.income)}).`,
    });
  for (const b of s.budgets
    .map(normalizeBudget)
    .filter((x) => x.type === "expense")) {
    const u = budgetUsage(
      s,
      b,
      month === monthKey(today()) ? today() : `${month}-28`,
    );
    if (u.used > u.limit)
      out.push({
        kind: "budget",
        weight: 1e11,
        text: `O orçamento ${b.name || b.categories.join(", ")} passou ${money(u.used - u.limit)} do teto.`,
      });
  }
  return out.sort((a, b) => b.weight - a.weight).slice(0, 6);
}

// Nota de 0 a 100 com fatores ponderados. Usa os 3 últimos meses fechados.
export function healthScore(s, ref = today()) {
  const month = monthKey(ref);
  let income = 0,
    expense = 0;
  for (let i = 1; i <= 3; i++) {
    const t = totals(s, prev(month, i));
    income += t.income;
    expense += t.expense;
  }
  const monthlyExpense = expense / 3;
  const factors = [];
  const add = (id, label, score, weight, detail) =>
    factors.push({
      id,
      label,
      score: Math.max(0, Math.min(1, score)),
      weight,
      detail,
    });

  const savings = income ? (income - expense) / income : 0;
  add(
    "savings",
    "Taxa de poupança",
    savings / 0.2,
    30,
    income
      ? `Você guardou ${pct(Math.max(0, savings))} da renda nos últimos 3 meses (referência: 20%).`
      : "Sem receitas registradas nos últimos 3 meses.",
  );

  const balance = totalBalance(s);
  const months = monthlyExpense
    ? balance / monthlyExpense
    : balance > 0
      ? 6
      : 0;
  add(
    "reserve",
    "Reserva de emergência",
    months / 6,
    25,
    monthlyExpense
      ? `O saldo cobre ${months.toFixed(1).replace(".", ",")} meses de gastos (referência: 6).`
      : "Sem gastos recentes para comparar.",
  );

  const debts = (s.financings || [])
    .filter((f) => !f.archived)
    .reduce((n, f) => {
      try {
        const st = contractStatus(s, f.id);
        return n + (st.next ? st.next.amount : 0);
      } catch {
        return n;
      }
    }, 0);
  const debtRatio = income ? debts / (income / 3) : debts ? 1 : 0;
  add(
    "debt",
    "Comprometimento com parcelas",
    1 - debtRatio / 0.3,
    20,
    income
      ? `Parcelas de contratos usam ${pct(debtRatio)} da renda mensal (referência: até 30%).`
      : debts
        ? "Há parcelas sem renda registrada."
        : "Sem contratos ativos.",
  );

  const budgets = s.budgets
    .map(normalizeBudget)
    .filter((b) => b.type === "expense");
  let within = 0,
    total = 0;
  for (const b of budgets)
    for (let i = 1; i <= 3; i++) {
      const u = budgetUsage(s, b, `${prev(month, i)}-28`);
      total++;
      if (u.used <= u.limit) within++;
    }
  add(
    "budget",
    "Orçamentos respeitados",
    total ? within / total : 0.5,
    15,
    total
      ? `${within} de ${total} ciclos recentes ficaram dentro do teto.`
      : "Crie orçamentos para medir este fator.",
  );

  const overdue = s.transactions.filter(
    (t) => !t.confirmed && t.type === "expense" && !t.cardId && t.date < ref,
  ).length;
  add(
    "overdue",
    "Contas em dia",
    overdue ? Math.max(0, 1 - overdue / 5) : 1,
    10,
    overdue
      ? `${overdue} pendência(s) com data passada.`
      : "Nenhuma pendência atrasada.",
  );

  const score = Math.round(factors.reduce((n, f) => n + f.score * f.weight, 0));
  const level =
    score >= 80
      ? "Ótima"
      : score >= 60
        ? "Boa"
        : score >= 40
          ? "Atenção"
          : "Crítica";
  const weakest = [...factors]
    .sort((a, b) => a.score * a.weight - b.score * b.weight)
    .slice(0, 3);
  return { score, level, factors, month, weakest };
}

// Plano de ação local (3 a 5 itens) a partir dos fatores mais fracos e dos insights.
export function actionPlan(s, ref = today()) {
  const h = healthScore(s, ref);
  const tips = {
    savings:
      "Defina um valor fixo para guardar logo que a renda entrar, numa caixinha.",
    reserve: "Monte uma caixinha de reserva até cobrir 6 meses de gastos.",
    debt: "Evite novas parcelas e avalie amortizar o contrato com maior juros.",
    budget:
      "Revise os tetos que estouram com frequência ou o que os está empurrando.",
    overdue:
      "Confirme ou reagende as pendências atrasadas para o saldo previsto ficar fiel.",
  };
  const plan = h.weakest
    .filter((f) => f.score < 0.9)
    .map((f) => ({ title: tips[f.id], why: f.detail }));
  for (const i of monthInsights(s, monthKey(ref))
    .filter((x) => x.kind === "up" || x.kind === "budget")
    .slice(0, 2))
    plan.push({
      title: "Olhe com atenção: " + i.text,
      why: "Destaque do mês.",
    });
  if (plan.length < 3)
    plan.push({
      title:
        "Continue registrando tudo: a análise fica mais precisa com dados completos.",
      why: "Hábito.",
    });
  return plan.slice(0, 5);
}

// Resumo agregado para enviar a um provedor de IA (sem descrições nem nomes de contas).
export function aiContext(s, ref = today()) {
  const month = monthKey(ref);
  const t = totals(s, month);
  const cats = [...byCategory(s, month).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const h = healthScore(s, ref);
  return [
    `Mês ${month}. Receitas ${money(t.income)}, despesas ${money(t.expense)}, a pagar ${money(t.pay)}, a receber ${money(t.receive)}.`,
    `Saldo total ${money(totalBalance(s))}.`,
    `Despesas por categoria: ${cats.map(([k, v]) => `${k} ${money(v)}`).join("; ") || "nenhuma"}.`,
    `Saúde financeira ${h.score}/100 (${h.level}). ${h.factors.map((f) => `${f.label}: ${f.detail}`).join(" ")}`,
    `Orçamentos: ${
      s.budgets
        .map(normalizeBudget)
        .map(
          (b) => `${b.name || b.categories.join("/")} teto ${money(b.amount)}`,
        )
        .join("; ") || "nenhum"
    }.`,
    `Metas: ${s.goals.map((g) => `${g.name} ${money(g.saved)} de ${money(g.target)}`).join("; ") || "nenhuma"}.`,
  ].join("\n");
}
