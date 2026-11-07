# Estado da implementação — 6 de novembro de 2026

## v1.1.1 — privacidade por conta e atualizações públicas

29 testes e TypeScript passaram. Contas permitem ocultar saldo e disponível individualmente; a opção separada de inclusão afeta saldo geral e projeções, sem apagar lançamentos. Testes cobrem transferências entre contas incluídas/excluídas e preservação/migração de preferências no backup.

No Android 15, conta Nubank PJ fictícia configurada com R$500: saldo e disponível permaneceram ocultos ao alternar o olho global duas vezes, e a conta Nubank existente manteve o valor visível. A conta excluída aparece identificada como fora do saldo geral.

Repositório tornado público por solicitação do usuário. Revisão local do histórico: 92 blobs, sem caminhos de assinatura/credenciais/backups/auditoria e sem padrões de tokens ou chaves privadas. Apenas código, recursos do Floco e APKs assinados são públicos. A chave de assinatura continua no computador.

Consulta pública real, sem Authorization, retornou a release disponível. Novo atualizador remove a credencial antiga, mantém verificação automática com intervalo de 15 minutos em primeiro plano, aviso de nova versão e botões de verificar/atualizar. Não promete instalação silenciosa ou detecção enquanto o app está fechado. APK 1.1.1/code 4 compilado com sucesso e certificado igual às versões anteriores.

Teste completo de atualização pública executado no Android 15: base local/code 3 com o novo atualizador consultou a release 1.1.1 sem token, baixou 40.873.912 bytes, verificou SHA-256 20fa86ef81dd9e46f4f4a5815a58ce7be7a4c84fe9ca62571e0d1398380acf11 e abriu o instalador. Permissão desta fonte concedida apenas no emulador; Play Protect fez a análise padrão e permitiu continuar. A confirmação instalou versionName 1.1.1/versionCode 4. Após reabrir, saldo geral fictício de R$38.411,10 preservado, conta PJ de R$500 ainda oculta e fora do total, conta PF visível. O workflow público com os 29 testes e TypeScript também passou.

- Floco Finanças Android 1.0.0, pacote br.com.kat.flocofinancas, compilado em release com assinatura própria. APK ARM64 + x86_64 gerado com sucesso.
- 13 testes passaram: regras financeiras, datas, parcelas, transferências, pagamentos, reservas, backup e validação de releases. TypeScript passou.
- Implementação anterior dos fluxos financeiros foi executada em emulador Android 15: navegação, digitação, salvamento, busca e persistência após force-stop/reabertura. A rolagem entre abas foi corrigida e conferida.
- Solar escolhido pelo usuário. APK final instalado e aberto em emulador Android 15; temas claro e escuro inspecionados, painel de atualizações aberto com repositório preenchido e campo de token vazio. Nenhum erro ReactNativeJS/AndroidRuntime observado.
- As três opções visuais são prévias com valores ilustrativos; a prévia interativa foi aberta em navegador de teste, sem overflow horizontal. Alternância de variantes e formulário local de exemplo funcionaram.
- Consulta/download/instalação de uma release privada real ainda não foram executados: dependem do futuro repositório, token e versão assinada. Não se declara atualização real concluída.
- Destino autorizado: repositório privado https://github.com/katsuuzin/floco-financas. A proposta inicial de assinatura em nuvem foi retirada por decisão do usuário. Chave e senha ficam somente no computador; GitHub Actions apenas valida código.

## v1.0.1 — Solar marrom

Marrom #311E0D extraído da imagem fornecida pelo usuário. Substituídos os verdes em textos, ícones, controles e superfícies dos dois temas. Treze testes e TypeScript passaram. Assinatura local com a mesma chave; nenhuma credencial é enviada ao GitHub. O workflow agora apenas valida código, conforme a decisão de manter a chave no computador.

APK 1.0.1 (versionCode 2) instalado com sucesso sobre 1.0.0 no emulador Android 15. Preferência de tema preservada. Temas marrom claro e escuro capturados e inspecionados; nenhum erro ReactNativeJS ou AndroidRuntime no lançamento. Pares de texto verificados com contraste mínimo de 6,32:1, acima de 4,5:1.

## v1.1.0 — expansão funcional sem PRO

23 testes passaram; TypeScript sem erros. Casos cobertos: perfis PF/PJ independentes, migração de backups antigos, categorias/subcategorias e tags, datas 29–31, recorrências sem duplicatas, simulador Price e centavos, contratos com parcelas anteriores pagas, recebimento parcial/estorno de dívida, relatórios sem principal ou fatura duplicados, projeção sem duplicar ocorrências e pagamento parcial de cartão.

APK release ARM64 + x86_64 compilado localmente com versionCode 3 e certificado SHA-256 ea08d8cde7b49229136e98a7a7bd43ebf4b6cb724b8a213f9f9cbe5f2757cad2. Atualização instalada sobre 1.0.1 no Android 15: contas, lançamentos e metas fictícias preservados. Dívida de teste de R$100 com recebimento de R$40 manteve saldo a receber de R$60, inclusive após instalar novamente o APK final. Simulação de R$1.200 em três parcelas sem juros apresentou R$400; projeção conferida contra aluguel e fatura do conjunto fictício. Conta Nubank PJ criada pelo formulário, separada da conta Nubank existente.

Recorrência mensal fictícia criada no Android e geração executada duas vezes; relatório do mês apresentou uma única ocorrência. Relatório gerado com os dados fictícios mostrou seis lançamentos, R$3.812 de entradas e R$2.307,30 de saídas (incluindo pendentes), sem contar R$40 de devolução de dívida como receita. Nenhum erro ReactNativeJS ou AndroidRuntime encontrado para o processo atual do Floco.

O Kontto original foi instalado pela Play Store e auditado em 55 rotas no mesmo emulador, com pt-BR/BRL e fuso de São Paulo. Nenhum cadastro financeiro do original foi alterado. Telas bloqueadas por PRO foram recriadas com comportamento próprio, autorizado pelo usuário, sem ativar compra ou teste.

Não há equivalência completa: os limites por módulo constam em PLANO-PARIDADE-KONTTO.md. As verificações Android usam dados fictícios; testes em aparelho físico e instalação de atualização pelo token privado ainda precisam ser executados. A publicação recebe somente código e APK assinado, sem a chave de assinatura nem a auditoria bruta do aplicativo original.
