// Catálogo de apps bancários para a captura de notificações (F4) e remetentes de SMS (F5).
// [pacote Android, nome exibido, palavra que identifica o remetente do SMS]
// Um pacote errado apenas não captura nada; o usuário liga só os bancos que usa.
export const BANK_APPS = [
  ["com.nu.production", "Nubank", "nubank"],
  ["br.com.intermedium", "Inter", "inter"],
  ["com.itau", "Itaú", "itau"],
  ["com.itau.empresas", "Itaú Empresas", "itau"],
  ["com.bradesco", "Bradesco", "bradesco"],
  ["br.com.bradesco.next", "Next", "next"],
  ["br.com.bb.android", "Banco do Brasil", "bb"],
  ["br.com.gabba.Caixa", "Caixa", "caixa"],
  ["com.santander.app", "Santander", "santander"],
  ["com.c6bank.app", "C6 Bank", "c6"],
  ["com.picpay", "PicPay", "picpay"],
  ["com.mercadopago.wallet", "Mercado Pago", "mercado pago"],
  ["br.com.uol.ps.myaccount", "PagBank", "pagbank"],
  ["br.com.neon", "Neon", "neon"],
  ["br.com.original.bank", "Banco Original", "original"],
  ["br.com.digio", "Digio", "digio"],
  ["br.com.bancopan.cartoes", "Banco PAN", "pan"],
  ["com.btg.pactual.banking", "BTG Pactual", "btg"],
  ["br.com.xp.carteira", "XP", "xp"],
  ["br.com.banrisul", "Banrisul", "banrisul"],
  ["br.com.sicredi.app.mobi", "Sicredi", "sicredi"],
  ["br.com.sicoobnet", "Sicoob", "sicoob"],
  ["com.willbank.app", "Will Bank", "will"],
  ["br.com.brb.digital", "BRB", "brb"],
  ["br.com.bancobmg.bancodigital", "Banco BMG", "bmg"],
  ["br.com.safra.digital", "Safra", "safra"],
  ["com.recarga.recargapay", "RecargaPay", "recargapay"],
  ["br.com.ame.digital", "Ame Digital", "ame"],
  ["br.com.alelo.meualelo", "Alelo (benefício)", "alelo"],
  ["br.com.ticket.ticketapp", "Ticket (benefício)", "ticket"],
  ["br.com.sodexo.app", "Pluxee/Sodexo (benefício)", "pluxee"],
  ["br.com.vr.vrapp", "VR (benefício)", "vr"],
  ["com.flash.benefits", "Flash (benefício)", "flash"],
  ["br.com.caju.app", "Caju (benefício)", "caju"],
];

export const DEFAULT_NOTIFY = { banks: ["com.nu.production", "br.com.intermedium"], ignored: [], sms: false, ignoreDenied: true };

export function notifySettings(state) {
  return { ...DEFAULT_NOTIFY, ...(state.settings?.notify || {}) };
}

// Argumentos para o módulo nativo FlocoBankNotifications.configure.
export function nativeConfig(state) {
  const n = notifySettings(state);
  const chosen = BANK_APPS.filter(([pkg]) => n.banks.includes(pkg));
  return {
    packages: JSON.stringify(Object.fromEntries(chosen.map(([pkg, label]) => [pkg, label]))),
    ignored: JSON.stringify(n.ignored.filter(Boolean).slice(0, 100)),
    sms: !!n.sms,
    smsSenders: JSON.stringify([...new Set(chosen.map(([, , sms]) => sms))]),
  };
}

const plain = (x) => String(x || "").toLowerCase().replace(/^sms · /, "").trim();
// Nome curto (ou comum, como "cora") só casa como palavra inteira: "Coral" não é a Cora.
const WORD_ONLY = new Set(["cora", "wise", "porto"]);
const matches = (n, key) => (key.length <= 3 || WORD_ONLY.has(key) ? n.split(/[^a-zà-ú0-9]+/).includes(key) : n.includes(key));

// Ícones oficiais dos bancos (arquivos em assets/banks, mesmos do Kontto, a pedido do usuário).
// [palavra no nome, arquivo]. Mais específicos primeiro (Personnalité antes de Itaú).
const BANK_LOGOS = [
  ["personnalit", "itaupersonnalite"],
  ["nubank", "nubank"],
  ["nu empresas", "nubank"],
  ["inter", "inter"],
  ["itaú", "itau"],
  ["itau", "itau"],
  ["bradesco", "bradesco"],
  ["banco do brasil", "bb"],
  ["caixa", "caixa"],
  ["santander", "santander"],
  ["c6", "c6"],
  ["picpay", "picpay"],
  ["mercado pago", "mercadopago"],
  ["pagbank", "pagbank"],
  ["pagseguro", "pagbank"],
  ["neon", "neon"],
  ["original", "original"],
  ["digio", "digio"],
  ["pan", "pan"],
  ["btg", "btg"],
  ["xp", "xp"],
  ["banrisul", "banrisul"],
  ["sicredi", "sicredi"],
  ["sicoob", "sicoob"],
  ["brb", "brb"],
  ["bmg", "bmg"],
  ["safra", "safra"],
  ["alelo", "alelo"],
  ["ticket", "ticket"],
  ["vr", "vr"],
  ["flash", "flash"],
  ["caju", "caju"],
  ["samsung", "samsung"],
  ["ton", "ton"],
  ["banestes", "banestes"],
  ["agibank", "agibank"],
  ["cora", "cora"],
  ["bv", "bv"],
  ["daycoval", "daycoval"],
  ["porto", "porto"],
  ["mercantil", "mercantil"],
  ["nomad", "nomad"],
  ["ailos", "ailos"],
  ["unicred", "unicred"],
  ["cresol", "cresol"],
  ["nordeste", "bnb"],
  ["bnb", "bnb"],
  ["revolut", "revolut"],
  ["wise", "wise"],
  ["99pay", "pay99"],
  ["méliuz", "meliuz"],
  ["meliuz", "meliuz"],
  ["infinitepay", "infinitepay"],
  ["sofisa", "sofisa"],
  ["pagaleve", "pagaleve"],
  ["swile", "swile"],
  ["ifood", "ifood"],
  ["wiipo", "wiipo"],
  ["lecard", "lecard"],
  ["google wallet", "googlewallet"],
  ["contabilizei", "contabilizei"],
];

// Selo de cada banco quando não há ícone: cor da marca e sigla (desenho próprio).
// [palavra no nome, fundo, texto, sigla]
const BANK_LOOKS = [
  ["next", "#00D95F", "#0B0B0B", "Nx"],
  ["will", "#FFD600", "#0B0B0B", "W"],
  ["recargapay", "#FF6B00", "#FFFFFF", "Rp"],
  ["ame", "#E4002B", "#FFFFFF", "Am"],
  ["pluxee", "#0A2F6B", "#FFFFFF", "Px"],
  ["sodexo", "#0A2F6B", "#FFFFFF", "Sx"],
];

// Ícone do banco pelo nome (instituição, nome da conta ou rótulo da notificação):
// { known, logo } com o nome do arquivo em assets/banks. Sem ícone: selo com sigla e cor
// da marca (Next, Will…) ou selo neutro com as iniciais; carteira vazia: "$".
export function bankLook(...names) {
  for (const n of names.map(plain).filter(Boolean)) {
    const logo = BANK_LOGOS.find(([key]) => matches(n, key));
    if (logo) return { known: true, logo: logo[1], bg: "#8A8A90", fg: "#FFFFFF", abbr: "" };
    const hit = BANK_LOOKS.find(([key]) => matches(n, key));
    if (hit) return { known: true, logo: "", bg: hit[1], fg: hit[2], abbr: hit[3] };
  }
  const first = names.map((x) => String(x || "").replace(/^sms · /i, "").trim()).find(Boolean) || "";
  return { known: false, logo: "", bg: "#8A8A90", fg: "#FFFFFF", abbr: first ? first.slice(0, 2).replace(/^./, (c) => c.toUpperCase()) : "$" };
}
