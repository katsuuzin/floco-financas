# Roteiro único de teste no celular (versão 1.11.0, em desenvolvimento)

Este roteiro junta os testes dos roteiros anteriores (`ROTEIRO-TESTE-CELULAR.md`, `ROTEIRO-TESTE-CELULAR-2.md`, `ROTEIRO-TESTE-INTEGRACOES.md`) e as telas novas. Use os dois primeiros só como consulta; este basta.

## Antes de testar

1. **Faça backup.** Em **Mais → Importar e exportar → Backup completo JSON**, salve o arquivo fora do celular (e-mail, nuvem ou computador). Se algo der errado, você restaura por ele.
2. Instale o APK de teste **por cima** do app atual (não desinstale). Abra o app e confira se o saldo e os lançamentos são os de antes.
3. Anote: modelo do celular, versão do Android, e se está no tema claro ou escuro.

Marque cada passo como **Passou**, **Falhou** ou **Não deu para testar**, e escreva uma frase do que viu quando falhar.

## A. Tela por tela

| # | Ação | Esperado | Passou? |
| --- | --- | --- | --- |
| 1 | Abra **Transações**. | Lista do mês; botões **Filtros** e **Ver calendário**. | |
| 2 | Toque em **Ver calendário**. | Grade do mês; dias com lançamento têm marca. A última semana fica alinhada nas colunas. | |
| 3 | Toque num dia com marca. | Mostra entradas, despesas e os lançamentos do dia. **Fechar detalhe do dia** volta. | |
| 4 | Toque em **Filtros**, escolha uma conta e uma faixa de valor, e aplique. | Só aparecem lançamentos que combinam; o botão mostra quantos filtros estão ativos. | |
| 5 | Feche e abra o app. | O filtro continua. **Limpar** volta ao mês inteiro. | |
| 6 | Toque no **+** → **Despesa**. Toque no ícone de divisão do campo de valor e digite `(10+5)÷3`. | Aparece `= R$ 5,00` e o botão **=**. Ao tocar **=**, o valor vira 5,00. | |
| 7 | Digite `1÷0`. | Mensagem clara de erro, sem travar. | |
| 8 | Em **Mais → Contas**, toque em **Reordenar contas** e mova uma conta. | A ordem muda e fica ao reabrir; os botões têm espaço entre si. | |
| 9 | Arquive uma conta que tem saldo. | Pede confirmação dizendo que sai do saldo total. Cancelar não muda nada. | |
| 10 | Arquive uma conta que tem dinheiro reservado em caixinha. | **Não** arquiva e explica que é preciso retirar a reserva antes. | |
| 11 | Em **Mais → Metas e caixinhas**, abra a aba **Caixinhas**. | Cada caixinha mostra o guardado e as ações Depositar, Retirar, Rendimento, Transferir, Renomear e Arquivar. | |
| 12 | Deposite R$ 1,00 numa caixinha e retire R$ 1,00. | O saldo muda e volta; o saldo da conta acompanha. | |
| 13 | Arquive uma caixinha que tem uma meta ligada, devolvendo o saldo a uma conta. | A meta deixa de apontar para a caixinha (volta ao progresso manual). | |
| 14 | Em **Mais → Categorias**, escolha ícone e cor para uma categoria. Faça o mesmo numa tag. | A escolha aparece nas linhas do extrato e no orçamento. O texto sobre a cor continua legível. | |
| 15 | Em **Mais → Lixeira**, abra a lixeira. | Lista o que foi apagado nos últimos 30 dias; esvaziar mostra a contagem e pede confirmação. | |
| 16 | Apague um lançamento e restaure-o pela lixeira. | Ele volta ao extrato com o mesmo valor. | |

## B. Lista de compras

| # | Ação | Esperado | Passou? |
| --- | --- | --- | --- |
| 17 | Abra **Mais → Lista de compras**. | A lista de itens aparece primeiro. **Está acabando** fica recolhido mais abaixo. | |
| 18 | Adicione "2 leite", marque no carrinho e remova outro item. | Os totais acompanham. **Desfazer** devolve o item removido e **Refazer** remove de novo. | |
| 19 | Toque em **Gerenciar listas**, crie uma segunda lista e troque entre elas. | Cada lista guarda seus itens. A excluída pode ser recuperada. | |
| 20 | Edite um item: marque **Sempre comprar** e a promoção **Leve 3, pague 2** com 3 unidades. | O total da linha considera a promoção. | |
| 21 | Compre e limpe o carrinho com o item recorrente. | Ele volta à lista depois do intervalo, sem a promoção da compra anterior. | |
| 22 | Em **Colar lista**, cole uma receita de 2 porções e peça para 4. | As quantidades dobram. | |
| 23 | Abra **Modo compra**, defina limite de R$ 100,00 e marque itens. | Total, progresso e tempo atualizam. Perto do limite fica em âmbar; acima fica em vermelho. | |
| 24 | Digite `-5` no limite. | Mensagem de erro e o limite anterior continua. | |
| 25 | Toque em **Finalizar e registrar despesa** com uma despesa parecida já lançada. | Aparece o aviso "Já existe uma despesa parecida". **Cancelar** volta; **Registrar** abre o formulário. | |
| 26 | Finalize escolhendo **Dividir por categoria**. | Abre a revisão do lote; a soma das despesas é igual ao total do carrinho. **Salvar tudo** grava de uma vez. | |
| 27 | Ligue **Avisar quando estiver acabando** (com histórico de compras). | Pede a permissão de notificação; o aviso nasce **desligado** por padrão. | |
| 28 | Em **Ler nota fiscal**, escolha um arquivo XML de teste. | Mostra uma prévia dos itens e só salva depois da sua confirmação, mesmo sem internet. | |

## C. Dados e backup

| # | Ação | Esperado | Passou? |
| --- | --- | --- | --- |
| 29 | Exporte um backup e restaure-o em seguida (**Mais → Importar e exportar**). | Tudo volta igual: contas, caixinhas, metas, listas, tags. Uma cópia dos dados antigos é guardada antes da troca. | |
| 30 | Restaure um backup da versão anterior (1.10.0). | Restaura sem erro; as telas novas aparecem com valores padrão. | |
| 31 | Restaure um backup com a lista de compras danificada (peça a versão de teste). | Aparece "Backup com problemas na lista de compras" em português, com **Reparar e continuar**. | |

## D. Só no celular (o emulador não cobre)

| # | Ação | Esperado | Passou? |
| --- | --- | --- | --- |
| 32 | Em **Ler nota fiscal**, aponte a câmera para o QR de uma nota de SP. Repita com pouca luz e papel amassado. | Lê o código; com lanterna a leitura melhora. | |
| 33 | Recuse a permissão da câmera e depois conceda nas configurações. | Sem câmera dá para digitar o código; ao conceder, o visor volta. | |
| 34 | Em **Escanear produto**, leia um código de barras real. | Mostra o nome do produto para você revisar antes de adicionar. | |
| 35 | Ative o **TalkBack**. Percorra a Início, a lista, o Modo compra e um formulário. | Cada botão tem nome claro; os valores são lidos uma vez só; o foco não se perde ao abrir e fechar painéis. | |
| 36 | Com o TalkBack, abra **Filtros** e o calendário. | A grade lê "Dia 10, 4 lançamentos…". Dá para fechar o painel por gesto. | |
| 37 | Aumente a fonte do Android ao máximo e a exibição também. | Nomes longos quebram em linhas; nada fica cortado; botões continuam tocáveis; o calendário rola em vez de espremer. | |
| 38 | Gire o aparelho na lista, no calendário e no Modo compra. | Nada se perde (o que você digitou continua). | |
| 39 | Ligue o **modo avião** durante uma consulta de nota. | Mensagem de falta de conexão; ao religar, tenta de novo sem travar. | |
| 40 | Deixe o Modo compra em segundo plano por 30 minutos e volte. | O tempo continua contando; o carrinho está igual. | |
| 41 | Receba o mesmo aviso do banco por SMS e por notificação (com a leitura ligada). | Aparece uma pendência e as duplicadas ficam em **Ver duplicadas**. Duas compras iguais com 3 minutos de diferença aparecem as duas. | |
| 42 | Crie um lembrete de teste para daqui a poucos minutos e bloqueie a tela. | A notificação chega com a tela bloqueada. | |
| 43 | Ative a economia de bateria e repita o 42. | Anote se chegou ou atrasou. | |
| 44 | Em **Configurações → Atualizações**, procure atualização. | Mostra a versão e baixa/instala pelo próprio app, com sua confirmação do Android. | |
| 45 | Ative **Remover animações** nas configurações do Android e toque em vários botões. | Os botões **não** afundam; só mudam um pouco de transparência. | |
| 46 | Com animações normais, toque e segure um botão, depois solte. | O botão afunda um pouco e volta suave; nada fica "preso" pequeno. | |
| 47 | Ative o **tema escuro** e passe pelas telas dos passos 1 a 28. | Texto legível, sem cores claras demais nem fundo branco perdido. | |

## Como me mandar o resultado

- Copie a tabela com **Passou/Falhou** e uma frase em cada falha.
- Para cada falha, mande uma captura de tela se puder.
- Diga o modelo do celular e a versão do Android.
- Não mande o arquivo de backup se ele tiver dados reais; se for preciso, use um backup de teste.
