import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { AccessToken } from 'livekit-server-sdk';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: true, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '64kb' }));

const REQUIRED = [
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'LIVEKIT_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingEnv = () => REQUIRED.filter(key => !process.env[key]);
let adminClient;

function supabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return adminClient;
}

function fail(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function roomCode(value) {
  return String(value || '').trim().toUpperCase();
}

function validRoomCode(value) {
  return /^[A-Z0-9]{6}$/.test(value);
}

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function authenticatedUser(req) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing Supabase access token'), { status: 401 });
  }

  const accessToken = header.slice(7).trim();
  if (!accessToken) {
    throw Object.assign(new Error('Missing Supabase access token'), { status: 401 });
  }

  const { data, error } = await supabaseAdmin().auth.getUser(accessToken);
  if (error || !data?.user) {
    throw Object.assign(new Error('Invalid Supabase access token'), { status: 401 });
  }
  return data.user;
}

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'walkie-talkie-token-server', version: '4.0.1' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'walkie-talkie-token-server', status: 'healthy' });
});

app.get('/ready', (_req, res) => {
  const missing = missingEnv();
  if (missing.length) return res.status(503).json({ ok: false, missing });
  return res.json({ ok: true });
});

app.post('/rooms/create', async (req, res) => {
  try {
    const missing = missingEnv();
    if (missing.length) return fail(res, 503, 'Server is not configured');

    const user = await authenticatedUser(req);
    const sb = supabaseAdmin();
    let roomId = null;

    for (let i = 0; i < 10; i += 1) {
      const candidate = makeRoomCode();
      const { data, error } = await sb.from('rooms').select('room_id').eq('room_id', candidate).maybeSingle();
      if (error) return fail(res, 500, 'Room lookup failed');
      if (!data) {
        roomId = candidate;
        break;
      }
    }

    if (!roomId) return fail(res, 500, 'Could not allocate room code');

    const { error: roomError } = await sb.from('rooms').insert({ room_id: roomId, owner_id: user.id });
    if (roomError) return fail(res, 500, 'Could not create room');

    const { error: memberError } = await sb.from('room_members').insert({ room_id: roomId, user_id: user.id });
    if (memberError) {
      await sb.from('rooms').delete().eq('room_id', roomId);
      return fail(res, 500, 'Could not add room member');
    }

    return res.json({ ok: true, roomId });
  } catch (error) {
    console.error('rooms/create', error);
    return fail(res, error.status || 500, error.status ? error.message : 'Could not create room');
  }
});

app.post('/rooms/join', async (req, res) => {
  try {
    const missing = missingEnv();
    if (missing.length) return fail(res, 503, 'Server is not configured');

    const user = await authenticatedUser(req);
    const roomId = roomCode(req.body?.roomId);
    if (!validRoomCode(roomId)) return fail(res, 400, 'Room code must be 6 letters/numbers');

    const sb = supabaseAdmin();
    const { data: room, error: roomError } = await sb.from('rooms').select('room_id').eq('room_id', roomId).maybeSingle();
    if (roomError) return fail(res, 500, 'Room lookup failed');
    if (!room) return fail(res, 404, 'Room not found');

    const { error } = await sb.from('room_members').upsert(
      { room_id: roomId, user_id: user.id },
      { onConflict: 'room_id,user_id' }
    );
    if (error) return fail(res, 500, 'Could not join room');

    return res.json({ ok: true, roomId });
  } catch (error) {
    console.error('rooms/join', error);
    return fail(res, error.status || 500, error.status ? error.message : 'Could not join room');
  }
});

app.post('/token', async (req, res) => {
  try {
    const missing = missingEnv();
    if (missing.length) return fail(res, 503, 'Server is not configured');

    const user = await authenticatedUser(req);
    const roomId = roomCode(req.body?.roomId);
    const name = String(req.body?.name || '').trim().slice(0, 60);

    if (!validRoomCode(roomId)) return fail(res, 400, 'Room code must be 6 letters/numbers');

    const sb = supabaseAdmin();
    const { data: member, error: memberError } = await sb
      .from('room_members')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError) return fail(res, 500, 'Membership check failed');
    if (!member) return fail(res, 403, 'You are not a member of this room');

    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: user.id,
        name: name || user.user_metadata?.display_name || user.email || user.id,
        ttl: '1h'
      }
    );

    token.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const jwt = await token.toJwt();
    return res.json({ ok: true, token: jwt, wsUrl: process.env.LIVEKIT_URL, roomId, expiresIn: 3600 });
  } catch (error) {
    console.error('/token', error);
    return fail(res, error.status || 500, error.status ? error.message : 'Unable to create voice token');
  }
});

if (process.env.VERCEL !== '1') {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Walkie Talkie token server listening on ${port}`);
  });
}

export default app;
