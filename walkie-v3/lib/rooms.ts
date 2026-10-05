import { supabase } from './supabase';

function makeCode(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function createRoom(name: string, userId: string) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Room name is required.');

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const { data, error } = await supabase
      .from('rooms')
      .insert({ name: cleanName, code, created_by: userId })
      .select('id,name,code')
      .single();

    if (!error && data) {
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({ room_id: data.id, user_id: userId });

      if (memberError) throw memberError;
      return data;
    }

    // Unique-code collision: retry. Other database errors are surfaced.
    if (error && error.code !== '23505') throw error;
  }

  throw new Error('Could not create a unique room code. Try again.');
}

export async function joinRoom(code: string) {
  const cleanCode = code.trim().toUpperCase();
  if (cleanCode.length !== 6) throw new Error('Room code must be 6 characters.');

  const { data, error } = await supabase.rpc('join_room_by_code', {
    p_code: cleanCode,
  });

  if (error) throw new Error(error.message || 'Could not join room.');
  const room = Array.isArray(data) ? data[0] : data;
  if (!room) throw new Error('Room not found. Check the code.');
  return room as { id: string; name: string; code: string };
}
