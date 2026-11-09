# Tarefas para concluir o Floco Finanças

Como usar: abra um chat novo com a pasta do projeto, escolha o modelo indicado em cada tarefa e escreva: **"Faça a tarefa N de TAREFAS.md"**. O `CLAUDE.md` já traz o ambiente, os comandos e as regras, então não precisa explicar de novo.

Modelos sugeridos:
- **Haiku 5.5**: tarefas mecânicas (publicar, atualizar textos e status).
- **Sonnet 5.5**: funções novas com regra de negócio e testes.
- **Opus 5.5**: código nativo Android, captura de notificação e decisões de layout.

---

## 1. Concluir a correção de duplicatas de notificação
**Modelo:** Opus 5.5
**Contexto:** `dedupeInbox` está em `src/notification-import.mjs` e é usado em `src/app/inbox.ts`. Os testes passam, mas o código nativo ainda não foi compilado com essa mudança.
**Fazer:**
1. Rodar `npm test` e `npx tsc --noEmit`.
2. Gerar APK x86_64 e instalar no emulador.
3. Enviar dois SMS da mesma compra: `adb -s emulator-5554 emu sms send NUBANK "Compra de R$ 37,80 APROVADA em THE BEST ACAI CAJATI para o cartao com final 5179."` (e outro igual).
4. Confirmar que aparece só uma pendência na Início.
**Aceite:** uma pendência só, testes verdes, sem logs de diagnóstico no código.

## 2. Publicar a versão 1.3.4
**Modelo:** Haiku 5.5
**Depende de:** tarefa 1.
**Fazer:** incrementar a versão para 1.3.4 e `versionCode` 10 em `app.json`, `package.json` e `android/app/build.gradle`. Gerar APK universal, copiar para `entrega\Floco-Financas.apk`, gerar o `.sha256` e criar a release com `gh release create v1.3.4`.
**Aceite:** `gh api repos/katsuuzin/floco-financas/releases/latest` mostra v1.3.4 com os dois arquivos.

## 3. Filtros do extrato
**Modelo:** Sonnet 5.5
**Fazer:** na tela Transações, adicionar filtros por conta, por tag e por faixa de valor (mínimo e máximo), além dos que já existem (tipo e pendentes). Lógica em `src/finance.mjs` ou em módulo novo, com teste.
**Aceite:** testes da lógica passando, e na tela o contador de resultados bate com a lista.

## 4. Lixeira com purga e reordenar/arquivar contas
**Modelo:** Sonnet 5.5
**Fazer:**
- Lixeira: hoje a exclusão é definitiva. Criar exclusão lógica para lançamentos, com tela para restaurar ou purgar.
- Contas: reordenar por arraste ou setas, e arquivar/restaurar (o arquivamento já existe, falta a tela de reordenar).
**Aceite:** teste de restauração e de purga; a ordem das contas persiste após reiniciar o app.

## 5. Calculadora no valor e calendário no extrato
**Modelo:** Opus 5.5
**Fazer:**
- Calculadora: o campo de valor aceita expressões simples (+, −, ×, ÷) com um teclado de cálculo.
- Calendário: visão mensal do extrato, com o total de cada dia.
**Aceite:** a expressão `12,50+7` vira `19,50` ao confirmar; o calendário mostra os totais corretos no emulador.

## 6. Caixinha separada de meta, e arquivar caixinha
**Modelo:** Sonnet 5.5
**Fazer:** hoje metas e caixinhas são o mesmo tipo. Separar: meta só acompanha o objetivo; caixinha reserva dinheiro de uma conta. Permitir arquivar caixinha.
**Aceite:** saldo total continua igual ao criar e retirar reservas; testes de reserva e de arquivamento.

## 7. Ícone e cor em categorias e tags
**Modelo:** Sonnet 5.5
**Fazer:** adicionar cor e ícone às categorias personalizadas e às tags. Mostrar a cor nas listas e nos gráficos.
**Aceite:** a cor escolhida aparece na lista e persiste após reiniciar.

## 8. Widgets restantes (4 de 6) — CONCLUÍDA (commit e671491)
**Modelo:** Opus 5.5
**Contexto:** já existem "Saldo do Floco" e "Próximas contas". Faltam: lançar rápido, botão de lançar, fatura e orçamentos. Os arquivos nativos estão em `android/app/src/main/java/.../updates/FlocoWidgets.kt` e no `AndroidManifest.xml`. Não rodar `prebuild`.
**Fazer:** criar os quatro widgets restantes, reutilizando `src/widgets.mjs` para o texto.
**Aceite:** os widgets aparecem na lista de widgets do emulador e respeitam "ocultar valores".

## 9. Extrato bancário em PDF — CONCLUÍDA (commit c226975)
**Modelo:** Sonnet 5.5
**Fazer:** importar PDF de extrato. Ler o texto do PDF localmente, mostrar as linhas para revisão e só então gravar.
**Aceite:** importação mostra a prévia antes de gravar; testes com um PDF de exemplo sintético.

## 10. Ícones alternativos e cores de destaque — CONCLUÍDA (commit 6424cab)
**Modelo:** Sonnet 5.5
**Fazer:**
- Ícones alternativos do app (variações do mascote): trocar o ícone pela tela de configurações.
- Cores de destaque: escolher a cor de ação entre algumas opções da paleta Solar.
**Aceite:** trocar o ícone muda o lançador; trocar a cor de destaque muda os botões nos dois temas.

## 11. Google Drive e sincronização
**Modelo:** Opus 5.5
**Bloqueio:** precisa da configuração OAuth fornecida pelo usuário. Não começar antes disso.
**Fazer:** backup automático no Drive (pasta do próprio app, sem acesso a outros arquivos) e, depois, sincronização entre aparelhos com resolução de conflitos.
**Aceite:** backup restaurado em outro aparelho com os mesmos dados.

---

## Ao final de qualquer tarefa
- Atualizar o status em `INVENTARIO-FUNCIONAL.md`.
- Rodar `npm test` e `npx tsc --noEmit`.
- Informar o que foi testado no emulador e o que ficou sem teste (celular real, TalkBack).
- Commit e push só quando você pedir.
