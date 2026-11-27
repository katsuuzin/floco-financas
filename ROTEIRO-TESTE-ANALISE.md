# Roteiro de teste da Análise no celular real

27/11/2026. Complementa `PROPOSTA-ANALISE.md`. Tudo aqui foi conferido no emulador (escuro, claro, fonte 1,6×, backup real de 27/11, TalkBack com a saída de fala escrita na tela). Falta só o que depende do aparelho. Marque cada item e anote o que estranhar.

Antes: instalar `entrega\Floco-Financas.apk` (universal) por cima do app e abrir a aba Análise. Os dados são os seus.

## 1. Resumo
- [ ] "Resultado do mês" bate com Entrou − Saiu da aba Transações.
- [ ] "Pode gastar por dia" faz sentido: saldo, menos contas, faturas e recorrências que ainda vão sair, dividido pelos dias que faltam. Com saldo negativo aparece "Saldo negativo nas contas".
- [ ] Mudar de mês pelas setas: mês passado e mês futuro abrem sem erro e sem o cartão "Pode gastar por dia" (só vale no mês corrente).
- [ ] "Calendário do mês" abre e fecha.
- [ ] Avisos: aparecem só quando há motivo (orçamento a 80%, fatura em até 3 dias, categoria que subiu, assinatura que mudou de preço). "Dispensar" some com o aviso e mostra "Desfazer"; "Dispensados" lista e "Restaurar" traz de volta.

## 2. Categorias
- [ ] Tocar numa categoria abre os lançamentos do mês; a soma bate com o valor da lista.
- [ ] Selecionar um ou vários e "Mover para outra categoria": o valor muda de categoria na rosca, aparece "Desfazer" dentro da folha e ele funciona.
- [ ] Depois de mover, a pergunta de criar regra aparece só quando todos são do mesmo comerciante. "Criar regra" e "Aplicar aos antigos" funcionam.
- [ ] Alternar para Receitas: o seletor de categoria mostra só categorias de receita.
- [ ] Sub-aba "Lugares": a nota fiscal em itens conta como um lugar só.

## 3. TalkBack (o que o emulador não mostra)
Ligar em Configurações › Acessibilidade › TalkBack.
- [ ] Folha de categoria: cada lançamento é lido como caixa de seleção ("descrição, valor, data", marcada ou não).
- [ ] "Mover N para outra categoria", "Editar …" e "Fechar" são lidos pelo nome, sem vírgula solta no começo.
- [ ] Avisos: gravidade lida em palavras (Urgente, Atenção, Informação) antes do título.
- [ ] Aviso "Dispensar": o "Desfazer" do aviso é lido e funciona antes de sumir (cerca de 10 s).

## 4. Aparelho e uso real
- [ ] Rolagem das folhas fluida com 30 ou mais lançamentos.
- [ ] Tema claro e escuro legíveis ao sol e à noite; fonte grande do aparelho sem texto cortado.
- [ ] Mês com muitos lançamentos (seu mês mais cheio): tempo para abrir a Análise e a folha.

## Como me passar o resultado
Anote o item, o que viu e, se possível, uma captura de tela. Corrijo em uma rodada só.
