# Revisão do projeto e plano até a versão final

Estado em 6 de novembro de 2026, base v1.1.1. Complementa [PLANO-PARIDADE-KONTTO.md](PLANO-PARIDADE-KONTTO.md), que tem a matriz completa de funções. Este documento diz **o que está errado hoje** e **em que ordem consertar**.

## Escopo: o que "clone 1 pra 1" significa aqui

O alvo é equivalência **funcional** com o Kontto: tudo o que o Kontto faz, o Floco também faz, e sem PRO. A identidade continua sendo do Floco: nome, mascote, Solar marrom, layout e textos próprios.

Fica de fora:
- copiar telas pixel a pixel, ícones, ilustrações, textos ou marca do Kontto;
- extrair ou reaproveitar código do APK (o REA serve para entender o que existe, não para transplantar);
- usar o identificador, as credenciais ou os serviços do Kontto.

Funções e regras financeiras podem ser recriadas livremente. Cópia de arte, marca e código é infração e pode derrubar o app e o repositório.

## Revisão: problemas encontrados

| # | Problema | Gravidade | Onde |
|---|---|---|---|
| R1 | O app inteiro está em um componente (`FinanceApp`, cerca de 2.900 linhas). Qualquer mudança mexe em tudo e a tela inteira re-renderiza a cada digitação. | Alta | `App.tsx` |
| R2 | Todos os dados ficam em **um único JSON** no AsyncStorage, regravado inteiro a cada alteração. Não há transação: se o app fechar no meio de uma gravação, a base pode ficar inconsistente. Fica lento quando houver milhares de lançamentos. | Alta | `App.tsx:141-201` |
| R3 | Não há biblioteca de navegação: as abas são estado manual. O botão voltar do Android, os links internos e as futuras ações de widget dependem de remendos. | Média | `App.tsx` |
| R4 | Os testes (29, todos passando) cobrem só a lógica pura em `.mjs`. Telas, migração de dados e atualização do APK não têm teste automático. | Média | `tests/` |
| R5 | A tipagem é fraca: os componentes recebem `any` (`Choice`, `Field`), e o domínio está em `.mjs` sem tipos. `npm run check` não pega erros de dados. | Média | `App.tsx`, `src/*.mjs` |
| R6 | O ambiente desta máquina não tem Node/npm no PATH nem `node_modules`. Typecheck e build não rodam. | Bloqueio | máquina |
| R7 | A pasta `Kontto-clone` é uma cópia antiga, sem Git, com o nome do produto original. Gera confusão sobre qual é a fonte da verdade. | Baixa | pasta irmã |
| R8 | A auditoria do original (Etapa 0) está incompleta: 55 rotas percorridas, sem fichas de comportamento por função. Sem isso, "pronto" não tem critério. | Alta | `analysis/` (local) |
| R9 | O backup JSON não é criptografado e não há PIN. Para um app de finanças, isso precisa vir antes de nuvem ou sync. | Média | backup |

Pontos fortes que devem ser mantidos: a lógica de parcelas em centavos, a separação entre pagamento de fatura e despesa, os testes de borda de calendário, o atualizador público sem token e a regra de não marcar nada como pronto sem validação no Android.

## Plano por fases

Cada fase termina com testes passando, build Android instalado **por cima** da versão anterior sem perder dados, e commit no GitHub.

### F0 — Ambiente e linha de base
- Instalar Node LTS e npm; `npm ci`; fazer `npm test` e `npm run check` passarem.
- Confirmar que `build-android.ps1` gera o APK e que ele instala por cima da v1.1.1.
- Arquivar a pasta `Kontto-clone` (zip fora do projeto) e manter só o Floco.
- **Aceite:** test, check e build verdes nesta máquina.

**Resultado da F0 (6/11/2026):**
- Node 26.13 LTS instalado; `npm ci`, `npm test` (34 testes) e `npm run check` verdes.
- Toolchain Android encontrada em `R:\tools` (JDK 21 e 17, SDK 37, NDK 27.1); `R:` é um `subst` para `Documents\ChatGPT\Minha agenda\kontto-work`.
- Havia **uma terceira cópia** em `R:\project`, com trabalho mais novo que não estava no Git: importação de extratos, notificações bancárias, OCR de comprovante, tela de segurança, retirada/transferência de caixinha e 3 arquivos de teste. Esse código foi trazido para o repositório. O ícone daquela cópia (cachorro de óculos, sem moeda) **não** foi trazido; foi mantido o ícone documentado com a moeda R$.
- `Kontto-clone` foi compactada em `Projetos de IA\_arquivo\Kontto-clone-2026-11-06.zip`. A pasta original continua no lugar até você decidir apagá-la.
- Daqui em diante, a fonte da verdade é só este repositório. `R:\project` não deve mais ser editado.
- Build: `build-android.ps1` foi reescrito. O Android Gradle Plugin recusa caminhos com "ç", e o atalho anterior via `subst` na raiz do drive quebrava o autolinking do Expo. Agora o script espelha o projeto em `%USERPROFILE%\AndroidBuild\floco-work` (cópia descartável), compila lá e devolve o APK em `entrega/`. Também passou a funcionar no Windows PowerShell 5.1.
- A dependência do ML Kit (OCR de comprovantes) faltava em `android/app/build.gradle`; foi adicionada.
- APK release arm64 gerado, com 36,6 MB, assinado com `CN=Floco Financas`, versionCode 4. Ainda **não** foi instalado num aparelho; isso entra na validação da F1/F2.
- `expo-doctor`: 19/20. O aviso restante é esperado, porque o projeto mantém a pasta `android/`; mudanças de ícone e plugins precisam ser feitas em `android/` também (ou via `expo prebuild`).

### F1 — Auditoria funcional do original (Etapa 0)
- No emulador, com dados fictícios, preencher uma ficha por função: campos, validações, regras de saldo/fatura, edição, exclusão e o que persiste após reiniciar.
- Fechar as dúvidas abertas: o rótulo cortado do menu, Empréstimos × Quem me deve, variantes de relatório.
- **Aceite:** inventário fechado em `analysis/fichas/` (local), com cada item ligado a um teste de aceitação.

**Resultado da F1 (7/11/2026):** concluída em [INVENTARIO-FUNCIONAL.md](INVENTARIO-FUNCIONAL.md). Kontto 1.0.83; 87 telas percorridas; 79 funções com ID, comportamento e status no Floco. As três dúvidas abertas foram fechadas. Telas atrás do paywall foram descritas pela apresentação e estão marcadas como *deduzido*. Widgets não foram abertos. As capturas e os scripts (`analysis/f1*.py`) ficam só no computador.

### F2 — Fundação (corrige R1, R2, R3, R5)
- Migrar para **Expo Router** com abas e pilhas; o botão voltar passa a ser nativo.
- Quebrar `App.tsx` em `app/` (telas), `components/`, `domain/` (TypeScript) e `data/` (repositórios).
- Migrar o armazenamento para **expo-sqlite**, com migrações versionadas. Na primeira abertura, importar o JSON antigo, conferir os saldos e só depois apagá-lo.
- **Aceite:** atualizar sobre a v1.1.1 preserva saldos, faturas, metas e reservas, centavo por centavo; migração repetida não duplica.

**Resultado da F2 (7/11/2026), v1.2.0:**
- **Armazenamento:** SQLite (`expo-sqlite`), com uma linha por registro e gravação só do que mudou, numa transação. Na primeira abertura o JSON antigo do AsyncStorage é importado e conferido campo a campo antes de o banco novo ser usado. O JSON original fica intacto como cópia. Validado no emulador: atualização da 1.1.1 com dados de demonstração preservou saldo total, saldos por conta, disponível, pendências e faturas, centavo por centavo, e uma despesa nova sobreviveu ao reinício.
- **Estrutura:** `App.tsx` passou de 3.175 para cerca de 400 linhas. Componentes de interface em escopo de módulo (`src/ui/kit.tsx`), o que corrige a perda de foco ao digitar. Contexto de tema (`src/ui/theme.tsx`), store (`src/app/store.tsx`), regras de formulário (`src/app/forms.ts`) e telas em `src/screens/`.
- **Navegação:** pilha própria (`src/app/nav.tsx`) em vez do Expo Router, para não adicionar módulos nativos com a pasta `android/` commitada. Barra inferior Início · Transações · **+** · Análise · Mais (N1); menu de adicionar com Receita, Despesa, Despesa no cartão e Transferir (N3); Mais agrupado como no inventário (N2). O botão voltar do Android desempilha.
- **Modelo:** horário, observações, estorno (L5), ignorar na análise (L9), descrição opcional, repetição única/parcelada/recorrente no próprio formulário (L4), salvar e continuar (L10). Cartões com dias 1–31, compra no fechamento indo para a próxima fatura e vencimento em dia útil (O2). Contas com tipo e arquivamento (O1); cartões arquiváveis. Nova aba Análise (R1, versão inicial).
- **Testes:** 47, entre eles 5 de armazenamento contra SQLite real (`node:sqlite`) e 8 do modelo novo.
- **Pendente da F2:** os painéis antigos (`PlanningPanel` e os de importação, notificações, comprovante, segurança e atualizações) ainda recebem a paleta por props e têm cabeçalho próprio. Eles serão migrados para o kit novo à medida que cada área for refeita (F3–F6).

### F3 — Compromissos (Etapa 2 do plano de paridade)
Recorrências, parcelas, financiamentos (SAC/Price, amortização extra), empréstimos e Quem me deve, com estorno e histórico.

### F4 — Planejamento e análise (Etapa 3)
Orçamentos por ciclo, caixinhas separadas de metas, projeções e "e se", relatórios avançados, exportação em PDF.

### F5 — Entrada de dados (Etapa 4)
Importação CSV/OFX/PDF com revisão e deduplicação, OCR de comprovante, notificações bancárias, regras de categorização e lembretes.

### F6 — Proteção e nuvem (Etapa 5, corrige R9)
PIN, backup criptografado com versões, Google Drive opcional, sync com conflitos, os seis widgets e o assistente IA opcional.

**Resultado da F3–F6 (7/11/2026), v1.3.0:** o status por função está em [INVENTARIO-FUNCIONAL.md](INVENTARIO-FUNCIONAL.md#status-atual-v130-após-f2f6). Resumo:
- **F3:** contratos com Parcela fixa, Price e SAC (`src/contracts.mjs`), pagamento parcial com juros primeiro, juros por atraso, amortização extra, quitação e troca de cálculo; recorrências com totais e calendário; central de parcelas e simulador (`src/commitments.mjs`).
- **F4:** orçamentos por ciclo e com várias categorias; projeções curto/médio prazo e "e se"; relatórios avançados e PDF (`src/analysis.mjs`, `src/screens/ReportScreens.tsx`).
- **F5:** regras de categorização e conferência de fatura (`src/rules.mjs`); catálogo de 34 bancos, palavras ignoradas e SMS bancário na captura nativa; lembretes locais (`src/reminders.mjs`, `expo-notifications`).
- **F6:** saúde financeira, destaques e plano de ação locais (`src/insights.mjs`); assistente com chave própria opcional (Gemini, OpenAI, OpenRouter, Anthropic), enviando só resumo agregado e com consentimento; Início e Análise configuráveis, atalhos, quarto botão, preferências do extrato, primeiros passos, boas-vindas, link de suporte; 2 widgets Android e o link `floco://`.
- **Arquivos nativos fora do plugin:** os layouts e o XML dos widgets e as entradas novas do `AndroidManifest.xml` (receivers, esquema `floco`, `POST_NOTIFICATIONS`) foram feitos direto em `android/`. Um `expo prebuild --clean` apagaria isso. Não rode prebuild sem antes passar essas mudanças para `plugins/withAndroidUpdater.js`.
- **Testes:** 95.

### F7 — Conferência final e entrega (Etapa 6)
Repetir as fichas da F1 no Floco, com acessibilidade (TalkBack, fonte grande), modo offline, restauração e atualização do APK. Publicar a release assinada.

**Pronto final:** todas as fichas da F1 aplicáveis ao Android têm tela, fluxo, persistência e teste no Floco; o que ficar diferente está listado explicitamente.

## Ordem de execução

F0 → F1 → F2 são obrigatórias e sequenciais: sem ambiente não há validação; sem fichas não há critério; sem fundação, cada função nova aumenta o problema R1/R2. Depois disso, F3 a F6 podem avançar em paralelo por área, desde que não toquem os mesmos arquivos.
