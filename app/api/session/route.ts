import { z } from 'zod';
import { clearSessionCookie, configuredAdminPin, createSession, currentProfile, publicProfile, sessionCookie } from '../_lib/access';
import { ensureSchema, getD1 } from '../../../db/runtime';

export const dynamic = 'force-dynamic';
const loginSchema=z.object({name:z.string().trim().min(2).max(80),pin:z.string().max(20).optional()});
const cors={'access-control-allow-origin':'https://ayyoub1616.github.io','access-control-allow-credentials':'true','access-control-allow-methods':'GET,POST,DELETE,OPTIONS','access-control-allow-headers':'content-type'};
const json=(data:unknown,init?:ResponseInit)=>Response.json(data,{...init,headers:{...cors,...init?.headers}});

export async function OPTIONS(){return new Response(null,{status:204,headers:cors})}
export async function GET(){const profile=await currentProfile();if(!profile)return json({authenticated:false},{status:401});return json({authenticated:true,profile:publicProfile(profile)})}
export async function POST(request:Request){const parsed=loginSchema.safeParse(await request.json());if(!parsed.success)return json({error:'Escribe un nombre válido.'},{status:400});const manager=parsed.data.name.toLocaleLowerCase('es')==='ayyoub';if(manager){await ensureSchema();const ip=request.headers.get('cf-connecting-ip')||'unknown';const since=new Date(Date.now()-15*60*1000).toISOString();const recent=await getD1().prepare('SELECT COUNT(*) AS total FROM login_attempts WHERE ip_address=? AND created_at>=?').bind(ip,since).first<{total:number}>();if(Number(recent?.total||0)>=5)return json({error:'Demasiados intentos. Espera 15 minutos.'},{status:429});const pin=configuredAdminPin();if(!pin)return json({error:'El PIN de administrador todavía no está configurado.'},{status:503});if(parsed.data.pin!==pin){await getD1().prepare('INSERT INTO login_attempts (id,ip_address,created_at) VALUES (?,?,?)').bind(crypto.randomUUID(),ip,new Date().toISOString()).run();return json({error:'PIN incorrecto.'},{status:401})}await getD1().prepare('DELETE FROM login_attempts WHERE ip_address=?').bind(ip).run()}const token=await createSession(parsed.data.name,manager?'manager':'operario');return json({ok:true},{headers:{'set-cookie':sessionCookie(token)}})}
export async function DELETE(){return json({ok:true},{headers:{'set-cookie':clearSessionCookie()}})}
