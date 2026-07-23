create table room_vetoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  room_id uuid not null references rooms(id) on delete cascade,
  player_id text not null,
  faction_ids jsonb not null default '[]'::jsonb,
  unique (room_id, player_id)
);

-- Enable RLS
alter table room_vetoes enable row level security;

-- Policies (same open posture as `rooms`: no auth in this app, link-based identity)
create policy "Room vetoes are viewable by everyone" on room_vetoes for select using (true);
create policy "Anyone can submit a room veto" on room_vetoes for insert with check (true);
create policy "Anyone can update a room veto" on room_vetoes for update using (true);

-- Enable Realtime
alter publication supabase_realtime add table room_vetoes;
