-- ============================================================
-- Migration: fields to store intake-derived personalization data
-- Run after the other migrations.
-- ============================================================

alter table members add column if not exists dietary_notes text;
alter table members add column if not exists timezone text;

-- ============================================================
-- These are populated per-member from real intake form answers.
-- That data lives in a separate, non-public file — never in this
-- repo — since it's personally identifiable. See the file provided
-- directly in chat for the actual UPDATE statements.
-- ============================================================
