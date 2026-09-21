# Cadence

Give your week a rhythm: recurring classes/shifts, one-off tasks, a merged
week view, and nudges — the four things the landing page promises.

Stack: Next.js 14 (App Router) + TypeScript + Tailwind + Supabase
(Postgres + Auth). Visual language (ink/cream/marigold/violet/coral,
Baloo 2 + Manrope) carried over from the marketing landing page.

## Setup

1. Create a free project at supabase.com.
2. In the Supabase SQL editor, run `supabase/schema.sql` — creates
   `recurring_events`, `tasks`, and `user_settings` with row-level security
   so each user only ever sees their own rows.
3. If you don't want email confirmation while testing, turn off
   "Confirm email" under Authentication → Settings.
4. Copy `.env.local.example` to `.env.local` and fill in your project's URL
   and anon key (Project Settings → API).
5. Install and run:
   ```
   npm install
   npm run dev
   ```
6. Visit `/signup`, then you land in the week view.

## How the four features map to the app

- **"Add what repeats"** → `/dashboard/recurring` — day of week + start/end
  time, once, and it's on the timeline every week
- **"Drop in tasks"** → `/dashboard/tasks` — one-off deadlines with an
  optional time, checked off when done
- **"See your week"** → `/dashboard` — a 7-day grid merging both sources by
  time, current day highlighted
- **"Get nudged"** → `lib/notifications.ts` + Settings — browser
  Notification API, scheduled for whatever's left today

## Known limitation: nudges only fire while the tab is open

This build schedules notifications client-side with `setTimeout` when the
app loads, which is honest for an MVP but won't wake up a closed tab. Real
background push needs a scheduled server job (e.g. a Supabase Edge Function
on a cron) plus a service worker to receive it — worth doing once this is
past the personal-use stage.

## Not built yet

- Push notifications when the app isn't open (see above)
- Editing an existing recurring event or task (currently add/remove only)
- Hooking this up as a GrowthOS spoke, and the open question from the
  portfolio plan: whether this becomes the single source of truth for
  scheduling or GrowthOS keeps owning the semester timetable separately
