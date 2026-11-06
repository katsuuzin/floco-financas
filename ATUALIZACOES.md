# Atualizações do Floco Finanças

Repositório privado: https://github.com/katsuuzin/floco-financas.

## No aplicativo

Abra **Mais → Abrir atualizações**. O repositório já vem preenchido. Informe um token fine-grained do GitHub com acesso somente a esse repositório e **Contents: Read-only**. A credencial fica protegida pelo Android Keystore/SecureStore; não entra no APK, no código ou no backup financeiro.

O app consulta a última release estável somente quando solicitado. A tag deve usar `v1.2.3`; o asset se chama **Floco-Financas.apk**. O download exige digest SHA-256 do GitHub, verifica tamanho, identificador do app, assinatura e versionCode crescente. O token só é enviado a api.github.com, nunca aos hosts de redirecionamento. A instalação é confirmada no instalador do Android, com permissão para esta fonte quando necessária.

## Assinatura somente no computador

Por decisão do usuário, a chave privada e a senha permanecem no computador. Não são enviadas aos GitHub Secrets. Guarde `.signing/floco-release.keystore` e `.signing/local-signing.json` em local privado e mantenha a mesma chave nas versões seguintes. Esses arquivos estão excluídos do Git.

As novas versões são compiladas e assinadas localmente. Depois são enviados ao GitHub apenas o código, o APK assinado e seu SHA-256, em releases privadas. O workflow valida testes e TypeScript; não compila nem assina na nuvem. A atualização pelo app continua usando essas releases.

A versão 1.0.0 usa versionCode 1; a versão 1.0.1 usa versionCode 2. Incremente versão semântica e versionCode em cada atualização. O script `scripts/prepare-release.mjs` aceita RELEASE_TAG e RELEASE_BUILD_NUMBER; em seguida gere o projeto nativo quando necessário e compile com `build-android.ps1`.

As finanças funcionam offline. Só consultas e downloads de atualização usam rede. Expiração do token afeta apenas esse serviço, sem bloquear os recursos financeiros. A atualização real entre releases depende do token de leitura configurado pelo usuário no dispositivo.
