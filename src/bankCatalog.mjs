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

export const DEFAULT_NOTIFY = { banks: ["com.nu.production", "br.com.intermedium"], ignored: [], sms: false };

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
