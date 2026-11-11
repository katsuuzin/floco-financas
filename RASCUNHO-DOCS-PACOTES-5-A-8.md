# Rascunho para integrar os pacotes 5 a 8

As entradas abaixo são propostas para revisão antes de entrar nos três documentos existentes. A lista principal, o Modo compra atual, o histórico, a leitura de nota e a colagem já têm telas. O status das linhas descreve os módulos adicionados nos pacotes, que ainda precisam de ligação à interface.

## Entrada para INVENTARIO-FUNCIONAL.md

| Pacote | Módulo | Função | Status |
| --- | --- | --- | --- |
| 5 | `shoppingSuggestPrice.mjs` | Sugerir preços do histórico com confirmação. | Lógica pronta, sem tela |
| 5 | `barcode.mjs` | Normalizar e validar EAN/UPC. | Lógica pronta, sem tela |
| 5 | `scanProduct.mjs` | Resolver leitura de produto com consulta opcional. | Lógica pronta, sem tela |
| 5 | `shoppingTripSession.mjs` | Persistir e retomar o início do Modo compra. | Lógica pronta, sem tela |
| 5 | `shoppingAisles.mjs` | Ordenar corredores e aprender de sessões. | Lógica pronta, sem tela |
| 5 | `shoppingBudget.mjs` | Acompanhar limite e sugerir cortes. | Lógica pronta, sem tela |
| 6 | `shoppingStaples.mjs` | Planejar reposição de itens básicos. | Lógica pronta, sem tela |
| 6 | `shoppingStores.mjs` | Comparar preços e cobertura por loja. | Lógica pronta, sem tela |
| 6 | `shoppingInflation.mjs` | Medir variação pessoal de preços. | Lógica pronta, sem tela |
| 6 | `shoppingRunOut.mjs` | Selecionar avisos locais de itens acabando. | Lógica pronta, sem tela |
| 6 | `shoppingSplit.mjs` | Dividir o carrinho em despesas por categoria. | Lógica pronta, sem tela |
| 6 | `shoppingDeals.mjs` | Calcular promoções e economia em centavos. | Lógica pronta, sem tela |
| 6 | `shoppingImportShared.mjs` | Ler texto compartilhado e caixas de seleção. | Lógica pronta, sem tela |
| 6 | `shoppingExport.mjs` | Gerar CSV e validar histórico JSON. | Lógica pronta, sem tela |
| 7 | `hardened.mjs` | Funções alternativas para validação e aritmética. Os originais têm correções próprias. | Lógica pronta, sem tela |
| 7 | `shoppingBackupCheck.mjs` | Diagnosticar erros e referências órfãs no backup. | Lógica pronta, sem tela |
| 7 | `shoppingBackupRepair.mjs` | Propor reparo guiado com registro de ações. | Lógica pronta, sem tela |
| 7 | `shoppingMerge.mjs` | Mesclar listas por ID e marca de remoção. | Lógica pronta, sem tela |
| 7 | `shoppingUndo.mjs` | Manter histórico de desfazer e refazer. | Lógica pronta, sem tela |
| 7 | `shoppingSearch.mjs` | Buscar lista e histórico com tolerância a erro de digitação. | Lógica pronta, sem tela |
| 7 | `shoppingAutocomplete.mjs` | Sugerir nomes recentes e frequentes. | Lógica pronta, sem tela |
| 7 | `shoppingLists.mjs` | Administrar várias listas e modelos. | Lógica pronta, sem tela |
| 7 | `shoppingReport.mjs` | Calcular o relatório mensal da lista. | Lógica pronta, sem tela |
| 7 | `shoppingDuplicates.mjs` | Detectar compras duplicadas e sugerir mesclagem. | Lógica pronta, sem tela |
| 8 | `shoppingSpeech.mjs` | Montar rótulos falados com números em dígitos. | Lógica pronta, sem tela |
| 8 | `shoppingKeyMigration.mjs` | Migrar chaves de produto e referências de compras. | Lógica pronta, sem tela |
| 8 | `shoppingUnits.mjs` | Interpretar embalagem e comparar preço por medida. | Lógica pronta, sem tela |
| 8 | `shoppingCategoryLearn.mjs` | Aprender categorias corrigidas. | Lógica pronta, sem tela |
| 8 | `shoppingRecipe.mjs` | Escalar ingredientes e gerar itens da lista. | Lógica pronta, sem tela |
| 8 | `shoppingShareCode.mjs` | Compartilhar lista por código local sem preços. | Lógica pronta, sem tela |
| 8 | `shoppingReconcile.mjs` | Encontrar despesas existentes e indicar possíveis duplicatas. | Lógica pronta, sem tela |
| 8 | `nfceXml.mjs` | Ler arquivo XML da NFC-e localmente. | Lógica pronta, sem tela |

As revisões, roteiros, testes de regressão e `tests/helpers/shoppingFixtures.mjs` são ferramentas de verificação. O pacote 8 mantém testes “Achado:” para comportamentos conhecidos do código existente. A [revisão de importadores](REVISAO-SEGURANCA-IMPORTADORES.md) e a [revisão de textos](REVISAO-TEXTOS-LISTA-DE-COMPRAS.md) trazem as reproduções.

## Entrada para DESIGN.md

### Modo compra

O resumo vem antes dos itens, com total do carrinho, quantidade marcada, tempo e preço desconhecido em texto. As caixas têm estado acessível e a barra de progresso tem equivalente em texto. Manter uma área de toque de pelo menos 48 dp por ação e permitir quebra de nome e valor a 200%. Ao mover uma linha entre pendentes e carrinho, preservar o próximo foco lógico.

No claro, usar fundo `#FAF5EF`, superfícies `#FFFFFF`, texto e ação primária `#311E0D`, com texto `#FFFFFF` sobre a ação. No escuro, usar fundo `#0E0E10`, superfícies `#1D1D20`, texto `#F4F4F2` e ação primária `#FFCB45`, com texto `#311E0D`. Consumir os tokens de `src/ui/theme.tsx` para respeitar o destaque escolhido. Explicar valores indisponíveis em vez de mostrar um zero que pareça um preço.

### Chips de preço sugerido

Ao integrar `shoppingSuggestPrice`, usar cápsula com texto “Preço sugerido” e valor, em superfície `soft` (`#F0E3D4` claro, `#2A2A2E` escuro) e texto do tema. Informar a origem na prévia como “Último preço” ou “Mediana das compras recentes”. A confirmação de aplicar vem depois da revisão. A cápsula interativa tem nome acessível e alvo de pelo menos 48 dp.

### Avisos de orçamento

Ao integrar `shoppingBudget`, mostrar “Dentro do orçamento”, “Perto do limite” ou “Acima do orçamento”, com valor restante ou excedente. Usar `amber` (`#94621C` claro, `#FFCB45` escuro) e `red` (`#B53846` claro, `#FF8A8A` escuro) para atenção e excesso. Incluir ícone ou texto de estado e explicitar itens sem preço. Anunciar mudanças relevantes em região educada persistente e manter sugestões de corte como ações opcionais.

## Entrada para CLAUDE.md

- O inventário acima é o índice dos módulos. Use `makeState`, `makePurchase`, `makeNota` e `seededRandom` de `tests/helpers/shoppingFixtures.mjs`. `makeNota` usa chave fictícia com DV calculado. Rode a suíte principal, TypeScript e a suíte de segurança em separado.
- Para ligar `shoppingKeyMigration`, rodar a migração após validar e ler as três coleções, antes de consultar catálogo pelo `productKey` atual. Decimal vira ponto e letras de outros alfabetos permanecem. `migrateProductKeys` devolve `{ state, merged, rekeyed }`, conserva o primeiro ID de cada grupo, soma contagem, consolida 24 pontos recentes e reaponta os itens de compra. Persistir catálogo e compras juntos. Rodar novamente é seguro e devolve o estado original quando já está migrado.
- Antes de integrar backups, alinhar o teto do importador de tela ao teto de 2 MiB do verificador. O reparo devolve ações revisáveis e sinaliza revisão manual quando o limite conflita com preservar as compras válidas. Tratar ausência das coleções de backup antigo conforme o fluxo de restauração existente.
- `shoppingShareCode` transporta nome, quantidade, unidade, categoria e estado do carrinho. O checksum detecta alteração acidental e o fluxo deve permitir revisar a prévia. O código admite nomes de até 120 caracteres. Aplicar o limite vigente da lista na confirmação.
- `shoppingCategoryLearn` armazena `shoppingCategoryRules`. O prefixo é derivado das correções exatas. `shoppingRecipe` devolve avisos e a lista proposta. Ao somar a quantidade de um item pesado, limpa o preço da porção antiga para a estimativa não ficar desatualizada.
- `shoppingReconcile` devolve uma lista de candidatas quando a melhor posição empata. Usar confirmação antes de criar ou vincular despesa. `nfceXml` recebe texto e devolve o formato da prévia fiscal. O módulo lê campos do arquivo e valida o DV, sem verificação criptográfica da assinatura.
- As medições abaixo são do Node. O [roteiro de celular real](ROTEIRO-TESTE-CELULAR-2.md) cobre câmera, TalkBack, rede, notificações e segundo plano.

## Validação de desempenho do pacote 8

Mediana de três execuções por função. Massa de 2.000 itens, 600 produtos e 5.000 compras de oito itens. As cinco medições mais altas na execução isolada foram:

| Função | Mediana |
| --- | ---: |
| `repairShoppingBackup` | 90,41 ms |
| `findDuplicatePurchases` | 68,26 ms |
| `basketInflation` | 38,32 ms |
| `basketCompare` | 20,79 ms |
| `checkShoppingBackup` | 13,90 ms |

A massa completa excede o teto de 2 MiB. Os tempos de verificação e reparo nessa massa incluem a detecção de excesso. Uma projeção menor também passa pela validação integral.
