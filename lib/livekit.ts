import { supabase } from './supabase';

export async function getLiveKitToken(roomId: string, tokenServerUrl: string) {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error('Not authenticated');

  const base = tokenServerUrl.replace(/\/$/, '');
  const response = await fetch(`${base}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ roomId }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Could not get voice-room token');
  return body as { token: string; url: string; roomName: string };
}
