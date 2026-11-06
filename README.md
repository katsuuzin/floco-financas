# Floco Finanças — Android

Finanças pessoais offline, com o mascote enviado pelo usuário e identidade própria em amarelo e marrom. **Sem assinatura, plano PRO, anúncios ou limites comerciais** de contas, cartões, orçamentos e metas. Somente Android.

## Recursos

Contas, carteiras, receitas, despesas, transferências, pendências, busca, filtros e edição. Cartões, limite, fechamento, vencimento, parcelas em centavos e pagamento de fatura sem duplicar despesas. Orçamentos, metas com reservas, tema claro/escuro, ocultação de valores, biometria, backup JSON e CSV. Demonstração opcional com valores fictícios.

Atualizações pelo próprio app via GitHub privado, com token de leitura protegido pelo Android. Consulte [ATUALIZACOES.md](ATUALIZACOES.md). O ícone foi fornecido pelo usuário; a skill ui-ux-pro-max orientou o novo layout. A referência inicial foi analisada com REA. O Floco não depende dos serviços do aplicativo original.

## Instalação

Abra `entrega/Floco-Financas.apk` no celular Android. O pacote tem assinatura própria e identificador `br.com.kat.flocofinancas`. Não substitui outros aplicativos.

## Desenvolvimento

```powershell
npm ci
npm test
npm run check
```

O atualizador tem módulo nativo; use o APK ou um development build, não o Expo Go. Compilação local: Node compatível com Expo 58, Java 21, Java 17, Android SDK 37.0, Build Tools 37.0.0, NDK 27.1.12297006 e CMake 3.22.1. O script `build-android.ps1` aceita `-JavaHome`, `-Java17Home`, `-AndroidSdk` e gera APK ARM64 com caminho curto temporário no Windows.

Repositório privado: https://github.com/katsuuzin/floco-financas. **Guarde em local privado `.signing/floco-release.keystore` e `.signing/local-signing.json`.** A mesma chave é necessária para atualizar instalações existentes. Por decisão do usuário, a chave permanece somente no computador. As versões são assinadas localmente e publicadas como releases privadas; o GitHub Actions executa apenas as verificações, sem segredos de assinatura. Consulte ATUALIZACOES.md.

## Limites funcionais atuais

Leitura de notificações bancárias, OCR, PDF/OFX, sincronização financeira na nuvem, widgets e recorrências automáticas ainda não foram implementados. Não são recursos bloqueados por PRO. Não há desbloqueio de assinatura do app original.

O backup tem formato próprio, sem compatibilidade declarada com outros apps. JSON/CSV exportados não são criptografados. A biometria protege a abertura; o armazenamento financeiro não implementa criptografia adicional. O token GitHub fica separado no SecureStore e não entra no backup.

Fechamento e vencimento são de 1 a 28; o próprio dia do fechamento pertence ao ciclo corrente. Alterar datas não remapeia compras antigas. Saldo é atual, totais e pendências seguem o mês selecionado. Orçamento usa a data do lançamento, fatura usa vencimento. Metas reservam saldo sem retirar dinheiro da conta; excluí-las libera a reserva.

Status de testes e compilação: VALIDACAO.md.
