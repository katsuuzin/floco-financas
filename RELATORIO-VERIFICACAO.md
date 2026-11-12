# Relatório de verificação pós-Codex (12/11/2026)

Verificação **só de código e testes**. Build e emulador **não foram feitos** (E1–E20 = Não testado).

## Resumo
- O Codex entregou quase tudo em código: sem restos de `NotificationsPanel`, sem `Alert` em `TransactionRow`, `<Switch` só no `Toggle`, sem fonte 9–11, helper `overdueItems` com teste, voltar com confirmação no formulário, prévia "= R$".
- Portões verdes. Nenhuma regressão encontrada no código. **Falta a prova na tela**, então não é release ainda.

## Portões
| Portão | Antes | Agora |
|---|---|---|
| `tsc --noEmit` | limpo | limpo |
| `npm test` | 1125 | **1127** pass, 0 fail, 0 skip |
| `tests/security` | 119 | **120** pass |
| `.skip/.only/todo` novos | — | nenhum |

Fim de linha: `git diff --stat` e `--ignore-space-at-eol` iguais (50 arquivos, +1191/−2165); sem reescrita inteira por CRLF. Só avisos de CRLF→LF.

## Tarefas (evidência de código)
| Tarefa | Status | Evidência |
|---|---|---|
| T01 textos | Feito | Só sobra "AAAA-MM-DD" como formato aceito (ImportsPanel:243), `PlanningPanel:279` e comentários |
| T02 vencido | Feito | `reminders.mjs:23 overdueItems`, `overdueLabel`; usado em Home, Organize (Cartões/Transações), Reminders; teste em `reminders.test.mjs` |
| T03 ações da transação | Feito | zero `Alert` em `TransactionRow.tsx` |
| T04 fonte grande | Feito (código) | 12 usos de `maxFontSizeMultiplier`/`adjustsFontSizeToFit`; ver na tela a 200% |
| T05 Leitura automática | Feito (código) | HomeScreen:298 "Agora não", `SheetModal` "Como ligar" (302). Não conferi o prazo de 7 dias nem backup antigo sem o campo |
| T06 Notificações | Feito | arquivo apagado, `screens/NotificationsScreen.tsx` novo, zero referências ao painel antigo |
| T07 painéis | Parcial | Rotas `updates/security/imports/receipt/tool/notifications` existem em `App.tsx`; **`PlanningPanel` não tem mais as 5 páginas mortas**, mas ainda existe com `label.includes("AAAA-MM-DD")` |
| T08 cores do sistema | Feito | `selectionColor/cursorColor` em `kit.tsx:308,696`; `<Switch` só em `kit.tsx:466` |
| T09 alvos/fontes | Parcial | fonte 9–11: 0. Restam **14** `minHeight` < 48; conferir se têm `hitSlop` |
| T10 voltar com confirmação | Feito (código) | `FormScreen` usa `registerBackGuard` com `dirty` (173–180); InboxSheet também (178–182) |
| T11 erro leva ao campo | Feito (código) | `FormScreen:191-192` rola e foca |
| T12 prévia do valor | Feito | `kit.tsx:724` "= R$…"; 11 menções de `parseMoney` em testes |
| T13 criar/editar/apagar | Feito (código) | `CreateAction` em 15 pontos; Lixeira com `ConfirmSheet "Apagar de vez?"` e "Apaga em N dias" |
| T14 duplicidades | Não verificado | sem "Seus dados" em Configurações (ok); filtros e Importar extrato não lidos |
| T15 orçamento/item | Não verificado | strings presentes; regra não lida |
| T16–T18 | Parcial | "Sempre livre" removido de `MoreScreen`; resto não lido |
| T19 erros engolidos | Parcial | `softFail` usado 29 vezes; **ainda 18 `catch(() => {})`**, p. ex. `store.tsx:71,123`, `App.tsx:409`, `SettingsScreen:47`, `AssistantScreen:60` — julgar cada um |
| T20 desempenho | Não verificado | há texto em `INVENTARIO-FUNCIONAL.md:189`; não conferi os números |
| T21 orientação | Não tocada | manifest segue `portrait` (ok) |

Extras: `enableOnBackInvokedCallback="false"` preservado. Sem segredos no diff. Nada em inglês na tela (as correspondências de "Cancel/OK" são estilos de botão ou textos fora do escopo; não revisadas uma a uma).

## Checagem na tela (E1–E20) — rodada no emulador, só tema claro
Build x86_64 ok (APK mais novo que o último arquivo-fonte), instalado, sem FATAL no logcat.

| # | Resultado |
|---|---|
| E1 Início | **Passou**: Leitura automática curta (1 botão + "Como ligar"/"Agora não"), bloco "Atrasadas" com Aluguel e fatura Itaú ("Vencida há 2 dias" + ícone) |
| E3 Transações | **Passou em parte**: tocar abre folha do app (Editar em destaque, Marcar como pendente, Excluir). Não testei Desfazer, filtros em folha nem linha "Atrasado" |
| E5 Mais | **Passou**: 16 itens, sem "Sempre livre" |
| E6 Notificações | **Passou**: cabeçalho com seta, interruptor desabilitado sem permissão, "Principais" + "Ver todos (34)" |
| E8 Voltar | **Passou**: com valor digitado pergunta "Descartar este lançamento?" |
| E9 Valor 0 | **Passou**: borda vermelha e mensagem junto ao campo |
| E10 Prévia | **Passou**: `1234` mostra "= R$ 1.234,00" |
| E11 Cursor/interruptores | **Passou**: amarelo/marrom |
| E12 Fonte 200% | **Parcial**: Início, Transações (2 linhas), Análise (segmentado empilhado) e barra inferior ok. **Falhou**: nos "Insights do mês" da Análise o título corta ("Seu saldo zera neste …") e o valor quebra dígitos ("-R$ 110.79 / 3,91") |
| E2, E4, E7, E13–E20 | Não testado |
| Tema escuro (todos) | Não testado (app ignora o modo escuro do sistema; precisa ligar nas Configurações) |

### Rodada 2: emulador no tamanho do S24 Ultra
O emulador estava a 160 dpi (cerca de 1080 dp de largura, layout de tablet), então a rodada acima **não vale para o celular**. Refeita em 1080×2340, 420 dpi (cerca de 412 dp), como o S24 Ultra.

Telas abertas e vistas, **fonte 1.0, tema claro**: Início, Transações, Análise, Mais, Cartões (E2 passou: selo "Vencida há 2 dias" ao lado de "Vence 10/11/2026"), Contas, Categorias e tags, Orçamento, Metas e caixinhas, Projeções, Recorrências, Dívidas e contratos (3 abas), Entre pessoas (2 abas), Relatórios, Importar e exportar (E17 passou: backup e importação num só lugar), Conferir fatura, Categorização automática, Lixeira, Assistente, Lista de compras, Configurações (link único "Importar, exportar e backup"). Nenhuma tela branca, nenhum texto cortado novo, logcat sem erro.

**Tema escuro:** Início, Transações, Análise e Mais vistos: contraste bom, amarelo nos destaques (E11 ok). **E19 passou:** com "Ocultar valores" ligado, os blocos novos de "Atrasadas", Pendências, Contas, Transações e Análise mostram `R$ ••••`.

**Fonte 1.3 (S24 típico):** só trunca nomes longos de categoria em "Top categorias" da Análise ("Transpor…", "Alimenta…"). Aceitável.

**Fonte 2.0 (pior caso):**
- Análise → "Top categorias": nomes viram "Tra…", "Ali…" e "25 %" quebra em duas linhas.
- Análise → "Atividade recente": título trunca ("Lançame…") e se choca com "Ver tudo".
- Análise → abas: "Resumo do mês" cortada na borda (rolável).
- Mais → subtítulo do Assistente termina em "…".
- Início, Transações (linha em 2 linhas, valor inteiro) e a barra inferior ficaram bem.

**Achados visuais (P3):**
- Contas, Orçamento, Metas, Recorrências: o botão "Nova …"/"Criar …" encosta no bloco de baixo, sem espaço.
- Listas de compras: linha vazia no topo com só o ícone de mover solto.
- Metas: lápis e ⋮ lado a lado, enquanto Contas só tem ⋮ (padrão não unificado).
- Lixeira: "Apaga em 30 dias" quebra em 2 linhas; o apagar de vez fica no ⋮ (não vi o ícone de lixeira isolado, E15 só em parte).

### Correções aplicadas depois do relatório
- **Tema:** Configurações agora tem "Tema claro" (desligado por padrão); o app abre escuro. `validateBackup` trata `dark` ausente como escuro. Teste novo em `tests/darkDefault.test.mjs` (1128 testes, 120 de segurança, `tsc` limpo).
- **Análise a 200% de fonte (P2 resolvido):** "Top categorias" e "Atividade recente" empilham nome e valor, sem cortar nem quebrar dígitos; `CSection` deixa o título quebrar sem encostar em "Ver tudo". Visto no emulador (S24, fonte 2.0, tema escuro). Ainda não revi os "Insights do mês" nem o resto da Análise a 200%.

### Rodada 3 (S24, tema escuro ligado)
| # | Resultado |
|---|---|
| E4 Lembretes | **Passou**: seção "Atrasadas" com os 4 itens e "Vencida há 2 dias" |
| E7 | **Passou**: Atualizações e PIN do Floco com cabeçalho e botões do kit. Importar e exportar ok. Foto/comprovante e Segurança (Backup criptografado) não abertos por dentro |
| E8 (vazio) | **Passou**: formulário de orçamento vazio fecha direto com o voltar |
| E13 | **Passou**: "Novo orçamento → Teto de despesa" lista só Moradia, Alimentação, Transporte, Saúde, Educação, Lazer (sem Salário etc.) |
| E14 | **Passou**: "Filtros do extrato" abre em folha (conta/cartão, categoria, faixa de valor, ordenar) |
| E15 Lixeira | **Passou**: ⋮ abre folha com "Restaurar" e "Apagar de vez" (ícone de lixeira); "Apagar de vez?" pede confirmação; Restaurar devolveu o item ao extrato |
| E18 | **Passou** (visto na rodada 2): Resultado/Entrada/Saída/Saldo previsto em grade 2×2 |
| E20 | **Em parte**: criar despesa de R$ 123,00 mudou o total do dia; excluir tirou do extrato; Lixeira restaurou/apagou; "Uso dos botões" conta aberturas. **Não testei** Entre pessoas (criar/receber/desfazer) nem editar |

**Achados novos:**
- **P2:** o aviso "Desfazer" some rápido (nas minhas tentativas, ~4 s ou menos) e não consegui usá-lo a tempo; a recuperação pela Lixeira funcionou. Vale conferir o tempo do aviso no celular.
- **P3:** depois de buscar no extrato, a lista se reordena e o toque pode abrir outro item. Foi assim que excluí sem querer "Lançamento fictício 1848" (dado de teste do Codex); **restaurei** pela Lixeira.
- A busca por "Alimentacao" (sem acento) não filtrou; com o valor "123" funcionou. Não conferi se a busca ignora acento.

**Limpeza:** criei só uma despesa de R$ 123,00 e a apaguei de vez; saldo do emulador igual ao de antes. Tema claro, valores visíveis, cor Solar (voltou depois de eu mudar sem querer para Turquesa), fonte 1.0, tamanho original.

**Veredito atualizado: Aprovado com ressalvas.** Para release, falta: corrigir a Análise a 200% de fonte (P2), conferir o tempo do "Desfazer", testar Entre pessoas e Segurança, e o dono testar no celular real.

Dados de teste do Codex continuam no emulador: 1989 "Lançamento fictício", itens "QA" e "Item excluído fictício N" na Lixeira.

Estado do emulador restaurado: tamanho e densidade originais, tema claro, valores visíveis, fonte 1.0, modo noturno do sistema desligado. Não salvei nada (nenhum dado criado por mim).
**Atenção:** o emulador tem sujeira do Codex: 1989 "Lançamento fictício N" (teste de desempenho T20) e itens "QA" (Aluguel QA vencido, Fatura Itaú QA); saldo está −R$ 108.993,91, não os R$ 38.368,61 de referência. Precisa limpar antes de qualquer teste futuro.

## Problemas
- **P1 (bloqueia release, reduzido):** o que testei na tela funciona, mas faltam E2, E4, E7, E13–E20 e todo o tema escuro.
- **P2 (visto na tela):** Análise → "Insights do mês" a 200% de fonte: valor monetário quebra dígitos e título trunca. Corrigir com `adjustsFontSizeToFit`/`maxFontSizeMultiplier` nos cartões de insight.
- **P2:** 18 `catch(() => {})` restantes; 14 `minHeight` < 48 a conferir; 14 arquivos com `Alert.alert` (não exigido, só `TransactionRow`).
- **P3:** `PlanningPanel` ainda existe; confirmar que sobrou só o necessário.

## Regressões contra a 1.12.0
Nenhuma no código ou nos testes (1127/120 verdes). Entre pessoas, Dívidas e contratos e Uso dos botões não foram abertos na tela.

## Não testado
Build x86_64, emulador, celular real, TalkBack, notificação real, fonte 200%, tema escuro, T14/T15/T16–T18/T20 por leitura.

## Veredito: **Aprovado com ressalvas (só código)**
Falta para aprovar: build x86_64 + percorrer E1–E20 (claro/escuro/200%), julgar os 18 `catch` e os 14 `minHeight`, atualizar `INVENTARIO-FUNCIONAL.md` com testado/não testado reais.

Recomendação: nada para o Codex refazer agora. Próximo passo é eu fazer o build e a rodada no emulador; o dono testa no celular antes de qualquer release.
