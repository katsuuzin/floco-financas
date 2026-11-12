# Auditoria da aba "Listas" do Lemonlist (Fase 1)

Referência de **funcionamento** para a Lista de Compras do Floco: ordem, disposição, gestos, estados e movimento. Nada do visual (cores lima/lilás, mascotes, fontes, ilustrações) entra no Floco.

- **Data:** 11/11/2026. App `br.com.lemonlist.app` no AVD KonttoPlayStore (`emulator-5556`), Android 15, tela 1080×2400 px a 420 dpi. **1 dp = 2,625 px**; as medidas abaixo já estão em dp.
- **Como foi observado:** capturas (`screencap`), hierarquia de acessibilidade (`uiautomator dump`), toques e gestos por `adb input`, e gravações de tela convertidas em quadros a 10 ou 20 por segundo (`screenrecord` + `ffmpeg`). Nada foi extraído do APK, e nenhum arquivo, ícone, som ou animação foi copiado. O app roda numa aba do Chrome (aplicativo web instalado), o que explica rótulos de acessibilidade em inglês em alguns ícones.
- **Evidências:** `analysis/lemonlist/` (fora do Git), com 171 arquivos: PNG, XML da hierarquia, MP4 e folhas de quadros. Os nomes dos arquivos aparecem entre parênteses ao longo do texto.
- **Textos entre aspas** são o que aparece na tela, registrados para você reescrever com suas palavras. **Não usar como estão no Floco.**
- **REA:** o servidor está conectado, mas não achava o adb. Gravei `REA_ADB_PATH` como variável de usuário; ela só vale depois de reiniciar o app do Claude. As ferramentas `observe_native_ui` e `trace_native_ui_action` servem a apps de Mac e não se aplicam aqui. Toda a observação foi feita pelo adb direto.

---

## 1. Tela "Listas" (visão geral)

### a) Mapa de cima para baixo

| # | Controle | Posição e tamanho aproximado | Função | Estados |
|---|---|---|---|---|
| 1 | Botão redondo de ajustes | topo, à direita; 41×42 dp | abre Configurações | normal |
| 2 | Título grande "Listas" | à esquerda, abaixo do 1 | cabeçalho | — |
| 3 | Linha "Nova lista" com botão quadrado "+" à direita | largura toda, 397×69 dp; "+" com cerca de 44 dp | abre a folha Nova lista (a linha inteira é tocável) | normal; esmaecido no modo de edição |
| 4 | **Cartão de lista** (um por lista, na ordem escolhida) | largura toda, cerca de 190 dp de altura, cantos bem redondos, cor própria da lista | abre a lista | normal; afunda ~2% ao pressionar; levanta no arraste |
| 4.1 | dentro do cartão: personagem, "N itens" e botão quadrado preto com seta | linha de cima; seta com 48×48 dp | a seta abre a lista (igual tocar no cartão) | — |
| 4.2 | nome da lista em letra enorme (quebra em até 2 linhas) | meio do cartão | — | — |
| 4.3 | linha de números: Faltam · No carrinho · Prévia R$ | base do cartão | resumo | "Prévia" só aparece se há preço real (estimativas com "~" não entram) |
| 5 | Barra de abas flutuante: Início, Listas, **Compra** (pílula central maior e destacada), Histórico, Nota | base, sobre o conteúdo; abas com cerca de 71×55 dp | navegação | aba ativa com fundo cinza; "Compra" sempre em destaque |

Sem lista nenhuma: não observado (havia duas listas).

### b) Interações na visão geral

| Gesto | Resultado |
|---|---|
| Toque no cartão ou na seta | abre a lista (transição em 2.3, A7) |
| Toque longo no cartão (testado com 900 ms) | entra no **modo de edição** (02-listas-longpress) |
| Arrastar um cartão no modo de edição | **reordena** as listas (03-arraste-lista) |
| Puxar para baixo | nada acontece (não há puxar para atualizar) (71-puxar) |
| Voltar do Android dentro de uma lista | volta para esta tela, com os cartões entrando em cascata (A7) |

**Modo de edição** (02, 03, 05 a 09):
- O fundo, o título e "Nova lista" ficam esmaecidos (cerca de 40%).
- Uma pílula "+ Criar divisor" (cerca de 110×30 dp) aparece **em cada fronteira**: antes da primeira lista, entre as listas e depois da última.
- A barra de abas é trocada por dois botões grandes: **Cancelar** (161×65 dp, escuro) e **Concluir** (224×65 dp, destaque).
- **Cancelar desfaz tudo** que foi feito no modo (ordem e divisores). Testado: arrastei e cancelei, e a ordem voltou.
- "Criar divisor" abre, no lugar, um campo de texto com dica ("Nome do divisor (ex.: …)") e o teclado. Enter cria um **cabeçalho em maiúsculas** com a dica "toque para renomear". Tocar no cabeçalho volta a ser campo. **Apagar o nome e dar Enter remove o divisor.** O toque longo no divisor não faz nada.
- Os divisores agrupam listas; na folha "Nova lista" também há o campo "Grupo" com "Novo grupo".

---

## 2. Tela de uma lista (detalhe)

### a) Mapa de cima para baixo (10-lista-aberta, 43b-lista-criada)

**Cabeçalho colorido** (cor da lista, cantos de baixo redondos; **rola junto** com a lista, não fica preso no topo):

| # | Controle | Tamanho | Função | Estados |
|---|---|---|---|---|
| 1 | Pílula "Começar compra" com ícone de carrinho | 156×42 dp, à direita, ao lado de 2 e 3 | abre o preparo do Modo compra | **some quando a lista está vazia** |
| 2 | Botão redondo de compartilhar | 42×42 dp | folha Compartilhar | — |
| 3 | Botão redondo de lápis | 42×42 dp | folha Editar lista | — |
| 4 | Personagem (avatar) + nome da lista (título grande) | à esquerda | o toque no nome não teve efeito visível | o avatar muda de expressão: dormindo com a lista vazia, animação parada ao fundo |
| 5 | Linha abaixo do nome: "X de Y no carrinho" | — | progresso | vazia: "Nada por aqui ainda" |
| 6 | "PRÉVIA" e valor à direita (R$ pequeno, reais grandes, centavos sobrescritos) | à direita do nome | soma estimada da lista | inclui estimativas "~" (diferente do cartão da visão geral) |
| 7 | **Barra de adicionar** em pílula branca: botão de categoria à esquerda (46×46 dp, ícone de etiqueta), campo "Adicionar… ex.: 2 leite", botão "+" redondo à direita (45×46 dp) | largura toda | adiciona item | "+" cinza e desativado com o campo vazio; preto e ativo com texto; borda escura com foco; **o ícone da esquerda troca para a categoria adivinhada enquanto se digita** (ex.: pão → Padaria; "pão de queijo" → Congelados), e o rótulo falado vira "Categoria: X. Trocar" |
| 8 | Três atalhos em texto com ícone: **Falar · Colar lista · Escanear** | centralizados, 79 a 112 × 37 dp (menos de 48 dp de altura) | abrem folhas próprias | — |

**Corpo** (fundo escuro):

| # | Controle | Tamanho | Função | Estados |
|---|---|---|---|---|
| 9 | Bloco "ACABOU DE ENTRAR" | topo do corpo, temporário | mostra o item recém-adicionado | some sozinho em cerca de 6 a 8 s (A5) |
| 10 | Cabeçalho de categoria: ícone + nome em maiúsculas espaçadas, na cor de destaque | largura toda, cerca de 23 dp | agrupa os pendentes | **some quando o grupo fica vazio** |
| 11 | **Linha de item** em pílula clara | 381×59 dp; 3 dp entre linhas | — | ver abaixo |
| 11.1 | círculo de marcar à esquerda | alvo 59×59 dp; círculo de cerca de 32 dp | marca ou desmarca | vazio (borda) / cheio com ✓ |
| 11.2 | nome (corta com "…") + chip de quantidade "2×" + preço à direita | corpo tocável: 308×59 dp | toque abre a folha do item | preço "~R$" com ícone de alfinete = estimativa por região; "~R$" com ícone de faísca = estimativa por IA; subtítulo em linha 2: "não encontrado no mercado" / "fica pra outra compra" |
| 11.3 | Editar (lilás) e Excluir (vermelho), redondos | 56×48 dp e 55×48 dp | ficam escondidos e aparecem ao deslizar para a esquerda | também expostos ao leitor de tela sem deslizar |
| 12 | Seção "FICA PRA DEPOIS" | depois dos pendentes | itens adiados | — |
| 13 | Seção "NO CARRINHO · N" com o link sublinhado "Tirar da lista" à direita | link de 78×20 dp (pequeno) | limpa os comprados | itens riscados, círculo cheio; o mais recente fica no topo |
| 14 | Aviso flutuante (snackbar) | acima da barra de abas, pílula escura; botão "Desfazer" de 93×37 dp em destaque | desfaz a exclusão | dura cerca de 9 a 10 s |
| 15 | Barra de abas | igual à da visão geral | — | — |

**Lista vazia** (43b): cabeçalho sem "Começar compra", avatar dormindo e, no corpo, ilustração grande com um título e uma frase. Texto observado: "A lista está dormindo" / "Escreva o que falta em casa. Quem mora com você vê na hora."

### b) Interações na lista

| Gesto ou toque | Onde | Resultado | Evidência |
|---|---|---|---|
| Toque no círculo | linha | marca e manda para "No carrinho" (A4); "X de Y" atualiza | 20-marcar |
| Toque no círculo cheio | linha no carrinho | desmarca e volta ao grupo da categoria | (rótulo "Desmarcar …") |
| Toque no corpo da linha | linha | abre a folha do item | 35-abrir-item, 70a |
| **Deslizar para a esquerda, curto** | linha | revela Editar e Excluir; a linha fica aberta (tocar fora não fecha) | 54-deslizar-curto |
| **Deslizar para a esquerda, longo** (passa de cerca de 60% da largura) | linha | a faixa vermelha toma a linha com "Solte para excluir"; ao soltar, **exclui**, com aviso e Desfazer | 11-deslizar-esq |
| **Deslizar para a direita** | linha pendente | fundo verde cresce da esquerda; ao soltar, **marca** | 39-deslizar-dir |
| Toque longo na linha (1,2 s) | linha | nada (não há arrastar para reordenar itens) | 72-longo-item |
| Rolar | corpo | cabeçalho e barra de adicionar rolam junto; a barra de abas continua flutuando | 38-lista-rolada |
| Puxar para atualizar | — | não existe | 71-puxar |
| Toque em "Tirar da lista" | seção No carrinho | caixa de confirmação (sem Desfazer depois) | 49-tirar-da-lista |
| Voltar do Android | — | volta para a visão geral | 59-voltar |
| Toque em Desfazer | aviso | restaura o item (não deu tempo de testar: o aviso sumiu antes do toque) | — |

**Teclado ao digitar:** o teclado sobe e a barra de adicionar continua visível no alto, porque fica no cabeçalho e não na base. Enter adiciona, limpa o campo e **mantém o foco** para digitar o próximo. O "voltar" do Android com o teclado aberto fecha o teclado (e também a folha, se houver uma aberta).

### c) Antes e depois, com quadros

| Ação | Antes → depois |
|---|---|
| Adicionar "pão de queijo" | campo com texto e ícone de Congelados → campo vazio com foco; no topo do corpo, o bloco "Acabou de entrar" com o item (ícone da categoria num quadrado, nome, pílula "Editar", botão ✓ redondo e uma linha fina que esvazia como contagem); a PRÉVIA sobe; "X de Y" ganha +1 no total |
| Marcar | círculo vazio → cheio com ✓; a linha sai do grupo e entra no topo de "No carrinho", riscada; o grupo vazio some; o contador da seção sobe |
| Excluir deslizando | linha → faixa vermelha → a linha some, as de baixo sobem, o grupo vazio some; aviso "<item> saiu da lista · Desfazer"; PRÉVIA e "X de Y" atualizam |
| "Não tinha" (na folha) | a folha fecha sozinha; o item volta aos pendentes com o subtítulo "não encontrado no mercado" |
| "Depois" (na folha) | a folha fecha; o item vai para a seção "FICA PRA DEPOIS" com o subtítulo "fica pra outra compra" |
| "Tirar da lista" → confirmar | os itens comprados saem; a seção "No carrinho" some; sem aviso de desfazer |

---

## 3. Folhas e caixas de diálogo

Todas as folhas sobem de baixo, com alça no topo, título grande à esquerda e um X redondo à direita. O fundo **escurece e fica desfocado**. A folha cobre de 45% a 90% da tela, conforme o conteúdo.

**Folha do item** (14-digitando, 35b-item, 58-folha-peso), de cima para baixo:
1. Título = nome do item; X.
2. Cartão "NOME" com o campo e a dica "da próxima vez esse produto já vem com esse nome" (o nome é aprendido).
3. Seletor segmentado: **Por unidade | Por peso**.
4. Cartão de preço: "PREÇO · CADA" (ou "PREÇO DO QUILO" no peso); valor grande; abaixo, a estimativa com faixa de preço e fonte (ex.: média de N pessoas na região, ou "A IA estima ~R$ …").
5. "QUANTIDADE" com − / número / + (botões de 45 dp). No peso, vira "PESO" com campo em g.
6. "Pôr foto" (quadro 85 dp) + "DETALHES" (campo livre: marca, sabor…).
7. **Três botões grandes de estado**, lado a lado, de 121×73 dp: **Comprado / Desmarcar** (verde), **Não tinha** (amarelo), **Depois** (lilás). Cada um age **na hora e fecha a folha**.
8. "CATEGORIA": fileira horizontal de chips com ícone.
9. Rodapé fixo: **Tirar da lista** (secundário, com lixeira) | **Concluir** (primário).

**Folha de categoria** (botão à esquerda da barra de adicionar; 27-categoria): grade de 3 colunas com 18 categorias (Hortifrúti, Frutas, Carnes e peixes, Proteína vegetal, Frios e queijos, Leite e derivados, Padaria, Mercearia, Bebidas, Cervejas e vinhos, Doces e snacks, Congelados, Limpeza, Higiene, Bebê, Pet, Casa e utilidades, Outros). Embaixo, "CRIAR CATEGORIA": campo, botão Criar e grade de ícones a escolher. Os rótulos de acessibilidade dos ícones são nomes da biblioteca **Lucide** (Briefcase, NotebookPen…).

**Nova lista / Editar lista** (22b, 41b, 23-lapis):
- No Editar, prévia do cartão no topo.
- Campo do nome.
- "QUEM USA ESTA LISTA": "Só você por enquanto" + Convidar.
- Alternância "Dividir os gastos" com explicação.
- "PERSONAGEM": grade rolável na horizontal com 18 personagens.
- "COR": 7 bolinhas.
- "GRUPO": divisor, com "Novo grupo".
- Rodapé: **Criar lista** (Nova) ou **Salvar** + **Apagar lista** em vermelho (Editar).
- Criar a lista **abre a lista recém-criada** direto.

**Compartilhar** (25, 26): duas abas grandes.
- "Convidar para editar" mostra o que a pessoa convidada vê, o botão "Criar link de convite" e a validade do link.
- "Enviar como texto" mostra a prévia do texto: nome, "N itens", só os pendentes agrupados por categoria, com a quantidade. Embaixo, os botões **Copiar texto** e **Enviar para…**.
- Nada foi enviado.

**Colar lista** (28, 31, 32): título, explicação (aceita lista de mensagem, receita inteira ou ditado), campo grande de várias linhas, e "Organizar a lista" (desativado com o campo vazio). Depois de organizar: "N itens encontrados", uma linha por item (ícone, nome, quantidade, botão Remover) e o rodapé **Voltar | Adicionar todos**. O teclado do emulador autocorrigiu "leite" para "elite", e o app aceitou: não há revisão de grafia.

**Falar** (33): título, botão grande de microfone "Começar a falar", dica, exemplo de frase e "Organizar a lista" desativado. **Erro observado** (microfone sem permissão): "Sem acesso ao microfone. Libere nos ajustes do navegador."

**Escanear** (34): moldura de mira na área da câmera, botão de foto redondo no meio, texto de ajuda (código de barras, produto, vários produtos ou lista escrita no papel). Pede a permissão de câmera do Chrome; **não concedi**. Sem câmera aparece "Não foi possível abrir a mídia."

**Caixas de confirmação** (49c, 63-apagar, 67): um cartão no rodapé com título em forma de pergunta, duas seções **"O QUE MUDA"** e **"O QUE FICA"** em lista, e os botões **Voltar | <ação>**.
- Usada em: Tirar da lista, Apagar lista e Cancelar compra.
- Apagar lista avisa que dá para desfazer logo depois. Ao confirmar, o app vai para a Início com o aviso "Lista … apagada · Desfazer".

---

## 4. Fluxos (d)

| Fluxo | Passos observados |
|---|---|
| **Criar item** | toca no campo → digita ("2 leite", "500 g …"); o ícone da categoria é adivinhado ao vivo → Enter ou "+" → o item entra em "Acabou de entrar" (cerca de 6 a 8 s) e depois no grupo; o foco fica no campo |
| **Marcar** | toque no círculo **ou** deslizar para a direita **ou** "Comprado" na folha |
| **Editar** | toque na linha **ou** deslizar para a esquerda → lápis; a folha do item serve para nome, unidade ou peso, preço, quantidade, foto, detalhes, estado e categoria; Concluir |
| **Remover** | deslizar longo para a esquerda (aviso com Desfazer, cerca de 9 a 10 s) **ou** lixeira revelada **ou** "Tirar da lista" na folha |
| **Mover entre categorias** | chips "CATEGORIA" na folha do item; antes de adicionar, o botão de categoria na barra |
| **Mover entre estados** | Não tinha / Depois na folha (seções próprias na lista) |
| **Trocar de lista** | voltar → tocar em outro cartão (não há seletor dentro da lista) |
| **Criar lista** | "Nova lista" → folha → Criar lista → abre a nova lista vazia |
| **Renomear lista** | lápis → campo do nome → Salvar |
| **Excluir lista** | lápis → Apagar lista → confirmação "O que muda / O que fica" → Início com Desfazer |
| **Reordenar ou agrupar listas** | toque longo no cartão → arrastar / Criar divisor → Concluir (ou Cancelar desfaz) |
| **Compartilhar** | botão de compartilhar → convite por link **ou** texto (Copiar / Enviar para…) |
| **Começar compra** | pílula no cabeçalho (ou a aba Compra) → preparo do Modo compra: "QUAIS LISTAS?" (pode marcar várias, cada uma com o valor), Na loja / Compra online, "Achar o mercado mais perto", "Escolher mercado", rodapé **Cancelar / Começar** → Modo compra: total no carrinho em destaque, mercado e quanto falta, barra de progresso, campo "Fora da lista…" com Escanear, "PARA PEGAR · N" com ordenar por **Corredor**, linhas com **ícone da categoria em círculo colorido**, botão "EM FALTA" e botão ✓; rodapé Início / Cancelar / **Terminar compra**. Cancelar pede confirmação (O que muda / O que fica) |
| **Falar** | folha → microfone → o texto falado vira prévia como no Colar (não testado com áudio) |
| **Colar lista** | folha → texto → Organizar → prévia editável → Adicionar todos |
| **Escanear** | folha com câmera → código ou foto (não testado sem câmera) |

---

## 5. Movimento das interações (medido em quadros)

Medidas tiradas das gravações. Duração = quadros × 50 ms (20 fps) ou × 100 ms (10 fps), com erro de ±1 quadro. A curva é estimada pelo espaçamento entre quadros. **Para recriar com código próprio**; nada foi copiado.

| ID | Interação | O que se move | Medida |
|---|---|---|---|
| A1 | Arrastar cartão (modo de edição) | o cartão levantado cresce cerca de 2% e ganha sombra, e segue o dedo sem atraso; o vizinho desliza para abrir espaço; ao soltar, encaixa | deslocamento do vizinho cerca de 150 a 200 ms, com desaceleração; encaixe cerca de 150 ms |
| A2 | Deslizar para a esquerda | a linha acompanha o dedo; atrás dela, lápis e lixeira aparecem com esmaecer (de escuro para claro em cerca de 200 ms); passando o limite, a faixa vermelha cresce e mostra "Solte para excluir"; ao soltar, a linha encolhe na altura e as de baixo sobem | recolher cerca de 200 ms; o aviso entra subindo do rodapé em cerca de 150 ms |
| A3 | Deslizar para a direita | fundo verde cresce da esquerda junto com o dedo; ao soltar, o mesmo voo do A4 | cerca de 300 ms no total |
| A4 | Marcar (toque no círculo) | o círculo enche e mostra ✓; **a linha voa** para o topo de "No carrinho" (meio transparente durante o voo); as outras se ajustam; o cabeçalho vazio some | voo cerca de 150 ms; assentar cerca de 200 ms (sem ricochete visível) |
| A5 | Adicionar | o item aparece no bloco "Acabou de entrar" com uma linha fina embaixo do ícone que esvazia como contagem; no fim, o bloco some e o item entra no grupo | permanência cerca de 6 a 8 s (medida grosseira, por leitura da tela a cada ~2 s) |
| A6 | Abrir e fechar folha | sobe de baixo; o fundo escurece e desfoca junto | abrir cerca de 350 a 400 ms, com desaceleração forte no fim; fechar cerca de 200 ms, acelerando para baixo |
| A7 | Entrar numa lista / voltar | entrar: cerca de 100 ms de tela vazia, depois a lista desliza da direita (cerca de 40 dp) esmaecendo; voltar: os cartões da visão geral surgem **em cascata** (cada um esmaece e sobe um pouco) | entrar cerca de 300 ms; cascata com cerca de 50 ms entre cartões, cerca de 350 ms no total |
| A8 | Pressionar cartão | afunda (escala cerca de 0,98) enquanto pressionado | cerca de 100 ms para descer e para voltar |
| A9 | Aviso com Desfazer | pílula escura sobe acima da barra de abas | visível por cerca de 9 a 10 s |
| A10 | Entrar no modo de edição | o fundo esmaece; as pílulas "Criar divisor" e os botões Cancelar/Concluir aparecem | cerca de 200 ms |

Não observei se o app respeita "remover animações" do Android (não alterei a configuração do emulador).

---

## 6. Textos de ajuda, vazio e erro (para reescrever)

- Vazio: "A lista está dormindo" + "Escreva o que falta em casa. Quem mora com você vê na hora."; subtítulo "Nada por aqui ainda".
- Aviso: "<item> saiu da lista" · Desfazer; "Lista <nome> apagada" · Desfazer.
- Estados do item: "não encontrado no mercado"; "fica pra outra compra"; seção "Fica pra depois"; seção "Acabou de entrar".
- Confirmações:
  - "Tirar o que já está no carrinho?": muda "N itens saem da lista"; fica "os que faltam, os de depois e os não encontrados" e "o histórico de compras e preços".
  - "Apagar a lista <nome>?": muda "a lista e os N itens que faltam saem"; fica "compras, preços e o que o app aprendeu"; "dá para desfazer logo depois".
- Erros: microfone sem permissão; câmera indisponível ("não foi possível abrir a mídia").
- Dicas: campo "Adicionar… ex.: 2 leite"; nome aprendido ("da próxima vez esse produto já vem com esse nome"); divisor "Nome do divisor (ex.: Festas)".

## 7. Acessibilidade observada (só pela hierarquia; sem TalkBack)

- Rótulos claros nos botões de linha: "Marcar X como comprado", "Desmarcar X", "Editar X", "Excluir X", "X em falta", "Pôr X no carrinho".
- O botão de categoria muda de rótulo conforme o que é digitado.
- Editar e Excluir ficam expostos ao leitor de tela sem precisar deslizar (boa alternativa ao gesto).
- Abaixo de 48 dp: os botões redondos do cabeçalho (42 dp), os atalhos Falar/Colar/Escanear (37 dp de altura), o link "Tirar da lista" (20 dp de altura), as pílulas "Criar divisor" (30 dp) e o botão Desfazer (37 dp).

## 8. O que não foi testado ou ficou incerto

- Desfazer de fato (o aviso sumiu antes do toque); Convidar e o link de convite; Dividir os gastos; Enviar para…; Falar com áudio; Escanear com câmera; Terminar compra; tema claro do Lemonlist; fonte grande; "remover animações"; toque longo no limite exato (só testei com 900 ms); configurações.
- O tempo do bloco "Acabou de entrar" é aproximado (6 a 8 s).
- O toque no nome da lista não teve efeito visível.

## 9. O que mudou nos dados do Lemonlist durante a auditoria

- "Pão de queijo" (Mercado do mês) foi excluído sem querer ao testar o deslizar e adicionado de novo. Ficou **"Pao de queijo", sem til** (o `adb` não digita acento), na mesma categoria e com a mesma estimativa. Corrija o nome no aparelho, se quiser.
- "Escova dental media" teve texto digitado por engano na folha; apaguei e fechei. O nome conferido está igual ao original.
- Itens de teste criados e apagados ("Teste auditoria"). A lista de teste "Auditoria Floco" foi criada e apagada.
- O emulador `KonttoPlayStore.ini` apontava para o drive R: antigo; corrigi o caminho (cópia em `KonttoPlayStore.ini.bak`).
