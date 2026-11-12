// Campo de dinheiro "de caixa eletrônico": só dígitos, que entram pela direita ("1500" -> "15,00").
// O texto guardado no formulário é o mesmo que parseMoney aceita ("1.234,56"), então a lógica de dados não muda.
export const MAX_CENTS = 99_999_999_999; // R$ 999.999.999,99 (mesmo teto de parseMoney)

const grouped = (cents) => {
  const whole = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/gu, ".");
  return `${whole},${String(cents % 100).padStart(2, "0")}`;
};

// Texto digitado -> centavos. Ignora tudo que não é dígito. Vazio ou só zeros = 0.
export function centsFromDigits(text) {
  const digits = String(text ?? "").replace(/\D/gu, "").replace(/^0+/u, "");
  if (!digits) return 0;
  if (digits.length > 12) return Infinity; // passa do teto
  return Number(digits);
}

// Máscara enquanto se digita. Devolve { text, tooBig }: se o novo dígito passaria do teto, mantém o texto de antes.
// allowZero: quem digitou só zeros vê "0,00" (saldo real pode ser zero); sem isso, zero fica vazio.
export function maskMoney(text, previous = "", { allowZero = false } = {}) {
  const cents = centsFromDigits(text);
  if (cents > MAX_CENTS) return { text: previous, tooBig: true };
  const typed = /\d/u.test(String(text ?? ""));
  return { text: cents === 0 ? (allowZero && typed ? "0,00" : "") : grouped(cents), tooBig: false };
}

// Valor que veio de fora (edição, "Usar", sugestão: "1500,00", "150", "1.500,5") -> texto no padrão da máscara.
// Se não for um número simples (por exemplo uma conta como "10+5"), devolve como veio.
export function normalizeMoneyText(text, { allowZero = false } = {}) {
  const raw = String(text ?? "").trim().replace(/^R\$\s*/u, "");
  if (!raw) return "";
  if (!/^[\d.]+(?:,\d{0,2})?$/u.test(raw)) return raw;
  const [whole, decimal] = raw.replace(/\./gu, "").split(",");
  const cents = Number(whole || "0") * 100 + Number((decimal ?? "").padEnd(2, "0") || "0");
  if (!Number.isFinite(cents) || cents > MAX_CENTS) return raw;
  return cents === 0 ? (allowZero ? "0,00" : "") : grouped(cents);
}

// Apaga o último dígito (a vírgula e os pontos não contam): "15,00" -> "1,50".
export const backspaceMoney = (text) => maskMoney(String(text ?? "").replace(/\D/gu, "").slice(0, -1)).text;
