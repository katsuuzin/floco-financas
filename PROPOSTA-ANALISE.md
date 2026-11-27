# Proposta: nova aba Análise

27/11/2026. Base: Floco 1.15.1 no emulador (tema escuro, dados fictícios de um mês só). As 5 abas foram percorridas até o fim. Ideias de reforço vêm da tela de Análise e de Insights do PennyWise (só como inspiração, nada é copiado).

Ressalva: os dados de teste têm só novembro, então alguns vazios ("Sem gastos em outubro", barras iguais) aparecem pior do que apareceriam com um histórico real. Tema claro não foi conferido.

## O que está ruim hoje

1. **Não responde "como estou indo?".** O Resumo abre com um calendário de 30 quadradinhos quase idênticos que ocupa uma tela inteira. Os números que importam ficam acima, pequenos, e nada diz se o mês está bom ou ruim.
2. **O mesmo número aparece 3 a 4 vezes.** O gasto do mês (R$ 497,30) está no calendário, em "Gasto no mês", em "Gasto em NOV", na Categorias, na Tipos e na Mês. O balanço e as barras de 6 meses estão no Resumo e de novo na aba Mês.
3. **Abas que se sobrepõem.** "Resumo" e "Mês" (que é o "Resumo do mês") mostram quase a mesma coisa. "Tipos" (Variável/Fixo/Cortável/Guardado) exige que a pessoa classifique tudo; sem isso mostra 100% Variável e "Meta - definir".
4. **Três níveis de navegação.** Abas do topo, depois seletores em pílula (Categorias/Tags/Regras; Receitas/Despesas/Caixa/Projeção), depois botões só com ícone (seta, "i", lupa, "…") sem rótulo.
5. **Análise misturada com edição e atalhos.** "Editar categorias" e "Regras" dentro da Análise; "Atividade recente" repete o que já existe em Início e Transações.
6. **Defeito visível na aba Fluxo:** o valor R$ 3.812,00 quebra em duas linhas ("R$ 3.812,0" / "0") porque o botão "Adicionar receita" divide a linha com ele.
7. **Gráficos difíceis de ler.** Patrimônio em 12 meses são barras de mesma altura sem valor nem eixo. Meses futuros mostram barrinhas todas iguais de "previsto", que parecem ruído. Os títulos variam ("Gasto no mês", "Gasto em NOV", "Gasto em novembro").
8. **Nenhuma frase pronta.** Nada avisa que a fatura vence, que uma categoria subiu, que o orçamento está perto do limite.

## Como fica

**De 5 abas para 3:** Visão geral · Categorias · Fluxo. "Mês" some (entra na Visão geral). "Tipos" vira um agrupamento dentro de Categorias e só aparece se houver gastos classificados.

### Visão geral (de cima para baixo)
1. **Cartão do mês:** "Sobrou R$ X" (receitas − despesas), com uma etiqueta de comparação no mesmo ponto do mês anterior ("12% menos que até o dia 27 de outubro") e a taxa de poupança.
2. **"Pode gastar R$ X por dia"** até o fim do mês, já separando a fatura aberta. Se não houver base para calcular, o cartão some.
3. **Avisos (até 3)**, cada um com ícone e gravidade: fatura vencendo, orçamento acima de 80%, categoria que subiu em relação à média, gasto grande fora do padrão, assinatura que aumentou de preço. Tocar abre o item; dá para dispensar e desfazer.
4. **Gasto por mês** (últimos 6) com valor em cada barra e o mês atual destacado; sem barras de "previsto" quando não há base.
5. **Top categorias** com ícone, valor, % e barra. Tocar abre a lista das transações da categoria.
6. **Cartões:** um cartão compacto por cartão (fatura, vencimento, % do limite).
7. **Calendário de gastos:** recolhido por padrão ("Ver calendário"), com mapa de calor por dia em vez de quadrados iguais.

Saem: "Atividade recente" e o bloco duplicado de balanço.

### Categorias
Rosca menor, lista logo abaixo, filtro de tipo (despesa/receita) e agrupar por categoria, tag ou comerciante (Tipos entra aqui). Tocar numa categoria abre os lançamentos dela e permite recategorizar (detalhes na seção seguinte). "Editar categorias" e "Regras" saem para o menu "…" ou para Mais.

### Categorias: ver e recategorizar os gastos (pedido do usuário, 27/11)
Hoje, tocar numa categoria (por exemplo "Outros") só expande as subcategorias, e o lápis ao lado edita o limite da categoria. Não dá para ver quais lançamentos compõem o valor nem corrigir a categoria dali.

Como fica:
- Tocar na categoria (na lista ou na rosca) abre uma folha com **todos os lançamentos do mês naquela categoria**, ordenados por valor ou data, com busca. Cada linha mostra descrição, data, conta e valor.
- Tocar num lançamento permite **trocar a categoria e a subcategoria** ali mesmo, sem sair da Análise. Ao salvar, o item some da lista, o total e a rosca se atualizam, e aparece "Desfazer".
- Seleção em lote: marcar vários lançamentos e mover todos para outra categoria de uma vez (útil em "Outros", que costuma juntar muita coisa).
- Depois de recategorizar, perguntar "Sempre categorizar 'UBER*' como Transporte?" e, se aceitar, criar a regra de categorização automática (já existe em Mais > Regras) e oferecer aplicar aos lançamentos antigos.
- Os itens de uma nota fiscal dividida em itens também entram na lista (cada item é um lançamento) e podem ser recategorizados do mesmo jeito. Isso ajuda no caso real do backup de 27/11, em que 26 de 35 lançamentos estão em "Outros".
- O lápis do limite continua, mas passa a ter rótulo ("Limite") para não ser confundido com editar a categoria.

Reaproveita: a folha de edição de lançamento que já existe, a lista filtrada do extrato e as regras de `rules.mjs`. Não exige função de cálculo nova.

### Fluxo
Mantém Receitas / Despesas / Caixa / Projeção, com o valor principal em linha própria (corrige o defeito) e o botão "Adicionar receita" abaixo ou como ação no topo.

## Andamento (27/11/2026)

- **Passo 1: feito e conferido no emulador.**
- **Passo 2: feito e conferido** (cartão do mês, "pode gastar por dia", calendário recolhido). A aba **Mês** foi mantida porque guarda os blocos de "Personalizar análise".
- **Passo 3: avisos** — `src/alerts.mjs` (9 testes) e lista "Avisos" no Resumo, com gravidade, dispensar, restaurar e Desfazer.
- **Passo 4: categorias** — tocar numa categoria (lista ou rosca) abre a folha de lançamentos, com busca, ordem, subcategorias, seleção, mover em lote com Desfazer e sugestão de regra (`src/recategorize.mjs`, 7 testes). Sub-aba "Lugares" agrupa por comerciante (`merchantTotals`, 3 testes). A aba **Tipos** foi mantida: ela guarda metas por tipo de gasto que a pessoa já definiu.
- **Passo 5: conferência final — feita** em tema escuro e claro, fonte 1,6×, com o backup real de 27/11, com um backup com receitas e meses futuros e com TalkBack ligado (foco, duplo toque, árvore de acessibilidade e a fala escrita na tela). Ajustes que saíram dela: nota do orçamento sem "passou:" solto, aviso de categoria nova só com histórico, aviso "Seu mês com…" ignorando itens de nota fiscal, "Saldo nas contas" empilhado em fonte grande, texto de saldo negativo, "Selecionar todos" visível, rótulo dos botões sem vírgula e seletor de categoria que respeita receita × despesa. O que depende de celular físico está em `ROTEIRO-TESTE-ANALISE.md`.
