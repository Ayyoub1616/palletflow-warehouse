import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import type { ProfileRow } from '../../../db/schema';

export const ALL_PERMISSIONS = ['recepciones', 'escanear', 'ubicar', 'extraer', 'inventario', 'exportar', 'usuarios'] as const;
const OPERATOR_PERMISSIONS = ['recepciones', 'escanear', 'ubicar', 'extraer', 'inventario'] as const;
const COOKIE = 'palletflow_session';
const encoder = new TextEncoder();

type SessionPayload = { name:string; role:'operario'|'manager'; exp:number };
const runtimeEnv=()=>env as unknown as Record<string,string|undefined>;
const secret=()=>runtimeEnv().PALLETFLOW_SESSION_SECRET||(process.env.NODE_ENV!=='production'?'palletflow-local-development-secret':undefined);
const base64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const encodePayload=(payload:SessionPayload)=>base64url(encoder.encode(JSON.stringify(payload)));

async function signature(value:string){const valueSecret=secret();if(!valueSecret)throw new Error('Falta configurar el secreto de sesión.');const key=await crypto.subtle.importKey('raw',encoder.encode(valueSecret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return base64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value))))}

export async function createSession(name:string,role:'operario'|'manager'){const payload=encodePayload({name,role,exp:Date.now()+12*60*60*1000});return `${payload}.${await signature(payload)}`}

async function readSession(token:string|undefined):Promise<SessionPayload|null>{if(!token)return null;const [payload,sig]=token.split('.');if(!payload||!sig||await signature(payload)!==sig)return null;try{const encoded=payload.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(payload.length/4)*4,'=');const json=atob(encoded);const parsed=JSON.parse(json) as SessionPayload;return parsed.exp>Date.now()?parsed:null}catch{return null}}

export function sessionCookie(token:string){return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=43200`}
export function clearSessionCookie(){return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`}

export async function currentProfile(): Promise<ProfileRow | null> {const requestHeaders=await headers();const cookie=requestHeaders.get('cookie')||'';const token=cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);const session=await readSession(token);if(!session)return null;const now=new Date().toISOString();const manager=session.role==='manager';return {id:`local:${session.name.toLocaleLowerCase('es')}`,user_id:`local:${session.name.toLocaleLowerCase('es')}`,email:'',display_name:session.name,role:session.role,permissions_json:JSON.stringify(manager?ALL_PERMISSIONS:OPERATOR_PERMISSIONS),status:'active',created_at:now,updated_at:now}}

export function configuredAdminPin(){return runtimeEnv().PALLETFLOW_ADMIN_PIN}
export function publicProfile(profile: ProfileRow) {return {id:profile.id,email:profile.email,displayName:profile.display_name,role:profile.role,permissions:JSON.parse(profile.permissions_json) as string[],status:profile.status,createdAt:profile.created_at,updatedAt:profile.updated_at}}
export async function requireManager(): Promise<ProfileRow | null> {const profile=await currentProfile();return profile?.status==='active'&&profile.role==='manager'?profile:null}
