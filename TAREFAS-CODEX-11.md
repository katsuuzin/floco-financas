# Tarefas do Codex, pacote 11: ligar tudo às telas (código de verdade)

Mudança de papel: até o pacote 10 você só criava lógica em arquivos novos. Agora **você também edita telas, rotas e o armazenamento** para ligar os módulos que já existem. O Claude deixa de escrever código e fica com: build, teste no emulador, revisão visual, decisões de design e commit/release.

Estado: v1.10.0 + mudanças locais não commitadas (veja `git status`). Antes de começar leia `CLAUDE.md`, `INVENTARIO-FUNCIONAL.md`, `DESIGN.md`, `PLANO-RETOMADA-2.md` e `ROTEIRO-TESTE-INTEGRACOES.md`. Os módulos novos estão em `src/*.mjs` com testes em `tests/`.

## Regras

- Nunca `expo prebuild`. **Sem commit, push ou release. Não gere APK nem rode `build-android.ps1`** (o Claude usa o emulador e o build ao mesmo tempo; rodar dois builds quebra o `subst`). Sem dependência nova. Sem chave, CNPJ ou dado pessoal reais.
- Faça **uma tarefa por vez, na ordem**, e deixe `npm test`, `npx tsc --noEmit` e `node --test tests/security/*.test.mjs` verdes entre elas. Para os testes de tempo use `node --test --test-concurrency=1 tests/*.test.mjs` (em paralelo eles falham por carga da máquina, não por defeito).
- Só edite os arquivos da tarefa e os de apoio listados. Rotas novas: `src/app/nav.tsx`. Estado e backup: `src/finance.mjs`, `src/storage.mjs`, `src/shopping.mjs`, `src/shoppingData.mjs` (só quando a tarefa pede campo novo).
- **Dados antigos nunca quebram.** Todo campo novo é opcional, com padrão; backup da 1.10.0 sem o campo restaura igual; `validateBackup`, `keepShoppingOnRestore` e a migração ao abrir o app (`src/app/store.tsx`) aceitam os dois formatos. Cada campo novo ganha teste de "backup antigo" e de "backup com lixo no campo".
- Visual: use os tokens de `useTheme()` e os componentes de `src/ui/kit.tsx`; amarelo `#FBB202`/`#FFCB45`, marrom `#311E0D`, fonte Sora; tema claro e escuro; nada de cor fixa. Texto em português do Brasil, "…" (um caractere) no lugar de "...", valores em centavos.
- Acessibilidade em tudo que criar: `accessibilityRole`, `accessibilityLabel` sem repetir o preço duas vezes, estados (`selected`, `disabled`, `checked`), alvo de toque ≥ 48 dp, anúncio de carregamento/resultado (`accessibilityLiveRegion="polite"`), funciona com fonte 200% sem cortar texto. Siga `REVISAO-ACESSIBILIDADE-TELAS-NOVAS.md` e `REVISAO-TEXTOS-LISTA-DE-COMPRAS.md`. Os testes estáticos estão em `tests/security/a11y-static.test.mjs` e `tests/security/screens-contract.test.mjs`: estenda-os para cobrir cada tela tocada.
- Edições em arquivo com fim de linha misto (CRLF/LF): use um script Python que tenta `\n` e depois `\r\n`. Mantenha o fim de linha original.
- Cada tarefa termina com **um bloco no arquivo `RELATORIO-CODEX-11.md`** (crie; um bloco por tarefa): arquivos alterados, campos novos de dados, o que mudou para o usuário em 2 a 3 linhas, **passos de teste no emulador** para o Claude executar (curtos, com o resultado esperado) e o que você **não** conseguiu verificar. Não edite `INVENTARIO-FUNCIONAL.md`: o Claude copia do relatório.
- Dúvida de design que muda o comportamento (não só detalhe): escolha o padrão mais conservador, anote em "Decisões" no relatório e siga em frente. Não pare para perguntar.
- Teste novo que expõe defeito antigo: prefixo "Achado:" e relate com exemplo mínimo.

---

## 1. Modo compra com `shoppingTripView`

Arquivos: `src/screens/ShoppingTripScreen.tsx` (+ testes). Troque a lógica de decisão dentro do componente por `tripViewModel`, `parseLimitInput` e `finishPlan` de `src/shoppingTripView.mjs`. Mantenha: sessão guardada por 3 h, limite persistido, aviso de despesa parecida (`wouldDuplicate`, já ligado), texto falado, cores ok/perto/estourado. Entrada de limite inválida mostra a mensagem de `parseLimitInput` ao lado do campo. Sem mudança visível além disso: o teste do Claude é de regressão.

## 2. Extrato: filtros e calendário

Arquivos: `src/screens/TransactionsScreen.tsx`, `src/app/nav.tsx` se precisar de rota. Ligue `statementFilter` (painel "Filtros": contas, tags, faixa de valor, tipos; faixa de chips "filtros ativos" com `describeFilter` e botão "Limpar"; contador `activeFilterCount` no botão) e `statementCalendar` (alternância Lista/Calendário; grade do mês com intensidade por `level` usando só tokens do tema, toque no dia abre o detalhe do dia com `dayDetail`). Persistir o filtro escolhido com `sanitizeFilter` ao ler (guarde na mesma chave de preferências do extrato). Calendário e lista usam o mesmo mês e o mesmo filtro.

## 3. Calculadora no campo de valor

Arquivos: `src/ui/kit.tsx` (`AmountField`), `src/screens/FormScreen.tsx` se preciso. Ligue `amountExpression`: ao digitar uma expressão (`isExpression`), mostre o botão "=" (rótulo "Calcular") e o resultado prévio em texto pequeno ("= R$ 25,40"); ao tocar, o campo vira o valor. Expressão inválida mostra a mensagem em português sem travar o salvar de valores simples. Campo com número normal não muda em nada. Teclado numérico precisa permitir `+ - * / ( )` quando o campo é de valor com calculadora (hoje o ícone de divisão no campo indica a intenção: leia como ele funciona).

## 4. Lixeira com purga

Arquivos: `src/screens/TrashScreen.tsx`, `src/app/store.tsx` (purga ao abrir o app, uma vez por dia). Ligue `trashPurge`: purga automática por idade/limite, restaurar com os avisos de `restoreFromTrash` (em português, via `Alert`), "Esvaziar lixeira" com a contagem de `emptyTrashPlan` na confirmação. Texto de apoio "Itens ficam 30 dias na lixeira" coerente com `keepDays`.

## 5. Contas: reordenar e arquivar

Arquivos: `src/screens/OrganizeScreens.tsx` (`AccountsScreen`), seletores de conta em `FormScreen.tsx` e onde mais houver lista de contas (procure por `state.accounts`), saldo total em `HomeScreen.tsx` e `src/overview.mjs`/`src/finance.mjs` se o cálculo estiver lá. Ligue `accountOrder`: botões "Subir/Descer" (sem arrastar; acessível), "Arquivar"/"Desarquivar" com `blockers` mostrados em português, seção "Arquivadas" recolhida. Campos novos `accounts[].order` e `accounts[].archived` (opcionais). Arquivada não aparece nos seletores nem no saldo total, mas continua nos relatórios históricos.

## 6. Metas e caixinhas separadas

Arquivos: `src/screens/OrganizeScreens.tsx` (`GoalsScreen`), `src/finance.mjs` (validação de backup), `src/app/store.tsx` (migração ao abrir). Ligue `goalPots`: `migratePotsFromGoals` ao abrir o app (idempotente, uma vez, com prova de soma no teste), telas de metas e de caixinhas separadas na mesma tela (abas "Metas" e "Caixinhas"), vincular meta a caixinha, depositar/retirar, arquivar caixinha (`{ error }` em português). Campos novos `pots` e `goals[].potId`. Backup antigo continua restaurando e é migrado.

## 7. Ícone e cor em categorias e tags

Arquivos: editores de categoria e de tag (procure por `CategoriesScreen`/`TagsScreen` em `src/screens/*.tsx`), `src/ui/CategoryIcon.tsx`, `src/ui/pickers.tsx`. Ligue `categoryStyle`: seletor de ícone (grade de `ALLOWED_ICONS`) e de cor (paleta `ALLOWED_COLORS`) com pré-visualização, `readableOn` para o texto sobre a cor, padrão por nome (`defaultStyleFor`) quando não escolhido. Mostrar nas linhas de transação, no orçamento e nos filtros. Campos: `categoryLooks` já existente e `tag.color`; `tag.icon` novo e opcional. Lista de ícones e cores é fechada: backup com valor fora da lista cai no padrão sem erro.

## 8. Notificações: duplicatas

Arquivos: `src/app/inbox.ts`, `src/app/notify.ts` e `src/screens/InboxSheet.tsx` se precisar. Ligue `notificationDedupe`: antes de colocar a notificação na caixa de entrada, `isDuplicateNotification`; registro local de até 500 entradas (`rememberNotification`) guardado no armazenamento (chave própria, ignorada no backup). Um contador discreto "N duplicadas ignoradas" na caixa de entrada com opção de ver. Nunca descarte em silêncio uma notificação que pode ser uma segunda compra real (siga o teste do café).

## 9. Várias despesas de uma compra

Arquivos: `src/screens/ShoppingTripScreen.tsx`, `src/screens/ShoppingScreen.tsx`, `src/screens/FormScreen.tsx`, `src/app/nav.tsx` (rota nova "Revisar despesas"), `src/app/forms.ts`. Ligue `multiExpenseDraft`: na finalização, escolha "Uma despesa" ou "Dividir por categoria" (`shoppingSplit`); a divisão abre a revisão do lote (uma linha por despesa, valor e categoria editáveis, soma sempre igual ao total, aviso `batchDuplicates`), e "Salvar tudo" grava as despesas em **uma única operação** (`perform`) para o desfazer ser um só. Rascunho temporário só em memória. Depende da tarefa 1.

## 10. Lista de compras: recorrentes, promoções, receitas e XML da nota

Arquivos: `src/screens/ShoppingScreen.tsx`, `src/screens/ShoppingPastePanel.tsx`, `src/screens/ScanNotaScreen.tsx`, `src/shopping.mjs` e `src/shoppingData.mjs` (campos novos, validadores, `keepShoppingOnRestore`). Ligue `shoppingStaples` ("Sempre comprar": campo `staple` no item, volta à lista sozinho depois de comprado), `shoppingDeals` (campo `deal` no item: desconto percentual, "leve 3 pague 2"; total da linha usa a promoção), `shoppingRecipe` (porções e escala ao colar uma receita) e `nfceXml` (botão "Escolher arquivo XML" em `ScanNotaScreen`, com `expo-document-picker` que já está no projeto; sem rede; limites dos testes). Editar item abre uma folha com esses campos. Backups antigos sem os campos continuam válidos; atualize `shoppingBackupCheck`/`Repair` só se o formato novo exigir (teste).

## 11. Lista de compras: listas múltiplas, desfazer em etapas e "acabando"

Arquivos: `src/screens/ShoppingScreen.tsx`, `src/screens/RestockList.tsx`, `src/shopping.mjs`/`src/shoppingData.mjs`, `src/app/notify.ts`, `src/app/store.tsx`. Ligue `shoppingLists` (seletor de lista no topo, criar/renomear/excluir, modelos; migração com `migrateToLists`, leitura com `flattenLists`; backup antigo vira "Minha lista"), `shoppingUndo` (botões Desfazer/Refazer com `describeUndo` no rótulo; até 20 etapas em memória), `shoppingRunOut` + `shoppingStores` + `shoppingInflation` em `RestockList` ("Está acabando": lista, loja mais barata, variação), e notificações locais de "acabando" **desligadas por padrão**, com chave de ajuste. Depende da tarefa 10 (mesmos arquivos).

## 12. Acessibilidade e textos das telas novas

Aplique de ponta a ponta `REVISAO-ACESSIBILIDADE-TELAS-NOVAS.md` e `REVISAO-TEXTOS-LISTA-DE-COMPRAS.md` em `ShoppingScreen`, `ShoppingTripScreen`, `ScanProductScreen`, `ScanNotaScreen`, `NfceConsultaScreen`, `PurchasesScreens`, `RestockList` e as telas das tarefas 2 a 9: rótulos sem preço repetido, foco ao abrir/fechar painéis, anúncios de carregamento, nomes longos em fonte 200%, lanterna como alternância, "…" no lugar de "...", termos fixos. Estenda `tests/security/a11y-static.test.mjs` e `screens-contract.test.mjs` para falhar quando um desses itens voltar. Ao final, rode a suíte inteira e preencha o resumo final em `RELATORIO-CODEX-11.md`: tabela tarefa → status → arquivos → campos de dados novos → riscos.

---

## O que fica com o Claude (não faça)

Build de APK e teste no emulador/celular; conferência visual nos dois temas; decisão final de design (`/impeccable`); medições de segurança da WebView no Android (seção D do plano); notas de PR/SC/RS; Google Drive; `INVENTARIO-FUNCIONAL.md`; commit, push e release.

## Prompt de uma linha para o Codex

> Leia `TAREFAS-CODEX-11.md` na pasta do projeto e execute as 12 tarefas na ordem, uma por vez, respeitando as regras e escrevendo o `RELATORIO-CODEX-11.md`.
