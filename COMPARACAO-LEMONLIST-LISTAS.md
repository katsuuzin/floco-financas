# Comparação: Lista de Compras do Lemonlist × Floco (Fase 2)

Base: `AUDITORIA-LEMONLIST-LISTAS.md` (Fase 1) e leitura do código do Floco em 11/11/2026 (`ShoppingScreen.tsx`, `ShoppingTripScreen.tsx`, `shopping.mjs`, `shoppingData.mjs`, `shoppingLists.mjs`, `ui/motion.tsx`, `ui/pickers.tsx`, `app/store.tsx`, `App.tsx`). Nenhum código foi alterado.

**Esforço:** P = pequeno (horas, só tela) · M = médio (tela + dados ou componente novo) · G = grande (gesto nativo, tela nova ou mudança de dados em vários lugares). **⚑** = precisa de decisão do dono (Fase 3). **◆** = gesto que pode pedir dependência nativa (`react-native-gesture-handler`/`reanimated`, nenhuma instalada) ou `PanResponder` + `Animated` do próprio React Native.

## 1. Listas (visão geral)

| # | Lemonlist faz | Floco faz hoje | Diferença | Esforço |
|---|---|---|---|---|
| 1 | Tela "Listas" com um **cartão por lista** (nome grande, N itens, Faltam · No carrinho · Prévia); tocar abre a lista | Seletor "Minha lista ▾" no topo abre a folha "Gerenciar listas" (`Choice` + botões) | Falta a tela de visão geral e o resumo por lista | G ⚑ |
| 2 | Toque longo → modo de edição; **arrastar reordena**; Cancelar desfaz tudo; Concluir | Sem ordem manual (ordem de criação) | Falta ordem e modo de edição; campo novo opcional de ordem | G ◆ ⚑ |
| 3 | **Divisores** (grupos de listas), criados no modo de edição | Não existe | Falta; campo novo opcional `group` na lista | M ⚑ |
| 4 | "Nova lista": nome, cor, grupo; criar **abre a lista** | "Criar lista": só nome; a nova fica ativa (`createShoppingList` já troca) | Faltam cor e grupo. Personagem fica fora (identidade do Lemonlist) | P–M |
| 5 | Lápis no cabeçalho → "Editar lista" (nome, cor, grupo, **Apagar lista** com "O que muda / O que fica" e Desfazer) | "Renomear lista" e "Excluir lista" separados no Gerenciar; excluir **arquiva** (confirmação simples) | Juntar numa folha; confirmação no formato muda/fica | P |
| 6 | Trocar de lista: voltar e tocar outro cartão | Trocar pelo seletor sem sair da tela | Depende do item 1 | — |

## 2. Cabeçalho da lista

| # | Lemonlist faz | Floco faz hoje | Diferença | Esforço |
|---|---|---|---|---|
| 7 | Nome da lista grande, "X de Y no carrinho" e **PRÉVIA** no alto; rola junto | Resumo (pendentes, estimativa, no carrinho) **no fim** da lista, depois dos itens | Subir o resumo e usar o formato "X de Y" | P |
| 8 | Pílula **"Começar compra"** no cabeçalho; some com a lista vazia | Botão "Modo compra" na coluna de botões do fim (já some com a lista vazia) | Só posição e forma | P |
| 9 | Botão **compartilhar** → folha com prévia do texto, **Copiar** e **Enviar para…** (convite por link fica fora do escopo) | 3 botões: "Compartilhar lista" (abre o Share do Android direto), "Compartilhar código", "Exportar em CSV" | Uma folha com prévia e as opções do Floco dentro | M |
| 10 | — | Desfazer / Refazer no topo (ícones) | Só no Floco; manter | — |

## 3. Adicionar item

| # | Lemonlist faz | Floco faz hoje | Diferença | Esforço |
|---|---|---|---|---|
| 11 | Barra de adicionar **no alto**, dentro do cabeçalho (rola junto) | Barra **fixa na base** (`ShoppingAddBar` em `App.tsx`), acima do teclado | Posição. A base foi escolha pelo polegar (crítica Impeccable) | P–M ⚑ |
| 12 | **Botão de categoria** à esquerda: o ícone muda para a categoria adivinhada **enquanto se digita**; tocar abre a folha de categorias para trocar antes de adicionar | Categoria adivinhada só ao gravar (`categorize`), invisível; troca só na edição | Falta botão, prévia ao vivo e escolha manual | M |
| 13 | "+" desativado com o campo vazio | Igual (opacidade 0,35) | — | — |
| 14 | Enter adiciona, limpa e mantém o foco | Igual (`blurOnSubmit={false}`) | — | — |
| 15 | — | Autocompletar em chips (`suggestNames`) | Só no Floco; manter | — |
| 16 | Atalhos **Falar · Colar lista · Escanear** logo abaixo da barra | "Colar lista" no fim da tela; "Escanear produto" e "Ler nota fiscal" como botões grandes; **sem Falar** | Mover para atalhos sob a barra (P). Falar exige reconhecimento de voz: dependência nova, fora da E1 | P / G ⚑ |
| 17 | Bloco **"Acabou de entrar"** no topo (6 a 8 s, com linha de contagem e atalhos Editar / ✓) | O item entra direto no grupo; aviso "item adicionado" por 5 s | Falta | M |
| 18 | 18 categorias + **criar categoria** com ícone | 11 categorias fixas (`SHOPPING_CATEGORIES`) | Mais categorias ou categorias próprias mexem em dados, histórico e backup | M–G ⚑ |
| 19 | — | "Está acabando" (`RestockList`) dentro da barra da base | Só no Floco; definir onde fica se a barra subir | — ⚑ |

## 4. Linha do item

| # | Lemonlist faz | Floco faz hoje | Diferença | Esforço |
|---|---|---|---|---|
| 20 | Linha em **pílula** própria: círculo de marcar (alvo 59 dp), nome, **chip "2×"**, preço à direita | Linhas dentro de uma caixa por categoria; caixa quadrada de 24 dp em alvo de 48 dp; nome e "2x · R$" embaixo; **lixeira sempre visível** | Formato da linha, chip de quantidade, preço à direita | M |
| 21 | Ícone da categoria em **círculo colorido** (Modo compra, Acabou de entrar) | Ícone Lucide sem fundo, só no cabeçalho do grupo | Permitido pelo pedido; cor por categoria com tokens do Floco | P–M ⚑ |
| 22 | **Deslizar para a direita = marcar** (fundo cresce da esquerda) | Não existe (DESIGN: "Sem gesto de deslizar") | Falta | G ◆ ⚑ |
| 23 | **Deslizar para a esquerda**: curto revela Editar e Excluir; longo (>60%) exclui com Desfazer | Lixeira visível exclui na hora | Falta; botões continuam para leitor de tela | G ◆ ⚑ |
| 24 | Toque no corpo abre a folha do item | Igual (abre "Editar item") | — | — |
| 25 | Cabeçalho de categoria some quando o grupo esvazia | Igual (`groupByCategory`) | — | — |
| 26 | No carrinho, o mais recente fica **no topo** | Ordem de inserção | Falta registrar quando entrou no carrinho (campo opcional) | P |
| 27 | — | Busca na lista (mais de 8 itens) | Só no Floco; manter | — |

## 5. Estados do item

| # | Lemonlist faz | Floco faz hoje | Diferença | Esforço |
|---|---|---|---|---|
| 28 | **Não tinha** (volta aos pendentes com "não encontrado no mercado") e **Depois** (seção "Fica pra depois") | Só pendente / no carrinho (`inCart`) | Campo novo opcional de estado; afeta Modo compra, Registrar despesa, limpar carrinho, compartilhar, recorrentes e backup | M–G |

## 6. Folha do item

| # | Lemonlist faz | Floco faz hoje | Diferença | Esforço |
|---|---|---|---|---|
| 29 | Campo **Nome** separado; o nome é aprendido para a próxima vez | "Nome e quantidade" num campo só ("2 leite") | Separar nome e quantidade | M |
| 30 | **Por unidade \| Por peso**; no peso, preço do quilo e campo em g | Unidade embutida no texto (g, kg, l, ml); preço da porção | Seletor e cálculo por quilo | M |
| 31 | Quantidade com **− / +** | Só pelo texto | Falta | P |
| 32 | Preço com estimativa e faixa (região ou IA, fora do escopo) | Preço; sugestão do histórico num cartão separado na tela | Mostrar o preço do histórico dentro da folha | P |
| 33 | **Foto** e **Detalhes** (marca, sabor…) | Não existe | Detalhes: campo opcional (P). Foto: câmera já existe (`expo-camera`), mas guardar imagem pesa no backup | P / M ⚑ |
| 34 | 3 botões grandes: **Comprado / Não tinha / Depois**; agem e fecham a folha | Não existe | Depende do 28 | P |
| 35 | Categoria em chips horizontais **com ícone** | `Choice` com nomes, sem ícone | Pôr ícone | P |
| 36 | Rodapé fixo: **Tirar da lista** \| **Concluir** | Salvar \| Cancelar no fim da rolagem | Rodapé fixo e excluir pela folha | P |
| 37 | — | Recorrente ("Sempre comprar") e Promoção | Só no Floco; manter na folha | — |

## 7. Excluir, limpar e desfazer

| # | Lemonlist faz | Floco faz hoje | Diferença | Esforço |
|---|---|---|---|---|
| 38 | Link **"Tirar da lista"** no cabeçalho da seção No carrinho; confirmação **"O que muda / O que fica"** | Botão "Remover itens do carrinho" no fim; confirmação simples | Mover e criar o componente de confirmação muda/fica (alvo de 48 dp, não 20) | P–M |
| 39 | Excluir mostra aviso com botão **Desfazer** (9 a 10 s) | Exclui; aviso "item removido" por **5 s, sem botão**; desfazer só pelo ícone do topo. O DESIGN.md fala em 7 s, mas o código usa 5 s | Botão Desfazer no aviso e tempo maior para exclusões | P–M |

## 8. Modo compra

| # | Lemonlist faz | Floco faz hoje | Diferença | Esforço |
|---|---|---|---|---|
| 40 | Preparo: escolher **várias listas**, loja ou online, mercado; Cancelar / Começar | Entra direto na lista ativa; tem limite de gasto | Escolha de listas (M). Mercado e loja/online fora do escopo | M ⚑ |
| 41 | Ordenar por corredor, botão **EM FALTA**, ícone em círculo, Terminar compra | Grupos por categoria, No carrinho, Registrar despesa, Ler nota | "Em falta" depende do 28; ícone em círculo do 21 | M |

## 9. Movimento (IDs da auditoria)

| ID | Lemonlist | Floco hoje | Diferença | Esforço |
|---|---|---|---|---|
| A1 | Cartão levanta (+2%, sombra) e segue o dedo; vizinho abre espaço | — | Depende do 2 | G ◆ |
| A2/A3 | Linha segue o dedo; ações esmaecem; faixa "solte para excluir"; recolhe em ~200 ms | — | Depende do 22/23 | G ◆ |
| A4 | Marcar: a linha **voa** para No carrinho (~150 ms) e as outras assentam (~200 ms) | Troca seca | Dá para fazer com `LayoutAnimation` do RN, sem dependência | M |
| A5 | "Acabou de entrar" com linha que esvazia | — | Depende do 17 | P |
| A6 | Folha sobe com desaceleração (~350–400 ms); fundo escurece **e desfoca** | `Modal` com `animationType="slide"` e fundo escurecido (`c.scrim`), sem desfoque | Curva própria (P). Desfoque pede `expo-blur` (dependência nova) | P / M ⚑ |
| A7 | Lista entra deslizando da direita; cartões voltam em cascata (~50 ms entre eles) | Transição padrão das telas | Cascata depende do 1 | M |
| A8 | Cartão afunda ~0,98 ao pressionar | Já existe: `MotionPressable` tipo `row` (0,985) | — | — |
| A9 | Aviso sobe do rodapé (~150 ms), 9 a 10 s | Snackbar de 5 s | Ver 39 | P |
| A10 | Modo de edição esmaece o fundo (~200 ms) | — | Depende do 2 | P |

"Remover animações" do Android: o Floco já lê (`useReduceMotion`); todo movimento novo deve passar por ele.

## 10. Acessibilidade

O Floco já cumpre 48 dp em todos os controles da lista. No Lemonlist ficam abaixo: botões do cabeçalho (42 dp), atalhos Falar/Colar/Escanear (37 dp), "Tirar da lista" (20 dp), "Criar divisor" (30 dp) e Desfazer (37 dp). Na versão Floco, esses alvos sobem para 48 dp. Gestos de deslizar e arrastar precisam de botões ou ações de acessibilidade equivalentes (como o Lemonlist faz com Editar/Excluir).

## 11. Só no Floco (não podem sumir sem decisão)

Registrar a compra como despesa (uma ou por categoria), preços do histórico, exportar CSV, código de compartilhamento, recorrentes, promoções, "Está acabando", Desfazer/Refazer no topo, modelos de lista, recuperar lista excluída, busca na lista, autocompletar, limite de gasto no Modo compra, Escanear produto, Ler nota fiscal, Histórico de compras e o bloco da Início.

## 12. Fora do escopo

Convidar pessoas e link de convite, dividir gastos, personagens, estimativa de preço por IA ou região, achar mercado, compra online.

## Resumo do esforço

- **Pequeno (rearrumar tela, sem dados novos):** 5, 7, 8, 16 (sem Falar), 31, 32, 35, 36, A5, A9, A10.
- **Médio:** 3, 9, 12, 17, 20, 21, 26, 29, 30, 38, 39, 40, 41, A4, A7.
- **Grande:** 1 e 2 (visão geral e reordenar), 22 e 23 (deslizar), 28 (estados), 18 (categorias próprias), Falar.
- **Decisões para a Fase 3:** dependência de gesto (◆), trocar "sem deslizar" no DESIGN.md, barra no alto ou na base, cartões ou seletor, ícones em círculo, mais categorias, foto do item, Falar, desfoque das folhas, várias listas no Modo compra e onde fica o "Está acabando".
