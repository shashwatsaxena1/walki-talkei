import { TOKEN_SERVER_URL } from './config';

async function jsonOrEmpty(res: Response) {
  return res.json().catch(() => ({}));
}

export async function healthCheck() {
  const res = await fetch(`${TOKEN_SERVER_URL}/health`);
  const body = await jsonOrEmpty(res);
  if (!res.ok) throw new Error(body.error || `Token server returned ${res.status}`);
  return body;
}

export async function getLiveKitToken(accessToken: string, roomId: string, name: string) {
  const res = await fetch(`${TOKEN_SERVER_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ roomId, name })
  });
  const body = await jsonOrEmpty(res);
  if (!res.ok) throw new Error(body.error || `Token request failed (${res.status})`);
  return body as { token: string; wsUrl: string; roomId: string; expiresIn: number };
}

export async function roomRequest(
  accessToken: string,
  action: 'create' | 'join',
  roomId?: string,
  name?: string
) {
  const res = await fetch(`${TOKEN_SERVER_URL}/rooms/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ roomId, name })
  });
  const body = await jsonOrEmpty(res);
  if (!res.ok) throw new Error(body.error || `Room request failed (${res.status})`);
  return body as { roomId: string };
}
