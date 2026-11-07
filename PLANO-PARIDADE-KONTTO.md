# Plano de equivalência funcional — Kontto → Floco Finanças

Estado em 6 de novembro de 2026. Base do Floco: v1.0.1 Solar marrom. Este documento é um inventário de diferenças e um plano de implementação, não uma declaração de que os recursos abaixo já foram entregues.

## Objetivo e decisões preservadas

Adicionar ao Floco as funções do Kontto verificadas no Android, incluindo as funções identificadas como PRO, sem criar assinatura, período de teste ou bloqueios comerciais no Floco. Manter nome, mascote, Solar marrom #311E0D, amarelo, dados locais e repositório agora público por solicitação do usuário. A chave de assinatura permanece exclusivamente no computador. Novos APKs precisam atualizar a instalação existente sem apagar dados.

## Evidências e limite da verificação

1. Imagem do menu Mais enviada pelo usuário: confirma os nomes visíveis e a organização dos grupos; não mostra todos os formulários ou configurações internas.
2. Código atual: App.tsx, src/finance.mjs, src/UpdatesPanel.tsx, README.md e testes. A análise confirma que o Floco atual é uma base funcional, mas não tem equivalência completa com o Kontto.
3. APK Kontto 1.0.82, versionCode 194, pacote com.finapp.app. SHA-256 51fb25a60a7abacfa0cba8d7813c2691fb993f03c3b98851b72fc7fa62d5ab14. REA gerou o inventário estático anterior. Strings do bundle indicam 139 referências semelhantes a rotas, incluindo 22 arquivos de layout, ofertas, desenvolvimento e funções iOS. Isso não significa 139 funções nem comprova que todas são acessíveis.
4. A instalação inicial do APK base falhou por falta de splits. Esse bloqueio foi resolvido com a instalação completa pela Play Store no emulador Android 15. O usuário entrou na conta Google. Foram percorridas 55 rotas do Kontto; os registros locais da auditoria ficam em analysis/, fora do GitHub e dos APKs.
5. Fontes oficiais consultadas: https://kontto.com.br/, https://kontto.com.br/privacidade/ e https://play.google.com/store/apps/details?id=com.finapp.app. Descrições oficiais confirmam recursos, mas não substituem os testes dentro do app.

O emulador usa pt-BR, fuso America/Sao_Paulo; o Kontto usa Português (BR), BRL e datas brasileiras. O catálogo brasileiro exibe Nubank e Inter sem distinguir PF/PJ. O Floco terá os quatro perfis independentes solicitados: Nubank PF, Nubank PJ, Inter PF e Inter PJ. Isso é organização local; não significa integração automática com os bancos. Categorias criadas anteriormente em inglês no original foram preservadas.

Algumas telas retornam oferta PRO: simulador, cadastro de Quem me deve e parte das personalizações/relatórios. O usuário confirmou em 6/11/2026 que não tem PRO e pediu recriação livre. Nenhuma compra ou teste foi iniciado. A implementação própria usa os conceitos financeiros e os controles observados; detalhes protegidos não são declarados idênticos ao original.

## Implementação incremental v1.1.0 (em validação)

O status da matriz abaixo descreve a base v1.0.1. Este incremento adiciona funções reais, ainda sem equivalência completa:

- Quatro perfis bancários PF/PJ, com saldos independentes e nomes editáveis.
- Categorias e subcategorias personalizadas; renomear atualiza vínculos de lançamentos, orçamentos, recorrências e contratos. Tags múltiplas e filtro por tag em relatórios.
- Recorrências de receitas/despesas: diária, semanal, 14 dias, mensal e anual; término opcional, pausa, edição e geração explícita de pendentes sem duplicatas. Alterar calendário após geração exige nova recorrência.
- Central de parcelas por mês e simulador Price com entrada, juros mensais e ajuste de centavos. Não inclui CET, IOF ou seguros não informados.
- Financiamentos e empréstimos a pagar com parcela fixa, parcelas anteriores já pagas e cronograma pendente; confirmação/estorno por lançamento. Amortização extraordinária, SAC, renegociação e saldo principal para liquidação ainda pendentes.
- Quem me deve: pessoa, motivo, valor, vencimento, recebimentos parciais por conta, quitação e estorno vinculado. O cadastro acompanha dívida já existente; não desembolsa dinheiro automaticamente. Retorno do principal afeta saldo, mas não infla receitas.
- Projeção de 30/60/90 dias, 6/12/24 meses, incluindo pendências, faturas e recorrências não geradas; cenário mensal sem gravação. Não presume recebimentos incertos de terceiros.
- Relatório com período, situação, tipo, conta/cartão, categoria e tag; agrupamento por categoria, mês, origem, dia da semana e fixas/variáveis; CSV filtrado e quadro do orçamento do mês atual. Comparação dedicada entre períodos, relatório de faturas e exportação PDF ainda pendentes.
- Pagamento parcial de fatura; validação de migração/restauração dos novos registros.

Verificação inicial: 23 testes financeiros e de atualização passaram, incluindo calendário de fim de mês, duplicatas, reconciliação de dívida, pagamento parcial e projeções sem contagem dupla. Compilação e teste das telas Android são requisitos antes de publicar este incremento.

## Constatações adicionais da auditoria Android

- Importação: OFX, extrato PDF, CSV/Excel e prints; importação soma, restauração substitui. Conferência deve permitir revisão antes de gravar.
- Importar comprovante é a opção cortada na imagem do menu, ligada a câmera/galeria e OCR.
- Notificações: catálogo de 45 bancos; captura de mensagens via notificações do app de SMS, sem ler a caixa completa de SMS. Benefícios/vales têm seção própria.
- Backup e Sync original usa Drive, senha e pontos de restauração. Não confundir esse fluxo com o backup JSON sem criptografia da base atual.
- Segurança, lembretes, categorização automática, atalhos/layout da home/análise, quarto botão e variantes de ícone exigem etapas próprias. Permissões devem ser pedidas no contexto da função.
- Todas essas etapas permanecem no planejamento; um item só muda para concluído depois de comportamento funcional, persistência e validação Android.

## Matriz inicial de diferenças

Legenda: **Parcial** = existe uma base, mas faltam acesso dedicado ou comportamentos importantes; **Ausente** = não implementado; **Verificar** = indicação estática ou rótulo incompleto exige confirmação no original. Nenhum módulo é marcado como equivalente apenas porque existe um botão.

| Área/opção do Kontto | Floco v1.0.1 | Trabalho necessário |
|---|---|---|
| Mais: grupos e atalhos completos | Parcial | Organizar, Planejar, Acompanhar, Analisar e Ferramentas com telas reais e acesso a todas as funções confirmadas. |
| Contas | Parcial | Lista dedicada, detalhes, histórico, relatório, arquivamento/restauração, tipos de conta e operações em lote. |
| Cartões de crédito | Parcial | Arquivamento, fatura aberta/fechada/paga, pagamento parcial, ajustes e relatórios; validar fechamento/vencimento nos dias 29–31. |
| Categorias e subcategorias | Parcial | A lista atual é fixa. Adicionar cadastro, edição, hierarquia, ícone/cor, arquivamento e migração sem perder vínculos. |
| Tags | Ausente | Cadastro/edição, múltiplas tags por lançamento e filtros de transações, recorrências e relatórios. |
| Orçamento | Parcial | Ciclos semanal/quinzenal/mensal a confirmar, histórico, subcategorias, origens/contas/cartões, limites e influência opcional nas projeções. |
| Metas | Parcial | Edição, prazo, histórico, conclusão, relatório e relacionamento com caixinhas. |
| Caixinhas/reservas | Parcial | Separar metas de reservas por conta; depósitos, retiradas, transferência de reserva, alvo opcional e arquivamento. |
| Projeções | Ausente | Curto/médio prazo, saldo previsto e simulação “e se”, sem alterar os lançamentos reais. |
| Recorrências/assinaturas financeiras | Ausente | Modelos de receita/despesa/transferência, frequência, próxima ocorrência, pausa, encerramento e geração sem duplicatas. |
| Parcelamentos | Parcial | Já divide compras em centavos. Falta central de parcelas, filtros, simulação, comprometimento futuro e regras para ajustes/antecipação. |
| Financiamentos | Ausente | Contrato, conta de pagamento, parcelas, saldo devedor e ajustes/amortizações conforme o fluxo observado no original. |
| Empréstimos | Ausente | Confirmar a distinção exata em relação a Financiamentos e Quem me deve; implementar o fluxo completo observado, sem misturar principal e receita. |
| Quem me deve | Ausente | Pessoas, valores a receber, prazo, recebimentos parciais, renegociação/ajustes e histórico. |
| Relatório personalizado | Ausente | Período, contas/cartões, categorias/subcategorias, tags, agrupamento, totais, visualização e exportação. |
| Relatórios avançados | Ausente | Comparação entre períodos, fluxo de caixa, orçado x realizado, fixo x variável, resultado por categoria, faturas e distribuição por dia da semana. Confirmar cada variante. |
| Painel Analisar | Ausente | Resumos e acesso aos relatórios, indicadores explicáveis e organização do painel. |
| Assistente IA | Ausente | Chat financeiro, resumo, dicas/plano de ação e saúde financeira/histórico; análise local e provedor opcional com chave própria. |
| Ferramenta parcialmente cortada no print | Verificar | Rótulo entre Assistente IA e Importar e exportar não será adivinhado; identificar dentro do original. |
| Importar e exportar | Parcial | Hoje há backup JSON/restauração e CSV de saída. Faltam importação CSV/OFX/PDF, revisão/mapeamento, deduplicação e exportações de relatórios. |
| Conferência de faturas | Ausente | Ler PDF/CSV/imagem, comparar valores/descrições/parcelas e apresentar faltantes/divergências antes de qualquer gravação. |
| Leitura de comprovantes/OCR | Ausente | Câmera/galeria, reconhecimento local, revisão de data/descrição/valor e anexo ao lançamento. |
| Notificações bancárias | Ausente | Permissão do Android, bancos, sugestões pendentes, revisão, duplicatas, ignorados e recuperação conforme o original. |
| SMS e comprovantes de notificações | Verificar | Há referências /notifications/sms e /notifications/vouchers; confirmar o uso antes de pedir permissões ou implementar leitura automática. |
| Categorização automática | Ausente | Regras locais, prioridade, palavras/padrões, revisão e preservação das escolhas do usuário. |
| Lembretes | Ausente | Preferências, vencimentos, recorrências e avisos antecipados, respeitando permissões e limites do Android. |
| PIN e segurança | Parcial | Há biometria e ocultação de valores. Falta PIN local, recuperação/alteração e revisão do bloqueio por inatividade. |
| Backup criptografado e histórico | Parcial | O JSON atual não é criptografado. Adicionar criptografia, validação, versões e restauração transacional. |
| Backup automático no Google Drive | Ausente | OAuth opcional, acesso restrito aos arquivos do app, política de retenção e recuperação verificável. |
| Sincronização entre dispositivos | Ausente | Modelo de mudanças, conflitos, exclusões, repetição segura e dados criptografados; não confundir com sobrescrever backup. |
| Aparência e personalização | Parcial | Temas existem. Conferir preferências, layout da home/análise, atalhos, posição de abas e opções de ícone. Preservar a marca Floco. |
| Widgets Android | Ausente | Configuração do APK declara: lançar rápido, botão de lançar, saldo do mês, fatura, próximas contas e orçamentos. Implementar e validar cada widget. |
| Primeiros passos | Parcial | Há estados vazios/demonstração. Falta conferir apresentação, criação de conta, primeira transação e primeira meta do original. |
| Manutenção, preferências e suporte | Parcial | Hoje há limpeza total. Conferir ferramentas reais de manutenção, preferências alteradas, idioma/moeda e ajuda/feedback. |
| Ofertas, paywall, assinatura e analytics do original | Excluído intencionalmente | Não copiar cobrança PRO, anúncios, identificação comercial ou credenciais do Kontto. As funções financeiras correspondentes serão livres no Floco. |
| Integrações específicas de iPhone | Fora do escopo Android | Não criar opções iOS que não funcionem no Android. Registrar separadamente para eventual projeto iOS futuro. |

## Etapa 0 — Abrir e auditar o original completo

Instalar pela Play Store ou usar todos os splits originais. Registrar versão exata. Percorrer cada aba, cada item de Mais e Configurações, formulários, detalhes, filtros, botões secundários e estados vazios. Usar dados fictícios em emulador isolado. Registrar tela, ação, campos, validações, regras, vínculo com saldo/fatura e resultado após reiniciar.

Cada recurso receberá um ID e uma ficha: evidência visual, fluxo normal, edição/exclusão, persistência, casos de borda, situação no Floco e teste de aceitação. Recursos do original que não puderem ser abertos terão essa limitação registrada; não serão declarados inspecionados. Não ativar compras/assinaturas ou usar dados financeiros pessoais para descobrir telas.

**Saída:** inventário fechado de rotas/ações aplicáveis ao Android, inclusive o rótulo cortado na imagem e a distinção entre os módulos de dívida.

## Etapa 1 — Fundação e organização

Separar o App.tsx em telas, componentes, domínio e repositórios tipados. Adotar navegação de pilha/abas com retorno nativo. Criar menu Mais completo por grupos, sem botões vazios. Um item só fica liberado na versão distribuída quando sua função está operacional.

Preparar persistência transacional, preferencialmente SQLite, com migração versionada do JSON atual. Categorias passam de nomes soltos a IDs; preservar nomes existentes, saldos, parcelas e vínculos. Adicionar categorias/subcategorias, tags, arquivamento e detalhes de contas/cartões. Manter os limites comerciais ausentes.

**Aceite:** instalação sobre v1.0.1; backup prévio; migração repetida não duplica dados; os saldos e reservas antigos permanecem iguais; falha permite retomar/restaurar. Alterar/remover categoria não perde transações antigas.

## Etapa 2 — Compromissos e automação financeira

Criar recorrências e a central de parcelamentos. Unificar ocorrências previstas e realizadas com identificadores estáveis. Tratar frequência e datas de fim de mês, atrasos, anos bissextos e mudança de período. Gerar ocorrências uma única vez, inclusive após reabrir o app ou restaurar um backup.

Implementar Financiamentos, Empréstimos e Quem me deve após confirmar os contratos de comportamento. Preservar a separação entre principal, juros/encargos, parcelas e recebimentos. Não presumir sistemas de amortização não confirmados no original. Implementar pagamentos/recebimentos parciais, ajustes, quitação e histórico conforme os fluxos documentados.

**Aceite:** uma parcela/pagamento só movimenta o saldo uma vez; pagar fatura não duplica despesa; devolver principal não vira salário/receita fictícia; editar uma ocorrência não altera outras sem escolha explícita. Testar centavos, datas e reversão de operações.

## Etapa 3 — Planejamento e análise

Ampliar orçamentos e separar metas de caixinhas. Criar projeções de curto/médio prazo e cenários “e se” a partir dos compromissos da etapa 2. Implementar relatórios personalizados/avançados e exportação. A base de cálculo (data da compra, vencimento, competência ou caixa) deve ser explícita e consistente.

**Aceite:** total exibido bate com os lançamentos do período; transferências não inflam receita/despesa; pagamento de cartão não é contado duas vezes; cenário simulado não modifica o livro real; valor reservado não desaparece nem é descontado duas vezes. Caixinhas admitem retirada e relatório.

## Etapa 4 — Entrada de dados e conciliação

Implementar CSV com mapeamento de colunas e codificação; OFX; PDFs e imagens conforme amostras reais/sintéticas. Adicionar revisão antes da confirmação, origem de importação e detecção de duplicatas. OCR local para comprovantes. Integrar serviço de notificações Android com fila de sugestões e regras de categorização. Criar lembretes após o motor de recorrências estar estável.

**Aceite:** importar o mesmo arquivo duas vezes não duplica silenciosamente; vírgula/ponto, débito/crédito, parcelas e datas são revisáveis; PDF com senha não exige guardar a senha; falhas de OCR nunca viram lançamentos definitivos sem confirmação; permissões negadas não bloqueiam o registro manual. Não depende de login bancário.

## Etapa 5 — Assistente, proteção, nuvem e widgets

Implementar indicadores locais explicáveis, histórico e assistente opcional. Sem chave ou rede, as funções financeiras continuam funcionando. Chave do provedor no SecureStore; consentimento antes de enviar dados e resumo agregado por padrão. Custos de serviços externos são separados de uma assinatura do Floco; não prometer IA online gratuita ilimitada.

Adicionar PIN, backup criptografado, histórico/restauração, Google Drive e sincronização opcional, com tratamento de conflitos. A chave de dados financeiros não será a chave de assinatura do APK. Implementar os seis widgets e personalizações confirmadas; cada ação leva ao registro/destino correto no app.

**Aceite:** desligar/revogar integrações preserva dados locais; backups abrem no dispositivo de destino com o mecanismo de recuperação definido; sincronização não perde edição/exclusão nem duplica lançamentos; widget atualiza após operação relevante e respeita ocultação/bloqueio.

## Etapa 6 — Conferência de equivalência e distribuição

Repetir no Kontto e no Floco os cenários documentados, comparando resultados funcionais, não apenas aparência. Verificar telas claras/escuras Solar marrom, fonte ampliada, TalkBack, teclado, retorno do sistema e estados vazios/erro. Fazer restauração, atualização de APK e teste offline. Assinar localmente com a mesma chave e publicar APK, hash e notas na release privada.

**Pronto somente quando:** todos os itens aplicáveis do inventário tiverem tela e fluxo funcional, teste/evidência, persistência e migração; cada diferença restante estiver explícita. O contador de testes da base atual não será usado como prova de que funções novas estão prontas. Uma lista de menus sem implementação não fecha esta etapa.

## Dependências e decisões abertas

- Instalação completa do Kontto e eventual login na Play Store: necessário para concluir a inspeção em execução.
- Rótulo cortado do print, empréstimos versus Quem me deve, detalhes de relatórios e preferências: confirmar no original.
- Provedor/chave de IA e configuração OAuth do Drive: necessários para integrações online, não para o núcleo offline.
- Não há equivalência garantida de backups do Kontto; importar de outro app exige formato/amostras verificáveis e revisão, nunca promessa de compatibilidade automática.
- Priorizar etapas 0–2 antes de gráficos e personalização: os recursos posteriores dependem de categorias, tags e compromissos corretos.

## Registro de execução

- [x] Inspecionar a imagem, o código atual e as evidências estáticas disponíveis.
- [x] Confirmar a causa da falha de instalação do APK base.
- [x] Extrair 139 referências semelhantes a rotas para orientar o inventário, sem tratá-las como telas já testadas.
- [ ] Instalar o original completo pela Play Store e percorrer as telas.
- [ ] Fechar o inventário de comportamentos e executar as etapas de implementação.

Nenhuma funcionalidade nova foi marcada como entregue apenas pela elaboração deste plano.

## Incremento 1.1.1
Ocultação de saldo por conta independente do olho global, inclusão opcional no saldo geral/projeções, atualização pública sem token e verificação automática em primeiro plano. A mudança de visibilidade do código não publica dados financeiros locais nem a chave de assinatura. O inventário de funções restantes continua válido.
