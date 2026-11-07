# Estado da implementação — 6 de novembro de 2026

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
