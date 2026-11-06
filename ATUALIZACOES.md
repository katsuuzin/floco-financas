# Atualizações pelo Floco Finanças

Repositório **privado**: https://github.com/katsuuzin/floco-financas. A versão inicial v1.0.0 usa o APK assinado e validado localmente; o workflow publica as tags posteriores.

No app, abra **Seu Floco → Abrir atualizações**. Informe `usuario/repositorio` e um token fine-grained do GitHub com acesso somente a esse repositório e **Contents: Read-only**. Salve e toque em **Verificar atualizações**. A credencial é guardada com Expo SecureStore/Android Keystore; não é incluída nos backups financeiros, no APK nem no repositório.

O atualizador consulta a última release estável quando você solicita. A release deve ter tag `v1.2.3`, conter um asset chamado **Floco-Financas.apk** e disponibilizar o digest SHA-256 do GitHub. O download usa a API autenticada; o token só é enviado a `api.github.com`, nunca aos hosts de redirecionamento. O APK é verificado por tamanho, SHA-256, identificador do aplicativo, assinatura e versionCode crescente. Só então o instalador do Android é aberto. A primeira instalação por esta fonte pode exigir a permissão “Permitir desta fonte”. O Android sempre pede confirmação; não há instalação silenciosa.

## Publicar versões depois

1. Crie o repositório privado e envie o código, respeitando `.gitignore`.
2. Guarde a chave original **.signing/floco-release.keystore** e a senha em **.signing/local-signing.json** em local privado. Não envie esses arquivos ao GitHub. Sem a mesma chave, novos APKs não poderão atualizar a instalação existente.
3. Nas Actions Secrets do repositório, configure `ANDROID_KEYSTORE_BASE64` com o keystore codificado em base64 e `ANDROID_KEYSTORE_PASSWORD` com sua senha. O alias é `floco`.
4. Faça uma tag estável, por exemplo `v1.0.1`, e envie a tag. O workflow `.github/workflows/release-android.yml` executa verificações, compila e publica o APK na release privada. A primeira execução depende de Actions habilitado e das credenciais de assinatura configuradas.
5. No aplicativo, consulte e instale a atualização. A versão inicial tem versionCode 1; o workflow usa `GITHUB_RUN_NUMBER + 100`. Mantenha esse número crescente, inclusive se migrar de repositório.

As finanças funcionam offline. Somente consultas e downloads de atualizações exigem rede. Expiração ou revogação do token afeta apenas as atualizações, sem bloquear contas, cartões, lançamentos, metas ou orçamentos. O atualizador não envia os registros financeiros ao GitHub.

O fluxo de atualização privada foi implementado, mas uma atualização real entre releases depende do futuro repositório, token e release assinada; não foi simulada como sucesso nesta entrega.
