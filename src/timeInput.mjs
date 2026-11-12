// Hora no formato HH:MM e a grade do calendário do seletor de datas.

// Máscara enquanto se digita: só dígitos, com ":" depois das horas ("0930" -> "09:30").
export function maskTime(text) {
  const digits = String(text ?? "").replace(/\D/gu, "").slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

// "9:30", "09:30" ou "0930" -> "09:30". Hora que não existe devolve "".
export function parseTime(text) {
  const value = String(text ?? "").trim();
  const match = /^(\d{1,2})(?::|h)?(\d{2})$/u.exec(value);
  if (!match) return "";
  const [h, m] = [Number(match[1]), Number(match[2])];
  return h > 23 || m > 59 ? "" : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Semanas do mês (domingo primeiro). Células vazias são null; as demais, "AAAA-MM-DD". month de 1 a 12.
export function monthWeeks(year, month) {
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells = Array.from({ length: first }, () => null);
  for (let d = 1; d <= days; d += 1) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

// Soma `count` meses a (ano, mês) e devolve { year, month }.
export function shiftMonth(year, month, count) {
  const index = year * 12 + (month - 1) + count;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}
