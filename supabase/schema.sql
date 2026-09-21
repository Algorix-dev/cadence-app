-- Cadence schema
-- Run this in the Supabase SQL editor on a fresh project. Auth is Supabase's
-- built-in auth.users; every table is scoped to auth.uid() via RLS.

create extension if not exists "uuid-ossp";

-- ---------- Recurring items (classes, shifts, gym days...) ----------
-- day_of_week: 0 = Sunday .. 6 = Saturday, matching JS Date#getDay().
create table if not exists recurring_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  color text not null default '#6B4EFF',
  remind_minutes_before int not null default 15,
  created_at timestamptz not null default now()
);

-- ---------- One-off tasks / deadlines ----------
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_date date not null,
  due_time time,                       -- nullable: a task can be due "sometime that day"
  notes text,
  done boolean not null default false,
  remind_minutes_before int not null default 60,
  created_at timestamptz not null default now()
);

-- ---------- Settings ----------
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  default_reminder_minutes int not null default 15,
  updated_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table recurring_events enable row level security;
alter table tasks enable row level security;
alter table user_settings enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['recurring_events','tasks']
  loop
    execute format('create policy "own rows only" on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
  execute 'create policy "own row only" on user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);';
end $$;
