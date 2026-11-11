# Revisão do pacote 11

Comparei o diff da árvore de trabalho anterior ao pacote 12 com o HEAD local da 1.10.0 e li os módulos novos. As linhas apontam para a árvore atual. As reproduções usam dados fictícios. Os quatro testes “Achado:” falharam quando executados como testes comuns. **Atualização:** o Claude corrigiu C1 a C4 e os testes passaram a ser comuns (sem TODO).

| Módulo | Perda ou corrupção | Abertura | Vínculos | Acessibilidade e texto |
| --- | --- | --- | --- | --- |
| Extrato e calculadora | Nenhum. Filtro altera a seleção, e o cálculo só substitui o texto ao confirmar. | Nenhum no filtro saneado ou no parser com limite de entrada. | Nenhum que altere o histórico. Filtro salvo pode ser limpo. | O problema de largura na última semana está no inventário. Conferir grade e teclado com fonte ampliada. |
| Lixeira | Nenhum além da purga por prazo e capacidade. Datas inválidas ficam na lixeira. | Nenhum sem tratamento. A abertura tem captura e o teste cobre 10 mil entradas. | Nenhum na restauração de duplicata ou conta ausente. O código recusa a restauração. | Quantidade anunciada na confirmação. TalkBack fica pendente. |
| Contas | Nenhuma exclusão direta ao arquivar. | Nenhum na normalização de ordem ausente ou inválida. | C1 e C2. Histórico continua na conta arquivada. | A pilha original de ações foi tratada na tarefa 1. |
| Metas, caixinhas e armazenamento | Nenhum na migração válida repetida. Os testes comparam centavos e depósitos. | C4. Falhas de leitura caem na captura de `src/app/store.tsx:63`. | C3. Exclusão de conta com depósitos tem teste e guarda. | Ações agrupadas na tarefa 1. Conferir anúncios e foco da folha no aparelho. |
| Categorias e tags | Estilos inválidos são saneados. A entrada conhecida e seus outros dados permanecem. | Nenhum nos padrões por nome e na validação de arrays. | Nenhum encontrado no vínculo por ID. | A prévia calcula contraste. A aparência nos dois temas precisa de conferência. |
| Caixa de entrada e notificações | Nenhum na deduplicação. O livro de assinaturas é separado e a fila nativa permanece. | A leitura de assinaturas inválidas cai no padrão vazio. | Nenhum encontrado nos testes de origem e janela. | Revisão das duplicadas tem ação nomeada. Entrega e anúncios dependem do Android. |
| Despesas por categoria | Nenhum no lote. O teste exige centavos inteiros e total idêntico ao do carrinho. | A revisão é aberta sob demanda. | A conta é verificada ao aplicar o lote. | Campos rotulados. Conferir teclado e retorno de foco. |
| Compras, reposição, histórico e importação | Nenhum na criação pela tela. O teste refutou a hipótese de perda da lista 101. Recorrência, promoções e receitas têm testes dos campos opcionais. | Nenhum sem captura no caminho revisado de importação. Os limites de entrada estão no leitor. | A lista excluída fica arquivada junto aos itens e pode ser recuperada. | Lanternas e campos têm rótulos. A fala e as origens do WebView exigem medição no Android. |
| Kit, movimento e navegação | Nenhum estado financeiro gravado pelo kit. | Nenhuma migração nesses módulos. | Nenhum vínculo de dados. Rotas têm contrato estático. | A escala e a preferência de movimento têm testes de código. O foco efetivo depende do aparelho. |

## Achados reproduzidos

| ID | Gravidade | Local | Exemplo mínimo e efeito |
| --- | --- | --- | --- |
| C1 | Média | `src/accountOrder.mjs:74` | Lance uma despesa pendente ontem e arquive a conta hoje. Com a data atual fornecida, o ramo só considera datas futuras e deixa a pendência vinculada à conta arquivada. |
| C2 | Média | `src/accountOrder.mjs:70`, `src/screens/OrganizeScreens.tsx:348` | Reserve R$ 1 em uma caixinha usando uma conta com R$ 2. Confirme o arquivamento pelo saldo. A reserva continua na conta, mas o seletor para retirada só oferece contas ativas. |
| C3 | Média | `src/goalPots.mjs:114`, `src/screens/OrganizeScreens.tsx:501` | Vincule uma meta à caixinha e arquive-a devolvendo o saldo à conta. A meta continua lendo a caixinha arquivada e zerada, embora ela já tenha saído das opções. O teste registra o vínculo. A regra de desvincular ou transferir fica para revisão. |
| C4 | Média | `src/finance.mjs:694`, `src/finance.mjs:837`, `src/sqliteStore.ts:51` | Abra uma base com N contas e N caixinhas com reservas na última conta. Dobrar de 100 para 200 quadruplicou as comparações de ID, de 10 mil para 40 mil. A abertura percorre isso de forma síncrona. |

A hipótese de perda da lista 101 foi refutada. Em `src/shopping.mjs:107`, a criação rejeita a tentativa antes de gravar. O teste confirmou que as 100 listas existentes continuam restauráveis.

## Correções feitas pelo Claude

- **C1:** `archiveAccount` agora também bloqueia lançamento pendente vencido (`confirmed === false`), não só os de data futura.
- **C2:** `archiveAccount` bloqueia (código `reserva`, não pode ser forçado) enquanto houver dinheiro reservado em caixinha ativa naquela conta.
- **C3:** `archivePot` solta o vínculo das metas (`potId: null`) ao devolver o saldo a uma conta; se o saldo vai para outra caixinha, o vínculo acompanha o dinheiro.
- **C4:** `validateBackup` usa um `Set` de ids de contas em vez de `.some` dentro de laços; 10 mil → 40 mil leituras virou 0.
