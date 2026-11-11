# Blocos para a documentação da lista de compras

## INVENTARIO-FUNCIONAL.md

| ID | Função | Comportamento e limites | Status e validação |
| --- | --- | --- | --- |
| E1 | Lista de compras | Lista única com itens pendentes e no carrinho, quantidade, preço opcional, categoria, edição, remoção com Desfazer, limpeza dos marcados e compartilhamento. O bloco na Início resume pendências. Valores em centavos. | Implementado e testado no emulador conforme o registro do projeto. Pendente no celular real, com TalkBack e fonte grande. |
| E2 | Leitor de nota | Lê QR pela câmera ou por foto da galeria. Também aceita colar a chave ou URL do QR. Valida a chave antes de oferecer consulta. Permissão de câmera é pedida para leitura ao vivo. | Implementado. QR ao vivo no celular, TalkBack e fonte grande pendentes. |
| E3 | Consulta e leitura da nota de SP | Abre a consulta oficial em WebView, extrai itens e mostra prévia antes de salvar. A leitura de itens cobre SP. A conexão e a disponibilidade da SEFAZ afetam o resultado. | Implementado e testado no emulador. Celular real, TalkBack e fonte grande pendentes. |
| E4 | Histórico de compras e produtos | Mostra compras salvas e preços por produto. Apagar compra retira sua contribuição do histórico. A despesa é registrada no formulário normal. Compras e produtos entram no backup. | Implementado. Confirmar gravação de despesa, restauração com compras, TalkBack e fonte grande no celular. |
| E5 | Ritmo de compra | Estima reposição pela mediana dos intervalos entre datas distintas. Filtra itens já pendentes e compras antigas demais. Precisa de pelo menos duas datas de compra. | Lógica com testes automatizados. Conferência da tela, TalkBack e fonte grande no celular pendentes. |
| E6 | Conferência com a lista | Sugere pares entre a nota e itens pendentes. A pessoa pode rever as escolhas antes de marcar os itens. Uma linha da nota só é usada uma vez. | Testado no emulador com nota de SP conforme o registro do projeto. Celular real, TalkBack e fonte grande pendentes. |
| E7 | Colar lista offline | Transforma texto em itens com nome, quantidade e unidade. Mostra prévia antes de adicionar. O reconhecimento usa regras locais e pode precisar de revisão. | Implementado com testes de parser. Fluxo no celular, TalkBack e fonte grande pendentes. |
| E8 | Colar lista com IA | Usa o provedor e a chave do usuário configurados no Assistente. Envia apenas o texto colado ao tocar em Interpretar com IA. A prévia permite retirar itens. Em caso de falha, mostra a leitura offline. | Gemini testado no emulador conforme o registro do projeto. Celular real, TalkBack e fonte grande pendentes. |

## DESIGN.md

### Lista, leitura e histórico de compras

Use os tokens do tema para fundo, superfície, borda e estados. Use `c.bg`, `c.surface`, `c.line`, `c.muted`, `c.primary`, `c.onPrimary` e `c.red` conforme o papel de cada elemento. Preserve alvos de 48 dp nas ações de linha e o botão explícito para marcar, editar ou remover. A lista não depende de gesto de deslizar.

O estado vazio explica como começar. O leitor dá alternativa por foto ou chave quando a câmera não está disponível. Consulta e colagem com IA informam quando estão processando. Erros ficam próximos da ação e mostram como continuar. A lista usa papel de caixa de seleção e informa se o item está pendente ou no carrinho. Rótulos de exclusão e Desfazer incluem o item. Mensagens que mudam durante o fluxo usam região de anúncio onde implementada. Na revisão em aparelho, conferir quebra de texto e leitura das ações em TalkBack.

## CLAUDE.md

- Consulte a SEFAZ pela WebView. O registro do projeto relata que a requisição HTTP direta com `curl` foi recusada pelo firewall da SEFAZ. Mantenha dados sintéticos nos testes de parser.
- O manifesto Android define `android:enableOnBackInvokedCallback="false"`. Preserve o comportamento de voltar do app ao revisar o build.
- O `build-android.ps1` mapeia temporariamente o SDK para uma unidade livre quando o caminho tem espaços, pois NDK/CMake pode falhar no link.
- O projeto inclui `expo-image-loader` para a leitura de QR de foto. Confira a opção de galeria ao validar mudanças no leitor.
- O campo **Modelo** recebe apenas o identificador do modelo. Use **Chave de API** para guardar a credencial no armazenamento seguro. Não use uma chave real em código, testes, screenshots ou arquivos de documentação.
