// Leitura do HTML da consulta pública da NFC-e. Lógica pura: sem rede, sem DOM (o React Native não tem DOMParser).
// Hoje só o layout de SP é conhecido. Outros estados entram quando houver uma nota real de cada um.
import { parseChave } from "./nfce.mjs";
import { expandName } from "./nfceNames.mjs";

// Endereço de consulta por estado (só os confirmados com nota real). A WebView NUNCA abre o endereço que veio
// no QR: o QR só diz a chave, e a URL é montada aqui com o host oficial do estado.
export const CONSULT_HOSTS = { SP: "www.nfce.fazenda.sp.gov.br" };
// Hosts que a página pode usar durante a consulta (redirecionamentos do próprio portal), por estado. Lista exata.
const ALLOWED_HOSTS = { SP: ["www.nfce.fazenda.sp.gov.br", "nfce.fazenda.sp.gov.br"] };
export const consultSupported = (uf) => !!CONSULT_HOSTS[uf];
export const allowedHosts = (uf) => (uf ? ALLOWED_HOSTS[uf] || [] : Object.values(ALLOWED_HOSTS).flat());

// URL para abrir na WebView: sempre montada com o host oficial do estado da chave e o ambiente 1 ou 2.
export function consultUrl(info) {
  const host = CONSULT_HOSTS[info.uf];
  if (!host) throw Error(`Ainda não consulto notas de ${info.uf}.`);
  if (!/^\d{44}$/.test(String(info.chave))) throw Error("Chave de acesso inválida.");
  const amb = info.tpAmb === "2" ? "2" : "1";
  return `https://${host}/qrcode?p=${info.chave}|3|${amb}`;
}

// Só https, porta padrão, sem usuário nem senha, e host EXATAMENTE da lista do estado (não vale qualquer .gov.br).
export function isAllowedUrl(url, uf) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
    return allowedHosts(uf).includes(u.hostname);
  } catch {
    return false;
  }
}

const decode = (s) =>
  String(s ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const strip = (h) => decode(String(h ?? "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
// "1.234,56" → 123456 centavos; vazio/inválido → null.
export function centsFromBr(text) {
  const m = String(text ?? "").match(/\d{1,3}(?:\.\d{3})*,\d{1,2}|\d+,\d{1,2}|\d+/);
  if (!m) return null;
  const [w, d = ""] = m[0].replace(/\./g, "").split(",");
  const cents = Number(w) * 100 + Number(d.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}
const qtyFromBr = (text) => {
  const m = String(text ?? "").match(/\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(/\./g, "").replace(",", ".")) : null;
};
const first = (html, re) => {
  const m = html.match(re);
  return m ? strip(m[1]) : "";
};
const spanText = (row, cls) => first(row, new RegExp(`<span[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)</span>`, "i"));

// Nome legível a partir do nome abreviado da nota: expande abreviações e, se o que sobrar ainda estiver em
// CAIXA ALTA, passa para frase. O nome original continua em `rawName`.
export function readableName(raw) {
  const base = String(raw ?? "").replace(/\s+/g, " ").trim();
  let name = "";
  try {
    name = expandName(base) || base;
  } catch {
    name = base;
  }
  const letters = name.replace(/\b\d+\s*(?:kg|g|ml|l)\b/gi, "");
  const upper = (letters.match(/[A-ZÀ-Ý]/g) || []).length;
  const lower = (letters.match(/[a-zà-ÿ]/g) || []).length;
  if (upper >= 4 && upper > lower * 1.5) {
    const low = name.toLowerCase();
    return low.charAt(0).toUpperCase() + low.slice(1);
  }
  return name;
}

const UNITS = { UN: "", UND: "", UNID: "", PC: "", PCT: "", CX: "", KG: "kg", G: "g", GR: "g", L: "l", LT: "l", ML: "ml" };

// Limites contra páginas hostis: a página real tem ~40 KB.
export const MAX_HTML_CHARS = 1_500_000;
const MAX_ROW_CHARS = 20_000;
const MAX_ROWS = 500;

// Procura as linhas de item sem expressão regular sobre o HTML todo (varredura linear, sem backtracking).
function extractRows(page) {
  const low = page.toLowerCase();
  const rows = [];
  let i = 0;
  let first = -1;
  let last = 0;
  while ((i = low.indexOf("<tr", i)) !== -1) {
    const tagEnd = low.indexOf(">", i);
    if (tagEnd === -1) break;
    if (/\bid="item/.test(low.slice(i, tagEnd))) {
      const end = low.indexOf("</tr>", tagEnd);
      if (end === -1) break;
      if (end + 5 - i > MAX_ROW_CHARS) throw Error("Um item da nota veio grande demais. A página pode estar corrompida.");
      if (rows.length >= MAX_ROWS) throw Error("A nota tem itens demais para ler.");
      if (first < 0) first = i;
      rows.push(page.slice(i, end + 5));
      last = end + 5;
      i = last;
    } else {
      i = tagEnd + 1;
    }
  }
  return { rows, first, last };
}

// HTML com quase nenhum ">" perto dos "<" é lixo (e deixaria as expressões lentas): recusa.
function assertSane(page) {
  let open = 0;
  let close = 0;
  for (let k = 0; k < page.length; k++) {
    const ch = page.charCodeAt(k);
    if (ch === 60) open++;
    else if (ch === 62) close++;
  }
  if (open > 50 && close < open * 0.5) throw Error("A página da nota veio malformada.");
}

// Lê o HTML da página de consulta de SP. Lança erro em português se não achar a tabela de itens.
export function parseNfceHtml(html, { uf = "SP" } = {}) {
  const page = String(html ?? "");
  if (/Request Rejected/i.test(page) && page.length < 2000) throw Error("A SEFAZ recusou a consulta. Tente de novo mais tarde.");
  if (uf !== "SP") throw Error(`Ainda não leio as notas de ${uf}.`);
  if (page.length > MAX_HTML_CHARS) throw Error("A página da nota é grande demais para ler.");
  assertSane(page);
  const { rows, first: firstRow, last: lastRow } = extractRows(page);
  if (!rows.length) throw Error("Não achei os itens da nota na página. Ela pode ainda não estar publicada.");

  const items = rows.map((row, i) => {
    const rawName = spanText(row, "txtTit");
    const code = (spanText(row, "RCod").match(/C[óo]digo:\s*([^)\s]+)/i) || [])[1] || "";
    const qty = qtyFromBr(spanText(row, "Rqtd").replace(/Qtde\.?:?/i, ""));
    const unitRaw = spanText(row, "RUN").replace(/UN:?/i, "").trim().toUpperCase() || "UN";
    const unitPriceCents = centsFromBr(spanText(row, "RvlUnit").replace(/Vl\.?\s*Unit\.?:?/i, ""));
    const totalCents = centsFromBr(spanText(row, "valor"));
    if (!rawName || !qty || !totalCents) throw Error(`Item ${i + 1} da nota veio incompleto.`);
    return {
      rawName,
      name: readableName(rawName),
      code,
      qty,
      unit: UNITS[unitRaw] ?? "",
      unitRaw,
      unitPriceCents: unitPriceCents ?? Math.round(totalCents / qty),
      totalCents,
    };
  });

  // Cabeçalho (antes da tabela) e rodapé (depois): as expressões abaixo rodam só neste recorte, com teto.
  const meta = page.slice(Math.max(0, firstRow - 30_000), firstRow) + page.slice(lastRow, lastRow + 60_000);
  const marketName = first(meta, /<div[^>]*class="[^"]*\btxtTopo\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const cnpj = (first(meta, /CNPJ:\s*([\d./-]{14,18})/i).replace(/\D/g, "") || "").slice(0, 14);
  const addr = [...meta.matchAll(/<div[^>]*class="[^"]*\btext\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)].map((m) => strip(m[1])).find((t) => t && !/CNPJ/i.test(t)) || "";
  const totalMatch = meta.match(/Valor a pagar R\$:?[\s\S]*?<span[^>]*class="[^"]*\btotalNumb\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const totalCents = totalMatch ? centsFromBr(strip(totalMatch[1])) : null;
  const countMatch = meta.match(/Qtd\.? total de itens:?[\s\S]*?<span[^>]*class="[^"]*\btotalNumb\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const itemCount = countMatch ? Number(strip(countMatch[1])) || items.length : items.length;
  const pay = meta.match(/<label[^>]*class="[^"]*\btx\b[^"]*"[^>]*>([\s\S]*?)<\/label>/i);
  const em = meta.match(/Emiss[ãa]o:\s*<\/strong>\s*([\d/]{10})\s+([\d:]{8})|Emiss[ãa]o:\s*([\d/]{10})\s+([\d:]{8})/i) || [];
  const dt = em[1] || em[3] || "";
  const issuedDate = dt ? dt.split("/").reverse().join("-") : "";
  const chave = first(meta, /<span[^>]*class="[^"]*\bchave\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i).replace(/\D/g, "");

  const sum = items.reduce((n, i) => n + i.totalCents, 0);
  return {
    marketName,
    cnpj,
    address: addr,
    items,
    itemCount,
    totalCents: totalCents ?? sum,
    itemsSumCents: sum,
    totalMatchesItems: totalCents == null ? true : Math.abs(totalCents - sum) <= Math.max(5, items.length),
    payment: pay ? strip(pay[1]) : "",
    issuedDate,
    issuedTime: em[2] || em[4] || "",
    chave: /^\d{44}$/.test(chave) ? chave : "",
  };
}

// Converte a nota lida na entrada de recordPurchase (shoppingPurchases). Não grava nada.
export function nfceToPurchase(parsed, info = {}) {
  const chave = parsed.chave || info.chave || "";
  const meta = chave ? parseChave(chave) : null;
  const date = parsed.issuedDate || (meta ? `${meta.issuedMonth}-01` : "");
  return {
    date,
    marketName: parsed.marketName,
    cnpj: parsed.cnpj || meta?.cnpj || "",
    chave,
    source: "nfce",
    totalCents: parsed.totalCents,
    items: parsed.items.map((i) => ({
      name: i.name,
      rawName: i.rawName,
      qty: i.qty,
      unit: i.unit,
      unitPriceCents: i.unitPriceCents,
      totalCents: i.totalCents,
    })),
  };
}
