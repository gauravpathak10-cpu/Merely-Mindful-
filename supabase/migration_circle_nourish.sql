-- ============================================================
-- Migration: gate Circle properly, add Nourish recipe content
-- Run after the other migrations.
-- ============================================================

-- Circle (Birth Circle / Womb Circle) is a separate paid membership
-- from the 9-Day Portal. This flag controls whether the Circle tab
-- shows at all -- defaults to false, since most members won't have it.
alter table members add column if not exists circle_enrolled boolean default false;

-- Recipe suggestions, aligned with each member's Diet section but
-- kept separate. Same pattern as the rest of member_plans: written by
-- hand after reviewing intake, no automated generation.
alter table member_plans add column if not exists recipes text;
