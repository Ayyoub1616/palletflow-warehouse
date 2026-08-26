import { env } from 'cloudflare:workers';

const statements = [
  `CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'operario',
    permissions_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, data_json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL, deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS operations (
    id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, action TEXT NOT NULL,
    payload_json TEXT NOT NULL, actor_user_id TEXT NOT NULL, device_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cloud_backups (
    id TEXT PRIMARY KEY, operator_name TEXT NOT NULL, data_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY, ip_address TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status)`,
  `CREATE INDEX IF NOT EXISTS idx_entities_type_updated ON entities(entity_type, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_operations_created ON operations(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_cloud_backups_created ON cloud_backups(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created ON login_attempts(ip_address,created_at)`,
];

let ready: Promise<void> | null = null;

export function getD1(): D1Database {
  if (!env.DB) throw new Error('La base de datos no está disponible.');
  return env.DB;
}

export async function ensureSchema(): Promise<void> {
  if (!ready) ready = getD1().batch(statements.map((sql) => getD1().prepare(sql))).then(() => undefined);
  return ready;
}
