import { currentProfile, publicProfile } from '../_lib/access';

export const dynamic = 'force-dynamic';

export async function GET() {
  const profile = await currentProfile();
  if (!profile) return Response.json({ authenticated: false, signInPath: '/signin-with-chatgpt?return_to=%2F' }, { status: 401 });
  return Response.json({ authenticated: true, profile: publicProfile(profile) });
}
