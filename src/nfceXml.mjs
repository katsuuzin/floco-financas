import { isChave } from "./nfce.mjs";
import { readableName } from "./nfceParse.mjs";
import { safeIsIsoDate, safeSum } from "./hardened.mjs";

const maxLength = 1_500_000;
const maxDepth = 40;
const maxNodes = 80_000;
const maxItems = 500;
const namePattern = /[A-Za-z_][A-Za-z0-9_.:-]*/y;
const whitespace = /[\t\n\r ]*/y;
const predefined = new Map([["amp", "&"], ["lt", "<"], ["gt", ">"], ["quot", '"'], ["apos", "'"]]);
const decimal = /^\d{1,13}(?:\.\d{1,10})?$/u;
const units = new Map([["KG", "kg"], ["G", "g"], ["GR", "g"], ["L", "l"], ["LT", "l"], ["ML", "ml"]]);
const payments = new Map([["01", "Dinheiro"], ["02", "Cheque"], ["03", "Cartão de crédito"],
  ["04", "Cartão de débito"], ["05", "Crédito da loja"], ["15", "Boleto"], ["17", "Pix"], ["20", "Pix"],
  ["90", "Sem pagamento"], ["99", "Outros"]]);
const local = (name) => name.slice(name.lastIndexOf(":") + 1);

function entities(text) {
  if (!text.includes("&")) return text;
  let cursor = 0;
  let output = "";
  while (cursor < text.length) {
    const amp = text.indexOf("&", cursor);
    if (amp < 0) return output + text.slice(cursor);
    output += text.slice(cursor, amp);
    const reference = /^&([^&;<]{1,12});/u.exec(text.slice(amp, amp + 15));
    if (!reference) throw Error("Referência de caractere inválida no XML.");
    const token = reference[1];
    if (predefined.has(token)) output += predefined.get(token);
    else {
      const hex = /^#x[\da-f]{1,6}$/iu.test(token);
      const dec = /^#\d{1,7}$/u.test(token);
      const code = hex ? Number.parseInt(token.slice(2), 16) : dec ? Number(token.slice(1)) : -1;
      if (!(code === 9 || code === 10 || code === 13 || code >= 32 && code <= 0x10ffff &&
            !(code >= 0xd800 && code <= 0xdfff) && code !== 0xfffe && code !== 0xffff))
        throw Error("Entidade ou caractere inválido no XML.");
      output += String.fromCodePoint(code);
    }
    cursor = amp + reference[0].length;
  }
  return output;
}

function tree(input) {
  if (typeof input !== "string" || input.length > maxLength) throw Error("O XML da nota é inválido ou grande demais.");
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\uFFFE\uFFFF]|[\uD800-\uDFFF]/u.test(input))
    throw Error("O XML contém caracteres inválidos.");
  const stack = [];
  let root;
  let nodes = 0;
  let items = 0;
  let i = input.charCodeAt(0) === 0xfeff ? 1 : 0;
  const take = (regex) => {
    regex.lastIndex = i;
    const match = regex.exec(input);
    if (match) i = regex.lastIndex;
    return match?.[0];
  };
  const space = () => take(whitespace);
  if (input.startsWith("<?xml", i) && /[\t\n\r ]/u.test(input[i + 5] ?? "")) {
    const close = input.indexOf("?>", i + 5);
    if (close < 0 || close - i > 256 ||
        !/^\s+version\s*=\s*(["'])1\.0\1(?:\s+encoding\s*=\s*(["'])[A-Za-z][A-Za-z0-9._-]*\2)?(?:\s+standalone\s*=\s*(["'])(?:yes|no)\3)?\s*$/u.test(input.slice(i + 5, close)))
      throw Error("O cabeçalho XML é inválido.");
    i = close + 2;
  }
  while (i < input.length) {
    const parent = stack.at(-1);
    if (input[i] !== "<") {
      const next = input.indexOf("<", i);
      const end = next < 0 ? input.length : next;
      const text = input.slice(i, end);
      if (parent) {
        if (text.includes("]]>")) throw Error("Trecho de texto XML inválido.");
        parent.parts.push(entities(text));
      } else if (!/^[\t\n\r ]*$/u.test(text)) throw Error("Há texto fora do documento XML.");
      i = end;
      continue;
    }
    if (input.startsWith("<!--", i)) {
      const end = input.indexOf("--", i + 4);
      if (end < 0 || input[end + 2] !== ">") throw Error("Comentário XML incompleto ou inválido.");
      i = end + 3;
      continue;
    }
    if (input.startsWith("<![CDATA[", i)) {
      const end = input.indexOf("]]>", i + 9);
      if (!parent || end < 0 || end - i - 9 > 65_536) throw Error("Trecho CDATA inválido ou grande demais.");
      parent.parts.push(input.slice(i + 9, end));
      i = end + 3;
      continue;
    }
    if (input.startsWith("<!", i) || input.startsWith("<?", i))
      throw Error("O XML contém uma declaração ou instrução não permitida.");
    if (input.startsWith("</", i)) {
      i += 2;
      const name = take(namePattern);
      space();
      if (!parent || parent.name !== name || input[i++] !== ">") throw Error("Elemento XML fechado incorretamente.");
      stack.pop();
      continue;
    }

    i++;
    const name = take(namePattern);
    if (!name || name.length > 128 || ++nodes > maxNodes || stack.length + 1 > maxDepth)
      throw Error("O XML tem elementos demais, profundidade excessiva ou nome inválido.");
    const tag = local(name);
    if (tag === "det" && ++items > maxItems) throw Error("A nota ultrapassa o limite de 500 itens.");
    const attrs = new Map();
    let selfClosing = false;
    while (i < input.length) {
      const gap = space();
      if (input[i] === ">") { i++; break; }
      if (input[i] === "/" && input[i + 1] === ">") { i += 2; selfClosing = true; break; }
      const attr = gap ? take(namePattern) : null;
      if (!attr || attr.length > 128 || attrs.has(attr) || attrs.size >= 64)
        throw Error("Atributo XML inválido ou repetido.");
      space();
      if (input[i++] !== "=") throw Error("Atributo XML sem valor.");
      space();
      const quote = input[i++];
      if (quote !== '"' && quote !== "'") throw Error("Atributo XML sem aspas.");
      const end = input.indexOf(quote, i);
      if (end < 0 || end - i > 16_384) throw Error("Atributo XML incompleto ou grande demais.");
      const raw = input.slice(i, end);
      if (raw.includes("<")) throw Error("Atributo XML contém caractere inválido.");
      attrs.set(attr, entities(raw));
      i = end + 1;
    }
    if (i === input.length && input[i - 1] !== ">") throw Error("Elemento XML incompleto.");
    const node = { name, tag, attrs, parts: [], children: [] };
    if (parent) parent.children.push(node);
    else if (root) throw Error("O XML tem mais de um elemento principal.");
    else root = node;
    if (!selfClosing) stack.push(node);
  }
  if (!root || stack.length) throw Error("O documento XML está incompleto.");
  return root;
}

function child(node, name) {
  let found;
  for (const candidate of node?.children ?? []) {
    if (candidate.tag !== name) continue;
    if (found) throw Error("Campo repetido na nota: " + name + ".");
    found = candidate;
  }
  return found;
}
const children = (node, name) => node?.children.filter((item) => item.tag === name) ?? [];
const value = (node, name) => {
  const found = child(node, name);
  if (!found) return "";
  if (found.children.length) throw Error("O campo " + name + " deve conter texto.");
  const text = found.parts.join("").trim();
  if (/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/u.test(text))
    throw Error("O XML contém caracteres de direção de texto não permitidos.");
  return text;
};

function number(text, field) {
  if (!decimal.test(text)) throw Error("Valor inválido no campo " + field + ".");
  const [whole, fraction = ""] = text.split(".");
  return [BigInt(whole + fraction), 10n ** BigInt(fraction.length)];
}

function roundedCents(num, den, field) {
  const cents = Number((200n * num + den) / (2n * den));
  if (!Number.isSafeInteger(cents) || cents > 99_999_999_999) throw Error("Valor fora do limite no campo " + field + ".");
  return cents;
}

function money(node, field) {
  const text = value(node, field);
  return text ? roundedCents(...number(text, field), field) : null;
}

function product(det, index) {
  const node = child(det, "prod");
  if (!node) throw Error("Produto ausente no item " + (index + 1) + ".");
  const rawName = value(node, "xProd");
  if (!rawName || rawName.length > 120) throw Error("Nome inválido no item " + (index + 1) + ".");
  const qtyText = value(node, "qCom");
  const [qtyNum, qtyDen] = number(qtyText, "qCom");
  const qty = Number(qtyText);
  if (qty <= 0 || qty > 99999) throw Error("Quantidade fora do limite no item " + (index + 1) + ".");
  const unitRaw = value(node, "uCom").toUpperCase() || "UN";
  const priceText = value(node, "vUnCom");
  const unitPrice = priceText ? number(priceText, "vUnCom") : null;
  const reported = money(node, "vProd");
  if (reported === null && !unitPrice) throw Error("Preço ausente no item " + (index + 1) + ".");
  const gross = reported ?? roundedCents(unitPrice[0] * qtyNum, unitPrice[1] * qtyDen, "vProd");
  const discount = money(node, "vDesc") ?? 0;
  if (discount > gross) throw Error("O desconto supera o valor do item " + (index + 1) + ".");
  const unitPriceCents = unitPrice ? roundedCents(...unitPrice, "vUnCom") : Math.round(gross / qty);
  if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents > 99_999_999_999)
    throw Error("O preço unitário está fora do limite no item " + (index + 1) + ".");
  return {
    rawName, name: readableName(rawName), code: value(node, "cProd"), qty, unit: units.get(unitRaw) ?? "", unitRaw,
    unitPriceCents,
    totalCents: gross - discount,
  };
}

export function parseNfceXml(text) {
  const root = tree(text);
  const nfe = root.tag === "nfeProc" ? child(root, "NFe") : root.tag === "NFe" ? root : null;
  const info = root.tag === "infNFe" ? root : child(nfe, "infNFe");
  if (!info) throw Error("Não encontrei os dados da nota no XML.");
  const id = info.attrs.get("Id") ?? "";
  const chave = id.startsWith("NFe") ? id.slice(3) : "";
  if (!isChave(chave) || chave.slice(20, 22) !== "65") throw Error("A chave da NFC-e não é válida.");
  const protocol = value(child(child(root, "protNFe"), "infProt"), "chNFe");
  if (protocol && protocol !== chave) throw Error("A chave do protocolo não confere com a nota.");

  const ide = child(info, "ide");
  const model = value(ide, "mod");
  if (model && model !== "65") throw Error("O modelo do documento não é NFC-e.");
  const issued = value(ide, "dhEmi") || value(ide, "dEmi");
  const issuedDate = issued.slice(0, 10);
  const issuedTime = issued.slice(11, 19);
  if (!safeIsIsoDate(issuedDate) || issued.length > 10 &&
      !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:Z|[+-]\d{2}:[0-5]\d)$/u.test(issued))
    throw Error("Data de emissão inválida na nota.");

  const emit = child(info, "emit");
  const marketName = value(emit, "xFant") || value(emit, "xNome");
  const cnpj = value(emit, "CNPJ");
  if (cnpj && (cnpj.length !== 14 || /\D/u.test(cnpj))) throw Error("CNPJ inválido na nota.");
  const addressNode = child(emit, "enderEmit");
  const address = ["xLgr", "nro", "xBairro", "xMun", "UF"].map((tag) => value(addressNode, tag)).filter(Boolean).join(", ");
  const items = children(info, "det").map(product);
  if (!items.length) throw Error("Não encontrei os itens da nota no XML.");
  const totals = child(child(info, "total"), "ICMSTot");
  for (const field of ["vProd", "vDesc"]) money(totals, field);
  const itemsSumCents = safeSum(items.map((item) => item.totalCents));
  const totalCents = money(totals, "vNF") ?? itemsSumCents;
  if (itemsSumCents === null || totalCents === null) throw Error("O total da nota é grande demais.");
  const paymentNode = child(info, "pag");
  money(paymentNode, "vTroco");
  const paymentLabels = [paymentNode, ...children(paymentNode, "detPag")].flatMap((node) => {
    money(node, "vPag");
    const code = value(node, "tPag");
    return code ? [payments.get(code) ?? "Outra forma de pagamento"] : [];
  });
  return { marketName, cnpj, address, items, itemCount: items.length, totalCents, itemsSumCents,
    totalMatchesItems: Math.abs(totalCents - itemsSumCents) <= Math.max(5, items.length),
    payment: [...new Set(paymentLabels)].join(", "), issuedDate, issuedTime, chave };
}
