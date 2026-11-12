# Auditoria Impeccable — Floco Finanças 1.12.0

Data: 12/11/2026 · Plataforma: Android (React Native/Expo) · Método: revisão de design + auditoria técnica de código, **sem detector** (não se aplica a app nativo). Nada foi corrigido: este arquivo só documenta, para resolver em outra etapa.

## 1. Como foi feito

- Emulador `emulator-5554` (x86_64), APK 1.12.0 (versionCode 22), dados de teste do projeto.
- **Todas as telas e opções de Mais** abertas e percorridas: Assistente, Contas, Cartões, Categorias e tags, Orçamento, Metas e caixinhas, Lista de compras (Listas, lista, folha do item), Projeções, Recorrências, Dívidas e contratos (3 abas), Entre pessoas (2 abas), Relatórios, Importar e exportar (+ painéis OFX e Foto/comprovante), Conferir fatura, Categorização automática, Notificações bancárias, Lixeira. Também Início, Transações (filtros e calendário), Análise (5 abas), Configurações (todas as seções), Preferências, Lembretes, PIN e backup, Atualizações, Personalizar, Uso dos botões e os formulários (despesa, cartão, receita, transferência, conta, orçamento, meta).
- **Tema claro e escuro**; **fonte do sistema a 200%**; **ocultar valores** em 5 telas.
- **Fluxos funcionais executados de ponta a ponta:** criar despesa → saldo recalculado; excluir → Lixeira; restaurar; esvaziar a Lixeira; criar/pagar/desfazer/excluir valor a receber e dívida; anexar e remover imagem; validação de valor zero; trocar de aba em Entre pessoas, Dívidas e contratos, Categorias/tags; ocultar valores; trocar tema.
- Código: varredura de cores fixas, fontes pequenas, alvos de toque, `Alert.alert`, `.catch(() => {})`, `Switch` cru, `Modal`, virtualização de listas, textos obsoletos.
- Medição: partida a frio ≈ 0,3 s (3 execuções), memória ≈ 93 MB PSS, APK universal 100 MB (arm64 sozinho 35 MB).

**Registro de transparência.** Durante a auditoria alguns toques meus com coordenadas fixas caíram em telas erradas: ligaram "Mostrar observação" em Preferências (restaurado ao padrão, desligado) e abriram o Google Agenda do emulador (fechado). Criei duas despesas de teste, excluí e esvaziei a Lixeira. Tema, fonte e ocultar valores voltaram ao estado original. Os dados financeiros de teste estão como estavam.

**Não testado** (limites desta auditoria): celular real, TalkBack, biometria/PIN ao abrir, câmera e OCR reais, reconhecimento de voz, leitura real de notificações bancárias, widgets, instalação de atualização, backup criptografado completo, importação real de arquivo, volumes grandes (2.000+ lançamentos), tablet/dobrável.

---

## 2. Resultado em números

**Nenhum P0 (bloqueante) encontrado** nos fluxos testados. Tudo o que abri funcionou.

| Severidade | Quantidade | Significado |
|---|---|---|
| P0 | 0 | impede concluir a tarefa |
| P1 | 5 | dificulta ou confunde muito; corrigir antes do próximo release (S1, S2, S3, S4, H1; T1, CC1 e N1 são a mesma raiz) |
| P2 | 42 | incômodo com contorno; próxima passada |
| P3 | 32 | polimento |

### Nota de design (Nielsen) — 27/40 · Aceitável

| # | Heurística | Nota | Achado-chave |
|---|---|---|---|
| 1 | Visibilidade do estado | 3 | Bom retorno visual; **faltam estados de "vencido"** |
| 2 | Linguagem do usuário | 3 | pt-BR natural; jargão pontual ("Cortável", "Prioridade 0 a 100") |
| 3 | Controle e liberdade | 3 | Lixeira, Desfazer na lista; **Voltar do Android descarta formulário sem avisar** |
| 4 | Consistência e padrões | 2 | 4 estilos de cabeçalho, diálogos do sistema, criar/editar diferente em cada tela |
| 5 | Prevenção de erros | 3 | Confirmações boas (até demais); erro de validação longe do campo |
| 6 | Reconhecer em vez de lembrar | 3 | Rótulos claros; vários ícones soltos |
| 7 | Flexibilidade e eficiência | 3 | Personalizar, atalhos, deslizar, voz, colar lista |
| 8 | Estética e minimalismo | 2 | Densidade em Análise, Configurações, Início (topo) e Notificações |
| 9 | Recuperação de erros | 3 | Mensagens claras; poucos "Desfazer" fora da lista de compras |
| 10 | Ajuda e documentação | 2 | Sem tela de ajuda; textos de ajuda só em alguns pontos |
| | **Total** | **27/40** | Aceitável (limite alto) |

### Nota técnica (Android) — 12/20 · Aceitável

| # | Dimensão | Nota | Achado-chave |
|---|---|---|---|
| 1 | Acessibilidade | 2 | Rótulos falados muito bons; **fonte 200% quebra barra e valores**; alvos de 44 dp; fontes de 9–11 |
| 2 | Desempenho | 3 | Partida 0,3 s; **nenhuma lista virtualizada** (tudo em `ScrollView`) |
| 3 | Aparência e temas | 3 | Tokens e tema escuro de primeira classe; teal do sistema vaza em campos, switches e diálogos |
| 4 | Conformidade com a plataforma | 2 | Painéis legados com "Voltar" em botão, diálogos fora da marca, Switch cru |
| 5 | Adaptatividade | 2 | Retrato travado; sem layout para tela grande; fonte grande quebra |
| | **Total** | **12/20** | Aceitável |

### Veredito de especificidade
O app **tem identidade própria**: o mascote, o amarelo Solar, o marrom, a Sora, o tema escuro preto/cinza com amarelo e a lista de compras (a tela mais autoral e acabada) não se confundem com um app genérico de finanças. A perda de especificidade vem da **herança**: telas e painéis de gerações anteriores (Notificações, Importar, Segurança, Atualizações, Categorias/tags) usam outra linguagem de cabeçalho e botão, e a **Análise** usa uma linguagem separada (Calen: fundo cinza-frio, cartão preto no tema claro).

---

## 3. Problemas sistêmicos (afetam várias telas)

> Resolver estes primeiro rende mais do que corrigir tela por tela.

### S1 · [P1] Quatro famílias de cabeçalho e de botão convivem
- **Onde:** rotas normais (seta + título, `App.tsx`); `PlanningPanel.tsx:548` (`Modal` próprio com seta + linha); `NotificationsPanel.tsx`, `ImportsPanel.tsx`, `ReceiptPanel.tsx`, `SecurityPanel.tsx` ("Voltar" como **botão tonal largo** + título pequeno + texto grande e botões alinhados à esquerda sem ícone); `UpdatesPanel.tsx` ("Voltar" em texto + título grande). A lista de painéis "sem cabeçalho do app" está em `App.tsx` (~linhas 407–436).
- **Impacto:** o usuário sente que muda de app ao abrir Notificações, Importar, Segurança, Atualizações ou Categorias; o voltar tem 4 formas; fontes e espaçamentos diferentes.
- **Solução:** migrar os 6 painéis para **rotas normais** usando o kit (`Button`, `Toggle`, `ListItem`, `Segmented`, `Field`), remover `SafeAreaView`/`Modal` próprios e tirar os nomes da lista "headless" do `App.tsx`. Um único cabeçalho.
- **Comando:** `/impeccable layout` e depois `/impeccable polish`. **Esforço:** G.

### S2 · [P1] Fonte grande (200%) quebra a barra, os valores e as listas
- **Evidência (200%):** rótulo da barra "Transaç/ões" quebra no meio; "R$ 1.733,7 / 9" e "R$ 3.812, / 00" quebram o valor; Análise mostra abas "Resu..", "Cate.." e segmentado "Gast/o", "Rece/bido"; linhas de transação ficam "Teste a..", "Aliment.."; total do dia "–R" corta na borda; placeholder da busca "…ou v..."; subtítulo do Assistente "d...".
- **Onde:** barra inferior (`App.tsx`), cartões de valor (`HomeScreen.tsx`), `TransactionRow.tsx` (`numberOfLines`), segmentado da Análise (`ui/calen.tsx`, `screens/analysis/*`), `MoreScreen`/`kit.tsx` (`Row`).
- **Solução:** `maxFontSizeMultiplier` 1.3 na barra inferior e nos segmentados; valores com `numberOfLines={1}` + `adjustsFontSizeToFit` (nunca quebrar dígitos); `TransactionRow` aceitar 2 linhas quando `fontScale > 1.3`; rótulo da barra com ícone grande e nome curto; testar a 130%, 150% e 200%.
- **Comando:** `/impeccable adapt`. **Esforço:** M.

### S3 · [P1] Diálogos do sistema fora da marca (30 usos de `Alert.alert` em 16 arquivos)
- **Evidência:** tocar numa transação abre um `AlertDialog` do Android com botões **EXCLUIR / EDITAR / MARCAR COMO PENDENTE** empilhados, em **teal**, com **Excluir em primeiro** (a ação destrutiva é a mais alta). Excluir pede uma **segunda confirmação** ("Excluir lançamento?"), mesmo indo para a Lixeira por 30 dias. No **tema escuro do app** o diálogo sai **branco** (segue o tema do sistema).
- **Convive** com o `ConfirmSheet`/`SheetModal` novo (Vai sair / Continua; Desfazer em 10 s) usado na lista de compras.
- **Solução:** trocar todos por `ConfirmSheet`; na linha da transação abrir uma **folha de ações** (Editar em destaque, Marcar como pendente, e "Excluir" separado, em vermelho, no fim); excluir direto com aviso **Desfazer** (a Lixeira já protege). Arquivos: `screens/TransactionRow.tsx:99` e os demais usos (`grep Alert.alert`).
- **Comando:** `/impeccable polish` + `/impeccable harden`. **Esforço:** M.

### S4 · [P1] Não existe estado de "vencido"
- **Evidência:** a fatura do Cartão Itaú venceu em 10/11 e o Aluguel pendente é de 10/11; hoje é 12/11. **Início** mostra "A pagar R$ 1.800,00" sem dizer que está atrasado; **Cartões** mostra "Vence 10/11/2026" e "Valor em aberto" sem aviso; **Lembretes** diz "Nada vence nos próximos 7 dias"; **Projeções** joga ambos para 12/11. O Assistente chega a dizer "1 pendência(s) com data passada", mas só lá.
- **Impacto:** o usuário pode perder uma conta vencida; é o risco mais caro de um app de finanças.
- **Solução:** badge "Vencida há N dias" (ícone + texto + vermelho) em Início, Cartões, Transações e Lembretes; bloco "Atrasadas" no topo da Início quando houver; incluir vencidos na lista e na notificação de Lembretes; regra única em `finance.mjs`/`reminders.mjs`.
- **Comando:** `/impeccable harden` + `/impeccable clarify`. **Esforço:** M.

### S5 · [P2] Voltar do Android perde o que foi digitado
- **Evidência:** em "Nova despesa" com valor e descrição preenchidos, o botão voltar do Android **fecha o formulário sem avisar** e perde tudo (testado duas vezes).
- **Solução:** interceptar o voltar em formulário "sujo" com `ConfirmSheet` ("Descartar este lançamento?" · Continuar editando / Descartar); opcional: rascunho local.
- **Comando:** `/impeccable harden`. **Esforço:** P.

### S6 · [P2] O teal do sistema vaza para a interface
- **Onde:** cursor e alças de texto nos campos (`kit.tsx` `Field`/`AmountField` sem `selectionColor`/`cursorColor`); `Switch` cru em `ImportsPanel.tsx:301` e `NotificationsPanel.tsx:234,281,288` (ficam teal; o `Toggle` do kit é amarelo/marrom); botões dos diálogos (S3).
- **Solução:** `selectionColor`/`cursorColor` pelo tema; trocar `Switch` por `Toggle` do kit.
- **Comando:** `/impeccable polish`. **Esforço:** P.

### S7 · [P2] Alvos de toque menores que 48 dp e fontes abaixo de 12
- **Evidência:** `minHeight` 44/40/46 em `FormScreen.tsx:249,265`, `InboxSheet.tsx`, `NotificationsPanel.tsx:266`, `ui/calen.tsx:39`, `kit.tsx:826,835,928`, `pickers.tsx:181,281`; `fontSize` 9–11 em 16 pontos (`HomeScreen.tsx:96,106,171`, `TransactionRow.tsx:168`, `OrganizeScreens.tsx`, `AssistantScreen.tsx`, `SettingsScreen.tsx`, `ui/calen.tsx`, entre outros). O `DESIGN.md` promete ≥48.
- **Solução:** constantes `touch.min = 48` e `type.caption >= 12`; trocar os valores; ajustar `hitSlop` onde o visual precisa ficar menor.
- **Comando:** `/impeccable adapt` + `/impeccable typeset`. **Esforço:** M.

### S8 · [P2] Ações de criar, editar e apagar sem padrão
- **Evidência:** "Adicionar" em texto (Contas, Orçamento), "Criar" em texto (Metas), botão cheio (Recorrências, Entre pessoas, Dívidas), "+" quadrado (Listas), seta no cartão (Listas). Editar/apagar: lápis + lixeira lado a lado sem rótulo (Orçamento), olho + arquivar (Contas), ↻ + ✕ (Lixeira), `⋮` (Lista).
- **Impacto:** o usuário reaprende em cada tela; ícone destrutivo encostado no de edição.
- **Solução:** um componente `CreateAction` (botão cheio no topo da tela) e um padrão de ação por linha: **toque abre detalhe**, ações secundárias num `⋮` com rótulos, destrutiva separada e com Desfazer.
- **Comando:** `/impeccable layout`. **Esforço:** M.

### S9 · [P2] Erros engolidos em silêncio (30 `.catch(() => {})`)
- **Onde:** `app/inbox.ts`, `ui/Attachments.tsx` (4), `ui/ItemPhoto.tsx` (3), `ShoppingScreen.tsx` (4), `ShoppingTripScreen.tsx` (3), `HomeScreen.tsx` (2), `SettingsScreen.tsx`, `usePublicUpdates.ts`, `usageTracker.ts`, entre outros.
- **Impacto:** se abrir as configurações do Android, salvar anexo ou foto falhar, o usuário não vê nada.
- **Solução:** helper `softFail("Não foi possível abrir…")` que mostra o aviso padrão; manter o silêncio só em tarefas de fundo (contador, atualizações).
- **Comando:** `/impeccable harden`. **Esforço:** P.

### S10 · [P2] Textos que ficaram velhos depois das fusões de Mais
- `screens/ToolScreens.tsx:167` (Conferir fatura): manda usar **"Importar comprovante"**, que não existe mais em Mais.
- "Relatórios avançados" ainda aparece em `screens/analysis/LegacyBlocks.tsx:242` e em `usage.mjs:20`, enquanto Mais e o título dizem "Relatórios".
- `finance.mjs:256` ("Desfaça este pagamento em Quem eu devo") agora é **Entre pessoas › Eu devo**.
- `app/forms.ts:243`: erro "Informe o prazo como **AAAA-MM-DD**", mas o campo é DD/MM/AAAA.
- **Comando:** `/impeccable clarify`. **Esforço:** P.

### S11 · [P2] Duplicidades de função
- **Backup/Importar/Exportar** em **Configurações › Seus dados** (Importar extrato, Salvar backup, Restaurar, Exportar CSV) **e** em **Mais › Importar e exportar** (as mesmas ações e mais).
- **Notificações bancárias** e **Categorização automática** aparecem em Configurações **e** em Mais.
- Em Importar e exportar, **"Extrato OFX", "Extrato em PDF" e "Planilha CSV/XLSX" abrem a mesma tela** (`nav.push({ name: "imports" })` ×3), que escolhe o formato pelo arquivo.
- **Solução:** um só lugar para dados (Mais › Importar e exportar) e Configurações só com preferências; reduzir as 3 linhas a uma ("Importar extrato") com os formatos no subtítulo.
- **Comando:** `/impeccable distill`. **Esforço:** M.

### S12 · [P2] Densidade de controles
- **Análise › Categorias:** 3 abas internas + botão amarelo + botão ⓘ + "Por fatura | R$ | %" + ⇄ + "Ordem" + "Editar categorias" + lápis por linha, tudo acima/ao redor da lista.
- **Configurações:** 4 telas rolando, ~25 controles; **Notificações bancárias:** 34 chips de bancos; **Transações:** filtros repetidos (chips Todas/Receitas/Despesas/Transferências **e** "Tipos de lançamento" dentro de Filtros).
- **Solução:** decidir com o **Uso dos botões** (já instalado) o que esconder; agrupar bancos em "Principais" + "Ver todos"; ver S11.
- **Comando:** `/impeccable distill`. **Esforço:** M.

### S13 · [P3] Avisos sem Desfazer em ações reversíveis
- Excluir lançamento mostra "Lançamento movido para a lixeira" sem **Desfazer**; "Salvo no aparelho" idem. Na lista de compras o Desfazer existe e funciona. Padronizar com `perform(..., { undoable: true })`.

### S14 · [P3] Orientação travada em retrato e sem layout para tela grande
- `AndroidManifest.xml` `android:screenOrientation="portrait"` e `app.json` `orientation`. Em tablets/dobráveis a UI de celular fica esticada ou com faixas. Baixa prioridade se o uso é só no celular.

### S15 · [P2] Nenhuma lista é virtualizada
- Não há `FlatList`/`SectionList`; tudo é `ScrollView` + `.map`. Hoje o filtro por mês segura o volume, mas **Histórico de compras**, **prévia de importação** (milhares de linhas) e **Lixeira** podem engasgar. **Testar com 2.000 lançamentos** antes de decidir. **Comando:** `/impeccable optimize`. **Esforço:** M.

---

## 4. Problemas por tela

Legenda: **[P1] [P2] [P3]**. "Sol." = solução sugerida. Esforço: P pequeno, M médio, G grande.

### Início
- **[P1] H1 · "Leitura automática" ocupa a primeira tela inteira.** Enquanto a permissão do Android não for dada, um cartão de ~10 linhas de instruções fica logo abaixo do saldo e empurra Pendências e Contas para fora da tela. `HomeScreen.tsx` ~256–272. **Sol.:** cartão compacto com um botão ("Ligar leitura das notificações") e as instruções numa folha "Como ligar"; botão "Agora não" que some por alguns dias.
- **[P2] H2 · Contas mostram dois valores sem legenda.** Cada conta tem "R$ 26.011,51" e embaixo "R$ 24.211,51", com "Previsto" só à esquerda; o Total repete o padrão. **Sol.:** rotular "Saldo" e "Previsto" nos próprios valores ou mostrar só um e abrir o outro ao tocar.
- **[P2] H3 · Ações das seções sem padrão.** "Ver", "Ver todas", "Ocultar", "Histórico". "Vamos começar" mostra 3 de 4 itens já feitos (riscados) e continua ocupando espaço. **Sol.:** padronizar "Ver tudo"; recolher os feitos.
- **[P3] H4 · Linha de meta truncada** nas despesas recentes ("…· Conta Co…"). **Sol.:** categoria + conta em 2 linhas quando faltar espaço.
- **[P3] H5 · Aviso "Visibilidade alterada"** ao ocultar valores. **Sol.:** "Valores ocultos" / "Valores visíveis".
- **[P3] H6 · "Já deve estar acabando"** usa só "+" sem texto e "atrasado 62 dias" (tom de cobrança). **Sol.:** "Adicionar à lista" visível e "há 62 dias sem comprar".

### Transações
- **[P1] T1 · Toque na linha abre diálogo do sistema com Excluir em primeiro e confirmação dupla** (ver S3).
- **[P2] T2 · Linha de resumo cortada.** "6 lançamentos · R$ 1.5…" passa da borda direita ao lado de Filtros e Ver calendário. **Sol.:** descer o resumo para uma linha própria.
- **[P2] T3 · Filtros inline e repetidos.** O painel empurra a lista (~1,5 tela) e repete os tipos. **Sol.:** folha de filtros com contador de filtros ativos e "Limpar".
- **[P2] T4 · Calendário sem legenda e sem destaque para hoje.** Só traços sob os dias, sem significado dito; diverge do calendário colorido da Análise. **Sol.:** um componente de calendário com legenda e "hoje" marcado.
- **[P3] T5 · "7 lançamentos · R$ 278,21"** é o resultado líquido, mas não diz. **Sol.:** "resultado R$ 278,21".
- **[P3] T6 · Descrição e conta truncadas** ("Supermercado Atacadao Di…", "…· C…"). **Sol.:** ver S2; mostrar a conta numa segunda linha.

### Análise
- **[P2] A1 · Resumo cortado.** A faixa Resultado/Entrada/Saída/Saldo previsto passa da borda ("SALD R$ 36") sem indício de rolagem. **Sol.:** grade 2×2 ou rolagem com sombra/indicador.
- **[P2] A2 · Dois segmentados empilhados** (Tudo/Conta/Cartão e Cor/Gasto/Recebido/Saldo) mais um botão "⤡" sem rótulo. **Sol.:** um só controle e menu com rótulos.
- **[P2] A3 · A aba "Mais" dentro da guia "Mais".** E o conteúdo repete a aba Categorias (`screens/analysis/LegacyBlocks.tsx`). **Sol.:** renomear para "Resumo do mês" ou remover o que repete.
- **[P2] A4 · Categorias: 8–10 controles** (ver S12) e **vermelho para "Outros"** (62%) sugere alerta, quando é só a maior categoria. **Sol.:** vermelho só para estouro de orçamento; cor por categoria.
- **[P2] A5 · Tipos: barra 100% laranja sólida** sem informação quando só há um tipo; "Meta – definir ✎" pouco claro. **Sol.:** esconder a barra com um só tipo.
- **[P2] A6 · Linguagem visual própria (Calen).** Fundo cinza-frio, cartão **preto no tema claro**, chips cinza, rótulos com outra fonte. É decisão registrada, mas destoa do resto. **Sol.:** manter o gráfico, alinhar fundo, raios e rótulos ao tema Floco.
- **[P3] A7 · Seletor de mês com 3 estilos** (botões redondos, chevrons simples, ausente no Resumo). **Sol.:** um `MonthNav`.
- **[P3] A8 · Fluxo: botão amarelo "+" sem rótulo.** **Sol.:** "Adicionar receita".

### Mais
- **[P3] M1 · Cartão "Sempre livre"** no fim é texto decorativo. **Sol.:** remover ou mover para Sobre.
- **[P3] M2 · "Lista de compras" abre "Listas"** (outro nome) e o bloco da Início abre a lista direto. **Sol.:** nomear a tela "Listas de compras".

### Contas
- **[P2] C1 · Olho e arquivar** lado a lado, sem texto (S8); o olho da conta não indica quando o "Ocultar valores" global já oculta tudo.
- **[P3] C2 · "Adicionar" e "Reordenar contas"** com estilos diferentes (S8).

### Cartões de crédito
- **[P1] CC1 · Fatura vencida sem marcação** (S4).
- **[P3] CC2 · Meta truncada** ("01 de nov · Outros · Cartão Itaú …").

### Orçamento
- **[P2] O1 · Subtítulo quebra de forma feia** ("Teto de despesa · Mensal · / 01/11–30/11") e "6 de 6 ciclos recentes fecharam dentro do teto" se repete em todo cartão. **Sol.:** subtítulo em 2 linhas fixas; mostrar o histórico só quando houver estouro.
- **[P2] O2 · Lápis e lixeira lado a lado** (S8).
- **[P2] O3 · Novo orçamento lista categorias de receita num "Teto de despesa"** (Salário, Freelance/Autônomo, Investimentos, Renda Extra, Aluguéis). `FormScreen.tsx:566–568` usa `categoryNames(state)` sem filtrar pelo tipo. Também: ~24 chips de uma vez; "Valor (R$)" sem exemplo; "Onde (vazio = todas as contas e cartões)" pouco claro. **Sol.:** filtrar por tipo, agrupar por Principais/Mais, placeholder "0,00", "Onde: Todas as contas" como chip selecionado.

### Metas e caixinhas
- **[P2] G1 · Cartão de meta com 6 controles** (editar, 3 chips de caixinha, Concluir, Arquivar, Excluir); "Excluir" sem fundo e "Arquivar" com fundo. **Sol.:** `⋮` para Arquivar/Excluir; escolha da caixinha numa folha.
- **[P3] G2 · Rótulo "Planejamento"** acima do segmentado é redundante.

### Lista de compras
- **[P2] L1 · Estados do item na folha.** O botão "No carrinho" aparece **preenchido escuro** enquanto o item está **"Faltou"** (selecionado só com contorno). Parece que "No carrinho" é o estado atual. **Sol.:** estado selecionado sempre preenchido; ação sempre contornada.
- **[P3] L2 · "+" do campo cinza sobre cinza** quando vazio (baixo contraste) e sem texto "Adicionar".
- **[P3] L3 · Espaço grande** entre "Está acabando" e o primeiro grupo.

### Projeções
- **[P2] P1 · Chip "E se…" cortado.** **Sol.:** "Cenário" ou rolagem visível.
- **[P3] P2 · "Menor folga"** é igual ao saldo final e não informa.

### Recorrências
- **[P3] R1 ·** dois cartões "R$ 0,00/mês" ocupam espaço quando não há nada. **Sol.:** esconder até haver recorrência.

### Entre pessoas (Me devem / Eu devo)
- **[P2] E1 · Valor digitado sem formatação nem prévia.** Digitar `1234` mostra "1234" e vale R$ 1.234,00; não há "= R$ 1.234,00" nem separador. `kit.tsx:608` (`AmountField`). **Sol.:** formatar ao digitar ou prévia ao lado.
- **[P3] E2 · Pagamento pré-preenchido** vem como "50000,00" (sem milhar).
- **[P3] E3 · "Anexo salvo neste aparelho."** aparece mesmo sem anexos.

### Dívidas e contratos
- **[P3] D1 ·** abas funcionam e reaproveitam as telas; "Novo financiamento"/"Novo empréstimo" só aparecem no vazio (S8).

### Relatórios
- **[P2] RL1 · "Relatório personalizado" abre o modal legado** (`PlanningPanel`) com outro cabeçalho (S1).

### Importar e exportar
- **[P2] I1 · Oito botões tonais iguais e colados** (Restaurar ×2, Exportar ×4) sem espaçamento entre si; sem hierarquia entre "Backup" e "Relatório PDF". **Sol.:** `ListItem` por ação, agrupadas por Importar/Backup/Exportar.
- **[P2] I2 · Três linhas levam à mesma tela** e **duplicam Configurações** (S11).
- **[P2] I3 · No painel de importação a conta de destino** é escolhida com "✓" em texto e **nenhuma vem selecionada**; os dois botões parecem iguais. `ImportsPanel.tsx:257–267`. **Sol.:** selecionar a primeira conta por padrão e usar `Choice` do kit.
- **[P2] I4 · Painel legado** (S1) e `Switch` teal (S6).

### Conferir fatura
- **[P2] CF1 · Texto obsoleto** (S10).
- **[P3] CF2 · Rótulo "Cartão"** colado ao parágrafo, sem respiro.

### Categorização automática
- **[P3] CZ1 · Jargão:** "Prioridade (0 a 100)", `*` e `|`. **Sol.:** exemplos tocáveis e texto "regras com prioridade maior vencem".

### Notificações bancárias
- **[P1] N1 · Painel legado com visual próprio** (S1), `Switch` teal (S6) e **34 chips de bancos** (S12).
- **[P2] N2 · "Ler notificações dos bancos" aparece ligado com "Acesso Android: não permitido".** Dá a impressão de que funciona. **Sol.:** desabilitar o interruptor com explicação enquanto não houver permissão.

### Lixeira
- **[P2] LX1 · "✕" ao lado de "↻"** apaga de vez sem texto; o `✕` lembra "fechar". Os rótulos falados estão ótimos ("Apagar … de vez"). **Sol.:** ícone de lixeira + confirmação; separar do restaurar.
- **[P3] LX2 · Título espremido** entre texto e ícones; "Excluído em 12 de nov. · 30 dias" é ambíguo. **Sol.:** "Apaga em 30 dias".

### Configurações
- **[P2] CO1 · Tela longa** (4 rolagens) e duplicada com Mais (S11, S12).
- **[P3] CO2 · "Uso dos botões"** está sob "Ajuda". **Sol.:** "Avançado" ou "Sobre".
- **[P3] CO3 · Cor "Turquesa" sozinha** na segunda linha; "Bloqueio biométrico" com folga extra no cartão.
- **[P3] CO4 · "Apagar todos os dados"** logo abaixo de "Reabrir…" no mesmo cartão. **Sol.:** zona de perigo separada.

### Assistente
- **[P2] AS1 · "Boa 68/100" com "Taxa de poupança 0/30"** por falta de histórico; o número parece mais certo do que é. **Sol.:** mostrar "dados insuficientes" em vez de nota quando faltar histórico.
- **[P3] AS2 · "pendência(s)"** (plural improvisado) e botão **colado no texto** acima ("Registrar nota deste mês", "Gerar resumo local").

### Formulários (despesa, receita, cartão, transferência, conta, orçamento, meta)
- **[P2] F1 · Erro de validação longe do campo.** Salvar com valor zero mostra "Informe um valor como 150,00." **junto ao botão**, e o campo Valor está fora da tela, sem foco. **Sol.:** rolar até o campo, borda vermelha e foco.
- **[P2] F2 · "Mais detalhes"** parece título, sem seta ou indício de abrir (`FormScreen.tsx:348`). **Sol.:** chevron e estado.
- **[P2] F3 · Nova conta: cores só com nome** ("Marrom", "Roxo") sem amostra. **Sol.:** bolinhas de cor como em Configurações.
- **[P3] F4 · "Tipo de gasto: Cortável"** é jargão. **Sol.:** "Pode cortar".
- **[P3] F5 · Transferência** diz que a descrição "usa o nome da categoria", mas transferência não tem categoria.
- **[P3] F6 · Folha "Adicionar" (+)** é branca no claro, sem alça nem X, diferente de `SheetModal`.

### PIN e backup / Atualizações
- **[P2] SG1 · Painéis legados** (S1); "Salvar PIN" com ênfase baixa (tonal) sendo a ação principal.

### Personalizar
- **[P3] PE1 · Nome "Pendentes das notificações"** no bloco que a Início chama de "Leitura automática".

---

## 5. O que funciona bem (manter e replicar)

- **Rótulos falados:** botões de ícone e linhas têm `accessibilityLabel` claro ("Restaurar Teste auditoria", "Apagar … de vez", "Novembro de 2026. Voltar ao mês atual", "Colocar Detergente… na lista de compras").
- **Lista de compras:** a tela mais autoral e acabada (cabeçalho colorido, "Ir às compras", folha do item, gestos, Desfazer, estados).
- **Tema escuro de primeira classe:** preto/cinza com amarelo, contraste bom, sem inversão preguiçosa; funcionou em todas as telas que abri.
- **Ocultar valores** vale em Início, Contas, Transações, Análise.
- **Lixeira, restaurar e esvaziar** funcionam; **datas DD/MM/AAAA** com máscara em todo o app; **validação** de valor zero.
- **Entre pessoas / Dívidas e contratos:** abas funcionam e reaproveitam a lógica; saldo recalcula e desfazer pagamento volta ao valor.
- **Estados vazios** bons (Recorrências, Lixeira, Entre pessoas).
- **Desempenho de partida** (0,3 s) e memória (93 MB) bons.

---

## 6. Matriz de funcionamento

| Área | Resultado |
|---|---|
| Início (blocos, olho, mês) | Funciona |
| Transações (busca, chips, filtros, calendário, abrir linha, excluir) | Funciona (ver T1–T4) |
| Análise (5 abas, calendário, gráficos) | Funciona (ver A1–A8) |
| Contas, Cartões, Orçamento, Metas | Funciona (abri e naveguei; criar conta/orçamento/meta só até o formulário) |
| Lista de compras (Listas, lista, folha do item) | Funciona |
| Projeções, Recorrências | Funciona |
| Dívidas e contratos (3 abas) | Funciona |
| Entre pessoas (2 abas, criar, pagar/receber, desfazer, anexar, excluir) | Funciona |
| Relatórios (índice) | Funciona (sub-relatórios não abertos um a um) |
| Importar e exportar, OFX, Foto/comprovante | Abre e mostra; **sem arquivo real** não testei a importação |
| Conferir fatura, Categorização automática | Abre; sem arquivo/regra real |
| Notificações bancárias | Abre; sem notificação real |
| Lixeira | Funciona (restaurar, esvaziar) |
| Configurações, Preferências, Lembretes, PIN e backup, Atualizações, Personalizar, Uso dos botões | Funciona (sem ativar PIN/biometria/backup) |
| Ocultar valores, tema escuro, fonte 200% | Funciona; fonte 200% quebra (S2) |

---

## 7. Plano de correção sugerido

**Onda 1 — risco e confiança (P1), ~2 dias**
1. **S4** estados de vencido (Início, Cartões, Transações, Lembretes).
2. **S3 + T1** folha de ações da transação, Excluir com Desfazer, trocar os `Alert`.
3. **S2** fonte grande: barra inferior, valores, linhas de transação, segmentados.
4. **H1** compactar "Leitura automática".
5. **S1 (início)** migrar Notificações bancárias para rota normal (é o pior caso de painel legado).

**Onda 2 — consistência (P2), ~3 dias**
6. **S1 (resto)** Importar, Receipt, Segurança, Atualizações, Categorias/tags.
7. **S6, S7** cores do sistema, alvos de 48 dp, fontes ≥12.
8. **S8, S11, S12** padrão de criar/editar, remover duplicidades, reduzir controles com base no Uso dos botões.
9. **S5, F1, F2, E1** voltar com confirmação, validação perto do campo, "Mais detalhes", prévia de valor.
10. **O3, L1, N2, I3** filtro de categoria por tipo, estados do item, interruptor sem permissão, conta padrão na importação.
11. **S10** textos obsoletos (rápido; pode ir já na Onda 1).

**Onda 3 — acabamento (P3) e decisões**
12. **S9, S13, S14, S15** erros silenciosos, Desfazer, orientação, virtualização (após teste com 2.000 lançamentos).
13. Harmonizar a **Análise** com o tema Floco (A6, A7) e renomear a aba "Mais".
14. Publicar também o APK **arm64** (35 MB) além do universal (100 MB).

**Antes de fechar cada onda:** repetir no emulador nos temas claro e escuro, a 100% e 200% de fonte; rodar `npm test`, `node --test tests/security/` e `npx tsc --noEmit`; testar no celular real o que o emulador não cobre (TalkBack, biometria, câmera, voz, notificações).

**Comandos sugeridos, em ordem:** `/impeccable harden` (S4, S5, S9) → `/impeccable adapt` (S2, S7) → `/impeccable layout` (S1, S8) → `/impeccable distill` (S11, S12) → `/impeccable clarify` (S10) → `/impeccable typeset` (S7) → `/impeccable polish` (final). Rodar `/impeccable critique` e `/impeccable audit` de novo para ver as notas subirem.

---

## 8. Perguntas em aberto para o dono

1. A **Análise** com a linguagem Calen é para manter como está (decisão de 11/2026) ou quer aproximar do tema Floco?
2. Qual **prazo** vale "atrasado"? (vence hoje = vencido amanhã? tolerância de 1 dia para cartão?)
3. **Backup/Importar/Exportar**: prefere ficar só em Mais ou só em Configurações?
4. Vale **publicar o APK arm64** como arquivo principal (35 MB) e deixar o universal só como alternativa?
