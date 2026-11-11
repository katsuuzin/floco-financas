# Plano de medição no Android (segurança da consulta fiscal)

Classificação dos itens abertos de `MATRIZ-DE-RISCO-LISTA-DE-COMPRAS.md` (W01 a W09) e das revisões `REVISAO-SEGURANCA-IMPORTADORES.md` e `REVISAO-SEGURANCA-WEBVIEW-2.md`.

**Regra:** nenhum desses itens foi alterado no código neste pacote. A consulta fiscal roda num WebView com ponte nativa; mexer nela sem ver o comportamento no aparelho pode quebrar a consulta de notas válidas ou afrouxar uma checagem. Só se muda depois da medição.

Classes: **A** corrigível e testável só com código; **B** exige medir no Android; **C** decisão de produto.

| Item | Classe | Situação | O que fazer |
| --- | --- | --- | --- |
| W01 origem e frame da ponte | B | Aberto | Provar de qual frame vem a mensagem (passo M1). |
| W02 destino fora da lista e timeout de decisão | B | Aberto | Provar o bloqueio na camada nativa (passo M2). |
| W03 HTML serializado antes do teto; `innerText` periódico | B | Aberto | Medir memória e tempo com página grande (passo M3). |
| W04 cookies, armazenamento DOM e subrecursos externos | B | Aberto | Instrumentar a rede e a sessão (passo M4). |
| W05 parser no Hermes com entrada hostil | B | Aberto | Benchmark no aparelho (passo M5). Os limites em Node já têm testes. |
| W06 vínculo fiscal por `includes` no caminho | B | Aberto, depende de W01 | Só definir a rota oficial depois do M1 e da matriz do M6. |
| W07 recusa sem endereço, erro genérico | A | **Tratado no pacote 11** | O texto de recusa da SEFAZ só é aceito com o mesmo endereço e a mesma chave. Conferir no passo M7. |
| W08 etapa oficial intermediária fora da política | B | Aberto | Montar a matriz de rotas oficiais por UF (passo M6). |
| W09 JSON escapado acima do teto do envelope | B | Aberto, depende de W03 | Medir o payload completo antes da ponte (passo M3). |
| Importadores (CSV, OFX, XLSX, PDF) | A | Cobertos por `tests/security/importers-hostile.test.mjs` | Sem item novo; rodar a suíte. |
| Texto colado com mais de 12.000 letras | A | A tela de colar já avisa | Conferir o aviso na tela (passo M8). |

Nenhum item ficou em **C** até agora. Se o passo M6 mostrar que uma UF usa um endereço que não queremos permitir, essa UF vira pergunta ao dono: liberar o endereço ou não suportar a UF.

## Passos para o Claude rodar no emulador

Pré-requisitos: APK x86_64 recente instalado; `adb` (caminho no `CLAUDE.md`); um aparelho de teste, nunca com dados pessoais; consulta com chave de **nota de teste** autorizada, nunca uma nota real da pessoa.

**M1. Origem da ponte (W01).** Objetivo: ver se uma mensagem vinda de um frame filho chega à prévia.
- Num build de **teste** (nunca o de uso), ligar um registro em `NfceConsultaScreen.tsx` que escreva no log a origem (`url` e se é o frame principal) de cada mensagem recebida.
- `adb logcat -s ReactNativeJS` durante uma consulta de teste.
- **Esperado:** só mensagens do frame principal e do host permitido. Se houver mensagem de outro frame, é falha; abrir um item de correção na camada nativa.

**M2. Redirecionamento e saída para outro app (W02).**
- Fazer a consulta de teste redirecionar para um endereço fora da lista (por exemplo, uma página local servida na máquina e alcançada com `adb reverse tcp:8080 tcp:8080`).
- `adb logcat | findstr -i "intent ActivityManager"` para ver se algum app externo é aberto.
- **Esperado:** a navegação é bloqueada, nenhum outro app abre, e a tela mostra uma mensagem. Repetir deixando a decisão de navegação passar do tempo limite: **não** pode liberar a navegação.

**M3. Página grande (W03 e W09).**
- Servir uma página de teste com HTML de 0,5, 1 e 2 vezes o teto (`MAX_HTML_CHARS` em `src/nfceParse.mjs`), inclusive uma com muitas aspas e quebras de linha (que dobram o tamanho ao escapar).
- Medir: `adb shell dumpsys meminfo br.com.kat.flocofinancas` antes e depois, e o tempo até a prévia aparecer (log com marca de tempo).
- **Esperado:** acima do teto, recusa limpa e rápida; abaixo, aceita; sem travar a interface (sem quadros perdidos visíveis) nem estourar memória. Anotar o payload escapado mais alto que ainda passa.

**M4. Sessão e subrecursos (W04).**
- Depois de uma consulta de teste, reabrir o app e uma nova consulta: conferir se cookies da consulta anterior continuam (`adb shell run-as br.com.kat.flocofinancas ls app_webview` só em build de teste).
- Capturar a rede do emulador (`adb shell tcpdump` se disponível, ou proxy local) durante a consulta e listar os hosts contatados.
- **Esperado:** nenhum host fora da lista oficial; cookies e armazenamento da consulta não persistem entre consultas.

**M5. Parser no Hermes (W05).**
- Reunir 10 entradas hostis dos testes (`tests/security/nfce-hostile.test.mjs`) num build de teste e rodar o parser medindo `performance.now()` no aparelho.
- **Esperado:** cada entrada em até 200 ms; nenhuma trava. Se passar, registrar o pior tempo.

**M6. Rotas oficiais por UF (W06 e W08).**
- Para SP (única UF com itens lidos hoje): seguir a consulta de teste inteira e listar cada host e caminho visitado, inclusive etapas intermediárias.
- Comparar com `allowedHosts` e `hrefMatchesKey` em `src/nfceParse.mjs`.
- **Esperado:** todo passo oficial está na lista; nenhum passo oficial é bloqueado sem motivo. Para PR, SC e RS: **só quando o dono enviar uma nota real de cada**; sem isso, não implementar (lista de hosts é exata de propósito).

**M7. Recusa da SEFAZ (W07).**
- Simular a página de recusa com o mesmo endereço e a mesma chave, e outra com endereço diferente.
- **Esperado:** a primeira mostra a orientação da SEFAZ; a segunda mostra o erro genérico.

**M8. Aviso de texto longo.**
- Em **Colar lista**, cole 12.001 letras.
- **Esperado:** aviso claro de limite, sem travar a tela.

## Como registrar

Para cada passo: data, aparelho (emulador ou celular), build, resultado (passou/falhou), medida (tempo, memória) e a decisão. Falha em M1, M2 ou M4 é **bloqueio para release** até haver correção.
