# Tarefas do Codex, pacote 12: acabamento, revisão e testes mais confiáveis

O pacote 11 foi conferido pelo Claude no emulador (tema claro). O que funcionou: atualização por cima da 1.10.0 sem perda de dados, extrato com calendário, contas, metas e caixinhas, lista de compras, calculadora. O que os testes **não** pegaram: calendário com a última semana desalinhada, botões colados em Contas e Caixinhas, e o bloco "Está acabando" empurrando a lista para baixo. Este pacote corrige isso e reforça a verificação.

Leia antes: `CLAUDE.md`, `DESIGN.md`, `RELATORIO-CODEX-11.md`, `INVENTARIO-FUNCIONAL.md` (parágrafo "Pacote 11") e `PLANO-ANIMACOES-LISTA.md`.

## Regras (as de sempre, mais estas)

- Nunca `expo prebuild`. **Sem commit, push ou release. Não gere APK nem rode `build-android.ps1`.** Sem dependência nova. Dados inventados.
- Uma tarefa por vez, na ordem. Entre tarefas: `npx tsc --noEmit`, `node --test --test-concurrency=1 tests/*.test.mjs` e `node --test tests/security/*.test.mjs` verdes.
- **Palavra proibida no relatório: "Validada".** Use dois campos separados por tarefa: **Código:** (testes passam, `tsc` ok) e **Tela:** ("verificada no emulador" só se o Claude confirmou; senão "não verificada"). Você não tem emulador, então "Tela" será sempre "não verificada" no seu relatório. Isso é esperado e honesto.
- Mudança visual: descreva em uma linha **o que o usuário vai ver de diferente** e **o que o Claude deve olhar** na tela (um passo curto cada). Use só tokens de `useTheme()`; nada de cor fixa.
- Fim de linha misto: use script Python que tenta `\n` e `\r\n`. Mantenha o original.
- Escreva tudo em `RELATORIO-CODEX-12.md` (um bloco por tarefa). Edite documentos só onde a tarefa 8 permite.

---

## 1. Corrigir o visual que os testes não pegaram

Arquivos: `src/screens/OrganizeScreens.tsx` (Contas, Caixinhas), `src/screens/ShoppingScreen.tsx` e `src/screens/RestockList.tsx` (Está acabando), `src/screens/TransactionsScreen.tsx` (calendário; o Claude já pôs `minWidth: 48` nas células vazias: confira se é a correção certa e se a grade continua certa com fonte 200%).

- **Contas e Caixinhas:** os botões ("Reordenar contas", "Arquivar …", "Criar caixinha", "Depositar" …) estão colados, sem espaço entre eles, e "Criar caixinha" encosta nas abas. Dê espaço vertical consistente (use o mesmo `gap` das outras telas) e agrupe as ações secundárias de cada item para não virar uma pilha de seis botões grandes: ação principal em destaque, as demais numa linha ou numa folha "Mais ações".
- **"Está acabando":** hoje ocupa uns 3 blocos no alto da lista de compras e empurra os itens para baixo. Mova o bloco para **depois** dos itens e do campo de adicionar, **recolhido por padrão** (título + contagem "3 sugestões", expande ao tocar, com `accessibilityState.expanded`). O seletor de listas e Desfazer/Refazer ficam compactos numa linha. A lista de itens deve ser a primeira coisa visível.
- Teste estático novo em `tests/security/screens-contract.test.mjs`: nas três telas, nenhum `Button` consecutivo sem espaçamento (defina uma regra simples, como todo contêiner com 2+ `Button` filhos ter `gap`), e a grade do calendário ter `minWidth` igual em células cheias e vazias.

## 2. Ligar o movimento dos botões

Arquivos: `src/ui/kit.tsx`, usando `src/ui/motion.tsx` e `src/motion.mjs` (já existem e têm testes). Troque `Pressable` por `MotionPressable` em `Button` (kind "button"), `IconButton` ("icon"), `Choice` e `Segmented` ("chip"), `ListItem` ("row") e no botão + central da barra em `App.tsx` ("fab"). Atenção:
- `MotionPressable` aceita `style` comum, **não** função de `pressed`: converta cada `style={({pressed}) => …}` mantendo o mesmo visual de repouso. O destaque de "pressionado" que existia (opacidade 0.75, fundo `c.soft` no `IconButton`) passa a vir da animação; mantenha o `IconButton` com fundo `c.soft` ao pressionar (use estado `pressed` via `onPressIn/onPressOut` se precisar).
- Nada pode mudar de tamanho ou posição em repouso. Desabilitado não anima.
- Respeita "remover animações" (já feito no hook).
- `DESIGN.md`: a frase "feedback pressionado sem deslocamento" passa a "feedback pressionado: afunda até 4% e volta; sem animação contínua nem decorativa; respeita remover animações". Edite só essa frase.
- Teste estático: `Button`, `IconButton`, `Choice`, `Segmented` e `ListItem` não usam mais `Pressable` direto de `react-native` em `kit.tsx`.

## 3. Testes de tempo que não dão alarme falso

Arquivos novos: `tests/helpers/timing.mjs`; edite os testes de tempo existentes (procure por "em menos de", "abaixo de", "ms" nos `assert.ok(performance.now() - start < …)`), que falham quando a máquina está ocupada (build ou emulador rodando).

Crie `measure(fn, { runs = 5 })` que roda `fn` várias vezes, descarta a primeira e devolve a **mediana**, e `assertFast(fn, budgetMs, label)` que compara a mediana com o orçamento multiplicado por `process.env.FLOCO_TIMING_FACTOR ?? 3`. Troque todos os testes de tempo por ela. Os orçamentos originais continuam, só com tolerância. Acrescente um teste de **complexidade**: dobrar a entrada não pode mais que ~3x o tempo (pega algoritmo quadrático sem depender da velocidade da máquina). Rode a suíte três vezes seguidas com o computador ocupado (rode `npm test` em paralelo em outro terminal) e relate quantas falhas sobraram (meta: zero).

## 4. Revisão crítica do seu próprio pacote 11

Sem editar código nesta tarefa: **leia o diff** (`git diff` e arquivos novos) e escreva `REVISAO-PACOTE-11.md`, com, por módulo: (a) o que pode perder ou corromper dado (migração não idempotente, campo novo que `validateBackup` não conhece, backup antigo que não restaura); (b) o que pode travar o app ao abrir (migração em arquivo grande, loop, exceção sem captura em `store.tsx`); (c) estado que fica órfão (conta arquivada referenciada, meta apontando para caixinha excluída, lista excluída com itens); (d) acessibilidade ou texto fora do padrão. Cada achado com arquivo:linha, exemplo mínimo e gravidade (alta/média/baixa). Sem achado, diga "nenhum" e como verificou. Depois escreva testes que **provem ou refutem** os achados de gravidade alta e média, com prefixo "Achado:" nos que falharem. **Não corrija** sozinho: o Claude decide a ordem.

## 5. Teste de ida e volta de backup (o de maior risco)

Arquivos: `tests/backup-roundtrip.test.mjs`, `tests/fixtures/backup-1.10.0.json` (inventado, no formato da 1.10.0; use `entrega/backup-ficticio-ritmo.json` como base e **não** copie dados pessoais). Casos:
1. Restaurar o backup da 1.10.0 → migrações de abertura → exportar → restaurar de novo: o segundo estado é igual ao primeiro (idempotência) e nenhum centavo, conta, meta, caixinha, tag ou item de lista some.
2. Mesmo com campos novos corrompidos (`pots: "x"`, `accounts[].order: -1`, `tags[].icon: {}`, `shoppingLists: null`): restaura, descarta só o campo ruim, e o resto fica.
3. Backup **mais novo** que o app (campo desconhecido): não apaga o campo ao exportar de novo.
4. Total de saldo de contas antes = depois; soma de caixinhas antes = depois.
5. 5 000 transações e 2 000 itens: restaura sem estourar o tempo (use `assertFast`).

## 6. Auditoria de cores fixas e tema escuro

Arquivos: `tests/security/theme-static.test.mjs`. Procure em `src/screens/*.tsx`, `src/ui/*.tsx`, `App.tsx` e nos painéis por cores fixas (`#hex`, `rgb(`, nomes como `"white"`) fora de `src/ui/theme.tsx` e das paletas fechadas (`categoryStyle`, ícones de banco). Liste no relatório e **troque** por tokens do tema onde for óbvio (texto, fundo, borda). Onde a cor é intencional (marca do banco, ícone de categoria), registre numa lista de exceções com motivo no próprio teste. O teste falha se aparecer cor fixa nova fora da lista. Confira também contraste: para cada par texto/fundo dos tokens claro e escuro, razão mínima 4,5:1 (calcule no teste e liste os pares que reprovam).

## 7. Segurança: parte que não precisa de aparelho

Leia `MATRIZ-DE-RISCO-LISTA-DE-COMPRAS.md`, `REVISAO-SEGURANCA-IMPORTADORES.md` e `REVISAO-SEGURANCA-WEBVIEW-2.md`. Para cada item aberto, classifique em: **A)** corrigível e testável só com código; **B)** exige medir no Android (origem da ponte, redirecionamentos, tempo no Hermes); **C)** decisão de produto. Corrija os da classe A (W01 a W08 onde couber), com teste em `tests/security/`. Para a classe B, escreva em `PLANO-MEDICAO-ANDROID.md` o passo exato que o Claude deve rodar no emulador (comando `adb`, o que observar, resultado esperado). Classe C: uma linha com a pergunta ao dono. Nunca afrouxe uma checagem existente para um teste passar.

## 8. Documentação do estado real

Pode editar: `INVENTARIO-FUNCIONAL.md`, `DESIGN.md`, `CLAUDE.md` (só a seção "Estado atual"). Integre `RASCUNHO-DOCS-PACOTES-5-A-8.md` e `RASCUNHO-DOCS-LISTA-DE-COMPRAS.md`; descreva as telas dos pacotes 9 a 12 como o Claude as conferiu (veja o parágrafo "Pacote 11" do inventário: **mantenha** a divisão entre "testado no emulador" e "não testado"; não promova nada para "testado"). `CLAUDE.md`: atualize versão/estado e a lista de tarefas (marque o que o pacote 11 concluiu; mantenha as regras e o ambiente exatamente como estão). Sem dado pessoal e sem caminho de usuário novo.

## 9. Roteiro único de teste para o celular real

Crie `ROTEIRO-TESTE-CELULAR-3.md` unindo e **substituindo a repetição** entre `ROTEIRO-TESTE-INTEGRACOES.md`, `ROTEIRO-TESTE-CELULAR.md`, `ROTEIRO-TESTE-CELULAR-2.md` e os passos de emulador do `RELATORIO-CODEX-11.md`. Formato: tabela Passo / Ação / Esperado / Passou?, agrupada por tela, com uma coluna "só no celular" (câmera, TalkBack, fonte 200%, notificação real, SMS, instalador). No máximo 60 passos, cada um em uma frase, em português simples, para uma pessoa sem conhecimento técnico seguir. Comece por "Antes de testar: faça backup" e termine com "como me mandar o resultado".

---

## O que fica com o Claude

Build e teste no emulador e no celular; decisão de design; animações do Lemonlist (dependem da resposta do dono às perguntas do `PLANO-ANIMACOES-LISTA.md`); medições da classe B; commit e release.

## Prompt de uma linha

> Leia `TAREFAS-CODEX-12.md` na pasta do projeto e execute as 9 tarefas na ordem, uma por vez, e escreva o `RELATORIO-CODEX-12.md` sem usar a palavra "Validada".
