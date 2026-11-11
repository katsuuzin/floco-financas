# Revisão do pacote 6 (Codex)

Data: 11/11/2026. Conferido: `npm test` (712 passam, 30 falham), `node --test tests/security/*.test.mjs` (64 passam), `npx tsc --noEmit` (limpo). Arquivos novos de `src/` e `tests/` lidos por amostragem; módulos exercitados à mão.

## Veredito

Entrega boa e dentro das regras (nenhum arquivo existente editado, dados inventados, sem dependência nova). As 30 falhas são **achados reais do código existente**, não defeitos dos testes novos, com duas ressalvas: alguns testes são mais rígidos do que o uso real exige (ver "Falhas de baixa prioridade"). Nada foi corrigido no app ainda.

## Conferido à mão nos módulos novos

| Módulo | Resultado |
| --- | --- |
| `shoppingExport` | CSV correto: BOM, `;`, vírgula decimal, `'` na frente de `=HYPERLINK(...)` e `+cmd`. |
| `shoppingDeals` | "Leve 3 pague 2" em 3 × R$ 10,00 dá R$ 20,00 e economia de R$ 10,00. Desconto maior que o preço vira R$ 0,00 sem negativo. |
| `shoppingSplit` | Soma dos grupos bate com o total. Item sem preço sai em `unpriced`. Limpeza vira "Moradia" (conferir se é a categoria desejada). |
| `shoppingImportShared` | Marcadores `☐`, `[x]`, `-`, `2x`, `5kg` e `\r\n` entendidos. **Defeito:** a linha de título "Lista 🛒" entra como item. |
| 634 → 712 testes | Sem teste que passe por acaso: as 30 falhas reproduzem em uma chamada. |

## As 30 falhas, em ordem de ação

### Corrigir agora (alto risco ou barato)
1. `isIsoDate("2026-02-30")` aceita data impossível (lacuna 3). Backup com data inválida entra.
2. `centsFromBr("-1,00")` devolve `100` (lacuna 5). Desconto ou valor negativo da nota vira cobrança.
3. `allowedHosts`, `consultSupported` e `consultUrl` tratam `"toString"`/`"constructor"` como UF (lacuna 10). Usar `Object.hasOwn`.
4. `consultUrl` e `sanitizePurchases` aceitam chave de 44 dígitos com DV trocado. Usar `chaveDv`.
5. `nfceToPurchase` converte prévia de outra chave que a de `info.chave`.
6. `parseNfceInput` com dois `p=` aceita o primeiro; recusar.
7. `isChave` aceita objeto com `toString` (coerção). Exigir `typeof === "string"`.
8. `parseNfceHtml` aceita `Rqtd=100000` (fora do contrato).
9. Lacuna 8: seleção antiga da conferência altera item renomeado. Revalidar nome antes de aplicar.
10. Lacuna 9: resposta da IA que chega depois do cancelamento reaparece. Ignorar resposta quando o sinal já foi abortado.
11. Lacunas 4, 6 e 7: backup com produto ausente, histórico truncado ao excluir e compra retroativa com histórico cheio.
12. `parsePastedList("½ kg de farinha")` não lê a fração.

### Falhas de baixa prioridade (decidir antes de mexer)
- Somas acima do inteiro seguro (`lineTotal`, `shoppingSummary`, `tripSummary`, `monthSummary`): irreal no uso, mas um `Math.min`/saneamento custa pouco.
- `normalizeName("抹茶")` vazio: só importa se houver uso de nomes não latinos.
- `productKey("Produto 1,5")` = `productKey("Produto 1 5")`: colisão rara; corrigir junto com a migração das chaves do catálogo.
- `scorePair` com palavra repetida e `priceTrend` com base zero: ajuste pequeno, risco baixo.
- `parseChave` mês 13 / UF 00: definir se a validação semântica fica em `parseChave` ou em quem chama.
- `lastKnownPrice` negativo: sanear na restauração (item 11).

## Defeitos achados fora dos testes dele
- `parseShared`: título da lista entra como item.
- `splitDraft`: descrição igual ("Compra de mercado") em todas as despesas por categoria; incluir o nome da categoria.

## Próximo passo
Pacote 7 (`TAREFAS-CODEX-7.md`) dá mais trabalho ao Codex sem tocar nos arquivos acima. As correções do código existente ficam com o Claude, em um lote só, depois da aprovação do dono.
