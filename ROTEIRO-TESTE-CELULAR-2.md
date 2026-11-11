# Teste no celular real da lista de compras

Complementa [o primeiro roteiro de celular](ROTEIRO-TESTE-CELULAR.md) e [o roteiro de emulador](ROTEIRO-TESTE-EMULADOR-LISTA.md). Use um aparelho de teste, um backup fictício, um QR impresso com chave sintética e a versão do APK a verificar. Registre modelo, Android, APK e configuração de acessibilidade. Para a prévia fiscal e a queda de rede, use um cenário de teste controlado. Uma chave sintética pode ser reconhecida localmente e não gera uma nota na SEFAZ.

1. **QR com luz e papel ruins.** **Ação** — Leia o QR impresso com luz lateral fraca e depois com o papel amassado, mudando distância e lanterna. **Esperado** — Quando a câmera consegue focar, a mesma chave é reconhecida uma vez. A falha de leitura deixa disponíveis câmera, foto e colagem. **Registrar** — Luz, distância, tempo, reflexo, leituras duplicadas e efeito da lanterna.
2. **Recusar e reconceder câmera.** **Ação** — Recuse a permissão na primeira abertura. Use a alternativa por colagem. Depois, conceda nas configurações do Android e retorne ao app. **Esperado** — A recusa mantém alternativas acessíveis. A câmera volta a funcionar após conceder. **Registrar** — Texto exibido, retorno dos ajustes, tempo de atualização e funcionamento após reiniciar.
3. **TalkBack na lista e no Modo compra.** **Ação** — Com TalkBack ativo, navegue por gestos esquerda/direita e explore pelo toque. Dê toque duplo para adicionar, editar, marcar, remover e desfazer. **Esperado** — A fala identifica nome, quantidade, preço e estado. Marcar move a linha sem perder o lugar na navegação. **Registrar** — Ordem, frase ouvida, ações que exigem tentativa extra e foco após mudança.
4. **TalkBack na colagem, histórico, ritmo e backup.** **Ação** — Navegue pelos campos e botões de colar lista, prévia e remoção de candidato. No histórico, mude de aba, abra uma compra e uma sugestão de ritmo. Inicie e cancele restaurar backup. **Esperado** — Os controles anunciam nome, papel e estado, as contagens são ouvidas e o cancelamento devolve o foco. **Registrar** — Leitura de valores, confirmação, estado vazio e foco restaurado.
5. **TalkBack no leitor fiscal.** **Ação** — Abra o leitor, acione lanterna, cole uma chave sintética inválida e depois uma válida. Use o cenário controlado para passar por carregamento, prévia e conferência. **Esperado** — Erro e resultado têm anúncio distinto. As caixas da conferência informam o item, o estado e a diferença de quantidade. **Registrar** — Falas repetidas ou ausentes, tempo do anúncio e acesso à ação Voltar.
6. **Fonte a 200% com exibição grande.** **Ação** — Aumente fonte e tamanho de exibição do Android. Em retrato, teste itens longos, valores, ações da barra inferior, abas, conferência e campos com teclado aberto. Repita nos dois temas. **Esperado** — Conteúdo essencial continua legível e ações continuam alcançáveis por rolagem. **Registrar** — Corte, sobreposição, rolagem lateral, contraste sob luz real e controle encoberto pelo teclado.
7. **Modo avião durante a consulta.** **Ação** — Inicie a consulta controlada e ligue o modo avião durante o carregamento. Aguarde o erro, desligue e use Tentar de novo. **Esperado** — A consulta sai do estado de espera, oferece recuperação e deixa a compra sem registro até confirmação. **Registrar** — Tempo até o erro, mensagem, comportamento do Wi-Fi e compra duplicada após retomar.
8. **Voltar do Android em cada tela.** **Ação** — Use gesto e, se disponível, o botão físico/virtual Voltar na lista com teclado, painel de colagem, Modo compra, leitor, carregamento, prévia, conferência, histórico, produto e diálogo de restauração. **Esperado** — O teclado fecha primeiro quando aberto. O app volta ao ponto anterior sem salvar uma ação pendente. **Registrar** — Destino, foco, rascunho, confirmação e consulta que permaneça em andamento.
9. **Rotação.** **Ação** — Gire o aparelho na lista, durante a câmera, na prévia fiscal e no Modo compra. Repita com rotação automática bloqueada. **Esperado** — O fluxo respeita a orientação definida para o app. Se houver rotação, mantém conteúdo, foco e seleção. **Registrar** — Orientação efetiva, relayout, câmera, teclado, perda de rascunho ou leitura duplicada.
10. **Economia de bateria e bloqueio.** **Ação** — Ative a economia de bateria, deixe o aparelho bloquear e volte durante uma consulta de teste. **Esperado** — O app retoma a consulta ou apresenta erro e nova tentativa. **Registrar** — Estado antes/depois, tempo, brilho e efeito sobre câmera e rede.
11. **Notificação real.** **Ação** — Crie um lembrete local de teste disponível no APK para poucos minutos depois. Verifique com tela bloqueada, som/vibração e permissão de notificações concedida e negada. Quando os alertas de compra estiverem integrados, repita com horário silencioso. **Esperado** — A notificação aparece no cenário autorizado e a abertura leva ao destino previsto. O horário silencioso é respeitado quando houver essa função na versão. **Registrar** — Hora prevista e recebida, visibilidade na tela bloqueada, economia de bateria e navegação ao tocar.
12. **Modo compra em segundo plano por 30 minutos.** **Ação** — Marque dois itens com e sem preço, mande o app para segundo plano e deixe o aparelho bloqueado por 30 minutos. Volte pelo ícone e pela tela de recentes em duas rodadas. **Esperado** — Carrinho e preços permanecem. Confira a continuidade do tempo da sessão conforme a versão instalada. **Registrar** — Se o processo reiniciou, tempo exibido, foco, carrinho, preço e possibilidade de terminar a compra.

| Passo | Passou/Falhou | Observação |
| --- | --- | --- |
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |
| 10 | | |
| 11 | | |
| 12 | | |
