# FitQuest Supabase Migration

## Apply SQL

Run `supabase/schema.sql` in the Supabase SQL editor for the project used by:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The script creates:

- profiles
- user_preferences
- workouts
- achievements
- user_achievements
- badges
- user_badges
- daily_quests
- user_daily_quests
- recommendation_history

It also enables Row Level Security, creates policies, adds indexes and triggers, and seeds the default achievements, badges, and daily quests.

## Supabase Dashboard Configuration

1. Authentication -> Providers -> Email
   - Enable Email provider.
   - Choose whether email confirmation is required.
2. Authentication -> URL Configuration
   - Add the Vercel production URL to Site URL.
   - Add local dev URL, usually `http://localhost:5173`, to Redirect URLs.
3. Project Settings -> API
   - Confirm the anon key matches `VITE_SUPABASE_ANON_KEY`.
4. Table Editor
   - Confirm RLS is enabled on all FitQuest tables.
   - Confirm global tables have read-only policies for authenticated users.

## Deployment Checklist

1. Run `npm run build` in `frontend`.
2. Run `supabase/schema.sql` in the Supabase project.
3. Confirm Vercel env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Redeploy the Vercel project.
5. Create a new account in production.
6. Log a workout and verify it appears in Supabase `workouts`.
7. Refresh and verify session persistence.

## Cross-Device Testing Checklist

1. Sign up or log in on laptop.
2. Log one workout.
3. Confirm Dashboard XP, level, achievements, quests, and recent workouts update.
4. Open the same Vercel URL on phone.
5. Log in with the same account.
6. Confirm:
   - same profile name and email
   - same age preference
   - same workouts
   - same XP and level
   - same achievement progress
   - same badge progress
   - same daily quest progress
   - recommendations reflect the same workout history

## Legacy Local Data Migration

On first Supabase login, FitQuest reads the old browser keys:

- `fitquest.localWorkouts.<userId>`
- `fitquest.localWorkouts`
- `fitquest.profileAge.<userId>`
- `fitquest.profileAge`
- `fitquest.recommendationHistory`

It uploads legacy workouts using `local_legacy_id`, saves age to `user_preferences`, sets `local_migration_completed_at`, and removes the old keys. The unique `(user_id, local_legacy_id)` index prevents duplicate imports.
