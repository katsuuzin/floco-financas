# Cobertura da lista de compras

A contagem usa referências diretas a importações nomeadas dentro de chamadas a `test()` em arquivos `*.test.mjs`, incluindo `tests/security/` e os testes deste pacote. Um teste parametrizado conta uma vez por declaração. Chamadas indiretas por auxiliares, constantes e cobertura de execução ou de ramos ficam fora da contagem. Zero indica ausência de referência direta pelo caminho listado, não necessariamente ausência de exercício. Risco considera o impacto da lacuna.

| Módulo | Função exportada | Testes que a citam | Lacuna a verificar | Risco |
| --- | --- | ---: | --- | --- |
| `nfce.mjs` | `chaveDv` | 3 | Corpo de 43 caracteres com letras. | Média |
| `nfce.mjs` | `formatCnpj` | 1 | Pontuação extra e tamanho incorreto. | Baixa |
| `nfce.mjs` | `isChave` | 1 | Objeto ou chave com espaços nas bordas. | Média |
| `nfce.mjs` | `parseChave` | 1 | Mês 00/13 e UF fora da tabela. | Média |
| `nfce.mjs` | `parseNfceInput` | 14 | Parâmetros p repetidos com valores diferentes. | Alta |
| `nfceNames.mjs` | `expandName` | 1 | Marca truncada e medidas repetidas em nome misto. | Baixa |
| `nfceParse.mjs` | `allowedHosts` | 0 | UF desconhecida e chaves herdadas como toString. | Alta |
| `nfceParse.mjs` | `centsFromBr` | 1 | Valor negativo ou separador decimal de outro formato. | Alta |
| `nfceParse.mjs` | `consultSupported` | 1 | Chaves herdadas e UF em caixa diferente. | Média |
| `nfceParse.mjs` | `consultUrl` | 6 | UF como toString e chave com 44 dígitos mas DV inválido. | Alta |
| `nfceParse.mjs` | `isAllowedUrl` | 6 | Callback nativo e redirecionamento real em Android. | Alta |
| `nfceParse.mjs` | `nfceToPurchase` | 2 | Divergência entre chave da prévia e info.chave no uso direto. | Alta |
| `nfceParse.mjs` | `parseNfceHtml` | 12 | Valores negativos, quantidades fora da faixa e custo no Hermes. | Alta |
| `nfceParse.mjs` | `readableName` | 1 | Texto Unicode misto com marca multi-palavra truncada. | Baixa |
| `openFoodFacts.mjs` | `isValidEan` | 3 | Casos extremos com todos os dígitos zero e controles Unicode. | Baixa |
| `openFoodFacts.mjs` | `lookupEan` | 12 | Limites da implementação de fetch no Android e expiração dos dados em cache. | Média |
| `pasteList.mjs` | `parsePastedList` | 5 | Fração ½ e item composto com vírgula literal fora de parênteses. | Média |
| `pasteListAi.mjs` | `interpretPastedList` | 7 | Cancelamento externo com interpretador que ignora AbortSignal. | Alta |
| `shopping-ai-client.mjs` | `requestShoppingSuggestions` | 4 | Corpo JSON incompleto e erro de credencial com provedor real. | Média |
| `shopping.mjs` | `addShoppingItem` | 1 | Limite de 2.000 itens com importação em lote. | Média |
| `shopping.mjs` | `categorize` | 1 | Nome composto com palavras de categorias diferentes. | Baixa |
| `shopping.mjs` | `clearCart` | 1 | Carrinho vazio com identidade dos itens preservada. | Baixa |
| `shopping.mjs` | `groupByCategory` | 1 | Grupo desconhecido junto com todos os grupos conhecidos. | Baixa |
| `shopping.mjs` | `itemsOf` | 0 | Campo ausente ou nulo em estado importado. | Baixa |
| `shopping.mjs` | `keepShoppingOnRestore` | 4 | Compras restauradas sem catálogo correspondente. | Alta |
| `shopping.mjs` | `lineTotal` | 1 | Produto de preço por unidade e quantidade acima do inteiro seguro. | Média |
| `shopping.mjs` | `parseItemText` | 2 | Notação científica e dígitos de largura cheia. | Média |
| `shopping.mjs` | `purchaseDraft` | 3 | Carrinho só com itens de custo zero. | Média |
| `shopping.mjs` | `removeItem` | 2 | ID ausente em lista grande. | Baixa |
| `shopping.mjs` | `renameItem` | 1 | Renomear sem alterar preço e categoria em item pesado. | Baixa |
| `shopping.mjs` | `restoreItem` | 1 | Posição inválida e ID duplicado. | Média |
| `shopping.mjs` | `sanitizeShoppingItems` | 1 | IDs duplicados e categoria ou centavos corrompidos no mesmo lote. | Alta |
| `shopping.mjs` | `setItemCategory` | 1 | Categoria não permitida em item existente. | Baixa |
| `shopping.mjs` | `setItemPrice` | 8 | Centavos extremos e separador ambíguo. | Média |
| `shopping.mjs` | `shareText` | 1 | Lista máxima e nomes com quebras de linha. | Baixa |
| `shopping.mjs` | `shoppingSummary` | 3 | Total agregado acima do inteiro seguro. | Média |
| `shopping.mjs` | `toggleCart` | 11 | ID ausente e item com estado corrompido. | Baixa |
| `shoppingAisles.mjs` | `learnAisleOrder` | 4 | Sessões esparsas com ordens contraditórias. | Baixa |
| `shoppingAisles.mjs` | `sortByAisles` | 3 | Ordem parcialmente inválida e empate de novas categorias. | Baixa |
| `shoppingBudget.mjs` | `budgetStatus` | 4 | Arredondamento próximo de 85% em limite de um centavo. | Média |
| `shoppingBudget.mjs` | `suggestCuts` | 5 | Cinco cortes insuficientes e itens com frequências muito díspares. | Média |
| `shoppingData.mjs` | `isIsoDate` | 0 | Datas impossíveis normalizadas pelo Date.parse. | Alta |
| `shoppingData.mjs` | `sanitizeProducts` | 0 | Referências a compras inexistentes em pontos do catálogo. | Alta |
| `shoppingData.mjs` | `sanitizePurchases` | 0 | Data impossível, chave com DV inválido ou total divergente. | Alta |
| `shoppingData.mjs` | `sanitizeShoppingItems` | 0 | Teste direto do módulo e conflito de IDs no backup. | Alta |
| `shoppingHistory.mjs` | `displayName` | 1 | Nome híbrido com marca e medida em caixa alta. | Baixa |
| `shoppingHistory.mjs` | `expenseDraftFromPurchase` | 1 | Compra restaurada sem data ou identificador. | Média |
| `shoppingHistory.mjs` | `monthSummary` | 1 | Total acima do inteiro seguro e mês sem movimento. | Média |
| `shoppingHistory.mjs` | `pricePoints` | 1 | Referência de compra ausente após restauração. | Média |
| `shoppingHistory.mjs` | `priceTrend` | 1 | Mesmo dia com múltiplos pontos e preço anterior zero. | Média |
| `shoppingHistory.mjs` | `purchasesByDate` | 2 | Desempate de compras com data e horário idênticos. | Baixa |
| `shoppingHistory.mjs` | `searchProducts` | 2 | Consulta Unicode decomposta com espaços incomuns. | Baixa |
| `shoppingMatch.mjs` | `applyConferencia` | 3 | Aplicar seleção antiga depois que um item muda de nome. | Alta |
| `shoppingMatch.mjs` | `matchListToNota` | 10 | Lista cheia com muitos itens muito parecidos. | Média |
| `shoppingMatch.mjs` | `scorePair` | 1 | Palavra repetida e variantes de embalagem concorrentes. | Média |
| `shoppingMatch.mjs` | `tokenMatch` | 1 | Acentos decompostos e limite de três caracteres. | Baixa |
| `shoppingMatch.mjs` | `tokens` | 1 | Número grudado em nome de marca e plural irregular. | Baixa |
| `shoppingPurchases.mjs` | `lastKnownPrice` | 1 | Preço inválido em item sem pontos e unidade incompatível. | Média |
| `shoppingPurchases.mjs` | `normalizeName` | 1 | Nome composto só por caracteres fora do alfabeto latino. | Média |
| `shoppingPurchases.mjs` | `priceSummary` | 1 | Pontos ausentes após remoção do histórico retido. | Média |
| `shoppingPurchases.mjs` | `productKey` | 1 | Colisão de nomes com pontuação semanticamente relevante. | Média |
| `shoppingPurchases.mjs` | `productsOf` | 11 | Catálogo ausente ou nulo. | Baixa |
| `shoppingPurchases.mjs` | `purchasesOf` | 5 | Histórico ausente ou nulo. | Baixa |
| `shoppingPurchases.mjs` | `recordPurchase` | 16 | Compra retroativa quando a lista de pontos já está cheia. | Alta |
| `shoppingPurchases.mjs` | `removePurchase` | 4 | Excluir os pontos mais recentes quando existem compras anteriores fora do recorte. | Alta |
| `shoppingRhythm.mjs` | `purchaseRhythm` | 2 | Histórico truncado e alteração recente do intervalo de compra. | Média |
| `shoppingRhythm.mjs` | `restockCandidates` | 11 | Vários produtos com nomes quase iguais já pendentes. | Média |
| `shoppingSuggestPrice.mjs` | `applySuggestedPrices` | 2 | ID repetido em estado corrompido e lista de IDs vazia. | Média |
| `shoppingSuggestPrice.mjs` | `suggestPrices` | 9 | Muitos candidatos com o mesmo prefixo e empate de qualidade. | Média |
| `shoppingTrip.mjs` | `formatElapsed` | 2 | Valores grandes de tempo que excedem o inteiro seguro. | Baixa |
| `shoppingTrip.mjs` | `nextToGet` | 7 | Limite fracionário e entradas com a mesma ordenação. | Baixa |
| `shoppingTrip.mjs` | `pendingByCategory` | 6 | Rótulo de categoria ausente e categoria duplicada com caixa diferente. | Baixa |
| `shoppingTrip.mjs` | `tripSummary` | 12 | Soma agregada acima do inteiro seguro. | Média |
| `shoppingTripSession.mjs` | `endSession` | 2 | Integração com a limpeza do armazenamento. | Baixa |
| `shoppingTripSession.mjs` | `parse` | 3 | Timestamp inválido e mudanças de relógio no aplicativo real. | Média |
| `shoppingTripSession.mjs` | `parseSession` | 0 | Visto pelo alias parse. Falta teste direto no limite máximo de timestamp. | Média |
| `shoppingTripSession.mjs` | `resumeSession` | 5 | Configuração inválida e sessão aberta em dois fluxos concorrentes. | Média |
| `shoppingTripSession.mjs` | `serialize` | 3 | Serialização com valor fora do limite de timestamp. | Baixa |
| `shoppingTripSession.mjs` | `serializeSession` | 0 | Visto pelo alias serialize. Falta teste direto com sessão inválida. | Baixa |
| `shoppingTripSession.mjs` | `startSession` | 7 | Fronteira superior de timestamp permitido. | Baixa |

## Dez lacunas prioritárias

1. **Origem real da ponte fiscal.** Na automação do Android, enviar um evento de um iframe local de teste. Confirmar que a camada nativa rejeita o frame antes da prévia. O teste atual da ponte é um espelho JavaScript.
2. **Redirecionamento e isolamento da WebView.** Em ambiente de teste, redirecionar a página para um host reservado de teste e confirmar que ela não abre outro app nem carrega subrecursos externos.
3. **Data de compra impossível.** Restaurar um backup sintético de compra com `date: "2026-02-30"` e verificar a rejeição explícita.
4. **Referências incompletas no backup.** Restaurar `shoppingPurchases` com um item apontando para um ID ausente de `shoppingProducts`. Verificar que o app diagnostica a inconsistência sem perder os dados existentes.
5. **Valor fiscal negativo.** Colocar `-1,00` no valor de um item sintético e conferir que o leitor não transforma o desconto ou valor inválido em cobrança positiva.
6. **Remoção com histórico truncado.** Criar 26 compras do mesmo produto, apagar as 24 mais recentes e conferir se último preço e data correspondem às duas restantes.
7. **Compra retroativa com histórico cheio.** Registrar 24 compras recentes e importar uma mais antiga. Verificar se ela não desloca indevidamente um ponto recente do catálogo.
8. **Seleção antiga da conferência.** Calcular os pares, renomear um item pendente e aplicar a seleção antiga. A aplicação deve revalidar o item antes de marcar ou alterar preço.
9. **Cancelamento externo da IA.** Abortar a solicitação com um interpretador que ignora o sinal e que responde depois com uma lista válida. Confirmar que a resposta tardia não reaparece.
10. **UF herdada em objeto.** Chamar `consultUrl({ uf: "toString", chave: "0".repeat(44) })` com dados fictícios e verificar que retorna erro de UF sem suporte.
