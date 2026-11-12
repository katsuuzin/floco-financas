# Pendências para finalizar o Floco Finanças

Atualizado em 12/11/2026, sobre a **v1.12.0** (commit `c3ff626`). Este arquivo junta tudo o que falta para considerar o app **finalizado**: o que depende do Codex, do Claude, do dono e de aparelho real. Para a verificação do trabalho do Codex, veja `VERIFICACAO-POS-CODEX.md`.

Legenda de quem faz: **[Codex]** código e testes · **[Claude]** emulador, verificação, build · **[Dono]** celular real, decisões, chaves · **[Dono+Claude]** decisão que vira trabalho.

## 1. Estado de partida

- Versão publicada: **v1.12.0** (versionCode 22). 1125 testes + 119 de segurança, `tsc` limpo. Testada **só no emulador, tema claro** (e partes no escuro).
- Fora do Git agora: o trabalho do Codex sobre `PLANO-CORRECOES-CODEX.md`.
- Auditoria completa em `AUDITORIA-IMPECCABLE.md`: **0 P0, 5 P1, 42 P2, 32 P3**. Notas: design 27/40, técnica 12/20.

---

## 2. Bloco A — Correções da auditoria (em andamento)

Origem: `PLANO-CORRECOES-CODEX.md` (T01–T21). **[Codex]** executa, **[Claude]** verifica.

| Onda | Tarefas | Resumo |
|---|---|---|
| 1 (graves) | T01–T06 | textos velhos, estado "vencido", folha de ações da transação, fonte 200%, "Leitura automática" compacta, Notificações como tela normal |
| 2 (consistência) | T07–T15 | demais painéis legados, cores do sistema, alvos 48 dp, voltar com confirmação, validação perto do campo, prévia de valor, padrão criar/editar, duplicidades, orçamento/estado do item |
| 3 (acabamento) | T16–T21 | Análise e Transações, Início e Contas, telas menores, erros engolidos, desempenho com volume, orientação (opcional) |

**Dependências:** a T14 (reduzir controles) só depois de o dono mandar o resultado de "Uso dos botões" (ver Bloco C). A T20 só mexe em lista se **medir** engasgo.

## 3. Bloco B — Testar na tela o que ainda não foi visto **[Claude, emulador]**

Do `PLANO-FINALIZACAO.md`, ainda sem teste na tela (claro e escuro, e a 200% de fonte quando fizer sentido):

- Lixeira com **purga** e restauração em lote.
- Folha **Editar item** (recorrente, promoção) e **Colar lista** com receita por porções.
- **Lote de despesas** ("Dividir por categoria") e salvar tudo de uma vez.
- Ler **nota em XML** (seletor de arquivo, prévia, modo avião).
- **Ícone e cor** em categorias e tags (e nas linhas do extrato e do orçamento).
- **Notificações duplicadas** (contador e "Ver duplicadas").
- **Listas múltiplas:** criar, trocar, excluir, recuperar, modelos ("Começar de" um modelo; "Salvar como modelo").
- **Filtros do extrato:** aplicar, persistir, limpar.
- **Restaurar backup** com a lista de compras danificada ("Reparar e continuar").
- **Modo compra** (a partir da folha "Quais listas?"): marcar item de lista não ativa e registrar despesa com várias listas; uma lista só entrando direto.
- **Tema escuro** em todas as telas novas de 1.11.0 e 1.12.0 (a auditoria cobriu as principais; faltam Entre pessoas, Dívidas e contratos, Uso dos botões, Lembretes, Preferências em escuro).
- Recorrência, contrato e relatório com período nos campos de **data DD/MM/AAAA** (só a despesa e as dívidas foram vistas); CSV de lançamentos e de histórico de compras com DD/MM/AAAA; importação aceitando os dois formatos.
- Despesa do **pagamento de dívida** no extrato (bloqueio de editar/excluir pelo extrato; só "Desfazer pagamento").
- **Quem me deve** com anexo; anexo que não é imagem (PDF); anexo acima de 15 MB.
- "Uso dos botões": interruptor desligado, "Compartilhar contagem".
- Importação e backups **com arquivo real** (OFX, PDF, CSV/XLSX); backup criptografado completo (criar, exportar, restaurar); ponto de restauração.

## 4. Bloco C — Decisões do dono **[Dono]**

1. **Análise (visual Calen):** manter como está ou aproximar do tema Floco? *(O plano assume manter.)*
2. **Prazo de "atrasado":** vence hoje conta como vencido amanhã? Tolerância no cartão? *(O plano assume: data < hoje, sem tolerância.)*
3. **Backup/Importar/Exportar:** só em Mais ou só em Configurações? *(O plano assume: só em Mais.)*
4. **APK arm64 (35 MB)** como arquivo principal, com o universal (100 MB) como alternativa?
5. **Resultado de "Uso dos botões"** depois de usar um tempo: o que esconder em **Lista de compras** e **Análise** (decide a T14 e o passo 5 do `RETOMADA-CHAT-NOVO.md`).
6. **Módulos de lista que existem só em lógica** (`shoppingUnits`, `shoppingCategoryLearn`, `shoppingMerge`, `shoppingDuplicates`): ligar ou descartar? (ver `INTEGRACAO-PACOTE-5-E-6.md`).
7. **Bloco "Lista de compras" na Início** duplica a entrada de Mais: manter?
8. **Orientação horizontal/tablet:** vale suportar? (T21)

## 5. Bloco D — Teste em **celular real** **[Dono]**

O emulador não cobre estes pontos. Roteiros: `ROTEIRO-TESTE-CELULAR-3.md` (47 passos), `ROTEIRO-TESTE-INTEGRACOES.md`, `ROTEIRO-TESTE-CELULAR-2.md`.

- **TalkBack** (foco, anúncios, ações de acessibilidade das linhas, tempo do aviso "Desfazer", folhas com desfoque).
- **Fonte grande e "remover animações"** nos aparelhos reais.
- **Câmera ao vivo:** QR, código de barras, foto de item, OCR de comprovante/nota.
- **Voz (Falar):** reconhecimento real, texto ao vivo, Parar, prévia, aviso de privacidade.
- **Notificação real do banco** e **SMS** (leitura, confirmação, duplicadas).
- **Gestos** com o dedo: deslizar na linha, arrastar na lista, vibração, toque longo.
- **Biometria e PIN** ao abrir o app; PIN novo.
- **Atualização pelo próprio app** (baixar e instalar a release).
- **Widgets** na tela inicial (6 existem) respeitando "ocultar valores".
- **Fatura/Pix/compra** reais no fluxo de "Leitura automática".
- Desempenho no aparelho real com **muitos lançamentos**.

## 6. Bloco E — Segurança e privacidade

- **[Dono]** Revogar a chave do Gemini que apareceu em um chat antigo e criar outra no Google AI Studio.
- **[Claude+Dono]** **Medição da WebView da consulta fiscal** (`PLANO-MEDICAO-ANDROID.md`, passos **M1 a M8**; `MATRIZ-DE-RISCO-LISTA-DE-COMPRAS.md`, W01–W09). Falha em **M1** (origem da ponte), **M2** (redirecionamento) ou **M4** (sessão e subrecursos) **bloqueia release**. Só mexer na ponte nativa depois de medir.
- **[Claude]** Conferir que nenhum arquivo versionado contém chave, senha ou dado pessoal (`git grep -in "api_key\|secret\|senha\|@gmail"`); `entrega/backup-ficticio-ritmo.json` não deve ir para o Git.
- **[Dono]** Aviso claro ao usuário (já existe em Atualizações e Assistente) de que o histórico de toques do "Uso dos botões" é um dado novo, **só no aparelho**.

## 7. Bloco F — Funções ainda abertas

- **Notas fiscais de outros estados:** hoje só **SP** lê itens. PR, SC e RS precisam de **uma nota real de cada** e do endereço de consulta de SC. Sem isso **não implementar** (a lista de hosts em `src/nfceParse.mjs` é exata de propósito). **[Dono envia, Codex implementa]**
- **Google Drive e sincronização:** **só com a configuração OAuth fornecida pelo dono**. Backup automático em pasta do app e depois sincronização com resolução de conflitos. **[Dono+Codex]**
- **Reconciliar a tabela de status** do `INVENTARIO-FUNCIONAL.md`: das 70 linhas, **25 estão ❌, 38 🟡 e 7 ✅**, mas boa parte está **desatualizada** (ex.: Personalizar início, Atalhos, Lembretes, Widgets, Ícone do app, Categorização automática, Primeiros passos e Apresentação já existem). Refazer a coluna "Floco" item por item, com teste e tela. **[Claude]**
- Itens que o inventário ainda aponta como **realmente abertos** (confirmar na reconciliação): estorno/devolução (L5), contrato parcelado a partir do formulário (L6), atalho "Alguém me deve" (L7), ignorar na análise no formulário (L9), salvar e continuar (L10), SAC e seguros nos financiamentos (D1), total anual e calendário em recorrências (A1), contratado × estimado nas projeções (P5), relatórios PRO (R3–R6, R9 só mês atual, R10 PDF por conta), SMS bancário (F5), vales e benefícios (F6), momento de progresso (H5, opcional).
- **Animações:** `PLANO-ANIMACOES-LISTA.md` está **arquivado** a pedido do dono. Qualquer animação nova só com código próprio.

## 8. Bloco G — Documentação e repositório **[Claude]**

- `CLAUDE.md`: a seção **"Estado atual"** e a **"Lista de tarefas"** estão **velhas** (citam 1.3.4 e a versão 1.11.0). Atualizar para a versão vigente e apontar para este arquivo.
- `TAREFAS.md`: lista antiga (tarefas 1–12); marcar o que já foi feito e arquivar o resto.
- **~55 arquivos `.md` na raiz** (planos, tarefas do Codex 2–12, revisões, roteiros, rascunhos). Mover o histórico para `docs/` (ou `docs/arquivo/`) e manter na raiz só: `README.md`, `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, `INVENTARIO-FUNCIONAL.md`, os roteiros de teste vigentes e este arquivo.
- Integrar `RASCUNHO-DOCS-PACOTES-5-A-8.md` e `RASCUNHO-DOCS-LISTA-DE-COMPRAS.md` em `INVENTARIO-FUNCIONAL.md` e `DESIGN.md`; conferir o que o Codex já integrou.
- `DESIGN.md`: registrar os padrões novos (cabeçalho único, `CreateAction`, folha de ações, estado "vencido", limites de fonte) depois das correções.
- Decidir o destino dos arquivos soltos (`AUDITORIA-*`, `RELATORIO-CODEX-11.md`, `REVISAO-*`): arquivar.
- `analysis/` está no `.gitignore` (capturas e scripts locais): manter assim.
- Gerar `entrega/backup-ficticio-ritmo.json` com datas atuais **se** um roteiro ainda pedir.

## 9. Bloco H — Qualidade antes da próxima release

- Rodar `/impeccable critique` e `/impeccable audit` **de novo** depois das correções; meta: design ≥ 32/40 e técnica ≥ 15/20, **0 P1**.
- Teste de **volume** (≈2.000 lançamentos) e medição de partida/memória (hoje: ~0,3 s e ~93 MB no emulador).
- Conferir contraste do tema (`tests/security/theme-static.test.mjs`) e a lista de exceções.
- Conferir se testes de tempo ainda falham com a máquina ocupada (`npm test` com build em segundo plano).
- Revisão de acessibilidade das telas novas (`REVISAO-ACESSIBILIDADE-TELAS-NOVAS.md`) refeita no **celular**.

## 10. Bloco I — Release (só quando o dono pedir)

Próxima versão sugerida: **1.13.0** (muita mudança de interface) ou **1.12.1** (se só correções).
1. Portões verdes: `npx tsc --noEmit`, `npm test -- --test-concurrency=1`, `node --test tests/security/`.
2. Verificação (`VERIFICACAO-POS-CODEX.md`) **Aprovada**, sem P0/P1.
3. Subir `version` e `versionCode` em `app.json`, `package.json` e `android/app/build.gradle` (hoje 1.12.0 / 22).
4. `.\build-android.ps1 -Architecture universal` → `entrega\Floco-Financas-universal.apk`; copiar para `entrega\Floco-Financas.apk`; gerar `.sha256` (formato `HASH  Floco-Financas.apk`). *(Opcional, se o dono quiser: também `arm64-v8a`.)*
5. Instalar o universal no emulador e abrir (fumaça) antes de publicar.
6. Commit com `Co-Authored-By` do modelo; `git push origin main`; `gh release create vX.Y.Z entrega/Floco-Financas.apk entrega/Floco-Financas.apk.sha256 --title … --notes …`.
7. Nas notas, dizer **o que foi e o que não foi testado** (celular real, TalkBack).

## 11. Definição de "app finalizado"

- [ ] Todas as ondas do `PLANO-CORRECOES-CODEX.md` verificadas e aprovadas.
- [ ] Bloco B (emulador) sem pendência; Bloco D (celular) feito pelo dono, com os roteiros marcados Passou/Falhou e as falhas corrigidas.
- [ ] Decisões do Bloco C respondidas e refletidas no código.
- [ ] Medição da WebView (M1–M8) feita e sem bloqueio; chave do Gemini revogada.
- [ ] Notas fiscais de PR/SC/RS: implementadas **ou** decisão de ficar só com SP.
- [ ] Google Drive/sincronização: implementado **ou** decisão de não ter.
- [ ] Tabela do `INVENTARIO-FUNCIONAL.md` reconciliada (sem item "❌" que já existe) e documentação organizada.
- [ ] Nova auditoria `/impeccable` sem P1 e com notas melhores.
- [ ] Release publicada com notas honestas de teste.

## 12. Ordem sugerida

1. **[Codex]** Ondas 1 → 2 → 3 do `PLANO-CORRECOES-CODEX.md`.
2. **[Claude]** Verificação em chat zerado (`VERIFICACAO-POS-CODEX.md`) → `RELATORIO-VERIFICACAO.md`; **[Codex]** refaz o que reprovar.
3. **[Dono]** Responde o Bloco C e testa no celular (Bloco D) com os roteiros; devolve Passou/Falhou e o "Uso dos botões".
4. **[Claude]** Bloco B (emulador), reconciliação do inventário e organização dos `.md` (Blocos B e G).
5. **[Dono+Codex]** Funções abertas (Bloco F) que o dono quiser: notas de outros estados, Drive, módulos de lista.
6. **[Claude]** Nova auditoria, release (Blocos H e I).
