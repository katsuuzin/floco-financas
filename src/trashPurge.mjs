import { restoreTrash, TRASH_DAYS } from "./trash.mjs";
import { CATALOG, LEGACY_ROOTS } from "./categories.mjs";
import { safeIsIsoDate } from "./hardened.mjs";

const day = 86400000;
const rows = (value) => Array.isArray(value) ? value : [];
function timestamp(value) {
  if (Number.isSafeInteger(value) && Math.abs(value) <= 8.64e15) return value;
  if (typeof value !== "string" || !safeIsIsoDate(value.slice(0, 10))) return NaN;
  if (value.length === 10) return Date.parse(value + "T00:00:00Z");
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value) ? Date.parse(value) : NaN;
}

export function planPurge(trash, { now, keepDays = TRASH_DAYS, maxItems = 500 } = {}) {
  const end = timestamp(now);
  const days = Number.isSafeInteger(keepDays) && keepDays >= 0 ? keepDays : TRASH_DAYS;
  const max = Number.isSafeInteger(maxItems) && maxItems >= 0 ? maxItems : 500;
  const classified = rows(trash).map((entry, index) => ({ entry, index, time: timestamp(entry?.deletedAt), code: "" }));
  const valid = [];
  const reasons = [];
  const explain = ({ entry, index, code }, message) => reasons.push({ id: entry?.id ?? null, index, code, message });
  for (const row of classified) {
    if (!Number.isFinite(row.time)) {
      explain({ ...row, code: "data_invalida" }, "Data de remoção inválida. O item foi mantido.");
    } else if (Number.isFinite(end) && end >= row.time && end - row.time >= days * day) row.code = "prazo";
    else valid.push(row);
  }
  if (!Number.isFinite(end) && classified.length)
    reasons.push({ id: null, code: "relogio_invalido", message: "Informe a data atual para verificar os prazos." });
  const excess = Math.max(0, classified.filter((row) => !row.code).length - max);
  if (excess) {
    valid.sort((a, b) => a.time - b.time || a.index - b.index).slice(0, excess).forEach((row) => { row.code = "limite"; });
  }
  const keep = [];
  const purge = [];
  for (const row of classified) {
    if (!row.code) { keep.push(row.entry); continue; }
    purge.push(row.entry);
    explain(row, row.code === "prazo" ? "O prazo de restauração terminou." : "O item excede a capacidade da lixeira.");
  }
  return { keep, purge, reasons };
}

export function restoreFromTrash(state = {}, id) {
  const trash = rows(state.trash);
  const entry = typeof id === "string" && id ? trash.find((row) => row?.id === id) : undefined;
  if (!entry) return { error: "Item não está mais na lixeira." };
  if (!Array.isArray(entry.transactions) || !entry.transactions.length) return { error: "Este item não tem lançamentos para restaurar." };
  const transactions = rows(state.transactions);
  const used = new Set(transactions.map((row) => row?.id));
  const categories = new Set([...CATALOG.map((category) => category.name), ...LEGACY_ROOTS,
    ...rows(state.customCategories).map((category) => category?.name)]);
  const restored = [];
  for (const row of entry.transactions) {
    if (!row || typeof row.id !== "string" || !row.id) return { error: "Um lançamento da lixeira está inválido." };
    if (used.has(row.id)) return { error: "Já existe um lançamento com o mesmo identificador." };
    used.add(row.id);
    restored.push(row.type === "transfer" || row.category && categories.has(row.category) ? row :
      { ...row, category: "Outros", subcategory: "" });
  }
  const candidate = { ...state, accounts: rows(state.accounts), cards: rows(state.cards), transactions,
    trash: trash.map((row) => row === entry ? { ...entry, transactions: restored } : row) };
  try { return restoreTrash(candidate, id); } catch (error) { return { error: error.message }; }
}

export function emptyTrashPlan(trash) {
  const entries = rows(trash);
  const count = entries.length;
  const transactions = entries.reduce((sum, row) => sum + rows(row?.transactions).length, 0);
  return { count, transactions, message: count === 1 ? "Excluir 1 item da lixeira?" : "Excluir " + count + " itens da lixeira?" };
}
