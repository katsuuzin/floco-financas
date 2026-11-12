# Plano de finalização do Floco Finanças (para abrir um chat novo)

Pasta: `C:\Users\Kat\Desktop\Projetos de IA\01 - Floco finanças` (Git, branch `main`, remoto `katsuuzin/floco-financas`). Leia antes: `CLAUDE.md`, `INVENTARIO-FUNCIONAL.md` (parágrafos "Pacote 11" e "Pacote 12"), `DESIGN.md` e este arquivo. Substitui `PLANO-RETOMADA-2.md`.

## Estado agora

- **Última release: v1.11.0** (versionCode 21), publicada no GitHub **sem teste completo, a pedido do dono**, que está verificando no celular. A última versão testada de ponta a ponta é a 1.10.0.
- Commit `9e38fa8` na `main`. Árvore de trabalho limpa na publicação (arquivos novos desde então: este plano).
- Testes: `npm test` e `node --test tests/security/*.test.mjs` (1193 no total passam com `--test-concurrency=1`), `npx tsc --noEmit` limpo.
- Dono: pessoa que usa o app (português, respostas curtas, sem enrolar). O **Codex** (outra IA) faz código e testes em pacotes `TAREFAS-CODEX-N.md`; ele **não** tem emulador e seus relatórios dizem "validada" quando só os testes de código passam: nunca confiar nisso. O pacote 12 (`TAREFAS-CODEX-12.md`) foi concluído em parte e completado pelo Claude (veja abaixo).

## Regras fixas

- Nunca `expo prebuild` (apagaria widgets, manifest e ícones em `android/`).
- Build: `.\build-android.ps1 -Architecture x86_64` (emulador) ou `universal` (celular). Saída em `entrega\` (fora do Git). Ambiente, Node e caminhos: seção "Ambiente" do `CLAUDE.md`. Um build leva 3 a 5 min; rode em segundo plano.
- Emulador: AVD `FlocoToolsAudit`, porta 5554, pacote `br.com.kat.flocofinancas`. Navegar com `adb` (`input tap`, `screencap`; no Git Bash use `exec-out screencap -p > arquivo.png`, no PowerShell o PNG corrompe). `adb input text` não digita emoji.
- Commit, push e release **só quando o dono pedir**. Release: subir versão e versionCode em `app.json`, `package.json`, `android/app/build.gradle`; gerar APK universal; `entrega\Floco-Financas.apk` + `.sha256` (formato `HASH *Floco-Financas.apk`); `gh release create vX.Y.Z`. Mensagem de commit termina com `Co-Authored-By: Claude <modelo> <noreply@anthropic.com>`.
- Ao concluir uma função: atualizar `INVENTARIO-FUNCIONAL.md`, mantendo a divisão **testado no emulador / não testado**. Nunca promover algo a "testado" sem ver na tela.
- Sem dado pessoal nem chave em arquivo versionado. Não copiar animações, imagens ou arquivos de outros apps (ex.: Lemonlist, Kontto): o que se faz é recriar com código próprio.
- Edição de arquivos com fim de linha misto (CRLF/LF): script Python que tenta `\n` e depois `\r\n`.
- Sempre que mexer no formato salvo: aceitar backup antigo sem o campo e atualizar `keepShoppingOnRestore` (`src/shopping.mjs`), `validateBackup` (`src/finance.mjs`) e os validadores de `src/shoppingData.mjs`.

## Lista de compras no funcionamento do Lemonlist (em andamento)

Fase 1 (auditoria) feita em `AUDITORIA-LEMONLIST-LISTAS.md`. Fase 2 (comparação) em `COMPARACAO-LEMONLIST-LISTAS.md`. Fase 3 (especificação) em `ESPECIFICACAO-LEMONLIST-LISTAS.md`, com as decisões do dono de 11/11/2026 na seção 0 e as 9 propostas da seção 12 (todas aprovadas em 11/11/2026). Fase 3 concluída; a Fase 4 começa quando o dono autorizar o passo 0. Contexto e truques do ambiente: `RETOMADA-LISTA-LEMONLIST.md`.

- **Decidido:** gesture-handler + reanimated (+ worklets), deslizar na linha com a lixeira escondida, barra de adicionar no alto, visão geral em cartões com reordenar e divisores, 18 categorias fixas, estados Faltou e Depois, desfoque nas folhas (`expo-blur`), Falar (`expo-speech-recognition`), foto e detalhes do item.
- **Fase 4:** 14 passos (0 a 13) na seção 13 da especificação. **Passo 0 concluído em 11/11/2026:** instalados `react-native-gesture-handler` ~3.3.0, `react-native-reanimated` 4.7.1, `react-native-worklets` 0.13.0 e `expo-blur` ~58.0.6 (`npx expo install`). O plugin do Babel entra sozinho pelo `babel-preset-expo` (sem `babel.config.js`). A raiz do `App.tsx` está em `GestureHandlerRootView`. O build passou a usar `C:\fw` (caminho longo quebrava o CMake do reanimated). `tsc` limpo, 1078 testes passando, APK x86_64 instalado no emulador: o app abre e as bibliotecas carregam; a lista de compras abre, marca e desmarca, a folha abre e fecha, a rolagem e o voltar funcionam, sem erro no logcat. **Tema escuro virou o padrão** (`applyDarkDefault` em `finance.mjs`, aplicado uma vez na carga; marca `settings.darkDefault`), testado no emulador. **Passo 1 concluído em 11/11/2026** (dados, 18 categorias, layout das listas; detalhes no INVENTARIO-FUNCIONAL.md, parágrafo "Lista no funcionamento do Lemonlist"). **Passo 2 concluído em 11/11/2026** (kit: `src/ui/Sheet.tsx` com SheetModal e ConfirmSheet, aviso com Desfazer no store e no App, `CategoryBadge`, `src/tones.mjs`). **Passo 3 concluído em 11/11/2026** (linha em pílula, cabeçalhos de grupo, "No carrinho" com Limpar comprados; o cartão de resumo saiu no passo 4). **Passo 4 concluído em 11/11/2026** (cabeçalho com a cor da lista, barra no alto com categoria ao vivo e manual, folhas Compartilhar/Mais/Escanear/Colar lista, "Está acabando" no corpo; a barra saiu do `App.tsx` e a rota `shopping` deixou o `KeyboardAvoidingView`). **Passo 5 concluído em 11/11/2026** (folha do item nova com unidade/peso, quantidade −/+, detalhes, três estados, categorias com ícone, Apagar | Salvar; Faltou/Depois na lista). **Passo 6 concluído em 11/11/2026** (deslizar em `src/ui/SwipeRow.tsx`; lixeira fora da linha; DESIGN.md atualizado). **Passo 7 concluído em 11/11/2026** (transições ao marcar; bloco Recém-adicionados de 7 s). **Passo 8 concluído em 11/11/2026** (tela Listas com cartões, rotas `shopping`/`shoppingList`, folha Nova/Editar lista, entrada e cascata). **Passo 9 concluído em 12/11/2026** (modo de edição das listas em `src/ui/ListsEditor.tsx`; testado no emulador só no tema escuro; grupo de teste "Casa" removido). **Passo 10 concluído em 12/11/2026** (folha Quais listas?, Modo compra com várias listas, Em falta e ícones; testado só no escuro). **Passo 11 concluído em 12/11/2026** (foto do item em `src/ui/ItemPhoto.tsx`, sem redução de tamanho). **Passo 12 concluído em 12/11/2026** (Falar; reconhecimento real só no celular). **Passo 13 concluído em 12/11/2026.** Fase 4 completa no código; falta o dono validar no celular (voz, câmera, gestos, TalkBack). Sem commit/release até o dono pedir.
- Quando a função for entregue, o DESIGN.md perde a regra "Sem gesto de deslizar".

## O que falta, em ordem

### 1. Testar na tela o que ainda não foi visto (emulador, tema claro)

Foi visto: atualização por cima da 1.10.0 sem perda de dados, extrato com calendário, contas (reordenar e arquivar), metas e caixinhas, lista de compras (listas, desfazer, "Está acabando" recolhido), calculadora, animação dos botões.

**Ainda sem teste na tela:**
- Lixeira com purga e restauração.
- Folha "Editar item" (recorrente, promoção) e Colar lista com receita por porções.
- Lote de despesas ("Dividir por categoria") e salvar tudo de uma vez.
- Ler nota em XML (seletor de arquivo, prévia, modo avião).
- Ícone e cor em categorias e tags (e nas linhas do extrato e orçamento).
- Notificações duplicadas (contador e "Ver duplicadas").
- Listas múltiplas: criar, trocar, excluir, recuperar, modelos.
- Filtros do extrato (aplicar, persistir, limpar).
- Restaurar um backup com a lista de compras danificada (texto em português vindo de `shoppingBackupMessages`, "Reparar e continuar").
- Assistente com Gemini: o campo Modelo aceita `models/gemini-…` e a mensagem "Chave salva…". Só dá para provar com a chave real do dono; ele está verificando.
- **Tema escuro em todas as telas novas** e fonte grande (200%).

Roteiro pronto: `ROTEIRO-TESTE-CELULAR-3.md` (47 passos, para o dono) e `ROTEIRO-TESTE-INTEGRACOES.md`.

### 2. Corrigir o que o dono achar no celular

O dono está testando a 1.11.0. Esperar os resultados (Passou/Falhou por passo do roteiro) e corrigir por gravidade. Já corrigidos nesta rodada: calendário com a última semana desalinhada, nome da conta quebrando no meio da palavra (ícone de arquivar), botões colados em Contas e Caixinhas.

### 3. Sobras do pacote 12 do Codex

- Não existe `RELATORIO-CODEX-12.md` (o Claude absorveu o trabalho). Se o Codex voltar a ter limite, pode-se refazer apenas as partes não verificadas.
- A tarefa 3 (testes de tempo com mediana e tolerância) foi feita (`tests/helpers/timing.mjs`); conferir se ainda há teste de tempo falhando em máquina ocupada: rodar `npm test` com um build em segundo plano e ver se sobra falha.
- A tarefa 6 (cores fixas e contraste do tema, `tests/security/theme-static.test.mjs`) foi feita; conferir a lista de exceções do teste e o relatório de pares que reprovam contraste.

### 4. Segurança da consulta fiscal (WebView)

Todos os itens **não foram alterados** no código; dependem de medição no Android. Leia `PLANO-MEDICAO-ANDROID.md` (passos M1 a M8) e `MATRIZ-DE-RISCO-LISTA-DE-COMPRAS.md` (W01 a W09). Falha em M1 (origem da ponte), M2 (redirecionamento) ou M4 (sessão e subrecursos) **bloqueia release**. Só mexer na ponte nativa depois de medir.

### 5. Notas fiscais de outros estados

Hoje só **SP** lê itens. PR, SC e RS precisam de uma **nota real** de cada (o dono envia) e do endereço de consulta de SC. Sem isso, não implementar: a lista de hosts em `src/nfceParse.mjs` é exata de propósito.

### 6. Funções do projeto ainda abertas (`TAREFAS.md`)

- Widgets restantes (4 de 6).
- Google Drive e sincronização: **só com a configuração OAuth fornecida pelo dono**. Sem ela, não iniciar.
- Módulos de lista de compras que ainda não têm tela: `shoppingUnits`, `shoppingCategoryLearn`, `shoppingMerge`, `shoppingDuplicates` (ver `INTEGRACAO-PACOTE-5-E-6.md` para ordem e horas). Decidir com o dono se valem a pena antes de ligar.
- Animações: **o plano `PLANO-ANIMACOES-LISTA.md` foi arquivado** a pedido do dono. Já existe movimento próprio nos botões (`src/motion.mjs`, `src/ui/motion.tsx`, ligado em `kit.tsx` e na barra). Qualquer animação nova só com código próprio.

### 7. Qualidade antes da próxima release (1.12.0 ou 1.11.1)

- Crítica de design `/impeccable` das telas novas (extrato com calendário, contas, caixinhas, lista de compras com listas, Modo compra, lote de despesas).
- Acessibilidade real: TalkBack e fonte 200% **só no celular** (o emulador não cobre foco, anúncios e gestos).
- Integrar `RASCUNHO-DOCS-PACOTES-5-A-8.md` e `RASCUNHO-DOCS-LISTA-DE-COMPRAS.md` em `INVENTARIO-FUNCIONAL.md` e `DESIGN.md` (o Codex integrou parte; conferir o que falta).
- Gerar `entrega/backup-ficticio-ritmo.json` com datas atuais, se um roteiro ainda pedir.
- Rodar a suíte toda e as três checagens (`npm test`, `npx tsc --noEmit`, testes de segurança) antes de qualquer commit.

## Depende do dono

- Revogar a chave do Gemini que apareceu em um chat antigo e criar outra no Google AI Studio.
- Testar no celular real com `ROTEIRO-TESTE-CELULAR-3.md`: câmera e QR ao vivo, código de barras, TalkBack, fonte grande, tema escuro, notificação real, SMS, atualização pelo próprio app.
- Enviar uma nota real de PR, SC e RS (e o endereço de consulta de SC).
- Fornecer a configuração OAuth, se quiser Google Drive e sincronização.
- Decidir: ligar ou não os módulos de lista que ainda estão só em lógica.
- Pedir commit, push e release quando quiser.

## Dicas aprendidas

- `normalizeName`/`productKey` mudaram (decimal "1,5" vira "1.5"; letras de qualquer alfabeto ficam); o catálogo é migrado ao abrir o app. Não alterar de novo sem nova migração.
- `parseItemText` já teve ReDoS com `½` + espaços; manter o `.replace(/\s+/g, " ")` **antes** do tratamento de frações.
- Preço de item da lista: com unidade (kg, g, l, ml) `priceCents` é o **total da linha**; o histórico guarda o preço **por unidade**. `suggestPrices` multiplica pela quantidade.
- Gemini: o nome do modelo vai na URL (`models/<id>:generateContent`); `geminiModelId` em `src/ai-model.mjs` tira `models/` e `:método`.
- Tela Contas (`AccountList` em `HomeScreen.tsx`): com o botão de arquivar na linha, o saldo vai para baixo do nome; na Início continua à direita.
- Testes com prefixo "Achado:" são defeitos conhecidos propositais; hoje todos passam.
- Chaves fiscais de teste precisam de dígito verificador válido (`chaveDv` em `src/nfce.mjs`).
- Testes de tempo falham em paralelo quando um build ou o emulador está rodando; use `node --test --test-concurrency=1`.
