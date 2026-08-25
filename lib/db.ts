import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const globalForDb = globalThis as unknown as { db?: Database.Database };

export const db = globalForDb.db ?? new Database(path.join(dataDir, "dynasty.db"));
globalForDb.db = db;

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    sleeper_id TEXT PRIMARY KEY,
    full_name TEXT,
    position TEXT,
    team TEXT,
    age INTEGER,
    years_exp INTEGER,
    status TEXT,
    injury_status TEXT,
    injury_body_part TEXT,
    news_updated INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS dynasty_values (
    sleeper_id TEXT,
    value_set TEXT,
    fc_name TEXT,
    value INTEGER,
    overall_rank INTEGER,
    position_rank INTEGER,
    trend_30day INTEGER,
    redraft_value INTEGER,
    is_pick INTEGER DEFAULT 0,
    updated_at INTEGER,
    PRIMARY KEY (sleeper_id, value_set)
  );

  CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS watchlist (
    sleeper_id TEXT PRIMARY KEY,
    note TEXT,
    added_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

export function getSetting(key: string): string | null {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.prepare(
    "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

export function deleteSetting(key: string) {
  db.prepare("DELETE FROM app_settings WHERE key = ?").run(key);
}

export function getLastSync(key: string): number | null {
  const row = db.prepare("SELECT updated_at FROM sync_meta WHERE key = ?").get(key) as
    | { updated_at: number }
    | undefined;
  return row?.updated_at ?? null;
}

export function setLastSync(key: string) {
  db.prepare(
    "INSERT INTO sync_meta (key, updated_at) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET updated_at = excluded.updated_at"
  ).run(key, Date.now());
}
