// L1: calculadora do campo de valor. Avalia "10,50+3×2" sem eval, com precedência
// de × e ÷ sobre + e −. Trabalha em centavos e arredonda no fim.

const OPS = { "+": 1, "−": 1, "-": 1, "×": 2, "*": 2, "÷": 2, "/": 2 };

export function tokenize(text) {
  const src = String(text || "").replace(/\s|R\$/g, "").replace(/\./g, "");
  const out = [];
  let num = "";
  for (const ch of src) {
    if (/[\d,]/.test(ch)) num += ch;
    else if (OPS[ch]) {
      if (!num) return null;
      out.push(num, ch);
      num = "";
    } else return null;
  }
  if (num) out.push(num);
  return out;
}

const value = (s) => (/^\d+(,\d{0,2})?$|^,\d{1,2}$/.test(s) ? Number(s.replace(",", ".")) : NaN);

// Resultado em centavos, ou null se a conta estiver incompleta ou inválida.
export function evaluate(text) {
  const tokens = tokenize(text);
  if (!tokens || !tokens.length || OPS[tokens[tokens.length - 1]]) return null;
  const nums = [];
  const ops = [];
  const apply = () => {
    const b = nums.pop();
    const a = nums.pop();
    const op = ops.pop();
    if (op === "+") nums.push(a + b);
    else if (op === "−" || op === "-") nums.push(a - b);
    else if (op === "×" || op === "*") nums.push(a * b);
    else nums.push(b === 0 ? NaN : a / b);
  };
  for (const t of tokens) {
    if (OPS[t]) {
      while (ops.length && OPS[ops[ops.length - 1]] >= OPS[t]) apply();
      ops.push(t);
    } else {
      const v = value(t);
      if (Number.isNaN(v)) return null;
      nums.push(v);
    }
  }
  while (ops.length) apply();
  const cents = Math.round(nums[0] * 100);
  return Number.isFinite(cents) ? cents : null;
}

export const hasOperator = (text) => /[+−\-×*÷/]/.test(String(text || "").replace(/^-/, ""));

// Centavos -> "1234,56" (formato aceito por parseMoney).
export const toAmountText = (cents) => (cents / 100).toFixed(2).replace(".", ",");
