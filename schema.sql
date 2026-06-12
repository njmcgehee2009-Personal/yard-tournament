-- Run this in the Supabase SQL editor to create all tables + policies

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table if not exists tournaments (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  event_date   date,
  location     text,
  status       text not null default 'setup'
                 check (status in ('setup','active','completed')),
  created_at   timestamptz not null default now()
);

create table if not exists teams (
  id              uuid primary key default uuid_generate_v4(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  name            text not null,
  color           text not null default '#3B82F6',
  created_at      timestamptz not null default now()
);

create table if not exists games (
  id              uuid primary key default uuid_generate_v4(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  name            text not null,
  format          text not null check (format in ('round_robin','single_elim','double_elim')),
  status          text not null default 'setup'
                    check (status in ('setup','active','completed')),
  created_at      timestamptz not null default now()
);

create table if not exists matches (
  id                  uuid primary key default uuid_generate_v4(),
  game_id             uuid not null references games(id) on delete cascade,
  team1_id            uuid references teams(id),
  team2_id            uuid references teams(id),
  score1              integer,
  score2              integer,
  winner_id           uuid references teams(id),
  round               integer not null,
  position            integer not null default 0,
  bracket             text not null default 'main',
  status              text not null default 'pending'
                        check (status in ('pending','active','completed','bye')),
  created_at          timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table tournaments  enable row level security;
alter table teams        enable row level security;
alter table games        enable row level security;
alter table matches      enable row level security;

-- Anyone can read
create policy "public read tournaments"  on tournaments  for select using (true);
create policy "public read teams"        on teams        for select using (true);
create policy "public read games"        on games        for select using (true);
create policy "public read matches"      on matches      for select using (true);

-- Only authenticated users (organizers) can write
create policy "auth write tournaments"  on tournaments  for all using (auth.role() = 'authenticated');
create policy "auth write teams"        on teams        for all using (auth.role() = 'authenticated');
create policy "auth write games"        on games        for all using (auth.role() = 'authenticated');
create policy "auth write matches"      on matches      for all using (auth.role() = 'authenticated');

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Enable realtime for live standings updates
alter publication supabase_realtime add table matches;
