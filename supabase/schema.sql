-- ============================================================
-- Merely Mindful — Member Dashboard schema
-- Run this once in your Supabase project's SQL editor:
-- Dashboard → SQL Editor → New query → paste this whole file → Run
-- ============================================================

-- MEMBERS: one row per paying member, id matches their Supabase Auth user id
create table if not exists members (
  id uuid references auth.users(id) primary key,
  email text unique not null,
  stage text check (stage in ('ttc','pregnant','sensitive_care')) default 'ttc',
  cycle_length int default 28,
  last_period_start date,
  due_date date,
  tier text,
  circle text check (circle in ('birth','womb')) default 'womb',
  hide_day_count boolean default false,
  created_at timestamp with time zone default now()
);
alter table members enable row level security;
create policy "members_select_own" on members for select using (auth.uid() = id);
create policy "members_update_own" on members for update using (auth.uid() = id);

-- CONTENT LIBRARY: yoga / meditation / breathwork / recipes, tagged by phase
create table if not exists content_library (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  type text check (type in ('yoga','meditation','breath','recipe')),
  tags text[] default '{}',
  duration_min int,
  media_url text,
  description text,
  created_at timestamp with time zone default now()
);
alter table content_library enable row level security;
create policy "content_select_authenticated" on content_library for select using (auth.role() = 'authenticated');

-- JOURNEY MODULES: the weekly curriculum
create table if not exists journey_modules (
  id uuid default gen_random_uuid() primary key,
  week_number int not null,
  title text not null,
  description text,
  media_url text,
  workbook_url text
);
alter table journey_modules enable row level security;
create policy "modules_select_authenticated" on journey_modules for select using (auth.role() = 'authenticated');

-- PROGRESS: per-member status against each module
create table if not exists progress (
  member_id uuid references members(id) on delete cascade,
  module_id uuid references journey_modules(id) on delete cascade,
  status text check (status in ('locked','current','done')) default 'locked',
  completed_at timestamp with time zone,
  primary key (member_id, module_id)
);
alter table progress enable row level security;
create policy "progress_all_own" on progress for all using (auth.uid() = member_id);

-- NEXT STEPS: the small checklist on the Today page
create table if not exists next_steps (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references members(id) on delete cascade,
  label text not null,
  done boolean default false,
  created_at timestamp with time zone default now()
);
alter table next_steps enable row level security;
create policy "steps_all_own" on next_steps for all using (auth.uid() = member_id);

-- ============================================================
-- IMPORTANT: the sensitive-care rule lives in application logic
-- (dashboard renders the compassionate view whenever
-- members.stage = 'sensitive_care'), NOT in this schema alone.
-- Setting that flag is something only you/your team should do
-- after a disclosure — never automatically from quiz free-text.
-- ============================================================
