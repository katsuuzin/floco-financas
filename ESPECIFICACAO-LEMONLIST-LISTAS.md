# Especificação: Lista de Compras do Floco no funcionamento do Lemonlist (Fase 3)

Base: `COMPARACAO-LEMONLIST-LISTAS.md` (os números entre colchetes, como [12], são as linhas daquela tabela) e `AUDITORIA-LEMONLIST-LISTAS.md` (movimentos A1 a A10). Visual 100% Floco: tokens de `useTheme()`, `space`/`radius` do kit, fonte Sora, temas claro e escuro. Do Lemonlist só entra o **funcionamento** e o estilo de ícone de categoria em círculo colorido.

## 0. Decisões do dono (11/11/2026)

| Tema | Decisão |
|---|---|
| Gestos | `react-native-gesture-handler` + `react-native-reanimated` (com `react-native-worklets`). O app já usa a nova arquitetura (RN 0.88, `newArchEnabled=true`). |
| Deslizar | Sim. A lixeira sai da linha e aparece ao deslizar; continua na folha do item e nas ações do leitor de tela. A regra "Sem gesto de deslizar" do DESIGN.md muda quando a função for entregue. |
| Barra de adicionar | No alto, dentro do cabeçalho da lista, rolando junto. |
| Listas | Tela de visão geral com cartões, reordenar por arraste e divisores (grupos). |
| Categorias | Ampliar as fixas para 18. Itens antigos mantêm a categoria. |
| Estados | "Faltou" e "Depois", os dois. |
| Extras | Desfoque nas folhas, Falar a lista, Foto do item, Detalhes do item. |

**Itens marcados com 🔸 eram propostas minhas; todas foram aprovadas em 11/11/2026** (lista na seção 12).

## 1. Dependências nativas

Nada é instalado antes do passo 0 da Fase 4, que inclui um build de teste. Se o build quebrar, paro e aviso. **Nunca** prebuild: o `android/` já faz autolinking. Mudanças no `AndroidManifest.xml` são feitas à mão.

| Pacote | Para quê | O que muda no projeto |
|---|---|---|
| `react-native-gesture-handler` | deslizar a linha, arrastar cartões | `GestureHandlerRootView` na raiz do `App.tsx` |
| `react-native-reanimated` + `react-native-worklets` | seguir o dedo e animar no nativo (A1 a A7) | plugin no `babel.config.js`; +2 a 3 MB no APK |
| `expo-blur` | desfoque atrás das folhas (A6) | no Android, `BlurTargetView` em volta do conteúdo e `BlurView` com `blurTarget`; sem desfoque com "remover animações" ligado (fica só o escurecido) |
| `expo-speech-recognition` (comunidade, não é do Expo) | Falar a lista | permissão `RECORD_AUDIO` e `<queries>` do serviço de voz, à mão no manifesto |
| — | Foto do item | usa o `expo-camera` e o `expo-file-system` que já existem |

Instalar sempre com `npx expo install`, para a versão casar com o Expo 58.

## 2. Dados (campos novos, todos opcionais)

| Onde | Campo | Significado | Antigo sem o campo |
|---|---|---|---|
| item | `status?: "missing" \| "later"` | Faltou / Depois | item normal |
| item | `cartAt?: number` | quando entrou no carrinho (ordena "No carrinho", mais recente no topo) [26] | ordem atual |
| item | `pricePer?: "kg"` | preço por quilo; total = preço × peso em kg [30] | preço da porção, como hoje |
| item | `details?: string` (até 120) | marca, sabor… | vazio |
| item | `photo?: string` | nome do arquivo em `documentDirectory/shopping-photos/` | sem foto |
| lista | `color?: string` | chave de cor da lista (seção 3) | cor padrão |
| estado | `shoppingListLayout?: ({ kind: "list", id } \| { kind: "divider", id, name })[]` | ordem das listas e divisores | ordem atual das listas |

Regras:
- `toggleCart` limpa `status` e grava `cartAt`.
- **Faltou** fica nos pendentes com subtítulo e entra no Modo compra como "Em falta".
- **Depois** sai dos pendentes, do "X de Y", da estimativa, do Modo compra e do texto compartilhado. Volta pelo botão "Pôr na lista" ou desmarcando o estado.
- `restockStaples` conta item com status como presente: não duplica.
- `clearCart` não mexe em Faltou nem em Depois.
- Layout: listas que não estão no layout entram no fim, e ids que não existem mais são ignorados. A migração é idempotente.
- Validadores (`shoppingData.mjs`, `validateBackup`, `keepShoppingOnRestore`) aceitam backup com ou sem os campos. Backup novo restaurado numa versão antiga perde só os campos novos (categoria nova vira "Outros").
- **🔸 A foto não entra no backup** (JSON ficaria grande): o item restaurado volta sem foto. Arquivo apagado quando o item sai de vez (fim do Desfazer, limpar comprados) e limpeza de órfãos ao abrir o app.

**Categorias (18).** As 11 atuais ficam com o mesmo nome (nenhuma migração). Entram 7 novas: **Frutas**, **Matinais** (café, cereal, achocolatado), **Bebidas alcoólicas**, **Doces e lanches**, **Bebê**, **Casa e utilidades**, **Farmácia**. O dicionário `categorize` ganha as palavras; frutas saem de Hortifrúti só para itens novos. Ícones novos desenhados em `ShoppingIcons.tsx`, no traço Lucide atual.

## 3. Tokens novos (`theme.tsx`)

- **Cores de categoria** `catColors`: 6 tons próprios, quentes e suaves (mel, terracota, oliva, petróleo, ameixa, areia), cada um com `bg` (círculo) e `fg` (ícone), em versão clara e escura. Contraste do ícone sobre o círculo de pelo menos 3:1. Cada categoria aponta para um tom fixo.
- **Cores de lista** `listColors`: 7 opções (Amarelo Floco #FFCB45, Areia, Terracota, Oliva, Petróleo, Ameixa, Grafite), com `bg` e `text` nos dois temas. Contraste do texto sobre o cartão de pelo menos 4,5:1.
- Nenhuma cor nova fora do `useTheme()`. A cor de destaque escolhida pelo usuário continua valendo para `primary`.

## 4. Visão geral "Listas" [1–6]

**Rota:** `shopping` vira a visão geral, e `shoppingList { id }` é a lista. 🔸 O "Ver" do bloco da Início empilha a visão geral e a lista ativa: o voltar da lista leva às Listas, e o voltar seguinte leva à Início.

**Layout de cima para baixo** (padding `space.lg`, gap `space.md`):
1. Linha do título: "Listas" (Sora semibold 28) e, à direita, `IconButton` "Organizar listas" (ícone `move`), que entra no modo de edição sem toque longo.
2. Linha "Nova lista": `Pressable` largura toda, altura de pelo menos 56, `c.surface`, `radius.lg`, texto "Nova lista" e ícone "+" em quadrado de 48. A linha inteira é o alvo.
3. Cartões, na ordem do layout, com o cabeçalho de divisor entre eles quando houver.
4. 🔸 Linha "Listas excluídas (N)", só se houver, que abre a folha com "Recuperar" (a função atual continua).

**Cartão da lista:**
- `radius.lg`, fundo `listColors[cor].bg`, padding `space.lg`, altura mínima de 140 (cresce com a fonte).
- Topo: "N itens" à esquerda e seta (`chevron-right`, 48) à direita, oculta para o leitor de tela.
- Meio: nome em Sora semibold 26, até 2 linhas, `maxFontSizeMultiplier` 1.6.
- Base: "Faltam N · No carrinho N · R$ X". O valor usa `show()` e respeita ocultar valores; sem preço nenhum, a parte do valor some.
- Cartão inteiro: `MotionPressable kind="row"` (A8 já existe). Rótulo: "Lista Mercado, 12 itens, faltam 9, 3 no carrinho, estimativa R$ 85,40". Dica: "Toque duas vezes para abrir. Toque longo para organizar".

**Entrar e voltar (A7):** a lista entra deslizando 40 dp da direita com esmaecer em 300 ms (curva de desaceleração). Ao voltar, os cartões entram em cascata (esmaecer + subir 12 dp, 50 ms entre eles, 350 ms no total). Com "remover animações" ligado, só o esmaecer, em 150 ms.

**Nova lista / Editar lista** (folha):
- Prévia do cartão (só no Editar).
- `Field` "Nome da lista".
- "Cor": 7 bolinhas de 48 dp, papel `radio`, rótulos falados ("Amarelo Floco, selecionada").
- "Grupo": `Choice` com "Sem grupo", os divisores existentes e "Novo grupo…".
- Só na Nova lista: 🔸 "Começar de": "Lista vazia" ou um modelo salvo (substitui os botões "Usar modelo X").
- Rodapé fixo: **Criar lista** (Nova) ou **Salvar** (Editar).
- No Editar, abaixo: "Salvar como modelo" (secundário) e "Excluir lista" (texto `c.red`, 48 dp).
- Criar abre a lista nova direto.
- Excluir: `ConfirmSheet` (seção 9) → arquiva (recuperável, como hoje) → volta às Listas com o aviso "Lista X excluída · Desfazer".

## 5. Modo de edição das listas [2, 3] (A1, A10)

- **Entrar:** toque longo de 400 ms no cartão, com vibração curta de 10 ms (a permissão já existe), ou o botão "Organizar listas".
- **Ao entrar** (200 ms): título e "Nova lista" vão para 40% de opacidade e ficam inativos; o rodapé ganha **Cancelar** (secundário) e **Concluir** (primário), 56 dp de altura, lado a lado e fixos.
- **Arrastar** (só no modo): o cartão pressionado cresce 2% e ganha sombra (elevation 8). Segue o dedo no nativo. Os vizinhos abrem espaço em 180 ms com desaceleração. Ao soltar, o cartão encaixa em 150 ms. A lista rola sozinha perto das bordas.
- **Sem gesto:** cada cartão mostra "Subir" e "Descer" (`IconButton` 48, ícones `arrow-up`/`arrow-down`) e as mesmas ações ficam em `accessibilityActions`. Depois de mover, o leitor anuncia "Mercado agora é a 2ª de 4".
- **Divisores:** pílula "+ Grupo" (altura 48) em cada fronteira. O toque vira um campo "Nome do grupo, ex.: Viagem" com o teclado aberto; Enter cria o cabeçalho (Sora semibold 13, maiúsculas, `letterSpacing` 1, `c.muted`). Tocar no cabeçalho renomeia; nome vazio + Enter remove. Também há um "×" de 48 dp para remover (alternativa sem esvaziar o texto).
- **Cancelar** desfaz ordem e divisores do modo. **Concluir** grava numa só ação (entra no Desfazer/Refazer).

## 6. Tela da lista

### 6.1 Cabeçalho [7, 8, 9, 10, 11, 16]

Fundo `listColors[cor].bg`, cantos de baixo `radius.lg`. **Rola junto** com a lista. De cima para baixo:

1. Linha de ações, alinhada à direita:
   - pílula **"Ir às compras"** (ícone `shopping-cart`, altura 48, `c.primary`/`c.onPrimary`), que some com a lista vazia;
   - `IconButton` **Compartilhar**;
   - `IconButton` **Editar lista**;
   - 🔸 `IconButton` **Mais** (`more-vertical`): menu com Desfazer, Refazer e Histórico de compras.

   Com fonte acima de 150%, a pílula desce para uma linha própria.
2. Nome da lista (Sora semibold 28, até 2 linhas) e, à direita, "Estimativa" (Muted 12) com o valor (Sora semibold 22, números tabulares, centavos menores). Sem preço nenhum, o bloco de valor some.
3. "3 de 10 no carrinho" (Muted). Lista vazia: "Nada por aqui ainda". "Depois" não conta.
4. **Barra de adicionar** (6.2).
5. Atalhos centralizados: **Falar · Colar lista · Escanear**. Cada um é `Pressable` com ícone e texto, altura 48 e padding horizontal `space.md`. 🔸 "Escanear" abre uma folha curta com "Código de barras do produto" e "Nota fiscal" (as duas funções que já existem).

### 6.2 Barra de adicionar [11–15, 19]

- Pílula `c.surface`, `radius.pill`, borda 1 `c.line`; com foco, borda 2 `c.primary`.
- À esquerda, **botão de categoria** (48 dp): círculo com o ícone da categoria adivinhada enquanto se digita (`categorize` a cada mudança, sem gravar). Campo vazio: ícone `tag`.
  - Rótulo: "Categoria: Padaria. Toque para trocar" ou "Escolher categoria".
  - Escolha manual vale até o campo ser limpo; o ícone ganha um anel `c.primary`.
- Campo `TextInput` com dica "O que falta? Ex.: 2 leite".
- "+" redondo de 48 à direita (desativado com o campo vazio, como hoje).
- Enter adiciona, limpa e mantém o foco (como hoje).
- `addShoppingItem` ganha a opção `{ category }`.
- Autocompletar em chips logo abaixo da barra (como hoje).
- **Folha de categoria:** grade de 3 colunas, célula com pelo menos 88 dp (círculo de 44 com ícone e nome em até 2 linhas), papel `radio`. Com fonte acima de 150%, 2 colunas.
- **"Está acabando"** (`RestockList`) sai da barra. 🔸 Vira um bloco recolhível no topo do corpo, "Está acabando (N)", fechado por padrão.
- Teclado: a barra fica no alto e não precisa de `KeyboardAvoidingView`. A rota sai da lista de `behavior="padding"` do `App.tsx` se não for mais necessária (testar).

### 6.3 Corpo [17, 20–28] (fundo `c.bg`)

Ordem: "Está acabando" (🔸) → **Recém-adicionados** → pendentes por categoria → **Para outra compra** → **No carrinho · N** com "Limpar comprados" → 🔸 cartão "Preços do histórico" (o atual) → "Registrar despesa" (com carrinho, como hoje) → busca (com mais de 8 itens, como hoje; 🔸 sobe para logo abaixo do cabeçalho).

**Cabeçalho de grupo:** círculo de 24 com o ícone da categoria e o nome em Sora semibold 13, maiúsculas, `letterSpacing` 1, cor `c.muted`. Papel `header`. Some com o grupo vazio (como hoje).

**Linha do item:**
- `Pressable` próprio, `c.surface`, `radius.lg`, altura mínima de 56, `space.xs` entre linhas. Sem a caixa única por categoria.
- **Marcar:** círculo de 28 dp (borda 2 `c.muted`; marcado: cheio `c.primary` com ✓ `c.onPrimary`) num alvo de 56×56. Papel `checkbox`, estado falado (como hoje).
- **Corpo:** nome (2 linhas no máximo), chip "2×" ou "500 g" (`c.soft`, `radius.pill`, Sora 13) e preço à direita (Sora semibold, tabular, `show()`). Linha 2 opcional (Muted): "Faltou no mercado", "Para outra compra" ou os detalhes.
- Com fonte acima de 150%, o preço desce para a linha 2.
- No carrinho: nome riscado e `c.muted`, círculo cheio.
- Tocar no corpo abre a folha do item. Rótulo: "Leite, 2 unidades, R$ 9,80. Toque duas vezes para editar".
- `accessibilityActions`: Marcar/Desmarcar, Editar, Apagar, Faltou, Depois.

**Recém-adicionados** (A5):
- Bloco no topo do corpo com o título "Recém-adicionados" (Muted 13) e até 3 itens.
- Cada um: círculo da categoria (36), nome e quantidade, botão "Editar" (pílula 48) e ✓ redondo de 48 (marca).
- Cada item fica 7 s. Sob o ícone, uma linha fina esvazia em 7 s (linear); no fim, o item sai com esmaecer de 150 ms e aparece no grupo.
- Ao adicionar, o leitor anuncia "Leite adicionado em Frios e laticínios". Com "remover animações", a linha não anima.
- Só na tela, não é gravado.

### 6.4 Deslizar a linha [22, 23] (A2, A3)

Com `Swipeable`/`Pan` do gesture-handler e reanimated:

| Gesto | Visual | Ao soltar |
|---|---|---|
| Direita, passando de 35% da largura | fundo `c.primary` cresce da esquerda junto com o dedo, ícone ✓ `c.onPrimary` que cresce de 0,8 a 1 | marca (ou desmarca, se já está no carrinho) e faz a animação 6.5 |
| Direita, abaixo de 35% | — | volta com mola curta |
| Esquerda, curto (até 60%) | aparecem **Editar** (círculo 48 `c.soft`, `edit-2`) e **Apagar** (círculo 48 `c.red`, `trash-2`), esmaecendo em 200 ms; a linha fica aberta em −120 dp | — |
| Esquerda, longo (acima de 60%) | a faixa `c.red` toma a linha, com "Solte para apagar" e vibração de 10 ms ao cruzar o limite | apaga: a linha encolhe na altura em 200 ms, as de baixo sobem, e entra o aviso com Desfazer |

- Diferente do Lemonlist, a linha aberta **fecha** ao tocar fora, ao rolar ou ao abrir outra.
- O deslizar só começa depois de 12 dp na horizontal, para não brigar com a rolagem.
- Com "remover animações", a linha ainda segue o dedo (é o próprio gesto), mas soltar não tem mola: as mudanças são instantâneas, com esmaecer de 100 ms.
- **Alternativas sem gesto:** círculo de marcar, folha do item (Apagar e estados) e `accessibilityActions`.

### 6.5 Marcar (A4)

- O item marcado sai do grupo (esmaecer para 50% + subir 8 dp, 150 ms) e entra no topo de "No carrinho" (esmaecer, 200 ms).
- As outras linhas assentam com `LinearTransition` de 200 ms e desaceleração, sem ricochete.
- O grupo vazio some junto.
- O foco do leitor vai para o item no novo lugar e o anúncio continua (como hoje).

### 6.6 No carrinho e limpar [38]

- Cabeçalho "No carrinho · N" com o botão **"Limpar comprados"** à direita (texto `c.primary`, altura 48, não um link de 20 dp).
- Abre um `ConfirmSheet`:
  - título "Limpar os comprados?";
  - Vai sair: "N itens no carrinho";
  - Continua: "Os que faltam, os de outra compra e os que faltaram" e "Histórico de compras e preços".
- 🔸 Diferente do Lemonlist, a limpeza **entra no Desfazer**, com o aviso "N itens limpos · Desfazer".

### 6.7 Lista vazia

Componente `Empty` com o ícone `shopping-cart`, título "Lista vazia" e o texto "Escreva lá em cima o que falta em casa. Ex.: 2 leite." Abaixo, os botões atuais de "Ler nota fiscal" e "Histórico de compras". O cabeçalho continua com a barra de adicionar e os atalhos, sem "Ir às compras".

## 7. Folha do item [29–37]

`SheetModal` novo (seção 9). Corpo rolável e rodapé fixo. De cima para baixo:

1. Título = nome do item; X de 48.
2. `Field` **"Nome"**, separado da quantidade. Dica: "O app lembra este nome nas próximas vezes" (usa `shoppingProducts`, que já existe).
3. `Segmented` **Por unidade | Por peso**.
4. **Preço:** `AmountField` (já tem calculadora), com o rótulo "Preço de cada" ou "Preço do quilo". Abaixo, se houver histórico: "Última compra: R$ 4,90 em 02/11" e o botão "Usar" (48).
5. **Quantidade:** − / número / + (`IconButton` de 48, número em Sora semibold 20, papel `adjustable` com incremento e decremento). No peso, vira `Field` "Peso (g)" numérico.
6. **Foto** (quadrado de 88: "Pôr foto" abre a câmera; com foto, miniatura com "Trocar" e "Tirar foto") e `Field` **"Detalhes"** ("Marca, sabor, tamanho…", até 120).
7. **Três botões de estado**, lado a lado, altura mínima de 72, `radius.md`:
   - **No carrinho** / **Tirar do carrinho** (`c.primary`);
   - **Faltou** (`c.soft`, ícone `x-circle`);
   - **Depois** (`c.soft`, ícone `clock`).

   Cada um grava as mudanças da folha, aplica o estado, fecha a folha e anuncia o resultado. O estado atual aparece selecionado (`accessibilityState.selected`), e tocar de novo tira o estado. Com fonte acima de 150%, ficam um embaixo do outro.
8. **Categoria:** fileira horizontal de chips com círculo e ícone, a atual primeiro (como hoje).
9. **"Sempre comprar"** e **"Promoção"** (os campos atuais).
10. Rodapé fixo: **Apagar** (secundário, `trash-2`; apaga com aviso e Desfazer) | **Salvar** (primário).

X e voltar descartam (como o "Cancelar" de hoje). Erros de validação aparecem acima do rodapé, com `accessibilityLiveRegion`.

## 8. Ir às compras e Modo compra [40, 41]

- 🔸 Com mais de uma lista com pendentes, "Ir às compras" abre a folha **"Quais listas?"**: uma caixa de 56 por lista, com nome, "N itens" e a estimativa, e a lista atual já marcada. Rodapé: **Cancelar | Começar**. Com uma lista só, entra direto.
- Modo compra (o atual) ganha:
  - ícone da categoria em círculo nas linhas;
  - botão **"Em falta"** por linha (48, aplica Faltou);
  - itens "Depois" fora;
  - itens Faltou numa seção "Em falta" no fim.
- O limite de gasto, Registrar despesa e Ler nota continuam.
- "Ordenar por corredor" não entra: o Floco não sabe os corredores, e a ordem por categoria já faz esse papel.

## 9. Componentes do kit novos ou mudados

- **`SheetModal`** (A6):
  - alça (36×4, `c.line`), título Sora semibold 22 à esquerda, X redondo de 48 à direita;
  - fundo `c.scrim` com `BlurView` (intensidade 20);
  - abre em 380 ms (bezier 0.2, 0.9, 0.1, 1) e fecha em 200 ms (aceleração para baixo);
  - arrastar a alça para baixo fecha;
  - com "remover animações": esmaecer de 150 ms, sem desfoque;
  - foco no título ao abrir (como hoje).
- **`ConfirmSheet`:** título em pergunta, seções "Vai sair" e "Continua" com marcadores, rodapé **Voltar | <ação>**, ação destrutiva em `c.red`. Substitui o `confirm()` em Limpar comprados e Excluir lista.
- **Aviso com Desfazer** (`Snackbar`, A9):
  - aceita uma ação `{ label, onPress }` e sobe do rodapé em 150 ms;
  - duração de 10 s com Desfazer (`AccessibilityInfo.getRecommendedTimeoutMillis(10000)`, que aumenta com o TalkBack) e 5 s sem ação (como hoje);
  - botão Desfazer de 48 dp;
  - corrige a divergência com o DESIGN.md (7 s).
- **`CategoryBadge`:** círculo (24, 36 ou 44) com `CategoryIcon` nas cores `catColors`; não é focável sozinho.

## 10. Falar e Foto

**Falar** (folha):
- Botão grande de 96 dp "Toque e fale". Enquanto ouve: anel pulsando (parado com "remover animações"), texto ao vivo e "Parar".
- No fim, o texto vai para o parser do **Colar lista**, com prévia editável e **Adicionar todos**.
- Parser novo: separa por vírgula, " e " e "mais", e entende números falados de um a vinte ("dois leites" → 2 leite).
- Privacidade: pede reconhecimento no aparelho quando o Android oferece. Sem isso, a folha avisa: "O áudio pode ser processado pelo serviço de voz do Google".
- Erros:
  - sem permissão: "Sem acesso ao microfone. Libere em Configurações > Apps > Floco." com o botão "Abrir configurações";
  - sem serviço de voz: "Este aparelho não tem reconhecimento de voz.";
  - nada ouvido: "Não ouvi nada. Tente de novo."

**Foto:**
- Câmera do `expo-camera` numa tela própria, qualidade 0,5, máximo de 1280 px.
- Grava em `documentDirectory/shopping-photos/<id>.jpg`.
- Miniatura só na folha do item (não na linha, para não pesar a rolagem).
- Rótulos: "Pôr foto de Leite", "Foto de Leite".

## 11. Textos (propostas do Floco; você reescreve à vontade)

| Onde | Texto |
|---|---|
| Visão geral | "Listas", "Nova lista", "Organizar listas", "+ Grupo", "Nome do grupo, ex.: Viagem", "Cancelar", "Concluir", "Faltam N · No carrinho N" |
| Cabeçalho | "Ir às compras", "Estimativa", "3 de 10 no carrinho", "Nada por aqui ainda" |
| Barra | "O que falta? Ex.: 2 leite", "Escolher categoria", "Categoria: X. Toque para trocar", "Falar", "Colar lista", "Escanear" |
| Corpo | "Recém-adicionados", "Para outra compra", "No carrinho · N", "Limpar comprados", "Faltou no mercado", "Em falta" |
| Gestos | "Solte para apagar", "Editar", "Apagar" |
| Folha do item | "Nome", "Por unidade", "Por peso", "Preço de cada", "Preço do quilo", "Última compra: R$ X em dd/mm", "Quantidade", "Peso (g)", "Pôr foto", "Detalhes", "No carrinho", "Tirar do carrinho", "Faltou", "Depois", "Categoria", "Apagar", "Salvar" |
| Avisos | "Leite apagado · Desfazer", "Lista X excluída · Desfazer", "N itens limpos · Desfazer" |
| Confirmações | "Limpar os comprados?" / "Excluir a lista X?", seções "Vai sair" e "Continua" |
| Vazio | "Lista vazia" + "Escreva lá em cima o que falta em casa. Ex.: 2 leite." |

## 12. Propostas (🔸): todas aprovadas pelo dono em 11/11/2026

1. Botão **Mais** no cabeçalho da lista com Desfazer, Refazer e Histórico de compras (hoje Desfazer e Refazer ficam no topo, sempre visíveis).
2. **Escanear** abre uma escolha: "Código de barras do produto" ou "Nota fiscal".
3. **"Está acabando"** vira bloco recolhível no topo do corpo da lista.
4. **"Ver" da Início** abre as Listas e, por cima, a lista ativa.
5. **Listas excluídas** como linha no fim da visão geral; **modelos** como "Começar de" na Nova lista.
6. **Foto fora do backup.**
7. **"Limpar comprados" com Desfazer** (o Lemonlist não tem).
8. **Ir às compras com várias listas** (folha "Quais listas?").
9. **Busca** logo abaixo do cabeçalho, e o cartão de preços do histórico no fim do corpo.

## 13. Ordem da Fase 4 (um passo por vez; `tsc` e `npm test` verdes, emulador claro e escuro, capturas antes e depois, inventário atualizado)

| Passo | Conteúdo |
|---|---|
| 0 | Instalar gesture-handler, reanimated, worklets e expo-blur; raiz e Babel; build x86_64; abrir o app e conferir que nada mudou |
| 1 | Dados: campos novos, 18 categorias, layout das listas, validadores, backup e testes (sem tela) |
| 2 | Kit: `SheetModal` novo com desfoque, `ConfirmSheet`, aviso com Desfazer, `CategoryBadge` e tokens |
| 3 | Linha do item nova + cabeçalhos de grupo + "No carrinho" com Limpar comprados |
| 4 | Cabeçalho da lista + barra no alto + botão e folha de categoria + atalhos + "Está acabando" |
| 5 | Folha do item nova + estados Faltou/Depois na lista |
| 6 | Deslizar a linha |
| 7 | Animação de marcar + Recém-adicionados |
| 8 | Visão geral, rotas, Nova/Editar lista, cores, cascata |
| 9 | Modo de edição: arrastar, Subir/Descer, divisores |
| 10 | Ir às compras com várias listas + Modo compra (Em falta, ícones) |
| 11 | Foto do item |
| 12 | Falar (instalar `expo-speech-recognition`, manifesto à mão, parser falado) |
| 13 | DESIGN.md (fim do "sem deslizar"), INVENTARIO-FUNCIONAL.md, passada final nos dois temas e com fonte 200% |

Não dá para testar no emulador: TalkBack de verdade (só a hierarquia), reconhecimento de voz real (o emulador não tem microfone), câmera real e a sensação do gesto no dedo. Fica para o dono no celular.
