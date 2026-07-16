-- ============================================================
-- Migration: Personalized Plans ("Your Plan" page)
-- Run this in Supabase SQL Editor after the other migrations.
-- ============================================================

-- One row per member who has a plan. You (or Gaurav) write these by
-- hand after reviewing intake responses — nothing here is generated
-- automatically. If a member has no row yet, the dashboard shows a
-- "please complete your onboarding form" message instead.
create table if not exists member_plans (
  member_id uuid references members(id) on delete cascade primary key,
  opening_letter text,
  profile_summary text,
  diet text,
  morning_routine text,
  evening_routine text,
  womb_detox text,
  movement text,
  subconscious_reprogramming text,
  journaling text,
  affirmations text,
  daily_checklist text,
  closing_letter text,
  updated_at timestamp with time zone default now()
);
alter table member_plans enable row level security;
create policy "member_plans_select_own" on member_plans for select using (auth.uid() = member_id);

-- ============================================================
-- To add a plan for a member, insert a row here (Table Editor, or SQL
-- like the example below). Use $$ ... $$ instead of single quotes
-- around each block of text — this avoids needing to escape every
-- apostrophe in the writing, which these documents have a lot of.
--
-- insert into member_plans (member_id, diet, morning_routine, ...)
-- values (
--   'the-members-uuid-here',
--   $$Diet section text goes here, apostrophes and all — no escaping needed.$$,
--   $$Morning routine text...$$,
--   ...
-- )
-- on conflict (member_id) do update set
--   diet = excluded.diet,
--   morning_routine = excluded.morning_routine,
--   updated_at = now();
-- ============================================================
