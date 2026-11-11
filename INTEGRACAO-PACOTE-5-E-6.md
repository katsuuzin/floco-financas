# Integração dos pacotes 5 e 6 da lista de compras

O ponto de partida é a interface atual. Cada etapa abaixo indica a tela, o estado e o comportamento esperado após a integração. As estimativas incluem implementação e conferência do fluxo no Android.

## Onde ligar os módulos

| Pacote e módulo | Tela e componente | Estado e compatibilidade | Permissões, bibliotecas e privacidade |
| --- | --- | --- | --- |
| 5 · shoppingSuggestPrice.mjs | Em `src/screens/ShoppingScreen.tsx`, abrir uma revisão de preços sugeridos perto do resumo. Exibir origem e aplicar somente os itens confirmados, chamando `applySuggestedPrices`. | Usa lista e catálogo atuais. Sugestão calculada em memória. Sem histórico, a revisão fica vazia. | Sem permissões, dependências ou rede. |
| 5 · barcode.mjs | Reusar o padrão de `ScanNotaScreen` em `src/screens/ScanNotaScreen.tsx` para a câmera do atalho em `ShoppingAddBar`, em `src/screens/ShoppingScreen.tsx`. Normalizar leitura e entrada manual antes de procurar produto. | Sem campo novo. Código manual continua disponível se a câmera for recusada. | `CAMERA` ao abrir a câmera, via `expo-camera` já instalado. Normalização local. |
| 5 · scanProduct.mjs | A partir do mesmo atalho em `ShoppingAddBar`, usar `resolveScan`, `suggestItemName` e `duplicateOf` em uma prévia editável. Permitir digitar nome em caso de erro, falta de rede ou resultado ausente. | Reusar o EAN opcional do catálogo onde houver vínculo explícito. Catálogos anteriores sem EAN continuam válidos. O cache de consulta pode ficar em memória. | O adaptador de Open Food Facts é opcional. Na consulta, envia-se o código de barras, com os metadados normais da conexão HTTP. Sem foto, histórico, credencial de IA ou lista. |
| 5 · shoppingTripSession.mjs | Em `ShoppingTripScreen` de `src/screens/ShoppingTripScreen.tsx`, iniciar, retomar ao abrir, persistir ao ir para segundo plano e limpar após encerrar. | Registro local opcional com `startedAt` e `lastSeenAt`. Ausência significa sessão encerrada. Usar `parseSession` para validar e preservar o carrinho quando o relógio mudar ou a sessão expirar. | Sem permissões novas. Usar armazenamento local já existente. |
| 5 · shoppingAisles.mjs | Em `ShoppingTripScreen`, ordenar grupos e acrescentar ajuste de ordem. Aprender de sessões concluídas quando houver eventos locais suficientes. | Preferência opcional de categorias por corredor e sequência agregada por sessão. Ausência usa `aisleOrder`. Preferência manual tem prioridade. | Sem permissões, bibliotecas ou rede. |
| 5 · shoppingBudget.mjs | Em `ShoppingTripScreen`, acrescentar limite, status e ações sobre itens pendentes no resumo do carrinho. | Limite em centavos opcional por sessão ou por lista, conforme a UX escolhida. Ausência deixa o orçamento desativado. | Sem permissões, bibliotecas ou rede. |
| 6 · shoppingStaples.mjs | Em `EditPanel` de `src/screens/ShoppingScreen.tsx`, incluir “Sempre comprar” e intervalo. No encerramento em `ShoppingScreen` e `ShoppingTripScreen`, registrar `lastRestockedAt` dos básicos concluídos, atualizar a lista e aplicar os retornos elegíveis na mesma atualização de estado. Reavaliar ao abrir a lista. | Persistir `shoppingStaples` e os campos espelhados de `shoppingItems` na sanitização de backup. Padrão vazio para instalação antiga. Ausência em arquivo restaurado preserva a configuração atual. Inserir com novo ID, respeitar o limite da lista e comparar nome normalizado e unidade. | Sem permissões, bibliotecas ou rede. Enviar a data civil local como `now`. |
| 6 · shoppingStores.mjs | Em `ShoppingScreen`, comparar pendentes. Em `ProductDetailScreen` de `src/screens/PurchasesScreens.tsx`, mostrar preços observados por loja. Expor cobertura e itens sem preço. | Derivado de `shoppingPurchases`. Sem nova coleção. Lojas com menos de 60% de cobertura ficam fora da recomendação. Valores sem observação em uma loja usam mediana de referência quando disponível. | Sem permissões, bibliotecas ou rede. A idade do preço usa a data mais recente no histórico. |
| 6 · shoppingInflation.mjs | Em `PurchasesScreen`, adicionar resumo da cesta e altas/quedas. Em `ProductDetailScreen`, mostrar a variação do produto e a janela selecionada. | Derivado do histórico. `null` indica menos de três compras comparáveis ou ausência de datas suficientes. Se salvar a janela escolhida, usar três meses na ausência da preferência. | Sem permissões, bibliotecas ou rede. |
| 6 · shoppingRunOut.mjs | Em `RestockSection` de `src/screens/PurchasesScreens.tsx`, mostrar itens com motivo e confiança. Usar `src/screens/RemindersScreen.tsx` para horários silenciosos e avisos locais. | Preferência de alertas começa desativada. Salvar horário silencioso, contagem do dia civil e IDs de agendamentos locais. Deduplicar ao reabrir a tela ou reagendar. `pickAlerts` limita a três por dia. | Aviso na tela sem permissões. Notificação usa `expo-notifications` existente e permissão Android de notificações quando aplicável. Conteúdo pode aparecer na tela bloqueada. |
| 6 · shoppingSplit.mjs | Na confirmação de `ShoppingScreen` e `ShoppingTripScreen`, oferecer despesa única ou por categoria. Usar `splitDraft` com `mode: "single"` ou `"category"`, exibir `unpriced` e adaptar `expenses` ao formulário em `src/screens/FormScreen.tsx`. Confirmar todas as despesas e a baixa do carrinho em conjunto. | Rascunho transitório. Persistir apenas lançamentos confirmados no formato atual. Mercado é a categoria legada. Higiene mapeia para Cuidados Pessoais › Higiene, Pet para Pets › Ração e Limpeza para Moradia ou categoria própria existente. | Sem permissões, bibliotecas ou rede. |
| 6 · shoppingDeals.mjs | Em `EditPanel`, validar com `validateDeal(deal, item)`, mostrar o aviso de desconto maior que o preço e usar `applyDeal` na prévia. Recalcular resumo, orçamento, fechamento e divisão com a mesma regra. | Promoção opcional no item se precisar sobreviver ao fechamento. Ausência usa preço anterior. Preservar preço base e permitir remover promoção. Na oferta por unidade física, `unitPrice` multiplica a quantidade. Leve X pague Y aplica a unidades inteiras sem unidade de medida. | Sem permissões, bibliotecas ou rede. |
| 6 · shoppingImportShared.mjs | Em `ShoppingPastePanel` de `src/screens/ShoppingPastePanel.tsx`, acrescentar leitura local de texto compartilhado. Mostrar ignorados, avisos e revisão antes de inserir. Preservar quantidade, unidade, categoria e caixas marcadas, quando representadas no texto. | Usa os campos existentes. Gerar IDs e respeitar o espaço disponível da lista no momento de confirmar. `shareText` publica pendentes e uma estimativa, sem os preços individuais. | Colar texto é suficiente para a primeira integração. Receber diretamente pelo menu de compartilhamento requer configuração nativa posterior. Leitura local, sem IA. |
| 6 · shoppingExport.mjs | Ação de CSV em `ShoppingScreen` e de CSV/JSON em `PurchasesScreen`. Reusar `DataToolsScreen` de `src/screens/DataToolsScreen.tsx` como referência para seletor, arquivo temporário e compartilhamento. Importar JSON em prévia antes de mesclar, reconstruir vínculos de catálogo por produto e tratar IDs repetidos. | Usa estado atual. `parsePurchasesJson` devolve as compras de `schema: 1`. Valida antes de aplicar, com limite de 16 MiB. Histórico anterior do backup segue pelo fluxo existente. CSV é formato de leitura. | `expo-file-system` e `expo-sharing` já instalados. Seletor do sistema para importação. Arquivo fica local até a escolha de destino. JSON preserva campos fiscais e vínculos existentes, e a prévia deve identificar esses dados antes do envio a outro app. |

Ao persistir campos novos, aceitar backup antigo com campos ausentes e aplicar a regra de presença usada por `keepShoppingOnRestore`. Um campo vazio e explicitamente presente significa limpar a coleção correspondente. Configurações estritamente locais, como contador de notificações e sessão temporária, ficam fora do backup compartilhável. Conferir o ciclo salvar, fechar, reabrir e restaurar antes de ligar cada ação à interface.

## Falhas reproduzidas pelos testes de lacunas

Todos os exemplos são sintéticos. As chamadas completas estão em `tests/shopping-gaps.test.mjs` e `tests/shopping-gaps-2.test.mjs`. Cada linha corresponde a um teste que falha.

| Caso | Exemplo mínimo e resultado observado |
| --- | --- |
| Lacuna 3 · data do backup | Restaurar uma compra com data `2026-02-30` passa pela validação. |
| Lacuna 4 · vínculo de catálogo | Restaurar `productId: "inexistente"` com catálogo vazio conserva o vínculo órfão. |
| Lacuna 5 · valor fiscal negativo | Ler uma linha fiscal com `-1,00` gera `100` centavos. |
| Lacuna 6 · exclusão do histórico recente | Registrar 26 compras de Arroz em dias seguidos e remover as 24 últimas deixa as duas antigas sem recomposição do último preço. |
| Lacuna 7 · compra retroativa | Registrar 24 pontos dos dias 2–25 e depois inserir uma compra do dia 1 expulsa um dos pontos mais recentes. |
| Lacuna 8 · conferência antiga | Selecionar Arroz na nota, renomear a linha da lista para Sabão e confirmar a seleção antiga ainda muda a linha. |
| Lacuna 9 · IA cancelada | Iniciar interpretação de Arroz, abortar e resolver a chamada simulada com Leite ainda aceita o resultado tardio. |
| Lacuna 10 · UF herdada | `consultUrl({ uf: "toString", chave: "0".repeat(44) })` falha fora da mensagem esperada para UF sem suporte. |
| `isChave` · coerção | Passar um objeto cujo `toString` devolve chave sintética com DV válido resulta em `true`. |
| `parseChave` · mês e UF | Chave sintética com UF `00` e mês `13` é decomposta. O export atual documenta decomposição por formato. Definir com a integração se a validação semântica fica no chamador. |
| `parseNfceInput` · parâmetro ambíguo | URL com `?p=CHAVE_A%7C3%7C1&p=CHAVE_B%7C3%7C1` aceita a primeira chave. |
| `allowedHosts` · UF herdada | `allowedHosts("toString")` devolve a propriedade herdada em vez da lista vazia. |
| `centsFromBr` · sinal | `centsFromBr("-1,00")` devolve `100`. |
| `consultSupported` · UF herdada | `consultSupported("constructor")` aceita a propriedade herdada como UF suportada. |
| `consultUrl` · DV | Informar UF SP e uma chave sintética de 44 dígitos com DV trocado ainda gera URL. |
| `nfceToPurchase` · chaves diferentes | Usar uma chave na prévia e outra em `info.chave` ainda converte a compra. |
| `parseNfceHtml` · quantidade | Linha de nota com `Rqtd=100000` passa pelo leitor embora exceda o contrato de compra. |
| `parsePastedList` · fração | Colar `½ kg de farinha` não produz Farinha com quantidade `0.5` e unidade `kg`. |
| `lineTotal` · inteiro seguro | Multiplicar `Number.MAX_SAFE_INTEGER` centavos por 100 expõe um total não seguro. A chamada direta usa estado sintético extremo. |
| `shoppingSummary` · inteiro seguro | Somar dois itens de `Number.MAX_SAFE_INTEGER` e 2 centavos expõe um total não seguro. |
| `isIsoDate` · calendário | `isIsoDate("2026-02-30")` devolve `true`. |
| `sanitizeProducts` · ponto órfão | Ponto válido com `purchaseId: ""` é aceito. A verificação de existência de IDs não vazios depende da coleção de compras durante a restauração. |
| `sanitizePurchases` · DV | Uma compra NFC-e com chave sintética de 44 dígitos e DV trocado passa no sanitizador. |
| `monthSummary` · inteiro seguro | Somar duas compras no mês com totais de `Number.MAX_SAFE_INTEGER` e 2 centavos expõe um total não seguro. |
| `priceTrend` · base zero | Dois pontos no mesmo dia, preços `0` e `100`, resultam em percentual não finito. |
| `scorePair` · palavra repetida | Comparar “Arroz arroz integral” a “Arroz branco” produz pontuação positiva. Revisar o peso da repetição para evitar aceitar variantes incompatíveis. |
| `lastKnownPrice` · valor negativo | Produto sem pontos e `lastPriceCents: -100` oferece preço negativo para a mesma unidade. |
| `normalizeName` · escrita não latina | `normalizeName("抹茶")` devolve texto vazio. |
| `productKey` · colisão | “Produto 1,5” e “Produto 1 5” geram a mesma chave. |
| `tripSummary` · inteiro seguro | Dois itens pendentes de `Number.MAX_SAFE_INTEGER` e 2 centavos expõem uma estimativa não segura. |

Lacunas 1 e 2, callback real da WebView, comportamento nativo do fetch, tempo de execução no Hermes, mudança real de relógio e autenticação em provedores dependem de teste em dispositivo ou serviço. Os testes Node usam entradas simuladas para os caminhos aplicáveis, incluindo a política de URL e respostas de IA e Open Food Facts.

## Ordem sugerida de integração

| Ordem | Etapa | Estimativa |
| --- | --- | --- |
| 1 | Sugestão de preço com revisão | 2–3 h |
| 2 | Orçamento da compra | 2–3 h |
| 3 | Importar lista compartilhada pelo painel de colagem | 2–4 h |
| 4 | Comparação por loja | 3–4 h |
| 5 | Inflação da cesta e do produto | 3–4 h |
| 6 | Retomar sessão do modo compra | 3–5 h |
| 7 | Ordenar corredores e aprender de sessões concluídas | 4–6 h |
| 8 | Itens básicos com restauração de backup | 4–6 h |
| 9 | Exportar CSV/JSON e importar histórico com revisão | 5–7 h |
| 10 | Ler código de barras e consultar produto | 5–8 h |
| 11 | Dividir a compra com confirmação conjunta | 6–8 h |
| 12 | Aplicar promoções aos totais e ao fechamento | 6–9 h |
| 13 | Integrar alertas locais com horário silencioso | 7–10 h |

A recepção pelo menu de compartilhamento do Android é opcional após a etapa 3 e acrescenta cerca de 4–6 h, incluindo instalação de teste e verificação de entrada com o app aberto e fechado.
