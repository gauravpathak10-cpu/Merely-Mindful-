-- ============================================================
-- Migration: separate "For Your Partner" content
-- Run after the other migrations.
-- ============================================================

alter table member_plans add column if not exists partner_notes text;

-- Note: existing plans (Bisakha, Heli) have partner content embedded
-- inside their `diet` field. A follow-up private SQL file moves that
-- content into this new column and removes it from `diet`, so it's
-- not duplicated in two places.
