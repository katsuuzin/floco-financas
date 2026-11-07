# Atualizações do Floco Finanças

Repositório público: https://github.com/katsuuzin/floco-financas.

## No aplicativo (a partir de 1.1.1)

Não precisa de conta GitHub, login, token ou chave. Abra **Mais → Abrir atualizações**. Use **Verificar atualizações** e, quando houver uma versão nova, **Atualizar aplicativo**. O botão baixa, verifica o APK e abre o instalador. Se necessário, permita instalações desta fonte e volte para **Instalar atualização**. Confirme a instalação no Android; os dados são preservados.

A verificação automática vem ligada, pode ser desligada e consulta ao abrir/voltar ao app, respeitando intervalo de 15 minutos. Enquanto o aplicativo está ativo, novas consultas acontecem a cada 15 minutos; um aviso informa a nova versão. Não há verificação quando o app está fechado nem instalação silenciosa. Limitações de rede e do GitHub podem adiar a detecção; a consulta manual continua disponível.

**Quem usa 1.1.0 ou anterior deve instalar o APK 1.1.1 uma vez pelo link público.** Essas versões antigas ainda pedem token. A partir de 1.1.1 as credenciais antigas são removidas do SecureStore e não são usadas. Nenhum registro financeiro é enviado nas consultas/downloads.

## Releases e verificação

Tags estáveis no formato v1.2.3; asset **Floco-Financas.apk**. O GitHub fornece SHA-256 e tamanho. Antes de instalar, o módulo Android valida tamanho, hash, identificador do app, assinatura e versionCode crescente. O APK é baixado por HTTPS da release pública e somente redirecionamentos GitHub permitidos são aceitos.

## Assinatura somente no computador

A chave privada e a senha permanecem somente no computador. Não são enviadas ao GitHub nem aos Secrets. Guarde `.signing/floco-release.keystore` e `.signing/local-signing.json` em local privado; são excluídos do Git. Todas as atualizações devem usar a mesma chave. Tornar o projeto público não torna a chave pública.

Compile e assine localmente. Publique somente código, APK assinado e SHA-256. O workflow executa testes e TypeScript, sem assinar na nuvem. Versões: 1.0.0/code 1; 1.0.1/code 2; 1.1.0/code 3; 1.1.1/code 4. Incremente semver e versionCode a cada nova versão. `scripts/prepare-release.mjs` aceita RELEASE_TAG e RELEASE_BUILD_NUMBER; atualize o projeto nativo correspondente e compile com `build-android.ps1`.

As finanças continuam funcionando offline, mesmo quando não é possível verificar ou baixar uma atualização.
