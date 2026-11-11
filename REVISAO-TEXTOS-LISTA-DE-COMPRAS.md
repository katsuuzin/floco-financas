# Revisão de textos da lista de compras

Foram lidos os rótulos, estados vazios, avisos e mensagens de erro das seis telas da lista e dos módulos `shopping*.mjs` e `nfce*.mjs`. O teste estático usa a árvore sintática para separar textos de ícones, rotas e comentários. Tradução de mensagens externas e texto digitado pela pessoa ficam fora do teste. Os termos da interface são “carrinho”, “lista de compras” e “nota fiscal”.

| Gravidade | Arquivo e linha | Texto atual ou contexto | Texto sugerido | Motivo |
| --- | --- | --- | --- | --- |
| Alta | `src/screens/NfceConsultaScreen.tsx:321` | “Nada é enviado a ninguém além da SEFAZ.” | “A consulta abre a nota fiscal no site da SEFAZ.” | A promessa de exclusividade depende da verificação de subrecursos e redirecionamentos no Android. |
| Alta | `src/screens/NfceConsultaScreen.tsx:91` e `:92` | Erro de origem genérico também cobre evento de recusa sem endereço. | “A SEFAZ recusou a consulta. Tente de novo em alguns minutos.” | Depois de corrigir o vínculo do evento, mostrar um próximo passo para recusa do serviço. |
| Alta | `src/shoppingData.mjs:69` e `:125` | Erros de backup mostram `shoppingPurchases` e `shoppingProducts`. | “O histórico de compras deste backup é inválido. Escolha outro arquivo.” / “O catálogo deste backup é inválido. Escolha outro arquivo.” | Nomes internos não ajudam a recuperar o backup. |
| Média | `src/screens/ShoppingPastePanel.tsx:67` | “A IA não respondeu com uma lista válida. Mostrando a leitura offline.” | “Não consegui montar a lista com IA. Veja a prévia feita no aparelho.” | Elimina “offline” e explica o que a pessoa pode revisar. |
| Média | `src/screens/ShoppingPastePanel.tsx:106` | “Ver prévia offline” | “Ver prévia sem IA” | Distingue claramente as duas ações do painel. |
| Média | `src/screens/ShoppingPastePanel.tsx:135` | “Fechar colagem” | “Voltar à lista” | Descreve o destino do botão. |
| Média | `src/screens/ShoppingScreen.tsx:127`, `src/screens/ShoppingTripScreen.tsx:103` e `src/screens/NfceConsultaScreen.tsx:215` | “Registrar compra como despesa”, “Finalizar e registrar despesa” e “Registrar como despesa”. | “Registrar despesa” | As três ações abrem um formulário. Evita sugerir que tocar no botão já finaliza a compra. |
| Média | `src/screens/ShoppingScreen.tsx:150` | “Limpar itens no carrinho” | “Remover itens do carrinho” | Explicita que os itens marcados saem da lista. |
| Média | `src/screens/ScanNotaScreen.tsx:160`, `:166` e `:171` | “Colar link do QR ou chave de 44 dígitos”, “Cole aqui” e “Usar o que colei”. | “Chave ou link da nota fiscal” / “44 dígitos ou link do QR” / “Ler nota fiscal” | Separa rótulo, exemplo do formato e ação. |
| Média | `src/screens/ScanNotaScreen.tsx:88` | “Esta nota é de teste (homologação) e não tem valor fiscal.” | “Esta é uma nota fiscal de teste. Use um cupom válido para consultar os itens.” | Retira o jargão e indica como continuar. |
| Média | `src/nfce.mjs:102` | “Esta é uma NF-e (modelo 55), não um cupom de NFC-e.” | “Use a nota fiscal de uma compra de mercado, com código QR.” | O nome técnico completo não viola a regra de “NF” sozinho, mas os modelos numéricos pouco ajudam nesse fluxo. |
| Média | `src/screens/PurchasesScreens.tsx:37` | Grupo de opções chamado “Ver”. | “Histórico de compras” | Nomeia o que Compras e Produtos alternam. |
| Média | `src/screens/PurchasesScreens.tsx:94` | “Nenhum produto ainda” é mostrado também quando o filtro não encontra produtos. | “Nenhum produto encontrado. Tente outro nome ou limpe a busca.” | Explica o estado filtrado quando já existe catálogo. |
| Baixa | `src/screens/NfceConsultaScreen.tsx:213` | “Marcar 1 como comprados” | “Marcar 1 item como comprado” / “Marcar {n} itens como comprados” | Ajusta número e concordância. |

A regra de inglês encontrou dois usos de “offline”. Na verificação estática, passaram as regras para reticências, ponto final em botões, formato de erros, maiúscula inicial e termos fixos. Permanecem para conferência os rótulos montados só em tempo de execução e as mensagens vindas da SEFAZ ou do provedor de IA. Prioridade de correção nos textos de consulta fiscal e de recuperação de backup.
