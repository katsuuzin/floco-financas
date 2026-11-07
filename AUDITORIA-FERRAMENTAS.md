# Ferramentas — versão 1.3.4

Auditoria de 7 de novembro de 2026. Referência: menus do Kontto Android 1.0.83 (assistente, comprovantes e importação/exportação). O Floco usa implementação própria, sem plano PRO. A identidade Solar foi preservada.

| Área | Comportamento no Floco | Validação |
|---|---|---|
| Assistente local | Destaques, saúde e histórico, plano de ação, resumo mensal e perguntas sobre categorias, comparação, resultado, folga e reserva. Sem chave e sem envio de dados. | Testes de cálculo e conversa no Android. |
| IA online opcional | Gemini, OpenAI, OpenRouter e Anthropic; consentimento, chave protegida e separada por provedor. | Requisições simuladas; não testado com serviço real ou credencial. |
| CSV Nubank | Separador automático, decimal com ponto, entradas positivas e identificador bancário. | Extrato real de nove movimentos. |
| OFX | Datas, centavos, receitas/despesas e FITID. | Comparação com o CSV e testes de repetição. |
| PDF Nubank | Texto nativo primeiro; conferência dos totais diários e dos saldos. | PDF real de duas páginas: nove movimentos conciliados. |
| Excel XLSX | Leitura local de abas, textos, datas Excel e valores numéricos; revisão antes de gravar. | Planilha derivada do mesmo extrato no Android. |
| Comprovante | Foto, câmera ou PDF; OCR local, sugestão de valores/datas e lançamento revisado. | OCR da imagem em resolução adequada e cadastro de comprovante fictício no Android. |
| Exportar | Modelo CSV, transações CSV, backup JSON, backup criptografado e relatórios PDF. | JSON/CSV com dez registros esperados; PDF gerado e aberto por leitor. |
| Restaurar | Validação do JSON Floco, confirmação explícita e cópia local antes da troca. | Restauração do backup exportado no emulador isolado. |

## Proteção contra duplicatas

CSV e OFX compartilham o identificador bancário por conta. Identificadores repetidos são sempre ignorados. PDFs sem identificador são comparados por conta, data, tipo e centavos, respeitando a quantidade de ocorrências. A opção de evitar possíveis duplicatas pode ser desligada para compras legítimas de mesmo valor; a revisão é necessária.

Os testes cobrem as seis ordens de importação CSV/OFX/PDF e múltiplas compras do mesmo valor. No Android, reimportar as nove linhas pelo XLSX adicionou zero registros. O CSV e o OFX reais têm identificadores correspondentes; o PDF corresponde ao mesmo conjunto de datas, tipos e valores.

Notificações parecidas vindas do banco e do SMS são sinalizadas para revisão, sem descarte automático por valor e proximidade de horário. Compras legítimas permanecem disponíveis.

## Correção de armazenamento

Instalações novas podiam gravar contas e lançamentos sem o marcador `version`. Ao reabrir, o carregador ignorava esses registros. Agora qualquer dado persistido é reconhecido, e a primeira inicialização grava o estado completo. Registros antigos sem marcador são recuperados sem apagamento. A reabertura do APK confirmou o saldo e os movimentos no emulador.

## Limites explícitos

- PDF bancário automático validado para o layout Nubank anexado. Outros layouts, PDFs protegidos por senha ou documentos que não conciliem devem ser importados por CSV/OFX. A leitura de comprovante não equivale à importação de um extrato inteiro.
- OCR precisa de texto legível: a imagem pequena do extrato falhou; a versão de maior resolução funcionou. Sempre conferir os campos. A câmera física não foi validada neste emulador.
- Excel aceita `.xlsx`; não aceita o formato binário antigo `.xls`. Fórmulas não são executadas; usa valores salvos. Não traz fórmulas, gráficos ou macros para os registros.
- O assistente local calcula respostas conhecidas; perguntas abertas dependem do provedor opcional. Não houve teste real de API nem envio do extrato a provedor.
- Backups de outros aplicativos não são backups Floco. CSV é exportação de transações; JSON/backup criptografado preserva o estado completo.
- Google Drive e sincronização entre aparelhos continuam adiados por escolha do usuário.

## Evidência e privacidade

112 testes automatizados passaram e o TypeScript foi validado. A verificação Android usa um emulador separado, sem alterar os registros do Kontto ou a instalação principal. Extratos, dados reais e capturas permanecem locais, fora do repositório. Os testes publicados usam apenas dados fictícios. A chave de assinatura permanece somente no computador.
