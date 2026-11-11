# Revisão estática de acessibilidade da lista de compras

Escopo de leitura: `ShoppingTripScreen.tsx`, `PurchasesScreens.tsx`, `ScanNotaScreen.tsx`, `NfceConsultaScreen.tsx`, `ShoppingPastePanel.tsx` e `ShoppingScreen.tsx`. Foram conferidos também os componentes chamados em `src/ui/kit.tsx`, as cores de `src/ui/theme.tsx`, a barra da lista em `App.tsx` e `RestockList.tsx`. WCAG 2.2 é a referência para contraste, ordem, nome, redimensionamento e mensagens de estado. [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Rótulos e informação falada

| Gravidade | Arquivo e linha | Achado | Correção sugerida |
| --- | --- | --- | --- |
| Alta | `src/screens/ShoppingTripScreen.tsx:40` | O resumo acessível substitui os filhos, mas omite a estimativa restante e total e a contagem pendente sem preço. O usuário pode finalizar sem ouvir esses valores (1.3.1). | Incluir as estimativas e contagens no resumo falado ou expor esses elementos individualmente. |
| Alta | `src/screens/ShoppingTripScreen.tsx:129` | O rótulo da caixa inclui nome, quantidade e estado, mas omite o preço exibido na mesma linha, o que impede comparar preços pelo leitor de tela (1.3.1). | Incluir total falado ou “sem preço” no rótulo da linha. |
| Alta | `src/screens/PurchasesScreens.tsx:69` | O rótulo explícito da compra inclui loja, data e quantidade, mas omite o valor exibido, necessário para comparar compras (1.3.1). | Acrescentar o valor falado ao rótulo. |
| Média | `src/screens/ShoppingScreen.tsx:223` | A ação de editar substitui o texto da linha por “Editar [nome]”, perdendo quantidade e preço na navegação linear (1.3.1). | Incluir quantidade e preço da linha no nome acessível. |
| Média | `src/screens/ScanNotaScreen.tsx:132` | O botão da lanterna tem nome de ação, mas não informa estado ligado/desligado separadamente (4.1.2). | Expor o estado da lanterna como alternância e manter um nome estável. |
| Média | `src/screens/ShoppingScreen.tsx:281` | A lista de opções de categoria comunica seleção por aba, sem nome de grupo que explique a função de classificação (4.1.2). | Rotular o conjunto “Categoria do item” e expor as opções como seleção única. |

## Ordem de foco e carregamento

| Gravidade | Arquivo e linha | Achado | Correção sugerida |
| --- | --- | --- | --- |
| Média | `src/screens/ShoppingScreen.tsx:73` e `:116` | Colar substitui o botão pela edição em linha. Editar insere campos após a linha. Ao abrir ou fechar, não há transferência ou restauração de foco explícita (2.4.3). | Focar o campo inicial após a abertura e devolver o foco ao gatilho ao fechar. |
| Média | `src/screens/ShoppingTripScreen.tsx:75` e `:89`, `src/screens/ShoppingScreen.tsx:104` | Alternar o carrinho move a linha entre grupos e pode desmontar o alvo em foco (2.4.3). | Manter o foco na próxima linha lógica ou na linha movida e anunciar a mudança. |
| Média | `src/screens/ShoppingScreen.tsx:168` e `App.tsx:496` | O botão Desfazer aparece ao fim do conteúdo e a barra de entrada fica depois da rolagem na árvore. Um anúncio educado existe, mas o acesso à ação pode exigir percorrer a lista (2.4.3). | Expor a ação perto do item removido e oferecer acesso previsível ao campo Adicionar no início da navegação. |
| Média | `src/screens/ShoppingPastePanel.tsx:109`, `:115`, `:118` e `:132` | Interpretação e gravação mudam o nome de botões desativados e os avisos surgem em regiões recém-montadas, com anúncio incerto no Android (4.1.3). | Manter uma região de estado sempre montada para “Interpretando”, “Adicionando”, falha e contagem da prévia. |
| Média | `src/screens/ScanNotaScreen.tsx:111` e `:172` | Verificação de permissão monta a região com texto e a leitura da foto depende do nome de um botão desativado (4.1.3). | Usar uma região de estado persistente para permissão, leitura e erro. |
| Média | `src/screens/NfceConsultaScreen.tsx:217`, `:260` e `:286` | Consultar já tem região educada, mas a troca para prévia não mantém a região e a abertura da prévia não define foco para o resultado (2.4.3, 4.1.3). | Manter uma região estável de consulta e focar o título ao mostrar a prévia ou o erro. |
| Média | `src/screens/PurchasesScreens.tsx:36` e `:91` | O seletor tem rótulo e estado, mas o filtro de produto atualiza a lista sem anúncio da contagem (4.1.3). | Anunciar a contagem em região persistente após uma pausa na digitação. |

## Fonte a 200% e alvos de toque

| Gravidade | Arquivo e linha | Achado | Correção sugerida |
| --- | --- | --- | --- |
| Média | `src/screens/PurchasesScreens.tsx:36`, `src/ui/kit.tsx:529` | O seletor força uma linha e reduz a fonte para caber. “Compras” e “Produtos” precisam ser conferidos em faixa estreita com fonte ampliada (1.4.4). | Permitir rótulos em múltiplas linhas ou empilhar as opções em telas estreitas. |
| Média | `src/screens/ShoppingTripScreen.tsx:151`, `src/screens/ShoppingScreen.tsx:228`, `src/screens/PurchasesScreens.tsx:75`, `:113`, `:173`, `:252` | O limite de uma ou duas linhas trunca nomes longos mais cedo em fonte ampliada (1.4.4). | Liberar quebras no modo de fonte ampliada e posicionar valor abaixo do nome quando o espaço exigir. |
| Média | `src/screens/NfceConsultaScreen.tsx:196`, `:197` e `:244` | A conferência limita nomes a uma linha e a prévia limita a duas. Isso dificulta distinguir variantes e ler “menos que o pedido” (1.4.4). | Permitir múltiplas linhas nos nomes e mover a ressalva de quantidade para texto separado. |
| Média | `src/screens/ShoppingPastePanel.tsx:122` e `src/ui/kit.tsx:816` | Nome, unidade e ícone dividem a mesma linha. Botões com ícone e título longo também usam linha horizontal, um risco de compressão a 200%. | Testar com largura estreita e empilhar quantidade ou ações quando a linha perder espaço. |
| Baixa | `src/screens/ShoppingScreen.tsx:281` e `src/ui/kit.tsx:463`, `:758` | A cápsula de categoria tem 40 dp visuais. Com 4 dp de hitSlop em cima e embaixo, a área teórica é 48 dp, limitada pelos limites do pai. | Confirmar o alvo efetivo e usar altura mínima de 44 dp se a área expandida for cortada. |

Nenhum alvo efetivo abaixo de 44 dp foi confirmado pela leitura. Os quadrados de 24 e 28 dp são desenhos internos de controles de 48, 56 ou 60 dp. O kit usa 48 dp para ícones, 52 dp para botões e 44 dp para segmentos. A meta de 44 dp vem deste roteiro de auditoria. O mínimo WCAG 2.2 AA para alvos na Web é 24 CSS px com exceções. [W3C Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

## Contraste medido

Razões calculadas em sRGB por luminância relativa, com o maior valor sobre o menor após adicionar 0,05 a ambos. Texto comum tem limiar de 4,5:1. Texto grande e informação gráfica essencial usam 3:1. A cor `#FBB202` é do calendário e dos tipos de gasto. O Solar de `src/ui/theme.tsx` é `#FFCB45`. [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

| Frente | Fundo | Razão |
| --- | --- | ---: |
| `#FBB202` | `#FFFFFF` | 1,83:1 |
| `#FBB202` | `#1D1D20` | 9,19:1 |
| `#FFCB45` | `#FAF5EF` | 1,40:1 |
| `#FFCB45` | `#FFFFFF` | 1,51:1 |
| `#311E0D` | `#FFFFFF` | 15,88:1 |
| `#705C4B` | `#FFFFFF` | 6,32:1 |
| `#94621C` | `#FAF5EF` | 4,82:1 |
| `#B53846` | `#FAF5EF` | 5,35:1 |
| `#E4D6C8` | `#FFFFFF` | 1,42:1 |
| `#E4D6C8` | `#FAF5EF` | 1,31:1 |
| `#311E0D` | `#F0E3D4` | 12,59:1 |
| `#F4F4F2` | `#1D1D20` | 15,27:1 |
| `#A3A3A8` | `#1D1D20` | 6,70:1 |
| `#311E0D` | `#FFCB45` | 10,50:1 |
| `#FFCB45` | `#2A2A2E` | 9,45:1 |
| `#FFCB45` | `#0E0E10` | 12,75:1 |
| `#2E2E33` | `#1D1D20` | 1,24:1 |
| `#2E2E33` | `#0E0E10` | 1,43:1 |
| `#94621C` | `#FFFFFF` | 5,22:1 |

| Gravidade | Arquivo e linha | Achado | Correção sugerida |
| --- | --- | --- | --- |
| Média | `src/screens/ScanNotaScreen.tsx:132`, `src/ui/theme.tsx:14` | A lanterna ativa usa o destaque Solar de 1,40:1 sobre o fundo claro, abaixo de 3:1 para o ícone que comunica a ação (1.4.11). | Usar marrom no símbolo sobre fundo claro e reservar o amarelo para o preenchimento. |
| Média | `src/ui/kit.tsx:287`, `:851`, `src/ui/theme.tsx:10`, `:28` | O contorno dos campos é 1,42:1 sobre branco e 1,24:1 sobre a superfície escura. Se o contorno for a única delimitação visível, fica abaixo de 3:1 (1.4.11). | Adotar um token de contorno de campo com contraste suficiente contra a área adjacente. |
| Baixa | `src/screens/ScanNotaScreen.tsx:127` | A moldura da câmera usa destaque sobre a imagem, um fundo variável sem contraste garantido. | Usar contorno duplo claro/escuro para indicar a moldura em cenas claras e escuras. |
| Baixa | `src/calenTheme.mjs:16`, `src/spendTypes.mjs:13` | O amarelo solicitado `#FBB202` tem 1,83:1 sobre branco. É inadequado para texto ou ícone essencial nesse par. | Quando houver texto ou ícone significativo sobre branco, usar frente mais escura ou combinar o amarelo com uma marca de alto contraste. |

**Veredito estático:** há informação essencial omitida nos rótulos de carrinho e histórico. Ficaram pendentes a ordem real com TalkBack e teclado, a entrega de anúncios, o tamanho efetivo dos alvos e a visualização a 200% nos dois temas. O roteiro de emulador indica os cenários que precisam de conferência.
