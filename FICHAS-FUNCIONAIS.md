# Fichas funcionais — auditoria de 9/11/2026

Observado no Kontto 1.0.83 (emulator-5554, conta sem PRO), só com dados fictícios: conta com saldo de R$ 1.500, caixinha "Viagem teste", meta "Notebook teste", orçamento "Mercado teste", cartão "Cartao teste" com compra em 3×, financiamento "Carro teste". Capturas e textos brutos ficam em `analysis/kontto-1.0.83/telas/`, que não vai para o Git. O inventário de rotas está em `analysis/kontto-1.0.83/INVENTARIO-ROTAS.md`.

Cada ficha descreve a função com palavras nossas, para o Floco reimplementar com a identidade dele. Não é cópia de texto, layout nem código.

Marcação de origem:
- **Observado:** visto na tela durante a auditoria.
- **Deduzido:** inferido do texto da tela ou de telas PRO que só mostram a apresentação.
- **Desconhecido:** não deu para ver.

O status do Floco vem de leitura do código, sem teste: ✅ tem · 🟡 parcial · ❌ falta · ❔ a confirmar.

---

## O6 — Ajustar saldo da conta ✅ (feito em 9/11/2026, `src/adjust.mjs`)

**Regras do Floco (nossas, fecham o que a observação deixou em aberto):**
- Entrada: **Editar conta › Ajustar saldo**. A tela mostra o saldo atual e pede o **saldo real**. Há uma chave "saldo negativo", porque o teclado decimal do Android não tem o sinal de menos. A diferença aparece ao vivo.
- Diferença = saldo real − saldo atual, só com lançamentos **confirmados** (pendentes não entram). Diferença zero é recusada com aviso.
- **Saldo real maior** → entrada. **Saldo real menor** → saída. Os rótulos mudam: "receita" ou "despesa".
- Os três destinos viram um lançamento marcado `adjustment`:
  1. **Receita/despesa:** conta em relatórios e totais, com categoria à escolha (padrão "Outros").
  2. **Só ajustar:** usa a marca `ignored` que já existe (fica no saldo e fora de relatórios, totais, orçamentos e análise).
  3. **Transferência:** exige uma segunda conta. Saldo maior → o dinheiro veio dela; saldo menor → foi para ela. Os totais do mês não mudam.
- O ajuste aparece no extrato com a etiqueta **Ajuste** (e **Fora da análise** no "só ajustar"). Não tem "Editar", porque editar apagaria a marca; para corrigir, exclua (vai para a lixeira) e ajuste de novo.
- Data padrão é hoje; motivo é opcional e vira a descrição.
- **Aceite verificado:** 8 testes automatizados (`tests/adjust.test.mjs`) e, no emulador, os três destinos. "Só ajustar": saldo 12.357,10 → 12.000,00 com Despesas do mês intactas. "Transferência": +191,90 numa conta e −191,90 na outra, saldo total igual. "Receita": Receitas do mês +100,00.

*Observação original, mantida:*

- **O que faz:** corrige o saldo de uma conta para o valor real informado pelo usuário e pergunta de onde veio a diferença.
- **Regras:**
  - Diferença = saldo real informado − saldo atual. *Observado:* de −88 para 1.500, a diferença foi de R$ 1.588.
  - Três destinos para a diferença:
    1. **Lançar como receita:** vira entrada e conta nos relatórios. Categoria opcional.
    2. **Apenas ajustar:** corrige o saldo sem entrar nos relatórios nem nos totais do mês.
    3. **Foi transferência:** a diferença veio de outra conta do usuário.
  - O valor usa o teclado de cálculo. Tem data do ajuste e motivo opcional.
- **Estados:** o ajuste aparece no extrato da conta como uma linha própria, com o valor da diferença. *Observado:* com "Apenas ajustar", o resumo do mês continuou com receitas de R$ 0,00.
- **Edição/exclusão:** é um lançamento do extrato; edição e exclusão seguem a regra dos lançamentos. *Deduzido*.
- **Persistência:** lançamento com um tipo de ajuste marcado (o backup do original tem um campo `adjustmentType`).
- **Aceite:**
  - Com "Apenas ajustar", o saldo vai ao valor informado e receitas/despesas do mês não mudam.
  - Com "Lançar como receita", a receita do mês sobe pela diferença.
  - Com "Foi transferência", o saldo da outra conta cai pela diferença.

## O7 — Detalhe da conta 🟡❔

- **O que faz:** mostra uma conta com o saldo dela, ações rápidas e o extrato do mês.
- **Regras:**
  - Sem caixinhas, mostra só o **Saldo**.
  - Com caixinhas, mostra **Disponível** como número principal, e abaixo o **Saldo total** e o **Reservado**. Disponível = Saldo total − Reservado. *Observado:* 1.500 − 400 = 1.100.
  - Ações: Relatório (PRO, ver O8), Ajustar saldo (O6) e Caixinha (lista e cria caixinhas desta conta).
  - Extrato do mês com navegação, ordem invertível (mais antigos ou mais novos primeiro), busca na lista, "marcar como pendente" em cada linha e botão "nova transação nesta conta".
  - O resumo do mês (+ receitas · − despesas) ignora ajustes "apenas ajustar" e movimentos de caixinha.
- **Estados:** conta com e sem caixinha; conta arquivada (vista na F1).
- **Edição/exclusão:** "Editar conta" no topo. Arquivar e excluir já são O1.
- **Persistência:** nada além de O1. O reservado é a soma das caixinhas da conta.
- **Aceite:** criar uma caixinha de R$ 400 numa conta de R$ 1.500 mostra Disponível R$ 1.100, Saldo total R$ 1.500 e Reservado R$ 400.

## O8 — Relatório por conta e por caixinha *(PRO, deduzido)* 🟡

- **O que faz:** relatório de uma conta ou caixinha no mês: gastos por categoria, comparação com o mês anterior e PDF. No original só aparece o paywall.
- **Regras:** *desconhecidas*. Fica decisão nossa: reaproveitar o relatório personalizado (R2) com o filtro da conta já aplicado.
- **Aceite:** abrir pelo detalhe da conta (O7) ou da caixinha (P3) já filtrado; a soma bate com o extrato daquela conta no mês.

## P3a — Caixinha: rendimento, resgate e opções 🟡 (rendimento feito em 9/11/2026, `registerYield` em `src/goals.mjs`)

**Regras do Floco para o rendimento (nossas):**
- Botão **Registrar rendimento** na caixinha com dinheiro guardado. Dois modos: **quanto rendeu** ou **saldo atual da caixinha** (o rendimento é a diferença; precisa ser maior que o guardado). A prévia mostra o novo valor da caixinha.
- O rendimento vira uma **receita confirmada** na conta (categoria "Outros", descrição "Rendimento · nome") e uma entrada na reserva. Os dois sobem juntos, então o Disponível da conta fica igual. A receita **conta nos relatórios**, porque é dinheiro ganho.
- A conta é a que mais guarda dessa caixinha; se houver mais de uma, o usuário escolhe. Conta sem reserva da caixinha é recusada.
- O lançamento leva a marca `boxYield`. Ele não pode ser editado nem excluído pelo extrato; o caminho é **Desfazer** na caixinha, que remove a receita e a parte da reserva. Se esse dinheiro já foi retirado, o desfazer é recusado até guardar o valor de volta.
- O histórico da caixinha ganhou o tipo `yield`, e "Movimento por mês" mostra "rendeu". O backup aceita o novo tipo.
- Excluir a caixinha mantém a receita já lançada (o dinheiro foi ganho).
- **Ainda não feito nesta ficha:** reserva de emergência, limite garantido do cartão e "já guardado sai do saldo" na criação. O resgate já existia (retirar).
- **Aceite verificado:** 6 testes (`tests/goals.test.mjs`) e, no emulador, +100,00 numa caixinha: saldo total +100,00, Receitas +100,00, Disponível das contas igual; Desfazer devolveu tudo ao ponto de partida.

*Observação original, mantida:*

- **O que faz:** registra quanto a caixinha rendeu, resgata dinheiro de volta para o Disponível e configura o papel da caixinha.
- **Regras de rendimento:**
  - Dois modos: informar **quanto rendeu**, ou informar o **saldo atual** e o app calcula a diferença. *Observado*.
  - O rendimento soma à caixinha **e** ao saldo total da conta. O Disponível não muda. *Observado:* caixinha de 400 → 412,50; Saldo total 1.500 → 1.512,50; Disponível ficou em 1.100.
  - O percentual atingido e o "falta" são recalculados (13% → 14%; falta 2.600 → 2.587,50).
- **Regras de resgate:**
  - O dinheiro não sai da conta: só deixa de ficar separado e volta para o Disponível.
  - Atalho "Tudo" preenche o valor guardado inteiro. Observação opcional.
- **Regras de criação:**
  - "Já guardado" tem a opção **De onde vem**: do saldo da conta, que reduz o Disponível. A prévia mostra o novo Disponível.
  - **Reserva de emergência:** marca a caixinha como colchão; entra no fator "reserva" da saúde financeira (F8a).
  - **Limite garantido:** a caixinha soma ao limite de um cartão (cartão com garantia). *Deduzido do texto; não testado.*
  - Prazo opcional, que pode ser removido.
- **Estados:** ativa, arquivada. O histórico lista "Guardado", "Rendimento" e "Resgate", com data e valor.
- **Edição/exclusão:** menu com editar, arquivar e excluir caixinha. Cada movimento do histórico pode ser excluído.
- **Persistência:** movimentos da caixinha, cada um com tipo (guardar, render, resgatar), data, valor e observação.
- **Aceite:**
  - Rendimento de 12,50 numa caixinha de 400 numa conta de 1.500 deixa a caixinha em 412,50, o Saldo total em 1.512,50 e o Disponível em 1.100.
  - Excluir esse movimento desfaz os três números.

## P2a — Meta: depósito, previsão, concluir e transformar 🟡 (depósitos, previsão e concluir/reabrir feitos em 9/11/2026, `src/goals.mjs`)

**Regras do Floco (nossas):**
- **Depositar** na meta: valor, data e observação; só soma ao progresso, sem tocar em nenhuma conta. Meta arquivada recusa depósito. Cada depósito entra no histórico (`moves`) e pode ser excluído, devolvendo o progresso ao que era.
- **Corrigir progresso** (antes "Atualizar progresso"): continua definindo o total, mas a diferença vira um movimento de **ajuste** com sinal no histórico. Ajuste não entra na média.
- **Previsão:** média por mês = total depositado ÷ meses desde o primeiro depósito até o mês de hoje (mínimo 1). Meses restantes = faltante ÷ média, **arredondado para cima**; a data é hoje + esses meses. Exemplo conferido: 800 de 5.000, falta 4.200 → 6 meses (05/2027).
- **Prazo:** com prazo, a tela diz "dentro do prazo" ou "passa do prazo". Quando passa, mostra quanto guardar por mês para chegar a tempo (faltante ÷ meses até o prazo, para cima).
- **Concluir/Reabrir:** concluir marca a meta como feita mesmo sem atingir o valor e mostra "Concluída em"; reabrir desfaz sem perder depósitos. Valor atingido não conclui sozinho.
- Backup valida o histórico (tipo, valor, data) e a data de conclusão.
- **Ainda não feito:** "Transformar em caixinha" e a edição de prazo pela tela da meta além do formulário existente.
- **Aceite verificado:** 8 testes (`tests/goals.test.mjs`) e, no emulador: meta de 5.000 com prazo em 02/2027, depósito de 800 → média 800, previsão de 6 meses, passa do prazo, 1.400 por mês; concluir/reabrir; excluir o movimento devolveu "falta 5.000".

*Observação original, mantida:*

- **O que faz:** acompanha um objetivo sem mexer em saldo de conta.
- **Regras:**
  - O depósito só marca progresso, sem tocar em nenhuma conta. Tem valor e observação.
  - **Média/mês:** traço enquanto não há depósito. Depois do primeiro, aparece **Previsão** em meses. *Observado:* falta 4.200 com depósitos de 800 → "6 meses", ou seja, arredonda para cima falta ÷ média mensal.
  - O prazo é exibido como mês/ano.
  - **Concluir** marca a meta como concluída mesmo sem atingir o valor; vira **Reabrir**. *Observado*.
  - **Transformar em caixinha:** passa a reservar dinheiro numa conta. *Deduzido; não executado*.
- **Estados:** em andamento, concluída.
- **Edição/exclusão:** editar meta, transformar em caixinha, excluir meta.
- **Persistência:** histórico de depósitos (data, valor, observação), status concluída e data de conclusão.
- **Aceite:**
  - Meta de 5.000 com um depósito de 800 mostra 16%, falta 4.200 e previsão de 6 meses.
  - Concluir e reabrir preserva os depósitos.
  - Nenhum saldo de conta muda.
- **Floco:** hoje o progresso da meta é um valor único informado à mão (`setGoalProgress`), sem histórico de depósitos, previsão nem concluir/reabrir.

## P1a — Detalhe do orçamento e saldo previsto 🟡❔

- **O que faz:** mostra um orçamento no ciclo e o impacto dele no saldo previsto.
- **Regras:**
  - Lista: orçado e gasto do mês, e por orçamento "gasto / teto" com o restante.
  - Detalhe: orçado, gasto e restante; gráfico dos **últimos 6 meses** com a linha do teto; mês "sem orçamento" quando ele não existia; legenda do ciclo em curso ("até dia X"); lista das transações que consumiram o orçamento.
  - **Considerar no saldo previsto:** com a opção ligada, o que **ainda falta gastar** do orçamento é descontado do saldo previsto da Home, marcado com *. Lançamentos consomem o orçamento sem descontar de novo. Se o orçamento estourar, conta só o que foi gasto. *Observado no texto de ajuda.*
  - A mesma categoria pode estar em mais de um orçamento.
- **Estados:** dentro do teto, estourado, ciclo em curso.
- **Edição/exclusão:** "Editar orçamento" no detalhe; histórico em tela própria (F1).
- **Persistência:** orçamento com categorias, subcategorias, origem (contas/cartões), ciclo, dia de início e opção de saldo previsto.
- **Aceite:**
  - Orçamento de 600 com 88 gasto e a opção ligada reduz o saldo previsto em 512.
  - Com 700 gasto, reduz só os 700 já lançados, sem desconto extra.

## O3a — Fatura do cartão: tela por cartão, pagamento parcial, ajuste e análise 🟡 (mínimo, ajuste do total, análise e escolha da fatura feitos em 9/11/2026, `src/invoices.mjs`)

**Regras do Floco (nossas; o original não mostra fórmula):**
- **Pagamento mínimo estimado** = 15% do total da fatura, arredondado para cima, nunca acima do que falta pagar; zero sem saldo. É uma estimativa e a tela diz para conferir no banco. Aparece na fatura do cartão e no pagamento, com o botão **Usar** que preenche o valor.
- **Ajustar total da fatura:** o total do banco substitui a soma das compras só naquele mês (`card.manualTotals`). Restante a pagar, mínimo, widgets, lembretes e projeções passam a usar o total ajustado. O total não pode ficar abaixo do já pago. Campo vazio remove o ajuste. Compras lançadas depois não mudam o total ajustado; a diferença aparece como "Ajuste manual".
- **Análise da fatura** por **categoria** ou **tag**, com valor e % por item. Estorno abate. Compra com várias tags aparece em cada uma (a soma pode passar do total, e a tela avisa). Compra sem tag cai em "Sem tag". Com total ajustado, a diferença vira a linha "Ajuste manual", e a soma bate com o total.
- **Escolher a fatura da compra:** no formulário de despesa no cartão, "Entra na fatura de" com setas para a fatura anterior ou a próxima da automática. A escolha vale para a compra e as parcelas acompanham mês a mês; ao editar, a escolha é mantida. Sem escolha, vale a regra de fechamento do cartão.
- **Fatura parcial no vencimento:** o restante continua em aberto na mesma fatura até ser pago (decisão nossa: o Floco não gera juros nem rola o saldo sozinho).
- **Ainda não feito:** seleção de vários itens da fatura e a faixa com três competências lado a lado.
- **Aceite verificado:** 7 testes (`tests/invoices.test.mjs`) e, no emulador: fatura de 312,40 → mínimo 46,86; ajuste para 400,00 → mínimo 60,00, "+87,60", análise com "Ajuste manual"; compra de 50,00 enviada à fatura anterior somou 362,40 em novembro com o total ajustado mantido.

*Observação original, mantida:*

- **O que faz:** mostra a fatura de um cartão por competência e permite pagar, ajustar o total, analisar e importar.
- **Regras:**
  - Faixa com três competências (anterior, atual, próxima), cada uma com status e valor. Mostra vencimento e período de compras ("de 06/nov a 05/dez" para fechamento no dia 5).
  - **Compra parcelada:** cada parcela cai na fatura do seu mês. *Observado:* 450 em 3× → 150 em dez, 150 em jan…
  - No formulário de compra, "Entra na fatura de X" com botões **fatura anterior/próxima** para forçar a competência.
  - **Parcelar:** número de parcelas, **parcela atual k de N** (para compras já em andamento) e valor informado como **total** ou **da parcela**, com prévia "N× de R$ X".
  - **Pagar fatura:**
    - Propõe o restante; mostra o total e o **pagamento mínimo** (*observado:* R$ 50 numa fatura de R$ 150; fórmula *desconhecida*).
    - Data e conta de débito.
    - Pagar menos que o total deixa a fatura **parcial**, com "R$ X pagos · restam R$ Y" e o número de pagamentos.
  - **Ajustar total:** substitui o valor da fatura por um valor manual (para bater com o banco).
  - **Análise:** composição da fatura por categorias ou tags, com a maior fatia.
  - **Selecionar:** seleção de vários itens da fatura. Ações *desconhecidas*.
  - **Importar:** PDF da fatura do banco (C1/F2).
- **Estados:** sem lançamentos, aberta, parcial, paga, fechada. O que acontece com o restante da parcial no vencimento é *desconhecido* (o original guarda "ação do restante" e "rolou da fatura"; não deu para avançar o tempo).
- **Edição/exclusão:** pagamentos e ajuste manual ficam registrados na fatura.
- **Persistência:** fatura por cartão e mês com abertura, fechamento, vencimento, total, total manual, pago, status e destino do restante; pagamentos ligados à fatura.
- **Aceite:**
  - Compra de 450 em 3× num cartão que fecha dia 5, feita em 9/nov, gera 150 nas faturas de dez, jan e fev.
  - Pagar 100 de uma fatura de 150 deixa status parcial, restante 50, e o saldo da conta cai 100.
- **Floco:** já tem pagamento parcial (`payInvoice`). Faltam mínimo, ajuste manual do total, análise da fatura e escolha da competência ❔.

## D1a — Detalhe e edição do financiamento 🟡 (abatimento, histórico e prévia feitos em 9/11/2026, `src/contracts.mjs`)

**Regras do Floco (nossas):**
- **Abater** (antes "Amortizar") ganhou três coisas:
  - **Sem movimentar conta:** o abatimento vale para o contrato, mas nenhuma conta é debitada e nenhuma despesa é criada. Serve para FGTS e outros recursos de fora.
  - **Novo saldo devedor editável:** campo opcional. Vazio = saldo atual − valor pago. Preenchido = o valor do banco, que precisa ser maior que zero e menor que o saldo atual (para zerar, use Quitar). Com o saldo informado, o valor pago pode ser diferente do abatimento real.
  - **Histórico de abatimentos:** cada abatimento fica no contrato (`amortizations`) com data, valor, modo (prazo ou parcela), saldo antes e depois, se foi sem conta e a observação. Aparece no detalhe do contrato, do mais novo para o mais antigo. O backup mantém o histórico.
- **Prévia "vai ficar assim"** em Abater e em Trocar cálculo: parcelas restantes, data da última, total a pagar em parcelas e saldo devedor, calculados ao vivo sobre uma cópia do estado. Se o valor for inválido, a tela mostra o motivo.
- **Correção junto:** o abatimento com conta era contado como "parcela paga" no progresso ("1 de 14 pagas"). Agora só conta como pagamento extra em "Já pago".
- **Ainda não feito nesta ficha:** editar o contrato (hoje só se troca o cálculo), reagendar as parcelas por nova data, mudar o total de parcelas antes de pagar, e exportar PDF do contrato. O Floco não tem tela "Editar contrato", então a prévia ficou nas duas telas que alteram o contrato.
- **Aceite verificado:** 8 testes novos (`tests/contracts.test.mjs`) e, no emulador, um contrato de R$ 850 em 14 parcelas: abatimento de 2.550,00 sem conta (saldo das contas igual, 14 → 11 parcelas, prévia correta) e abatimento de 1.000,00 com conta e saldo informado de 8.200,00 (conta −1.000,00, saldo devedor exato). O histórico mostrou os dois.

*Observação original, mantida:*

- **O que faz:** acompanha um contrato parcela a parcela e permite editar, pagar, abater e quitar.
- **Regras:**
  - Cabeçalho: "falta pagar em parcelas" (soma das pendentes), quantas pagas, quantas restam e até quando, próxima parcela (número de N, mês, valor, "vence hoje"/"em X dias"), e "já pago".
  - Lista **A vencer** e **Pagas**, cada parcela com "marcar como concluída/pendente".
  - **Pagar parcela:** valor, data, conta e **juros e multa** por atraso nesta parcela.
  - **Editar contrato:**
    - O novo valor vale só para as parcelas a vencer; as pagas ficam como estão.
    - Mudar a data reagenda as parcelas a vencer a partir dela.
    - O **total de parcelas** só pode mudar enquanto nenhuma foi paga.
    - Prévia "vai ficar assim": parcelas restantes, última data e total a pagar.
  - **Abater (pagamento extra):**
    - Valor e data.
    - **Reduzir prazo:** remove as últimas parcelas; o valor mensal não muda. O usuário informa quantas restam.
    - **Reduzir parcela:** diminui o valor das pendentes; o prazo não muda. O usuário informa o novo valor.
    - **Novo saldo devedor:** sugerido como pendentes − valor pago, sem desconto de juros, e **editável** para bater com o banco.
    - **Sem movimentar conta:** pago com FGTS ou outro recurso de fora; entra só no histórico do contrato.
  - **Histórico de abatimentos** no detalhe.
  - Menu: editar, arquivar/quitar, excluir contrato. **Exportar PDF** do contrato.
- **Estados:** ativo, quitado/arquivado. Parcela: a vencer, vencida, paga, paga com acréscimo.
- **Persistência:** contrato, parcelas como lançamentos ligados (número k/N), abatimentos com modo, valor, saldo informado e flag "sem conta".
- **Aceite:**
  - Contrato de 850 com parcelas 131 a 144: pagar a 131 deixa 13 restantes e "falta pagar" de 11.050.
  - Abater em "reduzir prazo" remove parcelas do fim.
  - Com "sem movimentar conta", nenhum saldo muda.
- **Floco:** já tem prazo/parcela em `extraAmortization`, juros por atraso e quitação. Faltam "sem movimentar conta", o saldo devedor editável, o histórico de abatimentos, a prévia na edição, o reagendamento pela data e o PDF ❔.

## F8a — Saúde financeira: fatores e histórico 🟡

- **O que faz:** gera uma nota de 0 a 100 no aparelho, explica a composição e guarda o histórico.
- **Regras:**
  - Seis fatores, cada um com nota de 0 a 100 e uma frase:
    - **Poupança:** taxa de poupança; alvo de pelo menos 10%.
    - **Reserva:** meses de despesa cobertos; alvo de 3 a 6.
    - **Dívidas:** uso do cartão.
    - **Orçamento:** % dos orçamentos dentro do limite.
    - **Regularidade:** % dos dias do mês com lançamento; *observado:* 22,2%.
    - **Fontes de renda.**
  - Faixa por nota; *observado:* 31 = "Frágil".
  - Pesos *desconhecidos*: com os fatores 0, 0, 60, 100, 22 e 0 a nota foi 31.
  - "Pontos fortes" e "A melhorar" com frases geradas pelos fatores.
  - Sem chave de IA, a análise é local e oferece copiar o prompt para usar num chat externo.
  - **Histórico:** atual, melhor e média; períodos 3M, 6M, 12M e Tudo; a curva aparece a partir da segunda análise; lista de análises com mês e data; detalhe de cada análise com "copiar resumo".
- **Estados:** sem análise, uma análise, várias.
- **Edição/exclusão:** "Atualizar análise" gera nova entrada. Excluir uma análise não foi observado.
- **Persistência:** cada análise com data, período, nota, fatores e textos.
- **Aceite:** o detalhe de uma análise salva mostra os mesmos fatores do momento em que foi gerada, mesmo depois de mudar os dados.
- **Floco:** já tem `healthScore` com histórico, mas usa 3 meses e fatores próprios. Faltam regularidade, fontes de renda, orçamento como fator, melhor/média e filtro de período ❔. O Floco define os próprios pesos.

## S6a — Preferências por grupo 🟡

Seis grupos, cada um com uma **prévia ao vivo** do efeito:

- **Extrato:** confirma L14. Detalhes novos:
  - "Hora" também liga o campo de hora ao lançar.
  - "Saldo acumulado por dia" vira o saldo da conta quando há filtro de conta e some com busca ou outros filtros.
  - "Atrasadas no mês atual" leva as pendentes de meses anteriores para o topo.
  - "Caixinhas no extrato" mostra guardar/resgatar como linha neutra, sem mudar totais.
- **Saldo e Home:**
  - Prévia "este mês × mês que vem" com Disponível e Disponível previsto.
  - **Início do mês** personalizado (salário a salário; as telas mostram o período, como "20/out – 19/nov") é PRO.
  - **Incluir "quem me deve" no saldo:** as projeções continuam só com o caixa.
  - **Saldo previsto por mês** nos meses futuros.
  - **Reservado nas contas.**
- **Análise e relatórios:**
  - **Parcelamentos pelo valor total:** a fatura e o extrato continuam por parcela.
  - **Cartão no mês de fechamento:** para cartão que fecha no fim do mês e vence no seguinte.
  - **Orçamento pela fatura do cartão:** a compra conta no mês em que a fatura vence.
- **Lançar e atalhos:** teclado de cálculo sempre aberto, ou desligado com a calculadora a um toque; **caixinha no botão +**.
- **Vibração:** vibração no app e "vibrar ao trocar de aba", separadas.
- **Idioma, moeda e datas:** idioma (sistema/pt-BR/en); moeda só muda o símbolo, sem converter valores; formato de data (dd/mm/aaaa, mm/dd/aaaa, aaaa-mm-dd).
- **Persistência:** chave/valor nas configurações. O backup do original guarda as configurações como lista de chaves.
- **Aceite:** cada opção altera a prévia do grupo e a tela real. "Moeda" troca o símbolo e mantém os números.
- **Floco:** a tela de personalização fixa idioma, moeda e data. Faltam início do mês, "quem me deve" no saldo, as três opções de análise, caixinha no + e vibração por aba ❔.

## H4a — Apresentação inicial (primeiros passos do app) 🟡❔

- **O que faz:** monta o app em três perguntas, sem cadastro.
- **Regras:**
  1. Boas-vindas com "montar" ou **"já uso, restaurar"** (vai direto para restaurar backup).
  2. **De onde sai seu dinheiro:** escolhe o banco numa lista com busca, só para nomear a conta, sem conexão com o banco. Pode pular.
  3. **O que resolver primeiro:** várias escolhas (para onde vai o dinheiro, não estourar o mês, faturas e contas em dia, juntar para uma meta, ter tudo num relatório). A escolha organiza o app. *Deduzido:* ordem dos blocos da Home e atalhos.
  4. **Último gasto:** valor estimado e categoria rápida. Pode pular.
  5. Conclusão e pedido de permissão de notificação. *Não renderizaram por link com o app já configurado; seria preciso apagar os dados do app.*
- **Persistência:** conta criada, objetivos escolhidos e primeiro lançamento.
- **Aceite:** concluir as três perguntas cria a conta com o nome do banco e o primeiro gasto, e a Home reflete os objetivos escolhidos.

## H5 — Momento de progresso ❌ (opcional)

- **O que faz:** no original é uma oferta de venda que mostra o progresso do usuário: dias no controle, lançamentos registrados e contas quitadas.
- **Para o Floco:** só a comemoração, sem venda. É um cartão de marco (por exemplo, 30 dias usando) com esses três números e "fechar".
- **Aceite:** aparece uma vez por marco e não volta depois de fechado.

---

## Telas sem observação nesta rodada

| Rota | Motivo |
|---|---|
| `personal-loans/[id]` | Criar "quem me deve" abre o paywall. O Floco já tem D3. |
| `accounts/report/[id]`, `reservas/report/[id]` | PRO: só a apresentação (O8). |
| `(onboarding)/done`, `notification-primer` | Não abrem por link com o app configurado. Exigem apagar os dados do Kontto no emulador. |

## Observado de passagem

- Concluir uma meta disparou o pedido de avaliação da Play Store. Isso fica fora de escopo e o Floco não deve imitar.
- No formulário de compra no cartão, o tipo vem antes do formulário: **Despesa** ou **Estorno** (L5 aplicado ao cartão).
