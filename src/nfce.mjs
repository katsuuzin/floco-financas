// Leitura do QR Code / chave de acesso da NFC-e. Lógica pura: sem rede, sem React.
// A chave tem 44 dígitos: cUF(2) AAMM(4) CNPJ(14) modelo(2) série(3) número(9) tpEmis(1) cNF(8) DV(1).
// O QR impresso no cupom é uma URL do portal do estado com ?p=chave|versão|ambiente[|...]
// (versão 3: só chave, versão e ambiente; versão 2 acrescenta id do token e hash).

export const UF_CODES = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO", 21: "MA", 22: "PI", 23: "CE",
  24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP",
  41: "PR", 42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF",
};
// Estados com leitura da nota prevista (SP, PR, SC e RS). Os demais ficam para uma atualização futura.
export const SUPPORTED_UFS = ["SP", "PR", "SC", "RS"];

// Dígito verificador (módulo 11): pesos 2 a 9 da direita para a esquerda; resto 0 ou 1 vira 0.
export function chaveDv(first43) {
  if (!/^\d{43}$/.test(first43)) throw Error("A chave precisa de 43 dígitos para calcular o verificador.");
  let sum = 0;
  let weight = 2;
  for (let i = 42; i >= 0; i--) {
    sum += Number(first43[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export const isChave = (s) => typeof s === "string" && /^\d{44}$/.test(s) && chaveDv(s.slice(0, 43)) === Number(s[43]);

export function formatCnpj(c) {
  const d = String(c).replace(/\D/g, "");
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : d;
}

// Decompõe uma chave de 44 dígitos (só confere o formato; use isChave para o verificador).
export function parseChave(chave) {
  const c = String(chave);
  if (!/^\d{44}$/.test(c)) throw Error("A chave de acesso tem 44 dígitos.");
  const ufCode = Number(c.slice(0, 2));
  const yy = Number(c.slice(2, 4));
  const mm = Number(c.slice(4, 6));
  if (mm < 1 || mm > 12) throw Error("O mês na chave de acesso não existe.");
  return {
    chave: c,
    ufCode,
    uf: UF_CODES[ufCode] || "",
    year: 2000 + yy,
    month: mm,
    issuedMonth: `${2000 + yy}-${String(mm).padStart(2, "0")}`,
    cnpj: c.slice(6, 20),
    model: c.slice(20, 22),
    series: String(Number(c.slice(22, 25))),
    number: String(Number(c.slice(25, 34))),
    tpEmis: c[34],
    dv: Number(c[43]),
  };
}

// Aceita: o texto lido do QR (URL com ?p=…), uma URL com chNFe=…, ou a chave digitada/colada
// (com ou sem espaços e pontos). Devolve os dados da nota ou lança um erro em português.
export function parseNfceInput(input) {
  const raw = String(input ?? "").trim();
  if (!raw) throw Error("Nada para ler. Aponte a câmera para o QR do cupom ou cole a chave.");
  if (raw.length > 2000) throw Error("Texto grande demais para ser um QR de nota.");

  let chave = "";
  let version = "";
  let tpAmb = "";
  let url = "";
  let source = "chave";

  if (/^https?:\/\//i.test(raw)) {
    let u;
    try {
      u = new URL(raw);
    } catch {
      throw Error("O endereço do QR não é válido.");
    }
    if (!/\.gov\.br$/i.test(u.hostname)) throw Error("O QR aponta para um endereço fora do governo. Por segurança, não vou abrir.");
    source = "qr";
    if (u.searchParams.getAll("p").length > 1) throw Error("O QR tem mais de uma chave. Por segurança, não vou abrir.");
    const p = u.searchParams.get("p");
    if (p) {
      const f = p.split("|");
      chave = f[0] || "";
      version = f[1] || "";
      tpAmb = f[2] || "";
    } else {
      chave = u.searchParams.get("chNFe") || "";
      version = u.searchParams.get("nVersao") || "";
      tpAmb = u.searchParams.get("tpAmb") || "";
    }
    url = u.toString();
  } else {
    const digits = raw.replace(/[\s.\-]/g, "");
    if (!/^\d+$/.test(digits)) throw Error("Isto não parece uma nota fiscal. Use o QR do cupom ou a chave de 44 dígitos.");
    chave = digits;
  }

  if (!/^\d{44}$/.test(chave)) throw Error("A chave de acesso da nota deve ter 44 dígitos.");
  const info = parseChave(chave);
  if (chaveDv(chave.slice(0, 43)) !== info.dv) throw Error("A chave não confere (dígito verificador). Confira se leu o QR inteiro.");
  if (info.model !== "65") throw Error("Use a nota fiscal de uma compra de mercado, com código QR.");
  if (!info.uf) throw Error("O código do estado na chave não existe.");
  if (!/^[0-9]{1,4}$/.test(version || "0")) throw Error("Versão do QR inválida.");

  return {
    ...info,
    source,
    url,
    version: version || "",
    tpAmb: tpAmb || "",
    homolog: tpAmb === "2",
    supported: SUPPORTED_UFS.includes(info.uf),
  };
}
