# Plano: animações na lista de compras (referência: Lemonlist)

**Estado: só planejamento. Nada foi iniciado** (sem instalar, sem baixar, sem mexer no código). Executar só quando o dono mandar.

## Ponto de partida: a origem e a licença de cada animação

O dono diz que as animações do Lemonlist são públicas e reutilizadas. Isso ainda **não está verificado**, e é o que decide o caminho. Regra do plano:

1. Para cada animação desejada, descobrir a **fonte original** (por exemplo, uma biblioteca pública de animações como o LottieFiles, com página do autor e licença).
2. Se tem fonte pública com licença que permite uso em app (e redistribuição dentro de um APK): **baixar da fonte original**, não do APK do Lemonlist. Guardar o autor, o link e a licença.
3. Se não achamos fonte pública, ou a licença não permite, ou ela é exclusiva do Lemonlist: **não usar**. Fazemos uma própria (ver "Alternativa própria").
4. Registro obrigatório em `ANIMACOES-CREDITOS.md`: nome, onde usa, autor, link, licença, data da conferência. Sem linha nesse arquivo, a animação não entra no app.

Tirar arquivos de dentro do APK de outro app só entra em cogitação se a etapa 2 não encontrar a fonte e o dono confirmar que o arquivo é de fato público. Mesmo assim, a licença precisa estar documentada.

## O que animar na lista (proposta, a decidir com o dono)

| # | Momento | Efeito | Onde |
| --- | --- | --- | --- |
| 1 | Marcar item no carrinho | caixa de seleção "desenha" o check; linha risca o nome | `ShoppingScreen.tsx`, `ShoppingTripScreen.tsx` |
| 2 | Adicionar item | item entra deslizando; ícone da categoria dá um pulo curto | `ShoppingScreen.tsx` |
| 3 | Remover item | linha encolhe e some; "Desfazer" aparece | `ShoppingScreen.tsx` |
| 4 | Lista vazia | ilustração leve (sem repetir sem parar) | `Empty` em `kit.tsx` |
| 5 | Compra finalizada | confete curto, uma vez | fim do Modo compra |
| 6 | Código lido com sucesso | check no visor | `ScanProductScreen.tsx` |
| 7 | Limite perto/estourado | barra muda de cor com transição suave | Modo compra |
| 8 | Botões em geral | afundar ao tocar (já pronto em `src/ui/motion.tsx`, falta ligar) | `kit.tsx` |

Itens 1, 3, 7 e 8 dá para fazer sem arquivo de animação nenhum (`Animated`/`LayoutAnimation` do React Native). Só 4, 5 e 6 se beneficiam de animação pronta.

## Duas formas de fazer

**A. Animações prontas (formato Lottie, JSON).** Ficam bonitas, mas pedem a biblioteca `lottie-react-native`, que é **código nativo novo**.
- Risco: o projeto proíbe `expo prebuild`. A biblioteca se liga sozinha no build do Android (autolinking), mas é preciso provar isso com um build de teste antes de usar, e conferir que `android/` (widgets, manifest, ícones) não é tocado.
- Custo: cresce o APK (poucos MB) e a pasta `node_modules`; precisa de `package.json` novo e atualização do build x86_64 e universal.
- Cada arquivo JSON deve ter poucos KB; limite sugerido de 50 KB por animação e 10 no total.

**B. Alternativa própria, sem dependência nova.** Check, entrada/saída de linha, barra e confete feitos com `Animated` e `LayoutAnimation`, desenhados por nós (com `react-native-svg` só se já existir no projeto; conferir). Sem questão de licença, sem risco de build, tamanho zero. Fica um pouco menos "rico" que Lottie.

**Recomendação:** começar pela B nos itens 1, 2, 3, 7 e 8, que são os de uso constante, e deixar A só para 4, 5 e 6 se a licença for comprovada.

## Regras para qualquer animação

- Respeitar "remover animações" do Android (`useReduceMotion` de `src/ui/motion.tsx`): sem movimento, só troca de estado.
- Nada em laço infinito (o `DESIGN.md` diz "sem animações decorativas contínuas"); animação toca uma vez e para. **Isso é uma exceção à frase de "sem deslocamento" do `DESIGN.md`: pedir aprovação do dono e atualizar o texto.**
- Tema claro e escuro: cores vêm dos tokens, nunca fixas na animação (em Lottie, trocar a cor por `colorFilters`).
- Leitor de tela: a animação nunca é a única informação; o estado continua falado ("marcado", "removido").
- Duração: até 400 ms nas ações, até 1,5 s no confete. Não pode atrasar o toque seguinte.
- Fonte 200% e telas pequenas: nada corta nem sobrepõe.

## Etapas (quando liberado)

1. **Decisão do dono:** quais dos 8 momentos; A, B ou mistura; aprovar a exceção no `DESIGN.md`.
2. **Fontes e licenças** (só se A): lista das animações com origem pública e licença; criar `ANIMACOES-CREDITOS.md`. O dono confirma o que é público.
3. **Teste de build** (só se A): instalar `lottie-react-native`, rodar `.\build-android.ps1 -Architecture x86_64`, abrir o app, conferir que `android/` não mudou (`git status`). Se falhar, voltar para B.
4. **Base de movimento:** ligar `MotionPressable` ao `kit.tsx` (depois que o Codex terminar a tarefa 3 do pacote 11, para não haver conflito no arquivo).
5. **Itens 1, 2, 3 e 7** na lista e no Modo compra, com `Animated`; teste no emulador nos dois temas e com "remover animações" ligado.
6. **Itens 4, 5 e 6** (Lottie ou próprios), um por vez.
7. **Testes:** funções de movimento e de preferência em `tests/`; testes estáticos de acessibilidade estendidos; `npm test`, `npx tsc --noEmit`, `node --test tests/security/*.test.mjs`.
8. **Fechamento:** `INVENTARIO-FUNCIONAL.md`, `DESIGN.md`, créditos. Informar o que não foi testado (celular real, TalkBack, aparelho fraco).

## Quem faz o quê

- **Claude:** decisões de movimento, teste de build, ligação em `kit.tsx` e nas telas, teste no emulador, créditos e documentação.
- **Codex (pacote próprio, depois):** testes das funções de movimento e dos testes estáticos de acessibilidade; nunca baixa nem escolhe arquivo de animação.
- **Dono:** confirmar a origem pública de cada animação e aprovar a mudança no `DESIGN.md`.

## Perguntas em aberto

1. Quais animações do Lemonlist você quer (os 8 acima ou só alguns)?
2. De onde elas vêm? Se você tem o link da página pública (ou o nome do autor), poupa a etapa 2.
3. Aceita a dependência nova `lottie-react-native` (A) ou prefere zero dependência (B)?
