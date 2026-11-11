# Tarefas do Codex, pacote 2

Obrigado pelo ritmo de compra: está integrado e sendo testado no emulador. Este pacote tem **quatro tarefas independentes**, todas em **arquivos novos**, sem tocar nos arquivos do Claude. Pode fazer na ordem que quiser; a ordem de valor é A, B, C, D.

## Regras (valem para todas)

- Nunca rodar `expo prebuild`. Sem commit, push ou release. Sem dado pessoal (use dados inventados; **nenhuma chave de API, CNPJ ou chave de nota reais**). Sem dependência nova sem avisar o dono.
- Funções puras em `src/*.mjs`, textos em português do Brasil, valores em centavos.
- Rodar `npm test` e `npx tsc --noEmit` ao final (hoje: 408 testes passando).
- **Não edite** estes arquivos (o Claude está nelas): `src/screens/ShoppingScreen.tsx`, `NfceConsultaScreen.tsx`, `ScanNotaScreen.tsx`, `PurchasesScreens.tsx`, `RestockList.tsx`, `HomeScreen.tsx`, `src/app/nav.tsx`, `App.tsx`, `src/layout.mjs`, `src/shopping.mjs`, `src/shoppingData.mjs`, `src/shoppingPurchases.mjs`, `src/shoppingHistory.mjs`, `src/shoppingMatch.mjs`, `src/nfceParse.mjs`, `src/nfce.mjs`, `src/ai-model.mjs` e os testes deles.
- Entrega de cada tarefa: arquivos novos listados + um parágrafo curto (o que fez, o que ficou de fora, quantos testes). **Avise o dono** ao terminar.

---

## A. Dicionário de abreviações dos nomes da nota: `src/nfceNames.mjs` + `tests/nfce-names.test.mjs`

A SEFAZ imprime nomes abreviados. Exemplos **inventados** no mesmo estilo:

| Como vem | Como deve ficar |
|---|---|
| `FARIN TRIGO MARCA 1KG` | `Farinha de trigo Marca 1 kg` |
| `CR LEITE MARCA TP 200G` | `Creme de leite Marca 200 g` |
| `BISC RECH 140G CHOCOLATE` | `Biscoito recheado chocolate 140 g` |
| `MAC OVOS 500G ESPAGUETE` | `Macarrão de ovos espaguete 500 g` |
| `MOL TOM SACH 240G` | `Molho de tomate sachê 240 g` |
| `DETERG LIQ MARCA 500ML` | `Detergente líquido Marca 500 ml` |
| `REFRIG COLA 2L` | `Refrigerante cola 2 l` |
| `LEITE L/VIDA MARCA 1L INTEGRAL` | `Leite longa vida Marca 1 l integral` |

API (contrato fixo):

```js
export function expandName(raw)            // string legível; nunca lança erro; "" para entrada vazia
export const ABBREVIATIONS                 // objeto { "farin": "farinha de", ... } em um bloco de dados fácil de ampliar
```

Regras:
- função **pura e idempotente**: `expandName(expandName(x)) === expandName(x)`;
- nomes que já estão legíveis (com minúsculas, ou palavras inteiras do dicionário) **não mudam**;
- separar número de unidade: `1KG`/`1kg`/`1 KG` → `1 kg`; `500G` → `500 g`; `2L` → `2 l`; `250ML` → `250 ml`; `UN`/`UND` somem;
- manter marca e variante como vieram (só a primeira letra da frase em maiúscula; marcas conhecidas em caixa alta podem ficar com inicial maiúscula);
- `L/VIDA` → `longa vida`; `TP`/`TETRA PAK` podem sumir;
- tabela com **80+ abreviações** comuns de supermercado brasileiro (FARIN, CR, BISC, MAC, MOL, REFRIG, DET/DETERG, SAB, DESINF, AMAC, PAP HIG, SALG, CHOC, MARG, PRES, LING, FGO, QJ, REQ, ACHOC, CAF, ARR, FEIJ, OL, VIN, MAION, KETCH, etc.), em estrutura de dados separada da função;
- **30+ testes**: os exemplos acima, idempotência, entrada vazia/`null`/`undefined`, acentos, minúsculas mistas, números colados, unidades, nomes longos (até 120 letras), e palavra que é prefixo de outra sem ser abreviação (ex.: `CR` sozinho só vira "creme" quando seguido de produto que combina).

---

## B. Cliente do Open Food Facts: `src/openFoodFacts.mjs` + `tests/open-food-facts.test.mjs`

O dono aprovou consultar o Open Food Facts por código de barras. API:

```js
export function isValidEan(code)                       // 8, 12, 13 ou 14 dígitos com dígito verificador (GTIN)
export async function lookupEan(ean, fetchImpl = fetch) // { name, brand, quantity } | null (nunca lança por rede/JSON)
```

- Endereço: `https://world.openfoodfacts.org/api/v2/product/<ean>.json?fields=product_name,brands,quantity`. **Só o número do código sai do aparelho** (nada de dados do usuário).
- Limite de tempo de 8 s (`AbortController`); tratar 404 (`status: 0`), JSON inesperado, `product` ausente, ausência de rede e resposta grande demais;
- cache em memória por código (evita repetir a consulta);
- `name` = `product_name` (ou `brands` + quantidade se não houver nome); recortar a 80 letras;
- testes com `fetchImpl` simulado (sem rede real): código válido, inválido, produto achado, não achado, JSON quebrado, timeout, cache, e GTIN-8/12/13/14 com dígito certo e errado. **25+ casos.**

---

## C. Ícones por categoria (Lucide, licença ISC): `src/ui/ShoppingIcons.tsx`

O app de estudo usa ícones próprios que **não** podem ser copiados. Use os do **Lucide** (ISC), copiando os desenhos (caminhos SVG) para o arquivo, com o aviso de licença no topo (ISC exige manter o aviso de copyright do Lucide). O Floco já tem `react-native-svg`; **sem dependência nova**.

Contrato:

```tsx
export type ShoppingCategory = "Hortifrúti" | "Carnes e peixes" | "Frios e laticínios" | "Padaria" | "Mercearia"
  | "Bebidas" | "Congelados" | "Limpeza" | "Higiene" | "Pet" | "Outros" | "No carrinho";
export default function CategoryIcon({ category, size = 22, color }: { category: string; size?: number; color?: string }): JSX.Element
```

- um ícone por categoria (sugestões: `leaf`, `drumstick`, `milk`, `croissant`, `package`, `cup-soda`, `snowflake`, `spray-can`, `droplets`, `paw-print`, `shopping-bag`, `shopping-cart`); categoria desconhecida cai em `shopping-bag`;
- traço 1,9, pontas e cantos arredondados, `fill="none"`, cor padrão do tema (`useTheme().c.muted`) quando `color` não vem;
- decorativo: `accessibilityElementsHidden` e `importantForAccessibility="no-hide-descendants"` (o texto da categoria já é lido ao lado);
- sem animação. Entrega: o arquivo; se quiser, um exemplo de uso de 10 linhas no parágrafo final (o Claude integra nas telas).

---

## D. Revisão de segurança da WebView: relatório (sem editar código)

Revisar **somente para ler**: `src/screens/NfceConsultaScreen.tsx` e `src/nfceParse.mjs` (`isAllowedUrl`, `parseNfceHtml`, `consultUrl`), e a ponte do `postMessage`. Escrever `REVISAO-SEGURANCA-WEBVIEW.md` com uma tabela (achado, severidade, trecho, correção sugerida) cobrindo:

- injeção de JavaScript e origem da mensagem (`onMessage` aceita de qualquer origem dentro da WebView?);
- navegação para fora de `https://*.gov.br` (redirecionamentos, `window.open`, `intent://`, `javascript:`);
- limite de tamanho do HTML (3 MB) e o custo das expressões regulares do leitor (**risco de ReDoS** em `parseNfceHtml` com HTML malicioso);
- vazamento de dados: cookies persistentes, cache, `incognito`, armazenamento, `sharedCookiesEnabled`;
- o que acontece se a página da SEFAZ for trocada por uma página falsa dentro de `.gov.br` (subdomínio qualquer);
- sugestões de teste automatizado para cada risco.

**Não corrija no código.** Só o relatório; o Claude aplica as correções depois.
