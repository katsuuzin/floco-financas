# Inventário funcional — F1

Auditoria feita em 7 de novembro de 2026 no Kontto 1.0.83 (emulador Android 15, conta sem PRO, dados fictícios). Foram percorridas 87 telas, cada uma rolada até o fim, e abertos os formulários de lançamento, contrato, cartão, conta, categoria, tag, orçamento e meta. As capturas brutas ficam em `analysis/f1/`, que é local e não vai para o Git.

**Regra deste documento:** ele descreve *o que cada função faz*, com palavras nossas. Não é especificação de layout, texto ou marca. O Floco implementa tudo com a identidade dele, e as funções PRO do original entram livres.

**Status no Floco v1.1.1 + F0:** ✅ tem · 🟡 parcial · ❌ falta. Os status foram estimados pelo código e ainda serão confirmados ficha a ficha na F2.

## Status atual (v1.3.6)

As colunas "Floco" das tabelas abaixo guardam o diagnóstico da F1. Esta tabela é o estado atual, verificado por testes automatizados (139) e por uso no emulador.

| Situação | IDs |
|---|---|
| ✅ Feito | N1, N2, N3, L2, L3, L4, L5, L6, L7, L8, L9, L10, L14, O2, O3, P1, P4, P5, P6, A1, A2, D1, D2, D3, R1–R10, F2, F3, F4, F5, F6, F7, F8, S2, S3, S4, S5, S7, S8, S12, H1, H2, H4, **L1** (calculadora no valor), **O6** (ajustar saldo, 9/11), **L12** (calendário no extrato), **L13** (conta/cartão, categoria, tag, faixa de valor e ordem), **O4/O5** (ícone e cor), **P2/P3** (meta × caixinha, arquivar e movimento por mês), **S11** (lixeira de 30 dias), **F1** (PDF do Nubank e PDF genérico com conferência de saldo; testado com textos de exemplo, não com PDFs reais de outros bancos), **S1** (6 cores de destaque), **S10** (4 ícones: Solar, Grafite, Creme, Céu), **W1** (6 widgets: saldo, próximas contas, lançar rápido, botão +, faturas, orçamentos; links testados, aparência na tela inicial não conferida) |
| 🟡 Parcial | **L11** (o comprovante abre o leitor, não preenche o formulário aberto) · **O1** (reordenar por setas e arquivar; sem arraste nem relatório por conta) · **S6** (extrato e saldo; sem vibração ou teclado) · **S9** (backup criptografado sim; Drive e sincronização não) · **H3** (lembretes entram pelos primeiros passos) |
| ❌ Não feito | Da auditoria de 9/11 (fichas em `FICHAS-FUNCIONAIS.md`): **H5** (momento de progresso, opcional) |
| ✅ Feito (auditoria 9/11) | **C1**: categorias com subcategorias (catálogo do Kontto, migração, seletor Categoria › Sub), pendentes só com setas e folha de confirmação compacta (ficha C1) |
| ✅ Feito (auditoria 9/11) | **F4a**: confirmação de notificação com rendimentos, opção "Não registrar compras negadas" e selos de banco (ficha F4a; faltam tipos e palavras ignoradas por banco) |
| 🟡 Parcial (auditoria 9/11) | **P3a**: rendimento feito; faltam reserva de emergência, limite garantido e "já guardado" na criação |
| 🟡 Parcial (auditoria 9/11) | **D1a**: abatimento, histórico e prévia feitos; faltam editar contrato (reagendar, mudar total) e PDF |
| 🟡 Parcial (auditoria 9/11) | **P2a**: depósitos, previsão e concluir feitos; falta transformar em caixinha |
| 🟡 Parcial (auditoria 9/11) | **O3a**: mínimo, ajuste do total, análise e escolha da fatura feitos; faltam seleção de itens e faixa de competências |
| 🔎 Parcial, a confirmar | Da auditoria de 9/11: **O7** (detalhe da conta com Disponível), **O8** (relatório por conta/caixinha), **P1a** (detalhe e saldo previsto do orçamento), **F8a** (fatores e histórico da saúde), **S6a** (preferências por grupo), **H4a** (apresentação em 3 perguntas) |

**Duplicatas de notificação (1.3.5):** a mesma compra por app e SMS (até 10 min) ou em dois SMS iguais (até 5 min) aparece marcada como *possível duplicata*, sem descarte automático. Testado no emulador com SMS reais do console.

**Correção (1.3.6):** ao abrir, o app perdia preferências (bloqueio biométrico, layout, lembretes, extrato). Agora elas são mantidas; só o backup restaurado continua sem trazer o bloqueio.

Drive e sincronização (S9) precisam de um projeto OAuth do Google registrado em nome do dono do app. Isso não dá para criar sem a sua conta, por isso ficou de fora, e não é uma limitação técnica do app.

**Limite da auditoria:** telas atrás do paywall mostraram só a apresentação. Para elas, o comportamento foi deduzido das descrições visíveis e está marcado com *(PRO, deduzido)*. Nenhuma compra ou teste grátis foi iniciado.

## Dúvidas do plano de paridade, agora fechadas

- **Rótulo cortado no menu:** era *Importar comprovante*.
- **Empréstimos × Quem me deve:**
  - *Empréstimos* é a dívida com banco ou fintech: o usuário paga. Usa o mesmo cadastro de contrato do *Financiamento*; o campo Tipo escolhe financiamento ou empréstimo. A parcela pode ficar em aberto e receber juros por atraso.
  - *Quem me deve* (rota `personal-loans`) são valores a receber de pessoas: empréstimo dado, venda, conta rachada. Fica fora dos relatórios de gasto.
- **SMS e vales:** a leitura de SMS é feita pela *notificação* do app de mensagens, nunca pela caixa de SMS, e só de remetentes bancários. Vales/benefícios é a mesma captura, aplicada a cartões de benefício.

## Estrutura

- **N1 — Barra inferior** ✅🟡: Início, Transações, botão Adicionar, quarto botão configurável (padrão: Análise) e Mais. O que sai do quarto botão vai para Mais. *Floco: 5 destinos fixos; falta o quarto botão configurável.*
- **N2 — Menu Mais** 🟡: grupos Organizar (Contas, Cartões, Categorias, Tags), Planejar (Orçamento, Metas e Caixinhas, Projeções), Acompanhar (Recorrências, Parcelamentos, Financiamentos, Empréstimos, Quem me deve), Analisar (Relatório personalizado, Relatórios avançados) e Ferramentas (Assistente IA, Importar comprovante, Importar e exportar). Mais o atalho para Configurações.
- **N3 — Adicionar** 🟡: quatro ações (Receita, Despesa, Despesa no cartão, Transferir).

## Lançamentos

| ID | Função | Comportamento | Aceite | Floco |
|---|---|---|---|---|
| L1 | Despesa/Receita | Valor com teclado de cálculo; pago/recebido ou pendente; data com dia anterior/próximo; **horário**; descrição opcional; categoria/subcategoria; conta. | Pendente não altera saldo até confirmar; horário aparece no extrato. | 🟡 sem horário e sem teclado de cálculo |
| L2 | Despesa no cartão | Igual a L1, com cartão no lugar da conta; entra na fatura pelo fechamento. | Compra cai na fatura certa, inclusive no dia do fechamento (ver C3). | ✅ |
| L3 | Transferência | Conta de origem e destino; não conta como receita nem despesa. | Totais do mês inalterados. | ✅ |
| L4 | Repetição | Única, Parcelar (N vezes) ou Recorrente, direto no formulário. | Parcelas em centavos sem sobra; recorrente cria regra em R1. | 🟡 recorrência é feita em tela separada |
| L5 | Estorno/devolução | Marca o lançamento como devolução: abate o gasto da categoria nos relatórios. | Relatório da categoria diminui; saldo sobe. | ❌ |
| L6 | Contrato parcelado | Atalho do formulário que converte o lançamento em financiamento/empréstimo (D1). | Cria o contrato com as parcelas futuras. | ❌ |
| L7 | Alguém me deve | Atalho que lança o valor como recebível em Quem me deve (D3), fora dos relatórios de gasto. | Gasto não infla relatório; saldo a receber aparece. | 🟡 existe o módulo, falta o atalho |
| L8 | Observações e tags | Texto livre; várias tags. | Busca encontra pelas observações (L10). | ✅ |
| L9 | Ignorar na análise | Fica fora de relatórios e do balanço, mas continua no saldo e na fatura. | Saldo e fatura incluem; relatórios excluem. | ❌ |
| L10 | Salvar e continuar | Salva e reabre o formulário vazio para outro lançamento. | — | ❌ |
| L11 | Importar comprovante no formulário | Botão no topo do formulário que preenche os campos a partir de um comprovante (F3). | Campos preenchidos e revisáveis antes de salvar. | 🟡 OCR existe fora do formulário |
| L12 | Extrato (aba Transações) | Mês com navegação; busca por nome ou valor; filtros rápidos (Todas, Receitas, Despesas, Transferências); agrupado por dia; marcar como pendente direto na lista; atalho para o fluxo em calendário. | — | 🟡 sem calendário e sem marcar pendente na lista |
| L13 | Filtros do extrato | Contas, cartões, categoria, tags, faixa de valor e ordenação. | Contador de resultados correto. | 🟡 |
| L14 | Preferências de exibição | Busca nas observações; compras do cartão separadas; apenas efetivadas; pendentes em destaque; atrasadas no mês; caixinhas no extrato; mostrar categoria, subcategoria ou ambas; tags; observação; hora; saldo do período ou acumulado por dia. Essas preferências não são apagadas pelo "Limpar". | Cada opção altera a lista como descrito. | ❌ |

## Organizar

| ID | Função | Comportamento | Floco |
|---|---|---|---|
| O1 | Contas | Nome, tipo (corrente etc.), instituição, cor, saldo inicial e opção *fora do saldo total* (não soma no total nem nas projeções). Lista reordenável por arraste; saldo total com variação do mês; detalhe, relatório e arquivados. | 🟡 falta tipo, cor, reordenar, detalhe/relatório e arquivados |
| O2 | Cartões | Nome, bandeira/banco, conta de pagamento, fechamento, vencimento, limite opcional, 4 últimos dígitos, cor. **Vencimento em dia útil**, que pula fim de semana e feriado. **Compra no dia do fechamento vai para a próxima fatura**, como opção do usuário. Arquivados. | 🟡 falta dia útil, regra do dia de fechamento como opção, dígitos, cor e arquivados |
| O3 | Fatura | Aberta/fechada/paga, pagamento (inclusive parcial), relatório da fatura e **conferência com a fatura do banco** (C1). | 🟡 |
| O4 | Categorias | Despesa e receita separadas; subcategorias; nome, tipo, cor e ícone. Vêm com um conjunto inicial de cerca de 16 categorias com 3 a 5 subcategorias cada. | 🟡 falta ícone/cor e o conjunto inicial completo |
| O5 | Tags | Nome sempre em minúsculas, exibido como `#tag`; cor; prévia. | 🟡 falta cor |

## Planejar

| ID | Função | Comportamento | Floco |
|---|---|---|---|
| P1 | Orçamento | Valor; tipo (despesa ou **receita**, que funciona como meta de receita); nome; **várias categorias**; onde (todas as contas e cartões, ou seleção); cor e ícone; ciclo **mensal, quinzenal ou semanal**; dia de início do ciclo; opção de considerar no saldo previsto. Histórico de 6 ou 12 meses mostrando quantos ciclos fecharam dentro do teto. | 🟡 hoje é mensal, por categoria, sem histórico |
| P2 | Metas | Nome, valor-alvo, prazo opcional, cor e ícone. **Sem conta** = só acompanha o objetivo, sem reservar dinheiro. | 🟡 |
| P3 | Caixinhas | Meta **com conta** = reserva dinheiro dentro da conta. Depósito, retirada, transferência entre caixinhas, arquivadas e relatório. Opção de mostrar caixinhas no extrato. | 🟡 retirada/transferência chegaram na F0; falta arquivar e relatório |
| P4 | Projeção curto prazo | 30, 60 ou 90 dias. Saldo de hoje mais tudo que está agendado (recorrências, faturas abertas, pendentes das contas incluídas). Mostra o pior ponto (menor folga e quando), se fica no vermelho, a data final e eventos relevantes. Atalho "simular" o déficit. | 🟡 |
| P5 | Projeção médio prazo | 3, 6 ou 12 meses mantendo o ritmo atual; gráfico mensal; quanto do resultado é *contratado* e quanto é *estimado*; explicação do cálculo. | 🟡 falta a separação contratado/estimado |
| P6 | Simulador "e se" | Cenários (por exemplo, cortar uma despesa mensal) em 6, 12 ou 24 meses, comparando trajetórias, sem gravar nada. | 🟡 |

## Acompanhar

| ID | Função | Comportamento | Floco |
|---|---|---|---|
| A1 | Recorrências | Despesas e receitas com total por mês e por ano; ordenar por categoria, fonte ou data; visão em calendário. | 🟡 falta total anual e calendário |
| A2 | Parcelamentos *(PRO, deduzido)* | Todas as parcelas de cartões e contas mês a mês: quanto falta, quando a fatura alivia, se cabe mais uma compra. Filtros por data de entrada, situação e ordem. Simulador de compra parcelada. | 🟡 |
| D1 | Financiamentos | Parcela mensal (não o total); primeira data e dia fixo; nome; instituição; parcela atual de N; categoria; conta; cálculo **Parcela fixa** (padrão, sem taxa), **Price** (pede taxa, separa juros e amortização) ou **SAC** (pede taxa e saldo devedor, parcela decrescente). Dá para trocar o cálculo depois sem perder o histórico. Juros, seguros e saldo devedor opcionais. Cronograma, saldo devedor e quitação. | 🟡 falta SAC, a troca de cálculo e seguros |
| D2 | Empréstimos | Mesmo cadastro de D1 com tipo Empréstimo. Pagar em partes e lançar juros por atraso. | 🟡 |
| D3 | Quem me deve *(PRO, deduzido)* | Valor a receber por pessoa, com motivo, vencimento, recebimentos parciais e saldo por pessoa; fora dos relatórios de gasto. | ✅ implementado no 1.1.0 |

## Analisar

| ID | Função | Comportamento | Floco |
|---|---|---|---|
| R1 | Aba Análise | Mês com navegação; visões *No mês* e *Novos gastos*; balanço (receitas, despesas, saldo) com variação contra o mês anterior; gráfico por categoria com troca de tipo e subcategorias; fluxo dos últimos 6 meses; patrimônio em 12 meses; atalho para relatórios. Blocos opcionais: ritmo de gasto, maiores gastos, taxa de poupança, dia da semana, fixas × variáveis. | 🟡 |
| R2 | Relatório personalizado | Período (mês, ano, intervalo); situação; tipo; contas; categorias; tags; agrupar por (categoria × mês etc.); exportar. | ✅ |
| R3 | Relatório de faturas *(PRO)* | Total das faturas do mês por cartão, categoria ou tag. | ❌ |
| R4 | Fluxo de caixa *(PRO)* | Ano, com ou sem previstos; projeção de fechamento do ano; mês que mais tira e categoria responsável; tabela mês a mês (entrou, saiu, líquido, acumulado). Compras do cartão entram pelo vencimento. | ❌ |
| R5 | Resultado por categoria *(PRO)* | Entradas, saídas e saldo por categoria no período. | ❌ |
| R6 | Comparar períodos *(PRO)* | Mês, ano ou intervalo contra o anterior; entradas, saídas, resultado e despesas por categoria lado a lado. | ❌ |
| R7 | Despesas por dia da semana *(PRO)* | Em que dias se gasta mais no período. | 🟡 existe como agrupamento em R2 |
| R8 | Fixas × variáveis *(PRO)* | Recorrentes contra avulsos por período. | 🟡 existe como agrupamento em R2 |
| R9 | Previsto × realizado *(PRO)* | Orçado contra gasto, mês a mês. | 🟡 só o mês atual |
| R10 | Exportar *(PRO)* | PDF do período (contas, categorias, meses, transações); CSV mensal por conta; CSV de todas as transações. CSV com `;` no padrão pt-BR. | 🟡 CSV existe; falta PDF e a planilha por conta |

## Ferramentas e automação

| ID | Função | Comportamento | Floco |
|---|---|---|---|
| F1 | Importar extrato | OFX (recomendado), PDF do banco, CSV/Excel (com modelo), prints com OCR (último recurso). **Importar soma; restaurar substitui.** Tudo no aparelho. | 🟡 chegou na F0; validar no aparelho |
| F2 | Conferir fatura (C1) | Importa PDF (com ou sem senha), OFX/CSV ou prints da fatura e compara com o que já foi lançado: faltantes e divergências, antes de gravar. | ❌ |
| F3 | Importar comprovante | Galeria, câmera ou PDF; OCR; revisão antes de salvar. | 🟡 chegou na F0 |
| F4 | Notificações bancárias | Permissão de acesso a notificações; catálogo de cerca de 45 bancos, cada um com tipos (cartão, Pix, TED, boleto, saldo, cashback) e opção de desativar; palavras ignoradas; tela de recuperação quando o Android revoga o acesso. Sugestões pendentes para confirmar. | 🟡 chegou na F0 |
| F5 | SMS bancário | Liga/desliga; lê a notificação do app de SMS só de remetentes bancários; reaproveita bancos e palavras ignoradas de F4. | ❌ |
| F6 | Vales e benefícios *(PRO)* | Mesma captura para cartões de benefício (VR etc.). | ❌ |
| F7 | Categorização automática | Regras por tipo (despesa/receita) com curinga `*` e alternativas `\|`, ignorando acentos e pontuação; categoria>subcategoria; prioridade; campo de teste; prévia e aplicação no histórico antigo por escopo. Vem com cerca de 40 regras iniciais (apps de transporte, delivery, streaming, combustível, farmácia, mercado…). | ❌ |
| F8 | Assistente IA | Chave própria opcional (Gemini, OpenAI, OpenRouter), testar conexão, chave guardada só no aparelho. Insights do mês locais; saúde financeira com nota de 0 a 100, fatores e histórico; chat; resumo narrativo; plano de ação com 3 a 5 itens. | ❌ |

## Configurações

| ID | Função | Comportamento | Floco |
|---|---|---|---|
| S1 | Aparência | Tema sistema/claro/escuro; cores de destaque; botão + colorido. | 🟡 tem tema; as cores ficam na paleta Solar |
| S2 | Personalizar início | Reordenar e mostrar/ocultar blocos: receitas e despesas, assistente, metas de receita, sugestões, atalhos, pendências, notificações, contas, cartões, quem me deve, parcelamentos, recentes, orçamento, metas, caixinhas, assinaturas. | ❌ |
| S3 | Atalhos da tela inicial | Escolher e ordenar atalhos para módulos. | ❌ |
| S4 | Personalizar análise | Reordenar e mostrar/ocultar os blocos de R1. | ❌ |
| S5 | Quarto botão da barra | Escolher o módulo do quarto botão (N1), com prévia. | ❌ |
| S6 | Preferências | Extrato (L14); saldo e início (descontar o reservado nas contas); análise (parcelas mês a mês, fatura pelo vencimento); lançar (teclado numérico); vibração; idioma, moeda e formato de data; busca de ajuste; lista do que foi alterado. | 🟡 |
| S7 | Lembretes | Permissão; resumo diário do que vence (contas, faturas, recorrências) de manhã e/ou à noite, com horário; aviso de retorno após 3, 7, 14 ou 30 dias sem abrir; aviso de falta de backup; restaurar padrão. | ❌ |
| S8 | Segurança | PIN guardado no cofre do sistema, sem recuperação; biometria. | 🟡 SecurityPanel chegou na F0 |
| S9 | Backup e Sync | Drive com cópia diária e senha *(PRO)*; pontos de restauração; restaurar de arquivo; pasta do aparelho; exportar arquivo. Restaurar substitui toda a base. | 🟡 JSON sem criptografia |
| S10 | Ícone do app | Variantes de ícone alternativo. | ❌ (variações do mascote do Floco) |
| S11 | Manutenção | Apagar tudo (com confirmação); reabrir apresentação; reabrir os primeiros passos; **purgar a lixeira** (exclusão é lógica; registros ligados a lançamentos vivos ficam guardados). | 🟡 só "apagar tudo" |
| S12 | Feedback | Contato com a versão do app. | 🟡 (para o Floco: link do GitHub Issues) |

## Início e primeiros passos

| ID | Função | Comportamento | Floco |
|---|---|---|---|
| H1 | Início | Mês com navegação; saldo total com olho de ocultar; receitas e despesas do mês; blocos de S2; atalho "gerenciar tela inicial". | 🟡 |
| H2 | Primeiros passos | Checklist de 4 passos (conta, primeiro gasto, cartão ou "não uso cartão", leitura automática), com progresso e ocultar. | ❌ |
| H3 | Convite para lembretes | Cartão na Home oferecendo ativar lembretes, com "agora não". | ❌ |
| H4 | Apresentação | Boas-vindas, primeira conta, primeira transação, primeira meta e conclusão. | ❌ |
| W1 | Widgets | Seis widgets declarados no APK: lançar rápido, botão de lançar, saldo do mês, fatura, próximas contas e orçamentos. Não foram abertos nesta auditoria. | ❌ |

## Auditoria de 9/11/2026 (Kontto 1.0.83)

Inventário de rotas com REA: 117 telas, idênticas às do 1.0.82. 83 já tinham sido vistas na F1. Desta vez foram observadas, com dados fictícios, 15 das 19 que faltavam. As outras 4 são PRO ou não abrem sem apagar os dados do app. As fichas completas (regras, estados, edição/exclusão, persistência e aceite) estão em `FICHAS-FUNCIONAIS.md`. O status do Floco abaixo vem da leitura do código e ainda não foi testado.

| ID | Função | Resumo | Floco |
|---|---|---|---|
| O6 | Ajustar saldo | Informa o saldo real; a diferença vira receita, só ajuste (fora dos relatórios) ou transferência. | ✅ 9/11: `src/adjust.mjs`, 8 testes, conferido no emulador (receita, só ajustar e transferência) |
| O7 | Detalhe da conta | Disponível = saldo − reservado; ações relatório, ajustar e caixinha; extrato do mês com ordem e busca. | 🟡❔ |
| O8 | Relatório por conta/caixinha *(PRO, deduzido)* | Categorias, comparação com o mês anterior e PDF, filtrado pela conta. | 🟡 |
| P3a | Caixinha: rendimento e opções | Rendimento por valor ou saldo atual (soma à caixinha e ao saldo total, o Disponível fica igual); resgate volta ao Disponível; reserva de emergência; limite garantido no cartão; "já guardado" sai do saldo. | 🟡 rendimento ✅ 9/11 (6 testes, emulador, desfazer); faltam reserva de emergência, limite garantido e "já guardado" |
| P2a | Meta: depósitos e previsão | Depósitos com histórico, previsão em meses pela média, concluir/reabrir, transformar em caixinha. | 🟡 9/11: depósitos, previsão e concluir/reabrir ✅ (8 testes, emulador); falta transformar em caixinha |
| P1a | Orçamento: detalhe e previsto | Gráfico de 6 meses com teto, transações do ciclo; o que falta gastar sai do saldo previsto, sem desconto duplo. | 🟡❔ |
| O3a | Fatura por cartão | Três competências, pagamento mínimo, status parcial, ajustar total, análise por categoria/tag, forçar fatura anterior/próxima, parcela atual k de N. | 🟡 9/11: mínimo, ajustar total, análise e escolha da fatura ✅ (7 testes, emulador); faltam seleção de itens e faixa de 3 competências |
| D1a | Financiamento: detalhe | Editar com prévia e reagendamento; abater prazo/parcela com saldo editável e opção sem movimentar conta (FGTS); histórico de abatimentos; PDF. | 🟡 9/11: abatimento sem conta, saldo editável, histórico e prévia ✅ (8 testes, emulador); faltam editar contrato com reagendamento e PDF |
| F8a | Saúde financeira | Seis fatores (poupança, reserva, dívidas, orçamento, regularidade, fontes de renda); pontos fortes e a melhorar; histórico com atual, melhor, média e períodos. | 🟡 |
| S6a | Preferências por grupo | Prévia ao vivo; início do mês personalizado; "quem me deve" no saldo; parcelamento pelo total; cartão no mês de fechamento; orçamento pela fatura; caixinha no +; vibração por aba; moeda só símbolo; formato de data. | 🟡 |
| H4a | Apresentação | Banco (sem conexão), objetivos múltiplos, primeiro gasto; "já uso, restaurar". | 🟡❔ |
| H5 | Momento de progresso | Marco com dias de uso, lançamentos e contas quitadas, sem venda. | ❌ opcional |

## Fora do escopo

Paywall, ofertas, teste grátis, cupom, avaliação na loja, telas só de iOS, ferramentas de desenvolvedor e os identificadores ou serviços do original.

## Como este inventário vira trabalho

1. **F2 (fundação):** primeiro o modelo de dados, para comportar todos os IDs acima: tipo/cor/ícone/arquivado/ordem nas entidades, horário nos lançamentos, flags *estorno* e *ignorar*, exclusão lógica (lixeira), ciclos de orçamento, tipos de contrato e cálculo, e regras de categorização. Depois a navegação (N1 a N3) e a reorganização das telas.
2. **F3 a F6:** implementar por área. A coluna Floco passa a ✅ só com teste automatizado do comportamento e verificação no Android.
3. **F7:** repetir o aceite de cada ID no Floco.
