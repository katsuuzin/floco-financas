// Persistência por entidade. O estado do app continua sendo um objeto imutável
// ({ accounts: [...], transactions: [...], settings: {...} }); aqui ele é gravado
// como uma linha por registro, e só o que mudou é regravado.
//
// Regras:
// - Toda chave de topo que é array vira uma coleção (uma linha por item, com `id`).
// - As demais chaves (version, settings...) vão para `meta` como JSON.
// - Uma linha muda quando o objeto deixa de ser o mesmo (referência) ou muda de posição.
//   As funções de domínio já retornam cópias só do que alteram, então a comparação
//   por referência é exata e barata.

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS rows (
     collection TEXT NOT NULL,
     id TEXT NOT NULL,
     ord INTEGER NOT NULL,
     json TEXT NOT NULL,
     PRIMARY KEY (collection, id)
   )`,
  `CREATE INDEX IF NOT EXISTS rows_order ON rows (collection, ord)`,
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL)`,
];
export const SCHEMA_VERSION = 1;

const isCollection = (value) => Array.isArray(value);

export function diffState(prev, next) {
  const upserts = [];
  const deletes = [];
  const meta = [];
  const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next)]);
  for (const key of keys) {
    const before = prev?.[key];
    const after = next[key];
    if (isCollection(after) || (after === undefined && isCollection(before))) {
      const rows = after || [];
      const old = new Map();
      (isCollection(before) ? before : []).forEach((row, index) =>
        old.set(row.id, { row, index }),
      );
      const seen = new Set();
      rows.forEach((row, index) => {
        if (!row || typeof row.id !== "string")
          throw Error(`Registro sem identificador em ${key}.`);
        if (seen.has(row.id)) throw Error(`Identificador repetido em ${key}.`);
        seen.add(row.id);
        const was = old.get(row.id);
        if (!was || was.row !== row || was.index !== index)
          upserts.push({
            collection: key,
            id: row.id,
            ord: index,
            json: JSON.stringify(row),
          });
      });
      for (const id of old.keys())
        if (!seen.has(id)) deletes.push({ collection: key, id });
    } else if (before !== after) {
      if (after === undefined) meta.push({ key, json: null });
      else meta.push({ key, json: JSON.stringify(after) });
    }
  }
  return { upserts, deletes, meta };
}

export const isEmptyDiff = (d) =>
  !d.upserts.length && !d.deletes.length && !d.meta.length;

// db: qualquer objeto com runSync(sql, params) — expo-sqlite e node:sqlite servem.
export function applyDiff(db, diff) {
  for (const r of diff.upserts)
    db.runSync(
      "INSERT INTO rows (collection, id, ord, json) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(collection, id) DO UPDATE SET ord = excluded.ord, json = excluded.json",
      [r.collection, r.id, r.ord, r.json],
    );
  for (const r of diff.deletes)
    db.runSync("DELETE FROM rows WHERE collection = ? AND id = ?", [
      r.collection,
      r.id,
    ]);
  for (const m of diff.meta)
    if (m.json === null) db.runSync("DELETE FROM meta WHERE key = ?", [m.key]);
    else
      db.runSync(
        "INSERT INTO meta (key, json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json",
        [m.key, m.json],
      );
}

// rows: [{collection, json}] já ordenados por (collection, ord); metaRows: [{key, json}]
export function assembleState(rows, metaRows, base = {}) {
  const state = { ...base };
  for (const m of metaRows) state[m.key] = JSON.parse(m.json);
  for (const key of Object.keys(base))
    if (isCollection(base[key])) state[key] = [];
  for (const r of rows) {
    if (!isCollection(state[r.collection])) state[r.collection] = [];
    state[r.collection].push(JSON.parse(r.json));
  }
  return state;
}

export const LOAD_ROWS =
  "SELECT collection, json FROM rows ORDER BY collection, ord";
export const LOAD_META = "SELECT key, json FROM meta";
// Older fresh installs wrote only changed fields, without the version marker.
// Existing rows must be loaded instead of silently starting an empty state.
export const HAS_STORED_DATA =
  "SELECT 1 FROM meta UNION ALL SELECT 1 FROM rows LIMIT 1";

// Igualdade estrutural usada para conferir a migração antes de confiar no banco novo.
export function sameData(a, b) {
  return stable(a) === stable(b);
}
function stable(value) {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .filter((k) => value[k] !== undefined)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + stable(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
