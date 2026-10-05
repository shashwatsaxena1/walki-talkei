-- WALKIE TALKIE — FINAL DATABASE SCHEMA
-- Supabase / PostgreSQL

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 2 and 30),
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 50),
  code text unique not null check (char_length(code) = 6),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

drop policy if exists "profiles readable by authenticated users" on public.profiles;
create policy "profiles readable by authenticated users"
on public.profiles for select
to authenticated using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
on public.profiles for insert
to authenticated with check (id = auth.uid());

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
on public.profiles for update
to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "members read rooms" on public.rooms;
create policy "members read rooms"
on public.rooms for select
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.room_members rm
    where rm.room_id = rooms.id and rm.user_id = auth.uid()
  )
);

drop policy if exists "authenticated users create rooms" on public.rooms;
create policy "authenticated users create rooms"
on public.rooms for insert
to authenticated with check (created_by = auth.uid());

drop policy if exists "members read memberships" on public.room_members;
create policy "members read memberships"
on public.room_members for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.room_members rm2
    where rm2.room_id = room_members.room_id and rm2.user_id = auth.uid()
  )
);

drop policy if exists "users join rooms" on public.room_members;
create policy "users join rooms"
on public.room_members for insert
to authenticated with check (user_id = auth.uid());

-- Join by code without exposing all room rows to non-members.
create or replace function public.join_room_by_code(p_code text)
returns table (id uuid, name text, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms%rowtype;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_room
  from public.rooms
  where public.rooms.code = upper(trim(p_code))
  limit 1;

  if v_room.id is null then
    raise exception 'Room not found';
  end if;

  insert into public.room_members(room_id, user_id)
  values (v_room.id, v_user)
  on conflict (room_id, user_id) do nothing;

  return query select v_room.id, v_room.name, v_room.code;
end;
$$;

revoke all on function public.join_room_by_code(text) from public;
grant execute on function public.join_room_by_code(text) to authenticated;

-- Automatically create a profile after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      'user_' || substr(replace(new.id::text, '-', ''), 1, 8)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Remove obsolete Day-3 speaker-lock functions/columns if an older schema was installed.
drop function if exists public.claim_speaker(uuid, integer);
drop function if exists public.release_speaker(uuid);
alter table public.rooms drop column if exists active_speaker;
alter table public.rooms drop column if exists active_speaker_until;
