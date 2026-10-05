import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: '32kb' }));

const required = [
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'LIVEKIT_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.warn(`Missing server environment variables: ${missing.join(', ')}`);
}

const getSupabaseAdmin = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
};

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'walkie-talkie-token-server', status: 'running' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'walkie-talkie-token-server' });
});

app.post('/token', async (req, res) => {
  try {
    if (missing.length) {
      return res.status(500).json({ error: 'Token server is not fully configured' });
    }

    const auth = req.headers.authorization || '';
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!jwt) return res.status(401).json({ error: 'Missing bearer token' });

    const { roomId } = req.body ?? {};
    if (typeof roomId !== 'string' || !roomId.trim()) {
      return res.status(400).json({ error: 'roomId is required' });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !userData.user) {
      return res.status(401).json({ error: 'Invalid Supabase session' });
    }

    const user = userData.user;
    const normalizedRoomId = roomId.trim();

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('room_members')
      .select('room_id')
      .eq('room_id', normalizedRoomId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this room' });
    }

    const roomName = `room_${normalizedRoomId}`;
    const displayName =
      user.user_metadata?.username || user.email?.split('@')[0] || user.id;

    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: user.id,
        name: String(displayName),
        ttl: '1h',
      }
    );

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    res.json({
      token: await token.toJwt(),
      url: process.env.LIVEKIT_URL,
      roomName,
    });
  } catch (error) {
    console.error('Token error:', error);
    res.status(500).json({ error: 'Could not create token' });
  }
});

// Vercel imports this module as a serverless function. Do not call listen() there.
// Local development still uses `npm start`.
if (process.env.VERCEL !== '1') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Token server running on http://0.0.0.0:${port}`);
  });
}

export default app;
