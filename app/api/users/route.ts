import { z } from 'zod';
import { ALL_PERMISSIONS, publicProfile, requireManager } from '../_lib/access';
import { ensureSchema, getD1 } from '../../../db/runtime';
import type { ProfileRow } from '../../../db/schema';

export const dynamic = 'force-dynamic';

const roleSchema = z.enum(['operario', 'coordinador', 'manager']);
const permissionSchema = z.enum(ALL_PERMISSIONS);
const createSchema = z.object({ email: z.email(), displayName: z.string().trim().min(2).max(80), role: roleSchema, permissions: z.array(permissionSchema) });
const updateSchema = z.object({ id: z.string().uuid(), displayName: z.string().trim().min(2).max(80), role: roleSchema, status: z.enum(['pending', 'active', 'blocked']), permissions: z.array(permissionSchema) });

export async function GET() {
  if (!await requireManager()) return Response.json({ error: 'Sin permiso de manager.' }, { status: 403 });
  await ensureSchema();
  const rows = await getD1().prepare('SELECT * FROM profiles ORDER BY created_at DESC').all<ProfileRow>();
  return Response.json({ users: rows.results.map(publicProfile) });
}

export async function POST(request: Request) {
  if (!await requireManager()) return Response.json({ error: 'Sin permiso de manager.' }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: 'Revisa el nombre, correo y permisos.' }, { status: 400 });
  const existing = await getD1().prepare('SELECT id FROM profiles WHERE email = ?').bind(parsed.data.email).first();
  if (existing) return Response.json({ error: 'Ya existe un perfil con ese correo.' }, { status: 409 });
  const now = new Date().toISOString();
  const row: ProfileRow = { id: crypto.randomUUID(), user_id: `invite:${parsed.data.email}`, email: parsed.data.email, display_name: parsed.data.displayName, role: parsed.data.role, permissions_json: JSON.stringify(parsed.data.permissions), status: 'active', created_at: now, updated_at: now };
  await getD1().prepare(`INSERT INTO profiles (id,user_id,email,display_name,role,permissions_json,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`)
    .bind(row.id,row.user_id,row.email,row.display_name,row.role,row.permissions_json,row.status,row.created_at,row.updated_at).run();
  return Response.json({ user: publicProfile(row) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const manager = await requireManager();
  if (!manager) return Response.json({ error: 'Sin permiso de manager.' }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: 'Datos de perfil no válidos.' }, { status: 400 });
  if (parsed.data.id === manager.id && (parsed.data.role !== 'manager' || parsed.data.status !== 'active')) {
    return Response.json({ error: 'No puedes retirar tu propio acceso de manager.' }, { status: 400 });
  }
  const now = new Date().toISOString();
  await getD1().prepare('UPDATE profiles SET display_name=?, role=?, permissions_json=?, status=?, updated_at=? WHERE id=?')
    .bind(parsed.data.displayName, parsed.data.role, JSON.stringify(parsed.data.permissions), parsed.data.status, now, parsed.data.id).run();
  return Response.json({ ok: true });
}
