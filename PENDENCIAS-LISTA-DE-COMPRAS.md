# Lista de compras do Floco: o que ficou de fora e o que ficou para depois

Documento para passar a outra ferramenta (ChatGPT/Codex) enquanto o Claude continua a integração. Atualizado em 10/11/2026. Não contém dado pessoal: nenhuma chave de nota, CNPJ, valor de compra ou conta real.

## 1. Contexto em 10 linhas

- **Floco Finanças**: app Android de finanças pessoais, React Native 0.88 + Expo 58 (React 19), navegação própria (`src/app/nav.tsx`, abas + pilha), dados em SQLite (uma coleção por lista do estado, via `src/storage.mjs`), tema claro e escuro, fonte Sora, destaque amarelo Solar `#FFCB45`, marrom `#311E0D`.
- **Módulo Lista de compras (E1)**: já feito e testado no emulador. Bloco na Início, tela da lista, leitor de nota fiscal (QR/chave), consulta da nota de **SP** pela SEFAZ numa WebView, histórico de compras e produtos no banco, tudo dentro do backup JSON e do criptografado.
- **Estado dos testes**: `npm test` com 325 testes passando e `npx tsc --noEmit` limpo.
- **Convenções**: valores em **centavos inteiros**; lógica pura em `src/*.mjs` (sem React), testes em `tests/*.test.mjs` com `node --test`; textos em português do Brasil; telas em `src/screens/*.tsx` usando o kit `src/ui/kit.tsx` e os tokens de `src/ui/theme.tsx`; ícones Feather (`@expo/vector-icons`).
- **Arquivos do módulo**
  - Lista: `src/shopping.mjs`, `src/shoppingData.mjs`, `src/screens/ShoppingScreen.tsx`
  - Compras e produtos: `src/shoppingPurchases.mjs`
  - Nota fiscal: `src/nfce.mjs` (chave de 44 dígitos, módulo 11, leitura do QR), `src/nfceParse.mjs` (HTML da SEFAZ de SP, URL de consulta, lista de endereços permitidos, conversão para compra)
  - Telas: `src/screens/ScanNotaScreen.tsx` (câmera/foto/colar), `src/screens/NfceConsultaScreen.tsx` (WebView, prévia, salvar)
  - Conferência e histórico: `src/shoppingMatch.mjs`, `src/shoppingHistory.mjs`, `src/screens/PurchasesScreens.tsx`
  - Testes: `tests/shopping.test.mjs`, `tests/shopping-purchases.test.mjs`, `tests/nfce.test.mjs`, `tests/nfce-parse.test.mjs`, `tests/shopping-match.test.mjs`, `tests/shopping-history.test.mjs`
- **Regras do projeto (valem para quem trabalhar nele)**
  - **Nunca** rodar `expo prebuild` (apagaria widgets, manifest e ícones feitos à mão em `android/`).
  - **Não** fazer commit, push nem release sem o dono pedir.
  - **Não** gravar dado pessoal em arquivo versionado (use dados fictícios em testes e exemplos).
  - Ao concluir uma função, atualizar `INVENTARIO-FUNCIONAL.md`. Rodar `npm test` e `npx tsc --noEmit` ao final.
  - Respostas e textos de interface em português, curtos.

## 2. Como dividir o trabalho sem conflito

O Claude está editando agora os arquivos abaixo. **Quem for ajudar em paralelo não deve alterá-los**:

`src/screens/ShoppingScreen.tsx`, `src/screens/NfceConsultaScreen.tsx`, `src/screens/ScanNotaScreen.tsx`, `src/screens/PurchasesScreens.tsx`, `src/screens/HomeScreen.tsx`, `src/app/nav.tsx`, `App.tsx`, `src/layout.mjs`, `src/shopping.mjs`, `src/shoppingPurchases.mjs`, `src/shoppingHistory.mjs`, `src/shoppingMatch.mjs`, `src/nfceParse.mjs`.

O formato de entrega que evita conflito: **arquivos novos** (módulo puro + teste) numa **cópia ou branch separada**. O Claude faz a integração nas telas depois. Cada tarefa abaixo diz quem pode pegar.

## 3. Para depois (planejado, ainda não feito)

Legenda de dono: **Claude** (em andamento ou na fila), **Paralelo** (pode ser feito já por outra ferramenta, em arquivos novos), **Dono** (depende de algo que só o usuário tem).

### 3.1 Conferência da nota com o carrinho: FEITO
`src/shoppingMatch.mjs` + integração na `NfceConsultaScreen` (testado no emulador com uma nota real de SP). Casa itens da lista com linhas abreviadas da nota, separa "leite" de "creme de leite" e não repete linhas.

### 3.2 Histórico de compras e produtos: FEITO (menos o ritmo de compra)
`src/shoppingHistory.mjs` e `src/screens/PurchasesScreens.tsx`: compras salvas, preço por produto (último, médio, mínimo, máximo), variação de preço, apagar compra e "Colocar na lista". **Ritmo de compra ("já deve estar acabando")**: dividido em duas metades. As **telas** (bloco na Início e seção na aba Produtos, `src/screens/RestockList.tsx`) estão prontas e só leem o contrato. A **lógica** é do Codex, em `src/shoppingRhythm.mjs` (hoje só a casca) com a tarefa completa em `TAREFA-CODEX-RITMO-DE-COMPRA.md`.

### 3.3 Dicionário de abreviações dos nomes da nota: **Paralelo**
A SEFAZ imprime nomes abreviados (exemplos fictícios: `FARIN TRIGO MARCA 1kg`, `CR LEITE MARCA TP 200G`, `BISC RECH 140G`, `MAC OVOS 500G ESPAGUETE`, `MOL TOM SACH 240G`). Criar `src/nfceNames.mjs` com `expandName(raw)` que devolve o nome legível ("Farinha de trigo Marca 1 kg", "Creme de leite Marca tetra pak 200 g"), por regras e dicionário local (sem IA, sem rede). Requisitos:
- não perder marca, peso nem unidade; manter `rawName` como veio;
- tabela de abreviações comuns de supermercado brasileiro (FARIN, CR, BISC, MAC, MOL, REFRIG, DET, SAB, DESINF, AMAC, PAP HIG, SALG, CHOC, MARG, PRES, LING, FGO, etc.), em arquivo de dados separado e fácil de ampliar;
- função pura, idempotente, com 30+ testes (casos reais fictícios, nomes já legíveis que não podem mudar, maiúsculas/minúsculas, acentos, unidades `G/KG/ML/L/UN`);
- entrega: `src/nfceNames.mjs`, `tests/nfce-names.test.mjs`. O Claude liga em `recordPurchase` depois.

### 3.4 Colar lista (texto de WhatsApp ou receita vira itens): **Paralelo**
Criar `src/pasteList.mjs` com `parsePastedList(text)` que devolve `[{ name, qty, unit }]`. Entradas: uma linha por item, itens separados por vírgula ou "e", marcadores (`-`, `•`, `*`, `1.`), quantidades (`2 cebolas`, `500g de farinha`, `1,5 kg tomate`, `uma dúzia de ovos`, `meia dúzia`), títulos de seção a ignorar (`Farofa:`, `Ingredientes`). Reaproveitar `parseItemText` de `src/shopping.mjs` (apenas importar, sem editar). Sem IA, sem rede. Entrega: módulo + `tests/paste-list.test.mjs` com 25+ casos. A tela fica com o Claude.

### 3.5 Ícones por categoria e movimento: **Paralelo** (parte pura) + Claude (integração)
- Ícones: o Lemonlist usa ícones próprios que **não** devem ser copiados. Usar os do **Lucide** (licença ISC) para as 11 categorias de `SHOPPING_CATEGORIES` (Hortifrúti, Carnes e peixes, Frios e laticínios, Padaria, Mercearia, Bebidas, Congelados, Limpeza, Higiene, Pet, Outros). O Floco já tem `react-native-svg`; criar `src/ui/ShoppingIcons.tsx` com os caminhos SVG dos ícones (com a nota de licença no topo), traço 1,9 e cantos arredondados, cor vinda do tema. Sem dependência nova.
- Movimento, só como especificação por enquanto (React Native `Animated`, sem biblioteca nova): marcar item (check que se desenha, ~1,1 s, curva `cubic-bezier(.22,1,.36,1)`), toast com pequeno overshoot, linha do leitor de QR (~2,4 s, ease-in-out), brilho de carregamento (~1,4 s linear). **Respeitar "reduzir movimento"** (`AccessibilityInfo.isReduceMotionEnabled`). O Floco evita animação decorativa contínua (ver `DESIGN.md`).
- Proibido: mascotes, ilustrações ou qualquer arte do Lemonlist.

### 3.6 Código de barras com Open Food Facts: **Paralelo** (cliente puro)
Criar `src/openFoodFacts.mjs` com `lookupEan(ean, fetchImpl = fetch)` que consulta `https://world.openfoodfacts.org/api/v2/product/<ean>.json?fields=product_name,brands,quantity` e devolve `{ name, brand, quantity } | null`. Regras: só o número do código sai do aparelho; validar o EAN (8, 12, 13 ou 14 dígitos, dígito verificador); limite de tempo de 8 s; tratar 404, JSON inesperado e ausência de rede sem lançar erro para a tela; cache em memória. Testes com `fetchImpl` simulado. Entrega: módulo + `tests/open-food-facts.test.mjs`. O botão "Escanear produto" na lista fica com o Claude (usa `expo-camera`, já instalado).

### 3.7 Preço estimado a partir do histórico: Claude
Preencher o preço sugerido de um item da lista com `lastKnownPrice` e marcar como "estimado do último valor pago". Mexe em `ShoppingScreen`.

### 3.8 Modo compra: Claude
Total do carrinho, progresso, tempo e "falta R$" durante a ida ao mercado.

### 3.9 Documentação: Claude (no fim)
Atualizar `INVENTARIO-FUNCIONAL.md` (E1), `DESIGN.md` (leitor, consulta, histórico), `CLAUDE.md` e `TAREFAS.md`, e rodar a crítica do `/impeccable` nas telas novas.

### 3.10 Revisão de segurança da WebView: **Paralelo** (só leitura)
Revisar `src/screens/NfceConsultaScreen.tsx` e `src/nfceParse.mjs` (`isAllowedUrl`, props da WebView, injeção de JavaScript, mensagem `postMessage`, limite de 3 MB) e listar riscos com severidade. **Só relatório, sem editar** esses arquivos.

## 4. Depende do dono (não dá para resolver sem algo que só o usuário tem)

| Item | O que falta |
|---|---|
| Leitura da nota de **PR** | uma nota real de PR (link ou foto do QR) e confirmar qual é o endereço de consulta correto (a tabela pública achada é ambígua e de 06/2024) |
| Leitura da nota de **SC** | uma nota real de SC e o endereço de consulta (não foi encontrado em fonte pública) |
| Leitura da nota de **RS** | uma nota real de RS (o endereço público conhecido é `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx`, a confirmar com nota real) |
| QR **ao vivo** pela câmera | teste num celular real (o emulador usa câmera simulada que não mostra imagens) |
| TalkBack e **fonte grande** | teste num celular real com leitor de tela e tamanho de fonte aumentado |
| **Restauração de backup** no aparelho | teste manual: restaurar backup antigo e novo com compras salvas |
| Gravar a **despesa** de uma compra | foi testado só abrir e cancelar o formulário; falta confirmar gravando de verdade |
| Commit e release | só quando o dono pedir (versão no repositório: 1.8.1) |

**Ao receber uma nota real de outro estado**, o procedimento que funcionou em SP: ler o QR (`parseNfceInput`), abrir a página **num navegador de verdade** (a consulta direta por HTTP é recusada pelo firewall da SEFAZ; **não tentar contornar**), estudar só a estrutura do HTML (classes e ordem), escrever o leitor em `src/nfceParse.mjs` com um **HTML sintético** nos testes (nomes, valores, CNPJ e chave inventados) e acrescentar o endereço em `CONSULT_HOSTS`.

## 5. Ficou de fora de propósito (decisão de escopo)

Estas funções do app de estudo (Lemonlist) **não serão feitas** no Floco:

- **Voz** (falar a lista): o Floco bloqueia a permissão de microfone (`RECORD_AUDIO`).
- **Achar mercado perto / localização**: exigiria permissão de localização e um serviço externo.
- **IA para preço estimado e normalização de nomes**: substituídas por regras e histórico locais. **Exceção decidida pelo dono**: "Colar lista → Interpretar com IA" existe como recurso **opcional**, com a chave do próprio usuário (Assistente), sempre com prévia editável e leitura offline como padrão; só o texto colado é enviado ao provedor. Testado no emulador com o Gemini (modelo padrão `gemini-3.5-flash-lite`).
- **Convidar pessoas, listas compartilhadas, dividir contas, "Casa" e Pix**: exigem servidor e contas de usuário.
- **Assinatura, planos e pagamento**.
- **Servidor, chaves e recursos pagos do Lemonlist**: nada disso é usado; cada função roda no aparelho.
- **Mascotes, animações próprias, ícones e textos do Lemonlist**: o Floco usa a identidade dele.
- **Contornar firewall ou captcha da SEFAZ**: a consulta é feita só pela WebView, como um navegador comum.
- **Várias listas no MVP**: lista única (cada item tem `listId` fixo `"main"`, para permitir várias depois sem migração).
- **Gesto de deslizar nos itens**: toda ação tem botão, por acessibilidade.
- **Estados além de SP, PR, SC e RS**: ficam para uma atualização futura.
- **Painel "Seus gastos" do Lemonlist**: o Floco já tem a aba Análise; o módulo não duplica.

## 6. Critério de pronto para qualquer tarefa "Paralelo"

1. Arquivos novos (módulo + teste), sem editar a "zona do Claude" da seção 2.
2. `npm test` e `npx tsc --noEmit` passando (o PATH do Node do projeto está no `CLAUDE.md`).
3. Sem dependência nova sem avisar o dono; sem dado pessoal; sem commit.
4. Um parágrafo curto dizendo o que foi feito, o que ficou de fora e como integrar.
