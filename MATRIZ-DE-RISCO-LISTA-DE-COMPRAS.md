# Matriz de risco da lista de compras

Esta matriz reúne as 30 falhas históricas do pacote 6, os dois defeitos extras da revisão, os pontos da WebView e as lacunas de cobertura. A suíte de referência atual, medida antes deste pacote, passou em 742 de 742 testes. As 30 falhas históricas ficam registradas como regressões aprovadas no Node. A ponte, a navegação e os subrecursos ainda exigem validação no Android.

Probabilidade estima a exposição ao cenário caso o defeito esteja presente. Esforço P indica ajuste local, M inclui mais de um fluxo ou validação no aparelho e G inclui ponte nativa, arquitetura ou migração. As lacunas de cobertura já representadas por uma regressão ou por um achado da WebView aparecem na linha correspondente. Verificação parcial permanece registrada quando o relatório cobre mais de um cenário.

| ID | Descrição | Arquivo | Impacto no usuário | Probabilidade | Esforço | Dependência | Ordem de correção |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W01 | A ponte confia em URL declarada pela mensagem. Falta comprovar origem e frame principal | src/screens/NfceConsultaScreen.tsx / RNCWebView.java | Conteúdo de frame indevido pode chegar à prévia | Média | G | Ponte nativa e harness Android | 1 |
| W02 | Destino fora da lista pode ir a outro app. Timeout de decisão pode liberar navegação | src/screens/NfceConsultaScreen.tsx / WebViewShared.tsx / RNCWebViewClient.java | Saída da consulta ou exposição de contexto fiscal | Média | G | Bloqueio na camada nativa e teste de redirecionamento | 2 |
| W03 | HTML é serializado antes da checagem de tamanho e innerText é lido periodicamente | src/screens/NfceConsultaScreen.tsx | Memória e interface podem sofrer em página grande | Média | M | Teto antes da ponte e medições no dispositivo | 3 |
| W04 | Isolamento de cookies, armazenamento DOM e subrecursos externos sem comprovação | src/screens/NfceConsultaScreen.tsx / RNCWebViewManagerImpl.kt | A consulta pode fazer conexões fora do contexto esperado | Indeterminada | G | Instrumentação de rede e teste de sessão Android | 4 |
| W05 | Parser síncrono tem limites em Node, mas falta medir entradas adversas no Hermes | src/nfceParse.mjs | Consulta grande pode atrasar ou travar a interface | Média | M | Benchmark no Android e revisão de expressões | 5 |
| W06 | Fallback de vínculo fiscal ainda usa substring no caminho quando p está ausente | src/nfceParse.mjs / src/screens/NfceConsultaScreen.tsx | Caminho ambíguo pode ser aceito antes da verificação do HTML | Baixa | M | Definir rotas oficiais e autenticar frame (W01) | 6 |
| W07 | Evento rejected sai sem href e recebe erro genérico | src/screens/NfceConsultaScreen.tsx | Pessoa perde orientação para tentar novamente | Média | P | Validar recusa pela mesma origem da tentativa | 7 |
| W08 | Host ou etapa oficial intermediária fora da política pode interromper consulta | src/screens/NfceConsultaScreen.tsx / src/nfceParse.mjs | Notas válidas de uma UF podem ficar inacessíveis | Média | M | Matriz de rotas oficiais no Android | 8 |
| W09 | JSON escapado pode exceder teto do envelope com HTML ainda dentro do teto | src/screens/NfceConsultaScreen.tsx | Página válida pode ser recusada por volume | Baixa | M | Medir payload completo antes da ponte (W03) | Após lote |
| W10 | URL inicial arbitrária, chave em parâmetro alheio e HTML sem chave foram tratados no fluxo JS | src/nfceParse.mjs / src/screens/NfceConsultaScreen.tsx | A política inicial e o vínculo fiscal precisam de regressão | Baixa | P | Manter testes do pacote anterior. Origem nativa em W01 | Regressão |
| E01 | Colar somente “Lista 🛒” cria item com o título | src/shoppingImportShared.mjs | Texto de cabeçalho polui a lista | Média | P | Reconhecer cabeçalho com emoji sem remover nomes válidos | 9 |
| E02 | Todas as despesas divididas recebem “Compra de mercado” | src/shoppingSplit.mjs | Dificulta distinguir lançamentos no extrato | Alta ao usar divisão | P | Descrição por categoria no modo dividido | 10 |
| L03 | Backup com data impossível `2026-02-30` | src/shoppingData.mjs / src/shopping.mjs | Compra atribuída ao dia errado | Média | P | Validação na restauração | Regressão passou |
| L04 | Item aponta para produto inexistente | src/shopping.mjs / src/shoppingData.mjs | Catálogo e compras ficam inconsistentes | Média | M | Validação cruzada de backup | Regressão passou |
| L05 | Valor `-1,00` convertido em cobrança | src/nfceParse.mjs | Total fiscal incorreto | Média | P | Leitor fiscal e centavos | Regressão passou |
| L06 | Apagar as 24 últimas compras não recompõe as duas mais antigas | src/shoppingPurchases.mjs | Último preço e ritmo ficam incorretos | Média | M | Reconstrução do catálogo | Regressão passou |
| L07 | Compra retroativa expulsa ponto recente | src/shoppingPurchases.mjs | Histórico de preço incompleto | Média | M | Ordenação cronológica do catálogo | Regressão passou |
| L08 | Seleção de Arroz antiga altera item renomeado para Sabão | src/shoppingMatch.mjs | Marca ou altera preço do item errado | Média | P | Revalidar seleção | Regressão passou |
| L09 | Resposta de Leite aparece depois de cancelar leitura de Arroz | src/pasteListAi.mjs | A prévia cancelada reaparece | Média | P | Cancelamento no fim da chamada | Regressão passou |
| L10 | `consultUrl` aceita UF `toString` | src/nfceParse.mjs | Tentativa de consulta inválida | Baixa | P | Checagem de propriedade própria | Regressão passou |
| L11 | `isChave` aceita objeto com `toString` | src/nfce.mjs | Objeto pode passar pela validação de entrada | Baixa | P | Tipo e DV | Regressão passou |
| L12 | `parseChave` decompõe UF `00` e mês `13` | src/nfce.mjs | Metadado fiscal impossível | Baixa | P | Contrato semântico da chave | Regressão passou |
| L13 | Dois `p` conflitantes aceitam o primeiro | src/nfce.mjs | Seleção ambígua da nota | Média | P | Parser de URL | Regressão passou |
| L14 | `allowedHosts('toString')` consulta propriedade herdada | src/nfceParse.mjs | Lista de destinos fica inválida | Baixa | P | Checagem de propriedade própria | Regressão passou |
| L15 | `centsFromBr('-1,00')` troca sinal | src/nfceParse.mjs | Desconto pode virar cobrança | Média | P | Parser de centavos | Regressão passou |
| L16 | `consultSupported('constructor')` aceita propriedade herdada | src/nfceParse.mjs | Aparece opção fiscal sem suporte | Baixa | P | Checagem de propriedade própria | Regressão passou |
| L17 | Consulta aceita chave de 44 dígitos com DV trocado | src/nfceParse.mjs | Consulta sem vínculo fiscal válido | Média | P | Checagem de DV | Regressão passou |
| L18 | Prévia e chave de entrada divergentes ainda viram compra | src/nfceParse.mjs | Salva nota diferente da consultada | Média | P | Comparar chaves antes de converter | Regressão passou |
| L19 | Leitor aceita quantidade fiscal `100000` | src/nfceParse.mjs | Prévia inválida ou erro ao salvar | Baixa | P | Limite coerente com histórico | Regressão passou |
| L20 | Colar `½ kg de farinha` perde quantidade fracionária | src/pasteList.mjs | Quantidade vira texto ou valor incorreto | Média | P | Parser de colagem | Regressão passou |
| L21 | Preço máximo seguro multiplicado por 100 estoura | src/shopping.mjs | Total de linha perde precisão | Baixa | P | Aritmética segura | Regressão passou |
| L22 | Dois itens de máximo seguro e 2 estouram o resumo | src/shopping.mjs | Estimativa perde precisão | Baixa | P | Aritmética segura | Regressão passou |
| L23 | `isIsoDate('2026-02-30')` retorna verdadeiro | src/shoppingData.mjs | Data inválida é normalizada | Média | P | Calendário real | Regressão passou |
| L24 | Ponto de preço com `purchaseId: ''` passa | src/shoppingData.mjs | Preço sem origem fica no catálogo | Média | M | Integridade no backup | Regressão passou |
| L25 | Backup aceita chave fiscal com DV trocado | src/shoppingData.mjs | Histórico fiscal inválido é restaurado | Média | P | DV na validação | Regressão passou |
| L26 | Total mensal ultrapassa inteiro seguro | src/shoppingHistory.mjs | Resumo do histórico perde precisão | Baixa | P | Aritmética segura | Regressão passou |
| L27 | Pontos de 0 e 100 no mesmo dia geram percentual infinito | src/shoppingHistory.mjs | Variação de preço inválida | Baixa | P | Tratamento de base zero | Regressão passou |
| L28 | Repetição em “Arroz arroz integral” infla par com “Arroz branco” | src/shoppingMatch.mjs | Sugestão cruza variantes | Média | P | Correspondência de termos | Regressão passou |
| L29 | Produto sem pontos oferece `lastPriceCents: -100` | src/shoppingPurchases.mjs | Estimativa pode sair negativa | Baixa | P | Saneamento de preço | Regressão passou |
| L30 | `normalizeName('抹茶')` gera nome vazio | src/shoppingPurchases.mjs | Produtos podem colidir ou desaparecer da busca | Baixa | M | Migração das chaves do catálogo | Regressão passou |
| L31 | “Produto 1,5” colide com “Produto 1 5” | src/shoppingPurchases.mjs | Históricos de variantes podem se misturar | Baixa | M | Migração das chaves do catálogo | Regressão passou |
| L32 | Soma agregada do Modo compra ultrapassa inteiro seguro | src/shoppingTrip.mjs | Estimativa perde precisão | Baixa | P | Aritmética segura | Regressão passou |
| C01 | `chaveDv` — Corpo de 43 caracteres com letras. | src/nfce.mjs | Erro fiscal pouco claro | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C02 | `formatCnpj` — Pontuação extra e tamanho incorreto. | src/nfce.mjs | Identificação da loja ilegível | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C03 | `parseChave` — Mês 00/13 e UF fora da tabela. | src/nfce.mjs | Validação pode produzir resultado inconsistente na condição indicada | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C04 | `expandName` — Marca truncada e medidas repetidas em nome misto. | src/nfceNames.mjs | Produto aparece com marca truncada | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C05 | `consultUrl` — UF como toString e chave com 44 dígitos mas DV inválido. | src/nfceParse.mjs | Validação pode produzir resultado inconsistente na condição indicada | Média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C06 | `parseNfceHtml` — Valores negativos, quantidades fora da faixa e custo no Hermes. | src/nfceParse.mjs | Leitura pode bloquear a interface | Média | M | Teste adicional em Android ou provedor simulado e contrato do fluxo | Após lote |
| C07 | `readableName` — Texto Unicode misto com marca multi-palavra truncada. | src/nfceParse.mjs | Produto exibido com nome ambíguo | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C08 | `isValidEan` — Casos extremos com todos os dígitos zero e controles Unicode. | src/openFoodFacts.mjs | Código inválido pode chegar à consulta | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C09 | `lookupEan` — Limites da implementação de fetch no Android e expiração dos dados em cache. | src/openFoodFacts.mjs | Consulta pode ficar lenta ou desatualizada | Baixa a média | M | Teste adicional em Android ou provedor simulado e contrato do fluxo | Após lote |
| C10 | `parsePastedList` — Fração ½ e item composto com vírgula literal fora de parênteses. | src/pasteList.mjs | Item com vírgula pode ser dividido | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C11 | `requestShoppingSuggestions` — Corpo JSON incompleto e erro de credencial com provedor real. | src/shopping-ai-client.mjs | Prévia indisponível ou mensagem de credencial imprecisa | Baixa a média | M | Teste adicional em Android ou provedor simulado e contrato do fluxo | Após lote |
| C12 | `addShoppingItem` — Limite de 2.000 itens com importação em lote. | src/shopping.mjs | Importação pode ultrapassar a capacidade da lista | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C13 | `categorize` — Nome composto com palavras de categorias diferentes. | src/shopping.mjs | Item pode cair no corredor errado | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C14 | `clearCart` — Carrinho vazio com identidade dos itens preservada. | src/shopping.mjs | Limpeza pode alterar referências sem necessidade | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C15 | `groupByCategory` — Grupo desconhecido junto com todos os grupos conhecidos. | src/shopping.mjs | Grupo de itens pode ficar fora de ordem | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C16 | `itemsOf` — Campo ausente ou nulo em estado importado. | src/shopping.mjs | Lista vazia pode se comportar como erro | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C17 | `parseItemText` — Notação científica e dígitos de largura cheia. | src/shopping.mjs | Quantidade pode ser confundida com nome | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C18 | `purchaseDraft` — Carrinho só com itens de custo zero. | src/shopping.mjs | Formulário pode preencher valor incorreto | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C19 | `removeItem` — ID ausente em lista grande. | src/shopping.mjs | Item errado pode ser removido | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C20 | `renameItem` — Renomear sem alterar preço e categoria em item pesado. | src/shopping.mjs | Edição pode alterar categoria ou preço | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C21 | `restoreItem` — Posição inválida e ID duplicado. | src/shopping.mjs | Desfazer pode inserir duplicata ou posição errada | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C22 | `sanitizeShoppingItems` — IDs duplicados e categoria ou centavos corrompidos no mesmo lote. | src/shopping.mjs | Backup pode restaurar estado inconsistente | Média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C23 | `setItemCategory` — Categoria não permitida em item existente. | src/shopping.mjs | Categoria inválida pode quebrar o agrupamento | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C24 | `setItemPrice` — Centavos extremos e separador ambíguo. | src/shopping.mjs | Preço pode ser arredondado ou interpretado incorretamente | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C25 | `shareText` — Lista máxima e nomes com quebras de linha. | src/shopping.mjs | Lista longa pode perder separação dos itens | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C26 | `toggleCart` — ID ausente e item com estado corrompido. | src/shopping.mjs | Item inconsistente pode mudar de estado | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C27 | `learnAisleOrder` — Sessões esparsas com ordens contraditórias. | src/shoppingAisles.mjs | Ordem aprendida pode variar entre compras | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C28 | `sortByAisles` — Ordem parcialmente inválida e empate de novas categorias. | src/shoppingAisles.mjs | Corredores podem aparecer fora da ordem | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C29 | `budgetStatus` — Arredondamento próximo de 85% em limite de um centavo. | src/shoppingBudget.mjs | Aviso de orçamento pode aparecer no ponto errado | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C30 | `suggestCuts` — Cinco cortes insuficientes e itens com frequências muito díspares. | src/shoppingBudget.mjs | Cortes sugeridos podem ser insuficientes | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C31 | `sanitizePurchases` — Data impossível, chave com DV inválido ou total divergente. | src/shoppingData.mjs | Validação pode produzir resultado inconsistente na condição indicada | Média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C32 | `sanitizeShoppingItems` — Teste direto do módulo e conflito de IDs no backup. | src/shoppingData.mjs | Backup pode restaurar estado inconsistente | Média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C33 | `displayName` — Nome híbrido com marca e medida em caixa alta. | src/shoppingHistory.mjs | Marca e medida podem aparecer com grafia ambígua | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C34 | `expenseDraftFromPurchase` — Compra restaurada sem data ou identificador. | src/shoppingHistory.mjs | Despesa pode perder data ou vínculo | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C35 | `priceTrend` — Mesmo dia com múltiplos pontos e preço anterior zero. | src/shoppingHistory.mjs | Validação pode produzir resultado inconsistente na condição indicada | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C36 | `purchasesByDate` — Desempate de compras com data e horário idênticos. | src/shoppingHistory.mjs | Compras empatadas podem trocar de posição | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C37 | `searchProducts` — Consulta Unicode decomposta com espaços incomuns. | src/shoppingHistory.mjs | Pesquisa pode omitir um produto válido | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C38 | `matchListToNota` — Lista cheia com muitos itens muito parecidos. | src/shoppingMatch.mjs | Pareamento pode ficar lento ou marcar produto parecido | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C39 | `scorePair` — Palavra repetida e variantes de embalagem concorrentes. | src/shoppingMatch.mjs | Validação pode produzir resultado inconsistente na condição indicada | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C40 | `tokenMatch` — Acentos decompostos e limite de três caracteres. | src/shoppingMatch.mjs | Variação de grafia pode alterar o pareamento | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C41 | `tokens` — Número grudado em nome de marca e plural irregular. | src/shoppingMatch.mjs | Marca ou plural pode ser separado incorretamente | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C42 | `priceSummary` — Pontos ausentes após remoção do histórico retido. | src/shoppingPurchases.mjs | Resumo pode ficar vazio ou exibir preço obsoleto | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C43 | `productsOf` — Catálogo ausente ou nulo. | src/shoppingPurchases.mjs | Catálogo ausente pode bloquear a tela | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C44 | `purchasesOf` — Histórico ausente ou nulo. | src/shoppingPurchases.mjs | Histórico ausente pode bloquear a tela | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C45 | `purchaseRhythm` — Histórico truncado e alteração recente do intervalo de compra. | src/shoppingRhythm.mjs | Dia de reposição pode ser impreciso | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C46 | `restockCandidates` — Vários produtos com nomes quase iguais já pendentes. | src/shoppingRhythm.mjs | Sugestão pode ocultar produto diferente | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C47 | `applySuggestedPrices` — ID repetido em estado corrompido e lista de IDs vazia. | src/shoppingSuggestPrice.mjs | Seleção vazia pode alterar a lista | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C48 | `suggestPrices` — Muitos candidatos com o mesmo prefixo e empate de qualidade. | src/shoppingSuggestPrice.mjs | Desempate pode sugerir produto parecido | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C49 | `formatElapsed` — Valores grandes de tempo que excedem o inteiro seguro. | src/shoppingTrip.mjs | Tempo de compra pode ser exibido incorretamente | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C50 | `nextToGet` — Limite fracionário e entradas com a mesma ordenação. | src/shoppingTrip.mjs | Sugestões seguintes podem trocar de ordem | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C51 | `pendingByCategory` — Rótulo de categoria ausente e categoria duplicada com caixa diferente. | src/shoppingTrip.mjs | Itens podem ficar em grupos duplicados | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C52 | `endSession` — Integração com a limpeza do armazenamento. | src/shoppingTripSession.mjs | Sessão encerrada pode reabrir | Baixa | M | Teste adicional em Android ou provedor simulado e contrato do fluxo | Após lote |
| C53 | `parse` — Timestamp inválido e mudanças de relógio no aplicativo real. | src/shoppingTripSession.mjs | Sessão pode parecer ativa após mudança de relógio | Baixa a média | M | Teste adicional em Android ou provedor simulado e contrato do fluxo | Após lote |
| C54 | `parseSession` — Visto pelo alias parse. Falta teste direto no limite máximo de timestamp. | src/shoppingTripSession.mjs | Sessão extrema pode ficar inválida ou parecer válida | Baixa a média | P | Teste de fronteira e confirmação do contrato | Após lote |
| C55 | `resumeSession` — Configuração inválida e sessão aberta em dois fluxos concorrentes. | src/shoppingTripSession.mjs | Duas retomadas podem divergir | Baixa a média | M | Teste adicional em Android ou provedor simulado e contrato do fluxo | Após lote |
| C56 | `serialize` — Serialização com valor fora do limite de timestamp. | src/shoppingTripSession.mjs | Marca de sessão inválida pode ser salva | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C57 | `serializeSession` — Visto pelo alias serialize. Falta teste direto com sessão inválida. | src/shoppingTripSession.mjs | Sessão inválida pode ser serializada | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |
| C58 | `startSession` — Fronteira superior de timestamp permitido. | src/shoppingTripSession.mjs | Sessão pode guardar horário fora do intervalo | Baixa | P | Teste de fronteira e confirmação do contrato | Após lote |

Fontes locais: [Revisão do pacote 6](REVISAO-PACOTE-6.md), [Revisão da WebView](REVISAO-SEGURANCA-WEBVIEW-2.md), [Cobertura da lista](COBERTURA-LISTA-DE-COMPRAS.md) e [reproduções completas das 30 falhas históricas](INTEGRACAO-PACOTE-5-E-6.md).

## Primeiro lote de correção

1. **W01** — Validar origem real, frame principal e tentativa ativa da ponte. Testar mensagem vinda de iframe em harness local.
2. **W02** — Bloquear saída para outros apps e negar navegação quando a decisão expirar.
3. **W03** — Limitar volume antes de cruzar a ponte e evitar leitura periódica desnecessária do texto.
4. **W04** — Medir subrecursos e sessão no Android e ajustar a política de isolamento e a mensagem da tela ao resultado.
5. **W05** — Medir tempo e memória do leitor no Hermes com HTML sintético de tamanhos limítrofes.
6. **W06** — Substituir a substring de caminho pela rota fiscal efetivamente reconhecida e manter a checagem de igualdade do documento.
7. **W07** — Preservar a mensagem específica de recusa com vínculo à tentativa ativa.
8. **W08** — Validar redirecionamentos legítimos antes de mudar a política de destinos.
9. **E01** — Ignorar o cabeçalho “Lista 🛒” ao importar texto compartilhado.
10. **E02** — Diferenciar as descrições das despesas divididas por categoria.
