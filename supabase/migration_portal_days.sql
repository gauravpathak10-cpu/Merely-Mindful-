-- ============================================================
-- Migration: 9-Day Portal Days feature
-- Run this in Supabase SQL Editor AFTER schema.sql (and seed.sql,
-- if you ran it — this migration doesn't touch those tables).
-- ============================================================

-- Marks which members should see the "Portal Days" tab at all.
-- Everyone else (e.g. future 6-week programme members) won't see it.
alter table members add column if not exists portal_enrolled boolean default false;

-- The 9 days of the Conception Portal. One shared set of rows — every
-- enrolled member sees the same 9 days, unlocking on the same schedule
-- (the cohort start date lives in dashboard/app.js as PORTAL_START_DATE,
-- currently set to 2026-07-15). Update that constant for a future cohort
-- with a different start date.
create table if not exists portal_modules (
  id uuid default gen_random_uuid() primary key,
  day_number int not null unique,
  title text,
  media_url text,
  workbook_url text
);
alter table portal_modules enable row level security;
create policy "portal_modules_select_authenticated" on portal_modules for select using (auth.role() = 'authenticated');

-- Seed the 9 day rows. Day 1 has a placeholder title/link — replace
-- media_url with the real material before members start clicking Day 1.
-- Days 2-9 are intentionally nameless for now (locked, generic "Day N"
-- is all that shows until each one unlocks) — fill in titles/links as
-- each day approaches, no rush.
insert into portal_modules (day_number, title, media_url) values
(1, 'Day 1 — Opening Session', 'https://REPLACE_ME_WITH_REAL_LINK'),
(2, null, null),
(3, null, null),
(4, null, null),
(5, null, null),
(6, null, null),
(7, null, null),
(8, null, null),
(9, null, null)
on conflict (day_number) do nothing;

-- ============================================================
-- After running this, enroll your current Portal purchasers by running:
--
--   update members set portal_enrolled = true
--   where email in ('helivyas@gmail.com', 'rbisakha@gmail.com');
--
-- (Adjust the email list to match whoever actually purchased.)
-- ============================================================
