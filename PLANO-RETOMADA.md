# Plano de retomada (Lista de compras no Floco Finanças)

Para abrir um chat novo. Pasta do projeto: `C:\Users\Kat\Desktop\Projetos de IA\01 - Floco finanças`. Último release: **v1.9.0** (HEAD 789f69f). Leia também `CLAUDE.md`, `PENDENCIAS-LISTA-DE-COMPRAS.md` e `INVENTARIO-FUNCIONAL.md` (E1).

## Regras fixas
- Nunca rodar `expo prebuild`. Build Android: `build-android.ps1`; APK em `entrega\` (fora do Git).
- Commit, push e release só quando o dono pedir.
- Respostas curtas, em português. Tarefas do Codex em arquivo `.md` + prompt de uma linha ("leia o .md …").
- Sem dados pessoais nem chaves em arquivos versionados. A chave do Gemini apareceu no chat: o dono deve revogá-la.
- Testes: `npm test` (540 passando) e `node --test tests/security/*.test.mjs` (11 defensivos), mais `npx tsc --noEmit`.

## Estado agora
- **Modo compra, em andamento:** criei `src/screens/ShoppingTripScreen.tsx` (usa `src/shoppingTrip.mjs` do Codex). A tela **ainda não está ligada** e nunca foi compilada.
  - Falta ligar: tipo de rota `{ name: "shoppingTrip" }` em `src/app/nav.tsx` (união de rotas, perto da linha 41); `case "shoppingTrip"` e título "Modo compra" em `App.tsx` (mapa de títulos perto da linha 288, `switch` perto da linha 590); `top?.name === "shopping"` no `KeyboardAvoidingView` só se tiver campo de texto (não tem); botão "Modo compra" em `src/screens/ShoppingScreen.tsx` (ao lado de "Ler nota fiscal", só com itens).
  - Ajuste na tela: o total da linha em `TripRow` deve usar `lineTotal(item)` de `src/shopping.mjs` (hoje faz conta própria e erra quando `unit` existe).
  - Depois: `npx tsc --noEmit`, `npm test`, verificar no emulador (AVD FlocoToolsAudit, porta 5554, driver `drv.py` no scratchpad da sessão antiga, que pode ter sumido: usar `adb`/`uiautomator`).
  - Opcional: guardar o horário de início para o tempo não zerar ao sair e voltar.

## Minha parte (Claude), em ordem
1. Terminar o Modo compra (acima).
2. **Preço sugerido do histórico** na lista: preencher o preço do item com `lastKnownPrice` (`src/shoppingPurchases.mjs`), sem sobrescrever preço digitado.
3. **Escanear produto**: ler código de barras (`expo-camera`, já aprovado) e buscar o nome em `src/openFoodFacts.mjs` (Open Food Facts, aprovado). Confirmar o nome com o usuário antes de adicionar.
4. **Aplicar o pacote 4 do Codex** quando chegar: corrigir o que `tests/security/nfce-hostile.test.mjs` e `REVISAO-SEGURANCA-WEBVIEW-2.md` apontarem; tratar os pontos de `tests/a11y-static.test.mjs` (ou `tests/security/`).
5. **Crítica /impeccable** das telas novas (leitor, consulta, histórico, ritmo, modo compra) e integrar `RASCUNHO-DOCS-LISTA-DE-COMPRAS.md` (revisado) em `INVENTARIO-FUNCIONAL.md`, `DESIGN.md` e `CLAUDE.md`.
6. **Release 1.10.0**: só com pedido do dono. Notas de exemplo: ver `notas-1.9.0.md` (scratchpad antigo) ou o release v1.9.0 no GitHub.
7. Gerar `entrega/backup-ficticio-ritmo.json` (citado em `ROTEIRO-TESTE-CELULAR.md`; datas relativas a 10/11/2026), se ainda não existir.

## Trabalho do Codex (código e testes; ele não edita arquivos existentes salvo exceção do `.md`)
- **Pacote 4** (`TAREFAS-CODEX-4.md`), força **alta** para 1 e 2, **média** para 3:
  1. testes hostis da WebView em `tests/security/nfce-hostile.test.mjs` (+ `helpers.mjs`; já existem, falta confirmar se cobrem tudo);
  2. `REVISAO-SEGURANCA-WEBVIEW-2.md` (relatório, sem editar código);
  3. testes de acessibilidade estática das telas novas.
- **Pacote 5, a criar** (força média), sugestões:
  - lógica pura do preço sugerido e do "Escanear produto" (normalizar código EAN, tratar falha da rede) em arquivos novos;
  - testes da lógica do Modo compra além dos 25 casos atuais;
  - revisão de acessibilidade do Modo compra depois de ligado.
- Modelo: GPT-6.1 Sol (o marcado no seletor).

## Depende do dono
- Revogar a chave do Gemini exposta.
- Testar em celular real: QR ao vivo, TalkBack, fonte grande (`ROTEIRO-TESTE-CELULAR.md`).
- Enviar nota real de PR, SC e RS (e o endereço de consulta de SC) para ler os itens desses estados; os demais estados ficam para outra atualização.
- Opcional: remover a chave real de uma nota em `02 - app lista de compras\docs\mapeamento-lemonlist.md`.

## Ainda não testado
QR ao vivo pela câmera, TalkBack, fonte grande, celular real, atualização pelo próprio app, leitura de itens de PR/SC/RS.
