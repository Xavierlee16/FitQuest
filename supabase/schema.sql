create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  goal text not null default 'general fitness'
    check (goal in ('general fitness', 'strength', 'endurance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age integer not null default 25 check (age between 1 and 120),
  active_goal text not null default 'general fitness'
    check (active_goal in ('general fitness', 'strength', 'endurance')),
  local_migration_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_legacy_id text,
  exercise_group text check (exercise_group in ('cardio', 'calisthenics', 'gym')),
  exercise_type text not null,
  amount numeric not null check (amount > 0),
  unit text not null,
  duration numeric check (duration is null or duration >= 0),
  sets integer check (sets is null or sets >= 0),
  reps integer check (reps is null or reps >= 0),
  weight numeric check (weight is null or weight >= 0),
  weight_unit text,
  rpe integer check (rpe is null or rpe between 1 and 10),
  difficulty text not null default 'normal',
  workout_date date not null default current_date,
  xp_earned integer not null default 0 check (xp_earned >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
  code text primary key,
  name text not null,
  description text not null,
  rule_type text not null,
  target_amount numeric not null,
  unit text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_code text not null,
  unlocked_at date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, achievement_code)
);

create table if not exists public.badges (
  code text primary key,
  name text not null,
  description text not null,
  min_level integer not null check (min_level > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_code text not null,
  earned_at date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, badge_code)
);

create table if not exists public.daily_quests (
  code text primary key,
  name text not null,
  description text not null,
  exercise_type text not null,
  target_amount numeric not null check (target_amount > 0),
  unit text not null,
  xp_reward integer not null default 0 check (xp_reward >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_daily_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_code text not null,
  quest_date date not null default current_date,
  progress_amount numeric not null default 0 check (progress_amount >= 0),
  is_completed boolean not null default false,
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, quest_code, quest_date)
);

create table if not exists public.recommendation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null,
  category text,
  exercise_type text not null,
  title text not null,
  recommendation text not null,
  reason text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists workouts_user_legacy_id_idx
on public.workouts (user_id, local_legacy_id);

create index if not exists workouts_user_date_idx
on public.workouts (user_id, workout_date desc, created_at desc);

create index if not exists recommendation_history_user_created_idx
on public.recommendation_history (user_id, created_at desc);

create index if not exists user_daily_quests_user_date_idx
on public.user_daily_quests (user_id, quest_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at
before update on public.workouts
for each row execute function public.set_updated_at();

drop trigger if exists user_daily_quests_set_updated_at on public.user_daily_quests;
create trigger user_daily_quests_set_updated_at
before update on public.user_daily_quests
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, goal)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'goal', 'general fitness')
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id, active_goal)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'goal', 'general fitness')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.achievements (code, name, description, rule_type, target_amount, unit)
values
  ('workouts_1', 'First Step', 'Log your first workout.', 'workout_count', 1, 'workouts'),
  ('workouts_5', 'Getting Warmed Up', 'Log 5 total workouts.', 'workout_count', 5, 'workouts'),
  ('workouts_10', 'Training Habit', 'Log 10 total workouts.', 'workout_count', 10, 'workouts'),
  ('workouts_20', 'Momentum Builder', 'Log 20 total workouts.', 'workout_count', 20, 'workouts'),
  ('workouts_50', 'Quest Regular', 'Log 50 total workouts.', 'workout_count', 50, 'workouts'),
  ('workouts_100', 'Century Club', 'Log 100 total workouts.', 'workout_count', 100, 'workouts'),
  ('workouts_200', 'Iron Routine', 'Log 200 total workouts.', 'workout_count', 200, 'workouts'),
  ('workouts_500', 'Elite Consistency', 'Log 500 total workouts.', 'workout_count', 500, 'workouts'),
  ('workouts_1000', 'Legendary Adventurer', 'Log 1000 total workouts.', 'workout_count', 1000, 'workouts')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  rule_type = excluded.rule_type,
  target_amount = excluded.target_amount,
  unit = excluded.unit;

insert into public.badges (code, name, description, min_level)
values
  ('bronze', 'Bronze', 'Reach level 10.', 10),
  ('silver', 'Silver', 'Reach level 25.', 25),
  ('gold', 'Gold', 'Reach level 50.', 50)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  min_level = excluded.min_level;

insert into public.daily_quests (code, name, description, exercise_type, target_amount, unit, xp_reward, is_active)
values
  ('walk_5000_steps', 'Walk 5000 Steps', 'Walk 5000 steps today.', 'walking', 5000, 'steps', 25, true),
  ('complete_50_pushups', 'Complete 50 Pushups', 'Complete 50 pushups today.', 'pushup', 50, 'reps', 25, true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  exercise_type = excluded.exercise_type,
  target_amount = excluded.target_amount,
  unit = excluded.unit,
  xp_reward = excluded.xp_reward,
  is_active = excluded.is_active;

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.workouts enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.daily_quests enable row level security;
alter table public.user_daily_quests enable row level security;
alter table public.recommendation_history enable row level security;

drop policy if exists "Profiles are own rows" on public.profiles;
create policy "Profiles are own rows" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Preferences are own rows" on public.user_preferences;
create policy "Preferences are own rows" on public.user_preferences
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Workouts are own rows" on public.workouts;
create policy "Workouts are own rows" on public.workouts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Achievements are readable" on public.achievements;
create policy "Achievements are readable" on public.achievements
for select using (true);

drop policy if exists "User achievements are own rows" on public.user_achievements;
create policy "User achievements are own rows" on public.user_achievements
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Badges are readable" on public.badges;
create policy "Badges are readable" on public.badges
for select using (true);

drop policy if exists "User badges are own rows" on public.user_badges;
create policy "User badges are own rows" on public.user_badges
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Daily quests are readable" on public.daily_quests;
create policy "Daily quests are readable" on public.daily_quests
for select using (is_active = true);

drop policy if exists "User daily quests are own rows" on public.user_daily_quests;
create policy "User daily quests are own rows" on public.user_daily_quests
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Recommendation history is own rows" on public.recommendation_history;
create policy "Recommendation history is own rows" on public.recommendation_history
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
