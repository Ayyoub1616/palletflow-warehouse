import { getAuthUser } from '../../chatgpt-auth';
import { ensureSchema, getD1 } from '../../../db/runtime';
import type { ProfileRow } from '../../../db/schema';

export const ALL_PERMISSIONS = ['recepciones', 'escanear', 'ubicar', 'extraer', 'inventario', 'exportar', 'usuarios'] as const;

export async function currentProfile(): Promise<ProfileRow | null> {
  await ensureSchema();
  const auth = await getAuthUser();
  const local = process.env.NODE_ENV !== 'production'
    ? { userId: 'local-manager', email: 'manager@demo.test', displayName: 'Manager demo' }
    : null;
  const user = auth ?? local;
  if (!user) return null;

  const db = getD1();
  const existing = await db.prepare('SELECT * FROM profiles WHERE user_id = ? OR email = ? LIMIT 1').bind(user.userId, user.email).first<ProfileRow>();
  if (existing) {
    if (existing.user_id.startsWith('invite:')) {
      await db.prepare('UPDATE profiles SET user_id = ?, display_name = ?, updated_at = ? WHERE id = ?')
        .bind(user.userId, user.displayName, new Date().toISOString(), existing.id).run();
      return { ...existing, user_id: user.userId, display_name: user.displayName };
    }
    return existing;
  }

  const count = await db.prepare('SELECT COUNT(*) AS total FROM profiles').first<{ total: number }>();
  const first = Number(count?.total ?? 0) === 0;
  const now = new Date().toISOString();
  const profile: ProfileRow = {
    id: crypto.randomUUID(), user_id: user.userId, email: user.email,
    display_name: user.displayName, role: first ? 'manager' : 'operario',
    permissions_json: JSON.stringify(first ? ALL_PERMISSIONS : []),
    status: first ? 'active' : 'pending', created_at: now, updated_at: now,
  };
  await db.prepare(`INSERT INTO profiles (id,user_id,email,display_name,role,permissions_json,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).bind(profile.id, profile.user_id, profile.email, profile.display_name, profile.role, profile.permissions_json, profile.status, profile.created_at, profile.updated_at).run();
  return profile;
}

export function publicProfile(profile: ProfileRow) {
  return {
    id: profile.id, email: profile.email, displayName: profile.display_name,
    role: profile.role, permissions: JSON.parse(profile.permissions_json) as string[],
    status: profile.status, createdAt: profile.created_at, updatedAt: profile.updated_at,
  };
}

export async function requireManager(): Promise<ProfileRow | null> {
  const profile = await currentProfile();
  return profile?.status === 'active' && profile.role === 'manager' ? profile : null;
}
