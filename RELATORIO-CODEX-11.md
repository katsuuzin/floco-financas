# Relatório do pacote 11 do Floco Finanças


## 1. Modo compra
- Arquivos: `src/screens/ShoppingTripScreen.tsx`, `tests/security/screens-contract.test.mjs`.
- Campos novos: nenhum. Sessão e limite continuam nas chaves locais existentes.
- A tela usa o modelo do Modo compra para o resumo, as linhas e o fechamento. Limite inválido mantém a edição aberta e tem mensagem anunciada junto ao campo.
- Emulador: defina R$ 100,00, tente salvar `-5` e confirme que o limite anterior permanece. Marque um item e confira total, fala e aviso de despesa parecida. Saia e volte antes de três horas para conferir a sessão.
- Pendente: conferir foco, fala e os dois temas no Android.


## 2. Filtros e calendário do extrato
- Arquivos: `src/screens/TransactionsScreen.tsx`, `tests/statement-filter.test.mjs`, `tests/security/screens-contract.test.mjs`.
- Campo opcional: `settings.display.statementFilter`. A tela sanitiza a preferência na leitura e usa filtros vazios no backup antigo.
- O painel mostra contas, cartões, categorias, tags, tipos e valores. Lista e calendário compartilham o mesmo filtro e mês. Tocar um dia mostra seus totais e lançamentos.
- Emulador: filtre duas contas e uma tag, toque Aplicar, alterne para o calendário e toque um dia. Confira os mesmos lançamentos, reinicie e verifique o filtro. Toque Limpar para voltar ao mês inteiro.
- Decisão: preservar cartão, categoria e ordenação do painel anterior e salvar só ao aplicar. A grade rola horizontalmente quando sete alvos de 48 dp não cabem.
- Pendente: teclado, grade e fonte ampliada no Android.


## 3. Calculadora no campo de valor
- Arquivos: `src/ui/kit.tsx`, `tests/security/screens-contract.test.mjs`.
- Campos novos: nenhum.
- O campo mostra a prévia e o botão Calcular quando recebe uma expressão. O teclado de cálculo aceita parênteses e operadores, e anuncia erros de entrada.
- Emulador: calcule `(10+5)/3` e confirme R$ 5,00 no formulário. Digite `1/0` e confira a mensagem. Feche a calculadora, substitua por `12,50` e salve.
- Decisão: o resultado só substitui a expressão após Calcular, para uma conta incompleta não registrar um valor intermediário.
- Pendente: teclado, toque e fala no Android.


## 4. Lixeira
- Arquivos: `src/screens/TrashScreen.tsx`, `src/app/store.tsx`, `tests/security/screens-contract.test.mjs`.
- Nova chave local: `floco.trashPurgeDay`, fora dos backups. Chave ausente ou inválida provoca uma verificação ao abrir.
- A purga por idade e capacidade roda na abertura, uma vez por dia. A restauração explica quando um vínculo está ausente ou um identificador já existe. Esvaziar confirma a quantidade.
- Emulador: abra uma massa fictícia com um item de 31 dias, um recente e um de data inválida. Confira que o primeiro sai, restaure o recente e confirme a contagem antes de esvaziar.
- Pendente: simulação de virada do dia e anúncio dos diálogos no aparelho.


## 5. Contas
- Arquivos: `OrganizeScreens.tsx`, `FormScreen.tsx`, `HomeScreen.tsx`, `ImportsPanel.tsx`, `NotificationsPanel.tsx`, `ReceiptPanel.tsx`, `src/finance.mjs` e testes.
- Campos opcionais: `accounts[].order` e `accounts[].archived`. Backup antigo mantém a ordem de origem. Campos inválidos são descartados.
- Reordenação por botões, contas arquivadas em seção recolhida e bloqueios de cartão e lançamento futuro. O histórico continua disponível e o saldo total exclui contas arquivadas.
- Emulador: mova duas contas, arquive uma sem vínculo, desarquive e confira seletores, saldo e extrato antigo. Tente arquivar uma conta ligada a cartão.
- Decisão: exigir confirmação separada quando só o saldo impede o arquivamento. Cartão ou lançamento futuro continuam bloqueando.
- Pendente: disposição das ações e leitura dos bloqueios no Android.


## 6. Metas e caixinhas
- Arquivos: `OrganizeScreens.tsx`, `finance.mjs`, `app/store.tsx` e testes.
- Campos opcionais: `pots` e `goals[].potId`. A migração conserva depósitos, histórico e centavos, com teste de ida e volta e de dados inválidos.
- Abas Metas e Caixinhas, com vínculo opcional, depósito, retirada e arquivamento com destino do saldo.
- Emulador: restaure backup antigo com R$ 2,00 reservados, confira o saldo disponível e a meta vinculada. Deposite, retire e arquive para outra caixinha ou conta.
- Decisão: quando vinculada, a meta exibe o progresso da caixinha e mantém o progresso manual guardado para desvinculação.
- Rendimento, desfazer rendimento, transferência parcial e edição do nome também estão nas caixinhas. O teste de rendimento cobre a ida e a volta da reserva sem alterar a meta vinculada.
- Pendente: operações e foco no Android.


## 7. Ícone e cor
- Arquivos: `PlanningPanel.tsx`, `CategoryIcon.tsx`, `pickers.tsx`, linhas do extrato e orçamento, `finance.mjs` e testes.
- Campo opcional: `tags[].icon`. A restauração sanitiza estilos e mantém o restante do registro.
- Ícones e cores podem ser escolhidos em categorias e tags. A prévia aplica contraste e as escolhas aparecem no orçamento, no extrato e nos filtros.
- Emulador: escolha ícone e cor para Mercado e uma tag, salve, abra um lançamento, um orçamento e o filtro. Restaure um backup antigo e confira os padrões.
- Decisão: os editores oferecem a lista fechada do pacote. Aparências legadas reconhecidas continuam visíveis. Valores desconhecidos usam o padrão por nome.
- Pendente: conferir contraste percebido e prévia nos dois temas.


## 8. Notificações duplicadas

- Arquivos — `src/app/inbox.ts` e `src/screens/HomeScreen.tsx` (a caixa de entrada é renderizada na Início).
- Campos novos — chave local `floco.bankNotificationSeen`, fora do backup. Leitura sem chave e armazenamento inválido começam vazios. Até 500 assinaturas, com expiração.
- Para o usuário — avisos iguais vindos por SMS e push na janela de dois minutos aparecem no contador e em “Ver duplicadas”. É possível revisar e registrar pelo fluxo normal. Avisos do mesmo canal seguem na fila.
- Emulador — envie o mesmo aviso por dois canais. Confira uma pendência e uma duplicada revisável. Envie duas compras iguais com três minutos de intervalo e confira ambas na fila.
- Decisões — o agrupamento mantém as notificações originais na fila nativa para recuperação. O armazenamento de assinaturas é independente do backup.
- Não verificado — captura nativa e TalkBack no Android.


## 9. Despesas por categoria

- Arquivos — `ShoppingTripScreen.tsx`, `ShoppingScreen.tsx`, `FormScreen.tsx`, `src/app/nav.tsx` e `src/app/forms.ts`.
- Campos novos — nenhum. A rota de revisão carrega o carrinho em memória.
- Para o usuário — a lista e o Modo compra permitem registrar uma despesa ou dividir por categoria. A revisão mostra itens sem preço, conta, categorias, valores e possíveis duplicatas. O lote é salvo em uma gravação e pode ser desfeito inteiro na tela de revisão.
- Emulador — marque alimentos e produtos de limpeza com preço. Divida, edite uma categoria e um valor, e confira o total. Salve e veja as despesas no extrato. Volte à revisão e teste desfazer antes de tocar em Concluir.
- Decisões — a maior das outras despesas absorve a diferença de um valor editado. A revisão preserva a sessão do Modo compra ao cancelar. Contas referenciadas por depósitos migrados também passaram a ser protegidas da exclusão.
- Não verificado — navegação e edição pelo teclado no aparelho.


## 10. Recorrentes, promoções, receitas e XML

- Arquivos — `ShoppingScreen.tsx`, `ShoppingPastePanel.tsx`, `ScanNotaScreen.tsx`, `shopping.mjs`, `shoppingData.mjs`, `shoppingTrip.mjs`, `shoppingSpeech.mjs`, `finance.mjs` e `tests/shopping.test.mjs`.
- Campos novos — `shoppingStaples`, `shoppingItems[].staple`, `everyDays` e `deal`. O registro recorrente guarda `lastRestockedAt`. Backup antigo mantém recorrentes locais ao restaurar. Opções inválidas são descartadas na leitura.
- Para o usuário — Editar item abre uma folha com recorrência e promoção. Ao limpar o carrinho começa o intervalo do item recorrente. Em Colar lista, o modo receita ajusta as quantidades pelas porções. Ler nota aceita XML local com prévia e confirmação.
- Emulador — salve três unidades com “Leve 3, pague 2” e confira os totais. Compre e limpe um item recorrente, depois avance o relógio do emulador além do intervalo e reabra a lista. Cole uma receita de duas porções para quatro. Abra um XML de teste em modo avião e confira o histórico após salvar.
- Decisões — item recorrente volta sem preço ou promoção da compra anterior. XML em cache é removido após a leitura. O arquivo tem limite de 1,5 MB antes da leitura e continua sujeito aos limites do parser.
- Não verificado — seletor de documentos do Android e uso real da folha com teclado.


## 11. Listas múltiplas, desfazer e reposição

- Arquivos — `ShoppingScreen.tsx`, `ShoppingTripScreen.tsx`, `ShoppingPastePanel.tsx`, `RestockList.tsx`, `shopping.mjs`, `shoppingData.mjs`, `finance.mjs`, `store.tsx`, `notify.ts` e `tests/shopping.test.mjs`.
- Campos novos — `shoppingLists`, `shoppingListId`, `shoppingListTemplates` e `shoppingRunOutAlerts`. A associação usa o `listId` já existente. Backups antigos ganham Minha lista ao abrir, com alertas desligados. O histórico de desfazer fica em memória.
- Para o usuário — selecione, crie, renomeie, exclua e recupere listas. Modelos criam outra lista a partir de uma cópia. Desfazer e Refazer percorrem até 20 etapas. “Está acabando” usa o histórico local para sugerir reposição, comparar lojas e mostrar variação de preços.
- Emulador — crie duas listas com itens marcados. Limpe o carrinho da segunda e confira que a primeira segue intacta. Desfaça e refaça. Crie uma lista a partir de um modelo. Com histórico fictício, ligue o aviso e confira a agenda local.
- Decisões — Excluir arquiva a lista para permitir recuperação. Avisos precisam ser ligados e autorizados, com até três notificações planejadas para o próximo horário local das 9 h.
- Não verificado — entrega de notificações locais e persistência no SQLite do Android.


## 12. Acessibilidade e textos

- Arquivos — `ShoppingScreen.tsx`, `ShoppingTripScreen.tsx`, `ShoppingPastePanel.tsx`, `ScanProductScreen.tsx`, `ScanNotaScreen.tsx`, `NfceConsultaScreen.tsx`, `PurchasesScreens.tsx`, `TransactionsScreen.tsx`, `HomeScreen.tsx`, `FormScreen.tsx`, `App.tsx`, `ui/kit.tsx`, `ui/pickers.tsx`, `shoppingData.mjs`, `nfce.mjs` e os dois testes estáticos de segurança e as expectativas dos testes de mensagens fiscais e de backup.
- Campos novos — nenhum.
- Para o usuário — a lanterna informa o estado de alternância. As buscas, a colagem e a leitura de notas anunciam o andamento. Os rótulos das compras e do carrinho incluem valores uma vez e respeitam o modo de ocultar. Nomes podem quebrar em linhas e seletores segmentados empilham com fonte ampliada.
- Emulador — com TalkBack, abra e feche Colar lista, Editar item e Filtros do extrato. Mova um item para o carrinho e confira anúncio e foco. Verifique as duas lanternas, a prévia da nota e a busca de produtos. Em 200%, confira nomes longos, preços e opções nos dois temas.
- Decisões — a conferência da nota e a verificação de item repetido respeitam a lista selecionada. O texto de recusa da SEFAZ só é aceito com o mesmo endereço e a mesma chave.
- Não verificado — posição de foco, anúncios do TalkBack e renderização a 200% em aparelho, além do comportamento da página real da SEFAZ.

## Resumo final

| Tarefa | Status | Arquivos principais | Campos de dados novos | Risco ou verificação pendente |
| --- | --- | --- | --- | --- |
| 1. Modo compra | Validada | ShoppingTripScreen | — | Sessão, som e TalkBack no Android |
| 2. Extrato | Validada | TransactionsScreen | `settings.display.statementFilter` | Foco dos filtros, teclado e grade em fonte ampliada |
| 3. Calculadora | Validada | ui/kit | — | Teclado de operadores no Android |
| 4. Lixeira | Validada | TrashScreen, app/store | Chave local `floco.trashPurgeDay` | Purga na abertura após a virada do dia |
| 5. Contas | Validada | OrganizeScreens, FormScreen, HomeScreen, formulários de importação, finance | `accounts[].order`, `accounts[].archived` | Confirmações e seletores no aparelho |
| 6. Metas e caixinhas | Validada | OrganizeScreens, app/store, finance, storage | `pots`, `goals[].potId` | Restaurar uma reserva antiga e conferir os movimentos no Android |
| 7. Estilos | Validada | PlanningPanel, CategoryIcon, pickers, TransactionsScreen, TransactionRow, OrganizeScreens, finance | `tags[].icon` | Prévia de cores nos dois temas |
| 8. Duplicatas | Validada | app/inbox, HomeScreen | Chave local `floco.bankNotificationSeen` | Captura nativa de SMS e push |
| 9. Lote de despesas | Validada | ShoppingScreen, ShoppingTripScreen, FormScreen, app/nav, app/forms | Rascunho em memória | Edição, navegação e desfazer no aparelho |
| 10. Recorrência, promoções, receita e XML | Validada | ShoppingScreen, ShoppingPastePanel, ScanNotaScreen, shopping, shoppingData, shoppingTrip, shoppingSpeech, finance | `shoppingStaples`, `staple`, `everyDays`, `deal`, `lastRestockedAt` | Seletor de arquivos e edição em folha no Android |
| 11. Listas e reposição | Validada | ShoppingScreen, ShoppingTripScreen, ShoppingPastePanel, RestockList, shopping, shoppingData, finance, storage, app/store, app/notify | `shoppingLists`, `shoppingListId`, `shoppingListTemplates`, `shoppingRunOutAlerts` | Entrega das notificações e recuperação de lista no Android |
| 12. Acessibilidade e textos | Validada | App, kit, pickers, telas de compras, Extrato, Início, FormScreen, testes estáticos | — | TalkBack, fonte a 200% e consulta real da SEFAZ |

Na rodada final, `npm test` e a execução serial passaram com **1.065 testes** cada. A suíte de segurança passou com **107 testes**. O TypeScript e `git diff --check` também passaram. Uma rodada paralela inicial teve três falhas de tempo. A execução serial da mesma etapa e a rodada paralela final passaram.

O teste de armazenamento em SQLite confirmou a leitura de coleções opcionais vazias, preenchidas e removidas. Os cenários de emulador nos 12 blocos ficam para o Claude.
