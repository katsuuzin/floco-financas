# Floco Finanças — Android

Finanças pessoais offline, com o mascote enviado pelo usuário e identidade própria em amarelo e marrom. **Sem assinatura, plano PRO, anúncios ou limites comerciais** de contas, cartões, orçamentos e metas. Somente Android.

## Recursos

Contas, carteiras, receitas, despesas, transferências, pendências, busca, filtros e edição. Perfis independentes Nubank PF/PJ e Inter PF/PJ, além de outros bancos. Cartões, limite, fechamento, vencimento, parcelas em centavos e pagamentos totais ou parciais de fatura sem duplicar despesas. Orçamentos, metas com reservas, tema claro/escuro, ocultação de valores, biometria, backup JSON e CSV. Demonstração opcional com valores fictícios.

A versão 1.1.0 acrescenta categorias/subcategorias e tags, recorrências com geração explícita de pendentes sem duplicatas, central de parcelas, simulador Price, contratos com parcela fixa, Quem me deve com recebimentos parciais e estorno, projeções com cenário mensal e relatórios filtráveis/exportáveis em CSV. Veja PLANO-PARIDADE-KONTTO.md para o inventário de diferenças e as etapas ainda pendentes; a versão não representa equivalência completa com o Kontto.

A versão 1.1.1 acrescenta ocultação independente do saldo de cada conta e exclusão opcional do saldo geral/projeções. Atualizações pelo próprio app via GitHub público, sem login ou token, com verificação automática enquanto aberto e instalação confirmada pelo Android. Consulte [ATUALIZACOES.md](ATUALIZACOES.md). O ícone foi fornecido pelo usuário; a skill ui-ux-pro-max orientou o novo layout. A referência inicial foi analisada com REA. O Floco não depende dos serviços do aplicativo original.

## Instalação

Abra `entrega/Floco-Financas.apk` no celular Android. O pacote tem assinatura própria e identificador `br.com.kat.flocofinancas`. Não substitui outros aplicativos.

## Desenvolvimento

```powershell
npm ci
npm test
npm run check
```

O atualizador tem módulo nativo; use o APK ou um development build, não o Expo Go. Compilação local: Node compatível com Expo 58, Java 21, Java 17, Android SDK 37.0, Build Tools 37.0.0, NDK 27.1.12297006 e CMake 3.22.1. O script `build-android.ps1` aceita `-JavaHome`, `-Java17Home`, `-AndroidSdk` e gera APK ARM64 com caminho curto temporário no Windows.

Repositório público: https://github.com/katsuuzin/floco-financas. **Guarde em local privado `.signing/floco-release.keystore` e `.signing/local-signing.json`.** A mesma chave é necessária para atualizar instalações existentes. Por decisão do usuário, a chave permanece somente no computador. As versões são assinadas localmente e publicadas como releases públicas; o GitHub Actions executa apenas as verificações, sem segredos de assinatura. Consulte ATUALIZACOES.md.

## Limites funcionais atuais

Leitura de notificações bancárias, OCR, importação PDF/OFX/CSV/Excel, sincronização financeira na nuvem, widgets, amortização extraordinária, SAC e comparação dedicada entre períodos ainda não foram implementados. As recorrências são geradas pelo usuário dentro do app, sem execução automática em segundo plano. Não são recursos bloqueados por PRO. Não há desbloqueio de assinatura do app original.

O backup tem formato próprio, sem compatibilidade declarada com outros apps. JSON/CSV exportados não são criptografados. A biometria protege a abertura; o armazenamento financeiro não implementa criptografia adicional. Credenciais antigas de atualização são removidas; nenhum token é necessário.

Fechamento e vencimento são de 1 a 28; o próprio dia do fechamento pertence ao ciclo corrente. Alterar datas não remapeia compras antigas. Saldo é atual, totais e pendências seguem o mês selecionado. Orçamento usa a data do lançamento, fatura usa vencimento. Metas reservam saldo sem retirar dinheiro da conta; excluí-las libera a reserva.

Status de testes e compilação: VALIDACAO.md.
