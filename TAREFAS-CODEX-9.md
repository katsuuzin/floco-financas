# Tarefas do Codex, pacote 9 (curto: 4 tarefas)

O pacote 8 foi recebido, revisado e **integrado**. O Claude corrigiu os 14 achados dos seus testes "Achado:" (agora passam: 991 na suíte principal e 72 de segurança). Ligado às telas: preço sugerido, exportar CSV, Modo compra (corredores, limite de gasto, tempo guardado, texto falado), escanear produto e migração de chaves. Este pacote é curto de propósito. Ordem de valor: 1 a 4.

## Regras (as mesmas)

- Nunca `expo prebuild`. **Sem commit, push ou release**. Dados inventados; nenhuma chave de API, CNPJ ou chave de nota reais. Sem dependência nova.
- Funções puras em `src/*.mjs`, textos em português do Brasil, valores em centavos, sem rede, arquivo ou relógio dentro das funções (receba `now`).
- **Não edite** arquivos existentes. Só crie os listados. Use `tests/helpers/shoppingFixtures.mjs`.
- Ao final rode `npm test`, `npx tsc --noEmit` e `node --test tests/security/*.test.mjs`. Hoje: 991 e 72, 0 falhas. Teste novo que expõe defeito real pode falhar: prefixo "Achado:" e relate com exemplo mínimo.
- Entrega: um parágrafo curto, quantos testes passam, quais falham.

---

## 1. Lógica de tela do Modo compra, testável sem celular

Arquivos novos: `src/shoppingTripView.mjs` e `tests/shopping-trip-view.test.mjs`.

O Claude ligou o Modo compra em `src/screens/ShoppingTripScreen.tsx` (leia-o). Extraia, **como funções puras novas** (o Claude trocará o código da tela por elas depois), toda a decisão que hoje está dentro do componente:

- `tripViewModel(state, { session, limitCents, now })` devolve tudo o que a tela mostra: `cart` (texto e centavos), `progress` (itens, porcentagem), `elapsed`, `budget` (`level`, mensagem, cor lógica "ok"|"near"|"over"), `groups` (já na ordem do corredor, com itens e totais por linha), `inCart`, `canFinish`, `empty`, `spoken` (texto falado do cabeçalho e de cada linha).
- `parseLimitInput(text)`: "250", "250,00", "R$ 1.250,50", "", "0", "-5", "abc", "1e3" → `{ ok, cents }` ou `{ ok: false, message }` em português; vazio e "0" significam "sem limite".
- `finishPlan(state)`: o que acontece ao finalizar (despesa única com valor e descrição; itens sem preço listados; aviso se o carrinho está vazio ou se há itens pendentes).
- Casos: lista vazia, tudo no carrinho, tudo sem preço, limite estourado, 2 000 itens em menos de 100 ms, estado sem `shoppingItems`, relógio no passado, sessão nula.

## 2. Testes de contrato das telas novas (estáticos, sem renderizar)

Arquivo novo: `tests/security/screens-contract.test.mjs` (usa o compilador do TypeScript como `tests/security/a11y-static.test.mjs` já faz).

Para `ShoppingTripScreen.tsx` e `ScanProductScreen.tsx` (e `ShoppingScreen.tsx`, que ganhou "Usar preços do histórico", "Exportar em CSV" e "Escanear produto"), verifique por análise estática:

- Todo `Button`/`Pressable` tem nome acessível; todo `Field` tem `label`.
- Toda rota nova (`shoppingTrip`, `scanProduct`) aparece em **três** lugares: o tipo em `src/app/nav.tsx`, o título e o `case` em `App.tsx`; e toda rota com campo de texto está na condição do `KeyboardAvoidingView` de `App.tsx`.
- Nenhuma tela nova chama `fetch` diretamente fora de `ScanProductScreen` (a única que acessa a internet); nenhuma loga dado pessoal (`console.log`).
- Nenhum `AsyncStorage.setItem` guarda texto livre da pessoa além das duas chaves `floco.tripSession` e `floco.tripBudgetCents`.
- Textos de interface em português, sem inglês; "…" e não "...".

## 3. Casos de borda do que acabou de ser ligado

Arquivo novo: `tests/shopping-integration-edges.test.mjs`.

Contra os módulos **como o app agora os usa** (leia `src/app/store.tsx`, `ShoppingScreen.tsx`, `ShoppingTripScreen.tsx`, `ScanProductScreen.tsx`):

- `migrateProductKeys` no carregamento: estado sem `shoppingProducts`; estado já migrado (mesmo objeto de volta); dois produtos que colidem após a regra nova e compras que apontavam para o removido; backup antigo com chave "leite 1 5l" que passa a "leite 1.5l"; idempotência em duas chamadas seguidas.
- `suggestPrices`/`applySuggestedPrices` com item com unidade, quantidade fracionada, histórico de produto sem pontos, item já com preço (não muda), 2 000 itens.
- `listToCsv` com todos os caracteres perigosos e invisíveis na primeira posição (NUL, BOM, bidi, tab, `=`, `+`, `-`, `@`).
- `resolveScan` com `lookup` que demora mais que `timeoutMs`, que lança e que devolve nome com `<`/`>`; `duplicateOf` com código no formato UPC-A e EAN-13 do mesmo produto.
- Sessão: `resumeSession` com `lastSeenAt` exatamente 180 min atrás (borda), 179 e 181; `parseSession` de texto corrompido; troca de fuso (relógio andando para trás 1 h).

## 4. Roteiro de teste final das integrações + registro

Arquivos novos: `ROTEIRO-TESTE-INTEGRACOES.md`.

Roteiro numerado (ação, esperado, registrar) para o emulador e o celular, só do que foi ligado agora: usar preços do histórico (com e sem histórico), exportar CSV (abrir no compartilhamento e conferir o separador `;` e o `'` antes de `=`), Modo compra (ordem dos grupos por corredor, definir e tirar o limite, cores de "perto" e "estourado", sair e voltar em até 3 h mantém o tempo, finalizar zera a sessão), escanear produto (permissão negada, concedida, código manual válido e inválido, sem internet, produto não encontrado, item duplicado), migração de chaves (atualizar o app com catálogo antigo e conferir que o histórico não duplica). Termine com a tabela em branco de resultados (passo, passou/falhou, observação) e uma seção "o que o emulador não cobre".

---

Prompt de uma linha: **"Leia o TAREFAS-CODEX-9.md na pasta do projeto e execute as tarefas 1 a 4 na ordem."** Força: média; alta só para a tarefa 1.
