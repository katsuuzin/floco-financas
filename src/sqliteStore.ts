import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SCHEMA,
  SCHEMA_VERSION,
  diffState,
  applyDiff,
  assembleState,
  isEmptyDiff,
  sameData,
  LOAD_ROWS,
  LOAD_META,
} from "./storage.mjs";
import { emptyState, validateBackup } from "./finance.mjs";

// Chave usada até a v1.1.x. Depois da migração ela não é mais gravada, mas é mantida
// intacta como cópia de segurança até uma versão futura confirmar que pode ser removida.
export const LEGACY_KEY = "@kat/floco-financas/v1";
const DB_NAME = "floco.db";

let db: SQLite.SQLiteDatabase | null = null;

function open() {
  if (db) return db;
  db = SQLite.openDatabaseSync(DB_NAME);
  db.execSync("PRAGMA journal_mode = WAL");
  const version = db.getFirstSync<{ user_version: number }>("PRAGMA user_version")?.user_version ?? 0;
  if (version < SCHEMA_VERSION) {
    db.withTransactionSync(() => {
      for (const sql of SCHEMA) db!.execSync(sql);
      db!.execSync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    });
  }
  return db;
}

function readAll(d: SQLite.SQLiteDatabase) {
  return assembleState(
    d.getAllSync(LOAD_ROWS) as any[],
    d.getAllSync(LOAD_META) as any[],
    emptyState(),
  );
}

function hasData(d: SQLite.SQLiteDatabase) {
  return !!d.getFirstSync("SELECT 1 FROM meta WHERE key = 'version'");
}

export type LoadResult = { state: any; migrated: boolean; fresh: boolean };

// Abre o banco; na primeira execução após a atualização, importa o JSON antigo,
// confere que o que foi gravado é idêntico ao original e só então passa a usar o SQLite.
export async function loadState(): Promise<LoadResult> {
  const d = open();
  if (hasData(d)) return { state: validateBackup(readAll(d)), migrated: false, fresh: false };

  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (!legacy) return { state: emptyState(), migrated: false, fresh: true };

  const parsed = JSON.parse(legacy);
  const original = validateBackup(parsed);
  original.settings.biometric = !!parsed.settings?.biometric;
  d.withTransactionSync(() => {
    d.execSync("DELETE FROM rows; DELETE FROM meta;");
    applyDiff(d, diffState(null, original));
  });
  const copy = readAll(d);
  if (!sameData(copy, original)) {
    d.withTransactionSync(() => d.execSync("DELETE FROM rows; DELETE FROM meta;"));
    throw Error(
      "A conferência da migração encontrou diferença. Seus dados antigos foram mantidos; reabra o app.",
    );
  }
  return { state: original, migrated: true, fresh: false };
}

// Grava a diferença entre dois estados numa transação única.
export function saveState(prev: any, next: any) {
  const d = open();
  const diff = diffState(prev, next);
  if (isEmptyDiff(diff)) return;
  d.withTransactionSync(() => applyDiff(d, diff));
}

// Substitui tudo (restauração de backup, apagar tudo).
export function replaceState(next: any) {
  const d = open();
  d.withTransactionSync(() => {
    d.execSync("DELETE FROM rows; DELETE FROM meta;");
    applyDiff(d, diffState(null, next));
  });
}
