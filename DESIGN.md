# Floco — sistema visual Android

Finanças pessoais acolhedoras, legíveis e diretas. Nome e mascote definidos pelo usuário; layout novo. Skill aplicada: ui-ux-pro-max.

Buscas verificadas: Personal Finance Tracker em products.csv e Minimalism & Swiss Style como alternativa secundária. O resultado agregado de landing page/glassmorphism não foi adotado. Hierarquia simples, contraste e cores derivadas do ícone, componentes e alvos nativos.

Claro: fundo #FAF5EF, superfície #FFFFFF, texto #311E0D, secundário #705C4B, marrom #311E0D, destaque #FFCB45. Escuro: fundo #311E0D, superfície #402A17, texto #FFF5E8, secundário #D8C0A8, caramelo #F0C998, destaque #EAC15B. Texto sobre amarelo #311E0D. Estados monetários têm texto e ícone, além de cor.

Sora 400/600/700, números tabulares e moeda pt-BR. Cabeçalho com mascote em proporção quadrada. Saldo amarelo, entradas/saídas separadas, atalhos de entrada, saída e transferência. Planejamento alterna orçamentos e metas. Seu Floco reúne preferências, dados, recursos livres e atualizações.

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

Barra inferior (v1.2.0): Início, Transações, botão + central (Receita, Despesa, Despesa no cartão, Transferir), Análise e Mais. Contas, Cartões, Orçamento, Metas e Configurações abrem em pilha com voltar nativo. Alvos >=48dp, feedback pressionado sem deslocamento, áreas seguras, formulários integrais, retorno nativo e rolagem reiniciada por aba. Tema escuro independente. Atualizações públicas sem token, aviso de nova versão, progresso real, erros e confirmação do instalador. Contas com olho individual e opções separadas de ocultar saldo e incluir no total. Marca PNG preservada; controles Feather. Sem animações decorativas contínuas ou gráficos fictícios.
