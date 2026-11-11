# Teste das integrações recentes da lista de compras

Use o APK de teste, uma instalação atualizável de teste e dados fictícios. Registre a versão, o Android e se rodou no emulador ou no telefone. Para o catálogo de código de barras, prepare respostas controladas de encontrado, ausente e falha de rede.

1. **Preço sem histórico.** **Ação** — Na lista limpa, adicione Leite sem preço. **Esperado** — “Usar preços do histórico” não aparece. **Registrar** — Estado da estimativa e se foi sugerido algum valor.
2. **Preço com histórico.** **Ação** — Restaure compras sintéticas de Arroz com preço conhecido. Adicione Arroz sem preço e Leite com preço manual. Use “Usar preços do histórico”. **Esperado** — Arroz recebe o valor sugerido, Leite conserva o valor manual. **Registrar** — Preço antes/depois, origem exibida e estimativa. Repita com 500 g de um item cotado por kg para verificar o preço da porção.
3. **CSV.** **Ação** — Crie um item fictício chamado `=1+1` e outro com preço de R$ 12,34. Toque “Exportar em CSV” e abra em um destino local que mostre texto bruto. **Esperado** — Colunas separadas por `;`, centavos com vírgula e `'` antes de `=`. **Registrar** — Destino, primeira linha, célula protegida e leitura ao abrir em planilha.
4. **Corredores no Modo compra.** **Ação** — Monte pendentes de Limpeza, Padaria, Hortifrúti e Mercearia. Abra Modo compra e marque um item. **Esperado** — Hortifrúti e Padaria aparecem antes de Mercearia e Limpeza. O item marcado vai para o carrinho. **Registrar** — Ordem dos grupos, progresso, valor e rótulo falado.
5. **Limite e cores.** **Ação** — Defina limite de R$ 100,00. Teste totais estimados de R$ 84,00, R$ 85,00 e R$ 101,00. Depois apague o valor do limite e salve. **Esperado** — Estado dentro, perto em âmbar e estourado em vermelho, com texto correspondente. Campo vazio remove o limite. **Registrar** — Cores nos dois temas e persistência ao voltar.
6. **Retomar sessão.** **Ação** — Deixe a tela aberta tempo suficiente para gravar, anote o tempo e volte em menos de três horas. Repita com uma sessão de teste cujo último acesso tem exatamente três horas. **Esperado** — O primeiro cenário mantém o início. No segundo, inicia uma sessão. **Registrar** — Horários, tempo antes/depois e relógio do dispositivo.
7. **Finalizar sessão.** **Ação** — Com item no carrinho, abra “Finalizar e registrar despesa”, confirme o aviso de duplicata se aparecer e depois retorne ao Modo compra. **Esperado** — O formulário recebe o valor conhecido, o horário antigo é limpo e a próxima sessão começa do zero. **Registrar** — Valor, confirmação e tempo.
8. **Câmera negada e concedida.** **Ação** — Abra Escanear produto, negue a permissão e verifique o campo manual. Conceda a câmera nos ajustes e retorne. **Esperado** — A entrada manual funciona sem câmera e o visor aparece após conceder. **Registrar** — Caminho da permissão, retorno e estado do visor.
9. **Código manual válido e inválido.** **Ação** — Digite UPC-A fictício com dígito válido e repita com o último dígito alterado. **Esperado** — A primeira entrada abre resultado ou alternativa manual. A inválida informa o problema sem consultar o catálogo. **Registrar** — Mensagem e código normalizado.
10. **Sem internet e ausente.** **Ação** — Consulte um código válido com rede bloqueada. Repita com rede ativa e catálogo simulado sem o produto. **Esperado** — Mensagens distintas para conexão e ausência. Ambas permitem digitar o nome e revisar antes de adicionar. **Registrar** — Mensagem, tempo e ação disponível.
11. **Item duplicado.** **Ação** — Cadastre um item e escaneie um código cujo resultado simulado sugere o mesmo nome. Se a massa tiver EAN gravado, repita com UPC-A equivalente. **Esperado** — Aparece “Já existe na lista” antes de confirmar. **Registrar** — Nome comparado, código e quantidade de linhas após decidir.
12. **Migração de chaves.** **Ação** — Em uma instalação de teste da versão anterior, prepare catálogo com “Leite 1,5L”, chave antiga `leite 1 5l` e compras ligadas a dois produtos que convergem para a mesma chave. Atualize por cima e reabra duas vezes. **Esperado** — Uma entrada consolidada para a chave nova `leite 1.5l`, compras intactas e vínculos no produto mantido. **Registrar** — Contagem, pontos de preço e último preço antes/depois.

## O que o emulador não cobre

A leitura óptica ao vivo em embalagem curva, a lanterna real, a reconcessão com os fluxos específicos do fabricante e o destino de compartilhamento instalado no telefone precisam de conferência física. Emulador com leitor de tela permite ensaiar a ordem dos controles. A confirmação dos gestos, da fala e das interrupções do Android fica no aparelho.

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
