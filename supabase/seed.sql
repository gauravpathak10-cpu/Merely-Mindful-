-- ============================================================
-- Optional sample data — run AFTER schema.sql if you want to see
-- the dashboard populated instead of empty while you build out
-- your real content. Safe to delete/edit any of these rows later
-- in the Supabase Table Editor.
-- ============================================================

insert into content_library (title, type, tags, duration_min, media_url, description) values
('Fertility-Supportive Restorative Flow', 'yoga', '{ovulation}', 18, 'https://vimeo.com/REPLACE_ME', 'Supported hip openers for the fertile window.'),
('Womb Breathing Meditation', 'meditation', '{ovulation}', 12, 'https://vimeo.com/REPLACE_ME', 'Soften the nervous system during your fertile window.'),
('4-7-8 Calming Breath', 'breath', '{luteal}', 6, 'https://vimeo.com/REPLACE_ME', 'A short breath practice for luteal-phase anxiety.'),
('Grounding Morning Flow', 'yoga', '{menstrual}', 15, 'https://vimeo.com/REPLACE_ME', 'Gentle movement for the start of your cycle.'),
('Follicular Energy Meditation', 'meditation', '{follicular}', 10, 'https://vimeo.com/REPLACE_ME', 'A visualization to support rising energy as you approach ovulation.'),
('Prenatal Flow for Hip & Pelvic Support', 'yoga', '{second_trimester}', 20, 'https://vimeo.com/REPLACE_ME', 'Standing sequence for round ligament tension.'),
('Bonding Meditation with Baby', 'meditation', '{second_trimester}', 10, 'https://vimeo.com/REPLACE_ME', 'A visualization to deepen connection with baby.'),
('First Trimester Nausea Relief Breath', 'breath', '{first_trimester}', 8, 'https://vimeo.com/REPLACE_ME', 'Gentle breathwork for early pregnancy queasiness.'),
('Releasing Meditation', 'meditation', '{menstrual,luteal}', 15, 'https://vimeo.com/REPLACE_ME', 'For processing grief, loss, or difficult cycles.'),
('Warming Beetroot & Lentil Bowl', 'recipe', '{luteal}', 25, null, 'Iron and folate-rich, supports healthy circulation to the uterus this phase.'),
('Seed Cycling Breakfast Bowl', 'recipe', '{follicular}', 10, null, 'Flax and pumpkin seeds to support the follicular phase.'),
('Iron-Rich Greens & Chickpea Stew', 'recipe', '{second_trimester}', 30, null, 'Supports rising blood volume in the second trimester.'),
('Ginger & Peppermint Tea', 'recipe', '{first_trimester}', 5, null, 'Gentle relief for first-trimester nausea.');

insert into journey_modules (week_number, title, description, media_url, workbook_url) values
(1, 'Grounding & Intention', 'A grounding meditation and journal prompt to set your intention for the six weeks ahead.', 'https://vimeo.com/REPLACE_ME', null),
(2, 'Understanding Your Cycle', 'Learn the four phases of your cycle and how each one supports conception.', 'https://vimeo.com/REPLACE_ME', null),
(3, 'Nervous System & Fertility', 'How chronic stress affects hormonal balance, and practices to calm it.', 'https://vimeo.com/REPLACE_ME', null),
(4, 'Nourishment & the Womb', 'A lesson on foods and rhythms that support the womb, plus this week''s workbook reflection.', 'https://vimeo.com/REPLACE_ME', 'https://REPLACE_ME/week4-workbook.pdf'),
(5, 'Partner & Relationship Work', 'Bringing your partner into the conception journey with intention.', 'https://vimeo.com/REPLACE_ME', null),
(6, 'Releasing & Letting Go', 'Processing past disappointment or loss to make space for what''s next.', 'https://vimeo.com/REPLACE_ME', null),
(7, 'Ritual & Ceremony', 'Creating a personal ritual to mark this chapter.', 'https://vimeo.com/REPLACE_ME', null),
(8, 'Integration', 'Bringing the last seven weeks together into daily life.', 'https://vimeo.com/REPLACE_ME', null);

-- Note: this seeds the shared catalog only. Per-member rows (members,
-- progress, next_steps) are created per person as they enroll — see
-- dashboard/README.md section 5 for how that works.
