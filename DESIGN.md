# Floco — sistema visual Android

Finanças pessoais acolhedoras, legíveis e diretas. Nome e mascote definidos pelo usuário; layout novo. Skill aplicada: ui-ux-pro-max.

Buscas verificadas: Personal Finance Tracker em products.csv e Minimalism & Swiss Style como alternativa secundária. O resultado agregado de landing page/glassmorphism não foi adotado. Hierarquia simples, contraste e cores derivadas do ícone, componentes e alvos nativos.

Claro: fundo #FAF5EF, superfície #FFFFFF, texto #311E0D, secundário #705C4B, marrom #311E0D, destaque #FFCB45. Escuro: fundo #311E0D, superfície #402A17, texto #FFF5E8, secundário #D8C0A8, caramelo #F0C998, destaque #EAC15B. Texto sobre amarelo #311E0D. Estados monetários têm texto e ícone, além de cor.

Sora 400/600/700, números tabulares e moeda pt-BR. Cabeçalho com mascote em proporção quadrada. Saldo amarelo, entradas/saídas separadas, atalhos de entrada, saída e transferência. Planejamento alterna orçamentos e metas. Seu Floco reúne preferências, dados, recursos livres e atualizações.

Tema escuro (v1.3.2): fundo #0E0E10, cartões #1D1D20, camadas #2A2A2E e divisórias #2E2E33. Texto #F4F4F2 e secundário #A3A3A8 (≈6,9:1). A ação e os destaques usam o amarelo Solar #FFCB45, com texto marrom #311E0D sobre ele; receitas em #8FD9A0 e despesas em #FF8A8A. Botões, campos e seletor segmentado em pílula; cartões com raio 22. Na barra, um traço amarelo marca a aba ativa e o botão + é redondo e amarelo. Inspirado na referência preto/cinza enviada pelo usuário, mantendo o tom de amarelo da marca.

Revisão de layout (v1.3.1, skill ui-ux-pro-max). A consulta de produto confirmou o tipo "Personal Finance Tracker". O estilo secundário recomendado, Minimalism/Swiss + Flat, foi adotado com a paleta Solar. A sugestão primária (glassmorphism, azul e fonte manuscrita) foi descartada por contrariar a identidade definida pelo usuário. Decisões:
- Escala de espaçamento 4/8 (`space` em `src/ui/kit.tsx`), gutter de 16dp e raios 10/14/18.
- Texto base 15/22 e secundário 12,5/18.
- Cabeçalho compacto: título só nas abas e mascote só na Início.
- Filtros numa fileira rolável de chips de 40dp, com hitSlop até 48dp.
- Tipo de lançamento em seletor segmentado; valor em destaque (`AmountField`) no topo do formulário; data e hora na mesma linha, com atalhos dia anterior / Hoje / próximo dia.
- Lançamentos em duas linhas (descrição; hora · categoria · conta), com selo de situação. A data só aparece fora do extrato agrupado por dia.
- Menus e configurações em listas agrupadas (`Group`/`Row`): um cartão por seção, com divisórias e ícone em quadro suave.
- Linhas de alternância tocáveis por inteiro, com papel `switch` para leitores de tela; ripple do Android em itens tocáveis.
- Conferido no emulador nos temas claro e escuro.

Barra inferior (v1.2.0): Início, Transações, botão + central (Receita, Despesa, Despesa no cartão, Transferir), Análise e Mais. Contas, Cartões, Orçamento, Metas e Configurações abrem em pilha com voltar nativo. Alvos >=48dp, feedback pressionado: afunda até 4% e volta; sem animação contínua nem decorativa; respeita remover animações, áreas seguras, formulários integrais, retorno nativo e rolagem reiniciada por aba. Tema escuro independente. Atualizações públicas sem token, aviso de nova versão, progresso real, erros e confirmação do instalador. Contas com olho individual e opções separadas de ocultar saldo e incluir no total. Marca PNG preservada; controles Feather. Sem animações decorativas contínuas ou gráficos fictícios.

Lista de compras (bloco da Início e tela própria). Mesmo kit e tokens do Floco, sem mascote nem cores do app de estudo. Bloco na Início: título "Lista de compras" com "Ver", cartão de superfície com raio 18, "N itens pendentes" em Sora semibold, estimativa à direita em semibold tabular com a legenda "estimado", até 3 itens e "e mais N", e "+" que abre a lista com o campo em foco; a área toda é um botão (≥72dp) com rótulo falado e respeita ocultar valores. Tela: resumo no topo, itens por categoria com caixa de marcar de 48dp (papel checkbox, estado falado) e lixeira de 48dp, itens no carrinho riscados em grupo próprio, edição inline, barra de adicionar fixa na base (fora da rolagem, acima do teclado) com botão redondo, "Desfazer" por 7s em vez de confirmação ao excluir, e "Registrar compra como despesa" como ação primária quando há itens no carrinho. Sem gesto de deslizar: toda ação tem botão. Crítica Impeccable (28/40) aplicada: estimativa em destaque, ação principal ao alcance do polegar, "Ver" no lugar de "Abrir", bloco por último na ordem padrão. Conferido no emulador nos temas claro e escuro.
