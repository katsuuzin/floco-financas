// Categorias e subcategorias (Categoria › Sub). O lançamento guarda `category` (a principal)
// e, opcionalmente, `subcategory`. Conjunto inicial no padrão do Kontto, por decisão do usuário.
// Sem imports: finance.mjs e planning.mjs dependem deste módulo.

// [nome, tipo, subcategorias]. "Outros" existe em despesa e receita: as subcategorias se juntam.
const RAW = [
  ["Moradia", "expense", ["Aluguel", "Condomínio", "Energia / Água / Gás", "Móveis / Eletrodomésticos", "Outros"]],
  ["Alimentação", "expense", ["Supermercado", "Restaurante", "Delivery", "Outros"]],
  ["Transporte", "expense", ["Combustível", "Manutenção", "Uber / 99", "Transporte Público", "Estacionamento / Pedágio", "Outros"]],
  ["Saúde", "expense", ["Plano de Saúde", "Medicamentos", "Consultas / Exames", "Outros"]],
  ["Educação", "expense", ["Escola / Faculdade", "Cursos Online", "Livros", "Outros"]],
  ["Lazer", "expense", ["Viagens", "Cinema / Eventos", "Hobbies", "Outros"]],
  ["Vestuário", "expense", ["Roupas", "Calçados", "Acessórios", "Outros"]],
  ["Cuidados Pessoais", "expense", ["Salão / Barbearia", "Cosméticos", "Higiene", "Outros"]],
  ["Assinaturas", "expense", ["Streaming", "Apps / Softwares", "Assinaturas de IA", "Outros"]],
  ["Serviços", "expense", ["Internet", "Celular", "Telefonia / TV", "Outros"]],
  ["Filhos / Dependentes", "expense", ["Escola", "Atividades Extracurriculares", "Mesada", "Outros"]],
  ["Pets", "expense", ["Ração", "Veterinário", "Pet Shop", "Outros"]],
  ["Impostos e Taxas", "expense", ["Imposto de Renda", "Taxas Bancárias", "IPTU", "Outros"]],
  ["Seguros", "expense", ["Seguro Vida", "Seguro Residencial", "Seguro Auto", "Outros"]],
  ["Presentes e Doações", "expense", ["Presentes", "Doações", "Contribuições", "Outros"]],
  ["Outros", "expense", ["Diversos", "Ajustes", "Outros"]],
  ["Salário", "income", ["CLT", "13o Salário", "PLR / Bônus", "Outros"]],
  ["Freelance / Autônomo", "income", ["Serviços Prestados", "Consultoria", "Projetos", "Outros"]],
  ["Investimentos", "income", ["Dividendos", "Juros / Rendimentos", "Venda de Ativos", "Outros"]],
  ["Renda Extra", "income", ["Vendas", "Cashback", "Restituição IR", "Outros"]],
  ["Aluguéis", "income", ["Imóvel Residencial", "Imóvel Comercial", "Outros"]],
  ["Outros", "income", ["Empréstimos Recebidos", "Devoluções", "Diversos", "Outros"]],
];

// Categorias do Floco anteriores à 1.6 que não estão acima: só aparecem se alguém as usa.
export const LEGACY_ROOTS = ["Mercado"];

const catalog = new Map();
for (const [name, type, subs] of RAW) {
  const prev = catalog.get(name);
  if (prev) {
    prev.types.add(type);
    for (const s of subs) if (!prev.subs.includes(s)) prev.subs.push(s);
  } else catalog.set(name, { name, types: new Set([type]), subs: [...subs] });
}
export const CATALOG = [...catalog.values()].map((c) => ({ name: c.name, types: [...c.types], subs: c.subs }));

const lc = (x) => String(x || "").toLocaleLowerCase("pt-BR");
const sameName = (a, b) => lc(a) === lc(b);

// Categorias ou subcategorias personalizadas (cadastro antigo: `parent` marca a subcategoria).
const customs = (s) => s.customCategories || [];
const usedRoots = (s) => {
  const used = new Set();
  const add = (v) => v && used.add(v);
  for (const t of s.transactions || []) add(t.category);
  for (const b of s.budgets || []) for (const c of b.categories?.length ? b.categories : [b.category]) add(c);
  for (const r of [...(s.recurrences || []), ...(s.financings || []), ...(s.rules || [])]) add(r.category);
  return used;
};

// Categorias principais disponíveis, na ordem do catálogo, depois as do usuário.
export function rootNames(s) {
  const own = customs(s).filter((c) => !c.parent).map((c) => c.name);
  const used = usedRoots(s);
  const legacy = LEGACY_ROOTS.filter((n) => used.has(n));
  return [...new Set([...CATALOG.map((c) => c.name), ...legacy, ...own])];
}

// Todas as opções de categoria para listas simples (orçamento, importação): principais e
// subcategorias criadas pelo usuário, como já era antes da 1.6.
export function categoryNames(s) {
  return [...new Set([...rootNames(s), ...customs(s).filter((c) => c.parent).map((c) => c.name)])];
}

// Subcategorias de uma categoria: as do catálogo e as criadas pelo usuário.
export function subsOf(s, category) {
  const base = CATALOG.find((c) => c.name === category)?.subs || [];
  const own = customs(s).filter((c) => c.parent === category).map((c) => c.name);
  return [...new Set([...base, ...own])];
}

// Árvore para o seletor. `type` ("expense" | "income") filtra o catálogo; o que o usuário
// criou ou já usa aparece sempre.
export function categoryTree(s, type) {
  const own = new Set(customs(s).filter((c) => !c.parent).map((c) => c.name));
  const keep = new Set([...own, ...usedRoots(s)]);
  return rootNames(s)
    .filter((n) => {
      const c = CATALOG.find((x) => x.name === n);
      return !type || !c || c.types.includes(type) || keep.has(n);
    })
    .map((name) => ({ name, subs: subsOf(s, name) }));
}

export function parentOf(s, name) {
  return customs(s).find((c) => c.name === name)?.parent || "";
}

// "Assinaturas › Streaming"
export const categoryLabel = (category, sub) => (sub ? `${category || "Outros"} › ${sub}` : category || "Outros");

// Um lançamento (ou regra) pertence a `name` se for a categoria dele ou a subcategoria dele.
export const inCategory = (t, name) => t.category === name || (!!t.subcategory && t.subcategory === name);

// Cadastro antigo guardava a subcategoria como se fosse categoria. Passa a guardar a principal
// em `category` e o nome em `subcategory`; orçamentos continuam achando o lançamento por
// `inCategory`. Idempotente; devolve o mesmo objeto se não há o que mudar.
export function migrateSubcategories(s) {
  const parents = new Map(customs(s).filter((c) => c.parent).map((c) => [c.name, c.parent]));
  if (!parents.size) return s;
  let changed = false;
  const fix = (r) => {
    const parent = parents.get(r.category);
    if (!parent) return r;
    changed = true;
    return { ...r, category: parent, subcategory: r.subcategory || r.category };
  };
  const next = {
    ...s,
    transactions: (s.transactions || []).map(fix),
    recurrences: (s.recurrences || []).map(fix),
    financings: (s.financings || []).map(fix),
    ...(s.rules ? { rules: s.rules.map(fix) } : {}),
  };
  return changed ? next : s;
}
