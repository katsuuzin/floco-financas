# Tarefas do Codex, pacote 3

Pacote 2 recebido e muito bom (nomes, Open Food Facts, ícones e o relatório da WebView). Este pacote tem **cinco tarefas**: A2 (ajustes no dicionário, os únicos arquivos existentes que você pode editar) e E, F, G, H em **arquivos novos**. Ordem de valor: A2, E, F, G, H.

## Regras (as mesmas dos pacotes anteriores)

- Nunca `expo prebuild`. Sem commit, push ou release. Sem dado pessoal (dados inventados; **nenhuma chave de API, CNPJ ou chave de nota reais**). Sem dependência nova sem avisar o dono.
- Funções puras em `src/*.mjs`, textos em português do Brasil, valores em centavos.
- Rodar `npm test` e `npx tsc --noEmit` ao final (hoje: 478 testes passando).
- **Não edite** os arquivos do Claude: `src/screens/*.tsx` (exceto o que for novo e pedido aqui), `src/app/nav.tsx`, `App.tsx`, `src/layout.mjs`, `src/shopping.mjs`, `src/shoppingData.mjs`, `src/shoppingPurchases.mjs`, `src/shoppingHistory.mjs`, `src/shoppingMatch.mjs`, `src/shoppingRhythm.mjs`, `src/nfceParse.mjs`, `src/nfce.mjs`, `src/ai-model.mjs`, `src/nfceNames.mjs`, `src/openFoodFacts.mjs`, `src/ui/ShoppingIcons.tsx` e os testes deles.
- Entrega: arquivos novos listados + um parágrafo curto. **Avise o dono ao terminar.**

---

## A2. Ajustes no dicionário de nomes: `src/nfceNames.mjs` e `tests/nfce-names.test.mjs` (única exceção: você pode editar estes dois)

Testei `expandName` com nomes no estilo de uma nota real de supermercado. Acertou muito, mas faltou:

| Entrada | Saída atual | Esperado |
|---|---|---|
| `MOL TOM HEINZ SACH 240G TRADICIONAL` | `Molho de tomate Heinz sach 240 g tradicional` | `Molho de tomate Heinz sachê 240 g tradicional` |
| `BISC NESTLE RECH 140G MOCA` | `Biscoito Nestlé rech 140 g moca` | `Biscoito Nestlé recheado 140 g moca` |
| `FAROFA YOKI 400G MANDIOCA TEMP TRAD` | `FAROFA YOKI 400 g MANDIOCA TEMP TRAD` (continua em caixa alta) | `Farofa Yoki 400 g mandioca temperada tradicional` |
| `MAC CAMIL OVOS 500G ESPAGUETE` | `Macarrão camil ovos 500 g espaguete` | `Macarrão Camil de ovos 500 g espaguete` (marca com inicial maiúscula, se estiver numa lista de marcas conhecidas) |

Pedidos:
1. Acrescentar abreviações: `RECH`→recheado, `SACH`→sachê, `TRAD`→tradicional, `TEMP`→temperado/temperada (conforme o substantivo), `INT`→integral, `DESN`→desnatado, `SEMI`, `TRIT`→trituradas, `TRAD`, `PICANT`, `COZ`, `PRE`, `COND`→condensado, `FATIA`/`FAT`, `UNID`/`PCT`/`CX` (some ou vira a unidade).
2. **Nome que sobra em CAIXA ALTA** (a maior parte das letras maiúsculas) deve virar frase: primeira letra maiúscula, resto minúsculo, **exceto** marcas de uma lista pequena e ampliável (`BRANDS`: Heinz, Nestlé, Camil, Yoki, Piracanjuba, Renata, Sadia, Perdigão, Seara, Aurora, Tirol, Italac, Itambé, Qualy, Liza, Soya, Omo, Ypê, Comfort, Dove, Colgate, Coca-Cola, Pepsi, Guaraná Antarctica, Brahma, Skol, Antarctica, Bauducco, Marilan, Vitarella, Fini, Elma Chips, Pringles, Maggi, Knorr, Hellmann's, Quero, Predilecta, Fugini, Dona Benta, Tio João, Camil, Namorado, Kicaldo, União, Caravelas, Bom Princípio, Lacta, Garoto, Hershey's, Ninho, Molico, Danone, Activia, Vigor, Batavo, Parmalat, Elegê...). Marca truncada (ex.: `PIRACANJ`) pode ficar como está.
3. Manter **idempotência** (`expandName(expandName(x)) === expandName(x)`) e todos os testes atuais passando. Acrescentar 15+ testes com os exemplos da tabela acima e mais 6 nomes seus no mesmo estilo (inventados).

---

## E. Fuzz e valores extremos do leitor da nota: `tests/security/nfce-fuzz.test.mjs`

O Claude **já corrigiu** os achados do seu relatório (host exato por estado, porta e credenciais, mensagem da ponte vinculada à página e à nota, limites de tamanho, varredura linear sem regex gigante) e já escreveu testes hostis básicos em `tests/nfce-parse.test.mjs`. Falta o que testes manuais não cobrem:

1. **Fuzz determinístico** de `parseNfceHtml` e `parseNfceInput`: gerador pseudoaleatório com **semente fixa** (ex.: mulberry32, escrito no próprio teste), 300 HTMLs formados por pedaços da página real inventada (`<tr id="Item + n">`, `<span class="txtTit">`, `</tr>`, `&nbsp;`, `R$`, números, lixo, bytes estranhos, emojis, caracteres de controle, RTL), embaralhados, truncados e repetidos. Para cada um: **não pode demorar mais de 500 ms**; se lançar erro, tem de ser `Error` com `message` em português (nunca `TypeError` interno); se não lançar, `totalCents`, `qty` e preços têm de ser inteiros seguros e positivos.
2. **Valores extremos** em `centsFromBr` e `nfceToPurchase`: `999.999.999.999,99`, `0,00`, `-5,00`, `1e9`, `NaN`, texto com 10 000 dígitos, vírgulas e pontos trocados, quantidade `0`, `1e-9` e `100000`.
3. **`parseNfceInput`** com 200 entradas aleatórias (URLs quebradas, `p=` repetido, `|` demais, chaves com 43, 44 e 45 dígitos, espaços e quebras de linha, `%00`): nunca lança erro interno, nunca devolve `chave` que não passe em `isChave`.

Só use módulos existentes (`src/nfceParse.mjs`, `src/nfce.mjs`); **não edite** nenhum `src/`. O arquivo roda com `node --test tests/security/*.test.mjs`. No parágrafo final diga **quais casos falham** (se algum), com um exemplo mínimo que reproduza.

---

## F. Lógica do modo compra: `src/shoppingTrip.mjs` + `tests/shopping-trip.test.mjs`

O Claude faz a **tela** do modo compra (total do carrinho, progresso e tempo durante a ida ao mercado); você faz a **lógica pura**. Contrato fixo:

```js
import { itemsOf, lineTotal } from "./shopping.mjs";   // pode importar, não edite
import { SHOPPING_CATEGORIES } from "./shoppingData.mjs";

// startedAt e now: milissegundos (Date.now()). Datas inválidas não podem quebrar.
export function tripSummary(state, { startedAt, now })
// -> {
//   total, inCartCount, pendingCount,
//   progress,                 // 0..1 = inCartCount / total (0 se total = 0)
//   cartCents, cartUnpriced,  // soma de lineTotal() dos itens NO CARRINHO que têm preço; quantos estão sem preço
//   pendingEstimateCents, pendingUnpriced, // idem para os PENDENTES
//   grandEstimateCents,       // cartCents + pendingEstimateCents
//   elapsedMinutes            // floor((now - startedAt) / 60000); 0 se algum valor for inválido ou now < startedAt
// }

export function formatElapsed(minutes)   // 0 -> "menos de 1 min"; 5 -> "5 min"; 65 -> "1 h 05 min"; 120 -> "2 h 00 min"; negativo/NaN -> "menos de 1 min"

// Itens pendentes na ordem em que costumam estar no mercado: segue a ordem de SHOPPING_CATEGORIES, depois o nome (pt-BR).
export function nextToGet(state, { limit = 5 } = {})
// -> [{ id, name, qty, unit, category, priceCents }]

// Pendentes agrupados por categoria, na ordem de SHOPPING_CATEGORIES, só categorias com itens.
export function pendingByCategory(state)
// -> [{ category, count, items: [{ id, name, qty, unit, priceCents }] }]
```

Testes: **25+ casos** (lista vazia; tudo no carrinho; nada no carrinho; itens sem preço; unidade em kg onde o preço é o da porção, via `lineTotal`; arredondamento de progresso; tempo 0, 59 s, 60 s, 61 min, 24 h; entradas inválidas; ordem por categoria e por nome com acentos; `limit`; categoria desconhecida cai no fim).

---

## G. Rascunho da documentação: `RASCUNHO-DOCS-LISTA-DE-COMPRAS.md`

**Não edite** `INVENTARIO-FUNCIONAL.md`, `DESIGN.md`, `CLAUDE.md` nem `TAREFAS.md`. Escreva, em um arquivo novo, **blocos prontos para o Claude colar**, em português, no estilo do projeto (descrever o que a função faz, com palavras nossas):

1. **Linhas para o `INVENTARIO-FUNCIONAL.md`** (tabela com ID, função, comportamento, status): E1 (lista), E2 leitor de nota (câmera, foto, chave colada), E3 consulta e leitura da nota de SP, E4 histórico de compras e produtos, E5 ritmo de compra, E6 conferência com a lista, E7 colar lista (regras) e E8 colar lista com IA (opcional, chave do usuário, só o texto colado é enviado). Para cada uma: comportamento, limites e **o que não foi testado** (TalkBack, fonte grande, celular real).
2. **Seção para o `DESIGN.md`**: tokens usados, alvos de toque, estados (vazio, carregando, erro), textos de acessibilidade, e a decisão de não usar gesto de deslizar.
3. **Notas para o `CLAUDE.md`**: o que aprendemos (WebView para a SEFAZ, firewall F5 recusa `curl`, back preditivo no manifesto, SDK em caminho com espaço, `expo-image-loader` necessário para ler QR de foto, campo Modelo da IA sem chave).
4. Use somente fatos que estão no código e nos arquivos `PENDENCIAS-LISTA-DE-COMPRAS.md` e `TAREFAS-CODEX-*.md`; **não invente** testes que não existem.

---

## H. Roteiro de teste manual: `ROTEIRO-TESTE-CELULAR.md`

Para o dono testar no **celular real** (hoje só foi testado em emulador, com dados fictícios). Checklist curto, em português, com passos numerados e "resultado esperado", cobrindo:

- instalar o APK e abrir; criar dados de demonstração;
- lista: adicionar, marcar, editar preço, excluir e desfazer, limpar carrinho, compartilhar;
- ler uma nota por QR com a câmera (**ao vivo**, que o emulador não testou), por foto e por chave;
- consulta da nota de SP, salvar, conferência com a lista, registrar despesa;
- histórico: compras, produtos, apagar compra;
- "Já deve estar acabando" (precisa de compras em datas diferentes: explique como criar com o **backup fictício** que o Claude vai gerar em `entrega/backup-ficticio-ritmo.json` (as datas das compras são relativas a 10/11/2026, então o celular precisa estar nessa data para o resultado ser o mesmo; se não estiver, o roteiro deve dizer isso), e como restaurar em Mais › Importar e exportar);
- Colar lista (offline) e com IA (sem digitar chave no roteiro: "configure sua chave no Assistente");
- **TalkBack**: ligar, percorrer a lista, o bloco da Início e o leitor; o que deve ser lido;
- **fonte grande** (Configurações do Android › Tamanho da fonte no máximo): telas que não devem cortar texto;
- backup e restauração de backup com compras;
- como relatar um problema (o que anotar: tela, passos, o que apareceu).
