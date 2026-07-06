# Member Dashboard — Setup

This folder is a real, working app — not a mockup — but it needs your own Supabase
project connected before it does anything. Right now, opening `index.html` will
show a banner saying it isn't connected yet, which is expected.

## 1. Create a Supabase project (free tier is enough to start)
1. Go to supabase.com → New project
2. Save the database password somewhere safe
3. Once created: **Project Settings → API** → copy the **Project URL** and the **anon public** key
   (do NOT copy the `service_role` key — never put that one anywhere in this repo)

## 2. Set up the database
1. In Supabase: **SQL Editor → New query**
2. Paste the entire contents of `../supabase/schema.sql`
3. Run it — this creates the tables and security rules

## 2b. (Optional) Add sample content
If you'd rather see the dashboard populated than empty while you build out
your real library, run `../supabase/seed.sql` too (same SQL Editor, after
schema.sql). It's placeholder yoga/meditation/recipe entries and the 8-week
curriculum with fake Vimeo links — edit or delete any of it in the Table
Editor whenever you're ready to replace it with the real thing.

## 3. Connect the app
1. Open `dashboard/supabase-env.js`
2. Paste your Project URL and anon key into the two fields
3. Commit and push — the banner will disappear once it's configured correctly

## 4. Add your content
The dashboard reads everything live from your database — nothing is hardcoded.
In Supabase's **Table Editor**, add rows to:
- `content_library` — yoga/meditation/breathwork/recipes, tagged (e.g. `{ovulation}`, `{second_trimester}`)
- `journey_modules` — your weekly curriculum
- For each new member, a row in `members` (see below)

## 5. How members get in
Right now, a member record has to exist before someone can log in — sign-up isn't
automated yet. After a purchase, you (or your Stripe→Kit automation, extended)
need to create a row in `members` with their email and stage. When they enter
that email on the login screen, Supabase emails them a magic link; once they
click it, their `auth.users` id needs to match the `id` in their `members` row.
The cleanest way to do this: use Supabase's **Invite user by email** feature in
Authentication → Users, which creates the `auth.users` row for you — then copy
that generated user id into the matching `members.id`.

## 6. Going live
This repo already has GitHub Pages enabled for merelymindful.com. Once supabase-env.js
has real values, this dashboard will be live at:

**merelymindful.com/dashboard/**

That's the same domain as your main site — no separate subdomain needed unless
you want one later.

## What's real vs. what's still a stub
- **Real:** auth, member data, cycle/pregnancy-week math, next steps checklist,
  content library with tag filtering, journey modules and progress, circle switch
- **Stub:** the "Upcoming Live Calls" section on the Circle page — this needs a
  calendar integration (Google Calendar or Calendly) to be real
