create table rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  state jsonb not null default '{}'::jsonb,
  is_active boolean default true
);

-- Enable RLS
alter table rooms enable row level security;

-- Policies
create policy "Rooms are viewable by everyone" on rooms for select using (true);
create policy "Anyone can create a room" on rooms for insert with check (true);
create policy "Anyone can update a room" on rooms for update using (true);

-- Enable Realtime
alter publication supabase_realtime add table rooms;
