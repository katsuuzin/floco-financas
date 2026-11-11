const generic = "Não foi possível validar uma informação do backup.";
const nouns = new Map([
  ["shoppingItems", ["Item", "itens da lista", "Lista de compras"]],
  ["shoppingProducts", ["Produto", "produtos", "Catálogo de produtos"]],
  ["shoppingPurchases", ["Compra", "compras", "Histórico de compras"]],
]);
const fields = new Map([
  ["name", "o nome"], ["rawName", "o nome da nota fiscal"], ["qty", "a quantidade"], ["unit", "a unidade"],
  ["priceCents", "o preço"], ["lastPriceCents", "o último preço"], ["unitPriceCents", "o preço unitário"],
  ["totalCents", "o valor total"], ["category", "a categoria"], ["listId", "a lista"], ["inCart", "a marcação do carrinho"],
  ["createdAt", "a data de criação"], ["updatedAt", "a data de alteração"], ["deletedAt", "a data de remoção"],
  ["key", "a chave do produto"], ["ean", "o código de barras"], ["buys", "o número de compras"],
  ["marketName", "o nome da loja"], ["source", "a origem da compra"], ["cnpj", "o CNPJ"],
  ["chave", "a chave da nota fiscal"], ["transactionId", "o vínculo com o lançamento"],
  ["productId", "o vínculo com o produto"], ["purchaseId", "o vínculo com a compra"],
  ["date", "a data"], ["lastBoughtAt", "a data da última compra"], ["id", "o identificador"],
]);
const absolute = new Map([
  ["tipo_json", "O backup tem conteúdo que não pode ser lido como JSON."],
  ["estrutura_json", "A estrutura do backup tem níveis demais ou referências circulares."],
  ["campo_reservado", "O backup contém um campo reservado. Escolha outro arquivo."],
  ["tamanho", "O backup ultrapassa 2 MiB. Escolha um arquivo menor."],
]);
const suffix = (field) => field && /^(a|as)\s/u.test(field) ? " é inválida." : " é inválido.";

function details(error) {
  if (!error || typeof error !== "object") return { text: generic };
  const code = Object.hasOwn(error, "code") ? error.code : undefined;
  if (absolute.has(code)) return { text: absolute.get(code), group: code };
  const path = Object.hasOwn(error, "path") && typeof error.path === "string" ? error.path : "";
  const match = /^(shoppingItems|shoppingProducts|shoppingPurchases)(?:\[(\d{1,6})\])?(?:\.(items|prices)(?:\[(\d{1,6})\])?)?(?:\.([A-Za-z]+))?$/u.exec(path);
  if (!match) return { text: code === "tipo" && path === "$" ? "Escolha um arquivo de backup válido." : generic };
  const [, collection, position, nested, inner, field] = match;
  const [one, many, section] = nouns.get(collection);
  let label = position === undefined ? section : one + " " + (Number(position) + 1) +
    (collection === "shoppingItems" ? " da lista" : "");
  if (inner !== undefined) label += ", " + (nested === "items" ? "item " : "preço ") + (Number(inner) + 1);
  const fieldName = fields.get(field);
  const invalid = fieldName ? fieldName + suffix(fieldName) : "";
  const reason = code === "campo" || code === "data" || code === "id" || code === "chave_fiscal" ? invalid :
    code === "tipo" ? "o formato é inválido." :
    code === "duplicado" ? (fieldName ? fieldName + (suffix(fieldName) === " é inválida." ? " está repetida." : " está repetido.") : "há um registro repetido.") :
    code === "limite" ? (nested === "items" ? "a quantidade de itens está fora do limite." :
      nested === "prices" ? "há preços demais no histórico." : "a quantidade de registros está fora do limite.") :
    code === "orfao" ? (field === "productId" ? "o produto vinculado não foi encontrado." : "a compra vinculada não foi encontrada.") : "";
  if (!reason) return { text: generic };
  return { text: label + ": " + reason, group: [collection, nested, code, field].join("/"),
    many, reason, invalidName: code === "campo" && field === "name" };
}

export function describeBackupIssue(error) {
  return details(error).text;
}

export function summarizeBackupIssues(errors, { max = 3 } = {}) {
  const groups = new Map();
  for (const error of Array.isArray(errors) ? errors : []) {
    const issue = details(error);
    const key = issue.group ?? issue.text;
    const row = groups.get(key);
    if (row) row.count++;
    else groups.set(key, { ...issue, count: 1 });
  }
  const rows = [...groups.values()];
  const limit = Number.isSafeInteger(max) && max >= 0 ? max : 3;
  const lines = rows.slice(0, limit).map(({ text, count, many, reason, invalidName }) =>
    count === 1 ? text : invalidName ? count + " " + many + " com nome inválido." : many ? count + " " + many + " com o mesmo problema: " + reason : count + " ocorrências. " + text);
  const more = rows.slice(limit).reduce((sum, row) => sum + row.count, 0);
  const text = [...lines, ...(more ? [more === 1 ? "Mais 1 problema." : "Mais " + more + " problemas."] : [])].join("\n");
  return { lines, more, text };
}
