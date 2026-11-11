import { hasOperator, toAmountText } from "./calc.mjs";

const maximum = 99_999_999_999n;
const invalid = "Confira os números e os sinais da conta.";
const whole = /^\d+(?:[.,]\d+)?$/u;
const grouped = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/u;

function number(text) {
  const normalized = grouped.test(text) ? text.replace(/\./gu, "").replace(",", ".") : text.replace(",", ".");
  if (!whole.test(normalized) && !/^\.\d+$/u.test(normalized)) throw Error(invalid);
  const [integer, decimal = ""] = normalized.split(".");
  return [BigInt((integer || "0") + decimal), 10n ** BigInt(decimal.length)];
}

function calculate(a, operator, b) {
  const [an, ad] = a;
  const [bn, bd] = b;
  if (operator === "+") return [an * bd + bn * ad, ad * bd];
  if (operator === "-") return [an * bd - bn * ad, ad * bd];
  if (operator === "*") return [an * bn, ad * bd];
  if (bn === 0n) throw Error("Não é possível dividir por zero.");
  return bn < 0n ? [-an * bd, -ad * bn] : [an * bd, ad * bn];
}

function parse(text) {
  const whitespace = /\s*/y;
  const digits = /[\d.,]+/y;
  let i = 0;
  const take = (regex) => {
    regex.lastIndex = i;
    const match = regex.exec(text);
    if (match) i = regex.lastIndex;
    return match?.[0];
  };
  const peek = () => { take(whitespace); return text[i]; };
  function factor(depth) {
    let sign = 1n;
    let next = peek();
    if (next === "+" || next === "-") {
      i++;
      if (next === "-") sign = -1n;
      next = peek();
    }
    if (next === "(") {
      if (depth >= 20) throw Error("Use até 20 níveis de parênteses.");
      i++;
      const [numerator, denominator] = expression(depth + 1);
      if (peek() !== ")") throw Error("Feche os parênteses para calcular.");
      i++;
      return [sign * numerator, denominator];
    }
    if (text.startsWith("R$", i)) { i += 2; take(whitespace); }
    const raw = take(digits);
    if (!raw) throw Error(invalid);
    const [numerator, denominator] = number(raw);
    return [sign * numerator, denominator];
  }
  function term(depth) {
    let value = factor(depth);
    for (let op = peek(); op === "*" || op === "/"; op = peek()) {
      i++;
      value = calculate(value, op, factor(depth));
    }
    return value;
  }
  function expression(depth) {
    let value = term(depth);
    for (let op = peek(); op === "+" || op === "-"; op = peek()) {
      i++;
      value = calculate(value, op, term(depth));
    }
    return value;
  }
  const result = expression(0);
  if (peek() !== undefined) throw Error(invalid);
  return result;
}

export function evaluateAmount(text) {
  if (typeof text !== "string" || !text.trim()) return { ok: false, message: "Digite um valor ou uma conta." };
  if (text.length > 100) return { ok: false, message: "Use até 100 caracteres." };
  if (text.includes("%")) return { ok: false, message: "Informe um valor em reais. Porcentagem sozinha não é um valor." };
  try {
    const [numerator, denominator] = parse(text.replace(/−/gu, "-").replace(/×/gu, "*").replace(/÷/gu, "/"));
    if (numerator < 0n) return { ok: false, message: "Use o tipo de lançamento para indicar uma saída ou entrada." };
    const value = (200n * numerator + denominator) / (2n * denominator);
    if (value > maximum) return { ok: false, message: "O resultado deve ser menor que R$ 1 bilhão." };
    const cents = Number(value);
    return { ok: true, cents, display: toAmountText(cents) };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

export const isExpression = (text) => typeof text === "string" && (hasOperator(text.trim()) || /[()%]/u.test(text));
