create table if not exists public.rooms (
  room_id text primary key check (room_id ~ '^[A-Z0-9]{6}$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id text not null references public.rooms(room_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- Keep these tables inaccessible to the mobile client. The service-role token server
-- performs the privileged room create/join/membership operations.
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
