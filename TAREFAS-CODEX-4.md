# Tarefas do Codex, pacote 4

O pacote 3 foi recebido (dicionário de nomes, lógica do modo compra e rascunhos de documentação). Obrigado. Este pacote fecha o que ficou **parcial** na segurança da WebView e prepara o que vem depois. Ordem de valor: 1, 2, 3.

## Regras (as mesmas dos pacotes anteriores)

- Nunca `expo prebuild`. **Sem commit, push ou release** (o Claude cuida das versões). Sem dado pessoal: dados inventados; nenhuma chave de API, CNPJ ou chave de nota reais. Sem dependência nova sem avisar o dono.
- Funções puras em `src/*.mjs`, textos em português do Brasil, valores em centavos.
- Ao final rode `npm test` e `npx tsc --noEmit` (hoje: 540 testes passando) e `node --test tests/security/*.test.mjs`.
- **Não edite** arquivos existentes. Só crie os arquivos listados em cada tarefa.
- Entrega: um parágrafo curto com o que foi feito, o que ficou de fora, quantos testes passam e **quais casos falham** (com um exemplo mínimo que reproduza).

---

## 1. Testes hostis reais da WebView (os que ficaram de fora no pacote 3)

Arquivo novo: `tests/security/nfce-hostile.test.mjs` (roda só com `node --test tests/security/*.test.mjs`).

O Claude **já corrigiu** o leitor e a validação de URL (veja `src/nfceParse.mjs`: `consultUrl`, `isAllowedUrl(url, uf)`, `allowedHosts`, `extractRows` linear, `assertSane`, `MAX_HTML_CHARS`, `parseNfceHtml`). No pacote 3 os cenários de ReDoS e de contorno da URL ficaram de fora porque se esperava que falhassem. **Agora eles devem passar**: escreva-os de verdade, contra o código atual, e **diga quais falham** (falha = achado real, e o Claude corrige).

Casos obrigatórios (HTML/URL **inventados**, gerados no próprio teste):

1. **Tempo** de `parseNfceHtml`, cada caso com orçamento de **500 ms** (`performance.now()`): `<tr id="Item + 1"><td>` repetido 40 000 vezes sem fechar; `<span class="txtTit">` 60 000 vezes sem fechar; 900 KB de espaços dentro de uma linha de item; 60 000 `<div>` aninhados; `Valor a pagar R$:` seguido de 900 KB de lixo; 2 000 linhas válidas seguidas de 1 MB de lixo; `&nbsp;` repetido 300 000 vezes; atributo `class="` aberto e nunca fechado; um `<` a cada 3 caracteres sem nenhum `>`.
2. **Limites**: HTML de 1 500 001 caracteres deve ser recusado com mensagem em português; 501 linhas de item deve ser recusado; uma linha de item com 30 000 caracteres deve ser recusada.
3. **`isAllowedUrl(url, "SP")` deve recusar**: `https://evil.gov.br.example.com/`; `https://user:pass@www.nfce.fazenda.sp.gov.br/`; porta `:8443`; `http://`; `javascript:`; `intent://`; `https://www.nfce.fazenda.sp.gov.br@evil.com/`; host com ponto final; punycode `xn--`; **outro órgão no mesmo domínio** (`https://www.fazenda.sp.gov.br/`); host de outro estado; string vazia; `null`; `undefined`; um número. **Deve aceitar**: `https://www.nfce.fazenda.sp.gov.br/qrcode?p=<chave fictícia válida>|3|1` e `https://nfce.fazenda.sp.gov.br/x`.
4. **`consultUrl`** com `info.url` apontando para um host **estranho** (`.gov.br` de outro órgão e `evil.com`): o resultado deve usar **sempre** `https://www.nfce.fazenda.sp.gov.br/qrcode?p=<chave>|3|<1 ou 2>`; chave com 43 ou 45 dígitos deve lançar erro; UF sem suporte deve lançar `Ainda não consulto notas de XX.`.
5. **Validação da mensagem da ponte**: em `tests/security/helpers.mjs` (arquivo novo, só utilitário de teste) escreva `acceptBridgeMessage(msg, { uf, chave })` **espelhando** o que o app faz em `src/screens/NfceConsultaScreen.tsx` (leia o `onMessage`: texto bruto até `MAX_HTML_CHARS + 10 000`, `JSON.parse`, `isAllowedUrl(msg.href, uf)`, `href` contendo a chave, `type` válido, `html` texto até `MAX_HTML_CHARS`, e a chave lida da página igual à consultada). Teste mensagens: sem `type`; `html` não-texto; `href` de outro host; `href` sem a chave; chave da página diferente; HTML grande; JSON inválido; objeto com `__proto__`/`constructor`.

---

## 2. Revisão de segurança da correção (relatório, sem editar código)

Arquivo novo: `REVISAO-SEGURANCA-WEBVIEW-2.md`. Releia `REVISAO-SEGURANCA-WEBVIEW.md` (o seu relatório anterior) e confira, **achado por achado**, se `src/nfceParse.mjs` e `src/screens/NfceConsultaScreen.tsx` atuais **fecham** o problema, fecham **em parte** ou **não fecham**, com o trecho e o motivo. Liste riscos **novos** que as correções possam ter criado (por exemplo: lista de hosts exata quebrando um redirecionamento legítimo, ou a checagem `href.includes(chave)` ser fraca). Termine com a lista de correções que ainda valem a pena, em ordem de risco. **Não corrija no código.**

---

## 3. Testes de acessibilidade estática das telas novas

Arquivo novo: `tests/security/a11y-static.test.mjs` (nome pode ser `tests/a11y-static.test.mjs` se preferir rodar com `npm test`; escolha `tests/` apenas se **todos passarem**).

Leitura estática (sem rodar o app) dos arquivos `src/screens/ShoppingScreen.tsx`, `ScanNotaScreen.tsx`, `NfceConsultaScreen.tsx`, `PurchasesScreens.tsx`, `RestockList.tsx`, `ShoppingPastePanel.tsx` e `src/ui/ShoppingIcons.tsx`. Verifique por texto/expressão regular, e **diga o que falha**:

- todo `Pressable` e `IconButton` tem `accessibilityLabel` ou texto filho legível;
- todo `Pressable` com papel `checkbox` tem `accessibilityState`;
- nenhum alvo de toque com `width` ou `height` fixo abaixo de 44 (aviso, não erro, se houver `hitSlop`);
- mensagens de erro e de status usam `accessibilityLiveRegion`;
- ícones decorativos estão ocultos para leitor de tela (`ShoppingIcons.tsx` já faz);
- nenhum texto de interface em inglês (procure palavras como `Loading`, `Error`, `Submit`, `Cancel` em strings literais).

Entrega: o arquivo de teste + uma lista curta dos pontos que falharam, com arquivo e linha. **Não edite** as telas.
