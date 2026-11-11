# Plano de retomada 2 (Floco Finanças, depois da 1.10.0)

Para abrir um chat novo do zero. Pasta: `C:\Users\Kat\Desktop\Projetos de IA\01 - Floco finanças`. Leia antes: `CLAUDE.md`, `INVENTARIO-FUNCIONAL.md` (E1), `DESIGN.md`, `TAREFAS.md` e este arquivo. Este substitui `PLANO-RETOMADA.md`.

## Estado agora
- **Última release: v1.10.0** (versionCode 20), publicada no GitHub com `Floco-Financas.apk` e `.sha256`. Branch `main`, tudo commitado e enviado.
- Testes: `npm test` (991 passando), `node --test tests/security/*.test.mjs` (72), `npx tsc --noEmit` (limpo). Rode os três antes de qualquer commit.
- Dono: pessoa que usa o app (português, respostas curtas). O Codex (outra IA) ajuda com **lógica pura e testes** em arquivos novos; ele está **sem limite de uso**, então o trabalho dele volta para o Claude por enquanto.

## Regras fixas
- Nunca `expo prebuild`. Build: `.\build-android.ps1 -Architecture x86_64` (emulador) ou `universal` (celular). Saída em `entrega\` (fora do Git). Ambiente e caminhos: seção "Ambiente" do `CLAUDE.md`.
- Emulador: AVD `FlocoToolsAudit`, porta 5554. Subir com `emulator.exe -avd FlocoToolsAudit -port 5554` usando `ANDROID_AVD_HOME=...\kontto-work\tools\avd`. Navegar com `adb` (`input tap`, `screencap`); `adb input text` não digita emoji.
- Commit, push e release **só quando o dono pedir**. Release: subir versão e versionCode em `app.json`, `package.json`, `android/app/build.gradle`; gerar APK universal; copiar para `entrega\Floco-Financas.apk` + `.sha256`; `gh release create vX.Y.Z`.
- Ao concluir uma função: atualizar `INVENTARIO-FUNCIONAL.md`. Testar no emulador antes de dizer "pronto" e dizer o que **não** foi testado.
- Sem dado pessoal nem chave em arquivo versionado. A chave do Gemini apareceu num chat antigo: o dono deve revogá-la.
- Tarefas para o Codex: arquivo `TAREFAS-CODEX-N.md` + prompt de uma linha. O pacote 9 (`TAREFAS-CODEX-9.md`) **não foi executado**.

## O que já está ligado nas telas (1.10.0)
Modo compra (`ShoppingTripScreen.tsx`: corredores, limite de gasto, tempo guardado por até 3 h, texto falado), Escanear produto (`ScanProductScreen.tsx`), "Usar preços do histórico", "Exportar em CSV", "Compartilhar código (sem preços)", autocompletar e busca na lista, colar lista com marcadores e código, "Resumo" na aba Produtos do histórico, migração das chaves de produto ao abrir (`src/app/store.tsx`).

## O que falta, em ordem

### A. Testar o que ainda não foi visto na tela (emulador)
1. Busca na lista (aparece com mais de 8 itens), código de compartilhamento (gerar e colar de volta), seção Resumo do histórico, tema escuro de todas as telas novas, fonte grande, Modo compra: sair e voltar mantém o tempo; finalizar zera a sessão; limite "perto" (amarelo) e "estourado" (vermelho).
2. Tela de colar lista com título "Lista de compras 🛒" (emoji real) deve ignorar o título.

### B. Ligar às telas o que hoje é só lógica (`src/*.mjs` + `tests/`)
| Módulo | Onde ligar | Observação |
| --- | --- | --- |
| `shoppingStaples` (sempre comprar) | editar item em `ShoppingScreen.tsx` | precisa campo novo no item e migração do backup |
| `shoppingSplit` (dividir por categoria) | finalizar no Modo compra e na lista | o formulário de despesa só aceita 1 despesa: criar fluxo de várias |
| `shoppingDeals` (desconto, leve 3 pague 2) | editar item | guardar a promoção no item (campo novo) |
| `shoppingLists` (listas múltiplas e modelos) | topo de `ShoppingScreen.tsx` | usar `migrateToLists`/`flattenLists`; maior mudança de dados |
| `shoppingUndo` | `ShoppingScreen.tsx` | hoje só há "Desfazer" de uma remoção |
| `nfceXml` | `ScanNotaScreen.tsx` (escolher arquivo XML) | sem rede; limites já testados |
| `shoppingRecipe` | `ShoppingPastePanel.tsx` | porções e escala |
| `shoppingReconcile` | "Finalizar e registrar despesa" | evitar despesa em dobro (`wouldDuplicate`) |
| `shoppingRunOut` (acabando) + `shoppingStores`/`Inflation` | `RestockList`, notificações locais | alertas começam desativados |
| `shoppingBackupCheck`/`Repair` | restauração de backup em `DataToolsScreen.tsx` | mostrar erros em português e oferecer reparo |
| `shoppingUnits`, `shoppingCategoryLearn`, `shoppingMerge`, `shoppingDuplicates` | conforme a tela | ver `INTEGRACAO-PACOTE-5-E-6.md` (ordem e horas) |

Sempre que mexer no formato salvo: aceitar backup antigo sem o campo e atualizar `keepShoppingOnRestore` (`src/shopping.mjs`) e os validadores de `src/shoppingData.mjs`.

### C. Acessibilidade e textos
- Aplicar `REVISAO-ACESSIBILIDADE-TELAS-NOVAS.md`: rótulos sem preço, foco ao abrir/fechar painéis, anúncios de carregamento, nomes longos em fonte 200%, lanterna como alternância.
- Aplicar `REVISAO-TEXTOS-LISTA-DE-COMPRAS.md` (tom, "…" no lugar de "...", termos fixos).
- Roteiros prontos: `ROTEIRO-TESTE-EMULADOR-LISTA.md`, `ROTEIRO-TESTE-CELULAR.md`, `ROTEIRO-TESTE-CELULAR-2.md`.

### D. Segurança e risco
- `MATRIZ-DE-RISCO-LISTA-DE-COMPRAS.md`: primeiro lote de correção (W01 a W08 da WebView, medir no Android: origem da ponte, redirecionamentos, tempo no Hermes).
- `REVISAO-SEGURANCA-IMPORTADORES.md` e `REVISAO-SEGURANCA-WEBVIEW-2.md`: itens ainda abertos.
- Texto com mais de 12.000 letras: a tela de colar já avisa; conferir.

### E. Notas fiscais de outros estados
Hoje só **SP** lê itens. PR, SC e RS precisam de uma **nota real** de cada (o dono envia) e do endereço de consulta de SC. Sem isso, não implementar (a lista de hosts em `src/nfceParse.mjs` é exata de propósito).

### F. Da lista de tarefas do projeto (`TAREFAS.md` / `CLAUDE.md`)
Duplicatas de notificação; filtros do extrato (conta, tag, faixa de valor); lixeira com purga e reordenar/arquivar contas; calculadora no valor e calendário no extrato; caixinha separada de meta e arquivar caixinha; ícone e cor em categorias e tags; widgets restantes (4 de 6); **Google Drive e sincronização só com a configuração OAuth fornecida pelo dono**.

### G. Antes da próxima release (1.11.0)
- Crítica de design `/impeccable` das telas novas (leitor, consulta, histórico, ritmo, Modo compra, Escanear produto).
- Integrar `RASCUNHO-DOCS-PACOTES-5-A-8.md` e `RASCUNHO-DOCS-LISTA-DE-COMPRAS.md` em `INVENTARIO-FUNCIONAL.md`, `DESIGN.md` e `CLAUDE.md`.
- Gerar `entrega/backup-ficticio-ritmo.json` com datas atuais, se o roteiro ainda pedir.

## Depende do dono
- Revogar a chave do Gemini exposta.
- Testar em celular real: QR e código de barras ao vivo, TalkBack, fonte grande, tema escuro, atualização pelo próprio app, notificação real.
- Enviar nota real de PR, SC e RS (e o endereço de consulta de SC).
- Fornecer a configuração OAuth se quiser Google Drive/sincronização.
- Pedir commit, push e release quando quiser.

## Dicas aprendidas nesta etapa
- Edições em arquivos com fim de linha misto (CRLF/LF): um script Python que tenta `\n` e depois `\r\n` evita falha de "texto não encontrado".
- `normalizeName`/`productKey` mudaram (decimal "1,5" vira "1.5"; letras de qualquer alfabeto ficam); o catálogo é migrado ao abrir o app. Não alterar de novo sem nova migração.
- `parseItemText` já teve ReDoS com `½` + espaços; manter o `.replace(/\s+/g, " ")` **antes** do tratamento de frações.
- Testes com prefixo "Achado:" são defeitos conhecidos propositais; hoje todos passam.
- Chaves fiscais de teste precisam de dígito verificador válido (`chaveDv` em `src/nfce.mjs`), pois `sanitizePurchases` valida.
