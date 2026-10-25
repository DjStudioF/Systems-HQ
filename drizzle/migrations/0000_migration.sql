-- Systems HQ: Stage 1 schema
create type public.theme_pref as enum ('system','light','dark');
create type public.goal_mode as enum ('focus','maintain');
create type public.goal_lifecycle as enum ('active','completed','archived');
create type public.log_status as enum ('done','minimum','skipped');
create type public.review_state as enum ('draft','submitted');

create or replace function public.is_valid_timezone(tz text)
returns boolean language sql stable set search_path = public, pg_catalog as $$
  select exists (select 1 from pg_timezone_names where name = tz);
$$;

create or replace function public.valid_days(d smallint[])
returns boolean language sql immutable set search_path = public as $$
  select d is not null
     and coalesce(array_length(d,1),0) <= 7
     and not exists (select 1 from unnest(d) x where x < 1 or x > 7)
     and d = coalesce((select array_agg(distinct x order by x) from unnest(d) x), '{}'::smallint[]);
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' then new.created_at = old.created_at; end if;
  return new;
end $$;

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  timezone text not null default 'UTC',
  timezone_confirmed boolean not null default false,
  theme public.theme_pref not null default 'system',
  consistency_threshold numeric(4,3) not null default 0.8 check (consistency_threshold > 0 and consistency_threshold <= 1),
  motto text not null default 'Build the system. Keep the promise small.' check (char_length(btrim(motto)) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.validate_profile()
returns trigger language plpgsql set search_path = public, pg_catalog as $$
begin
  if not public.is_valid_timezone(new.timezone) then
    raise exception 'Invalid timezone: %', new.timezone using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then new.id = old.id; end if;
  return new;
end $$;
create trigger profiles_validate before insert or update on public.profiles for each row execute function public.validate_profile();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- goals
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  why text not null default '' check (char_length(why) <= 2000),
  mode public.goal_mode not null default 'focus',
  start_date date not null,
  deadline date,
  outcome_notes text not null default '' check (char_length(outcome_notes) <= 2000),
  lifecycle public.goal_lifecycle not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_deadline_after_start check (deadline is null or deadline >= start_date),
  constraint goals_id_user unique (id, user_id)
);
create index goals_user_order_idx on public.goals (user_id, lifecycle, sort_order, created_at);
grant select, insert, update on public.goals to authenticated;
grant all on public.goals to service_role;
alter table public.goals enable row level security;
create policy "own goals read" on public.goals for select to authenticated using (auth.uid() = user_id);
create policy "own goals insert" on public.goals for insert to authenticated with check (auth.uid() = user_id);
create policy "own goals update" on public.goals for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger goals_updated before update on public.goals for each row execute function public.set_updated_at();

-- modules
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  goal_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  trigger text not null default '' check (char_length(trigger) <= 300),
  action text not null check (char_length(btrim(action)) between 1 and 300),
  minimum text not null check (char_length(btrim(minimum)) between 1 and 300),
  days smallint[] not null default '{}' check (public.valid_days(days)),
  archived_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint modules_goal_owner_fk foreign key (goal_id, user_id) references public.goals(id, user_id) on delete restrict,
  constraint modules_id_user unique (id, user_id)
);
create index modules_user_goal_idx on public.modules (user_id, goal_id, sort_order, created_at);
grant select, insert, update on public.modules to authenticated;
grant all on public.modules to service_role;
alter table public.modules enable row level security;
create policy "own modules read" on public.modules for select to authenticated using (auth.uid() = user_id);
create policy "own modules insert" on public.modules for insert to authenticated with check (auth.uid() = user_id);
create policy "own modules update" on public.modules for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger modules_updated before update on public.modules for each row execute function public.set_updated_at();

-- logs
create table public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  module_id uuid not null,
  log_date date not null,
  status public.log_status not null,
  timezone_at_entry text not null,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint logs_module_owner_fk foreign key (module_id, user_id) references public.modules(id, user_id) on delete restrict,
  constraint logs_unique_day unique (user_id, module_id, log_date)
);
create index logs_user_date_idx on public.logs (user_id, log_date);
grant select, insert, update, delete on public.logs to authenticated;
grant all on public.logs to service_role;
alter table public.logs enable row level security;
create policy "own logs read" on public.logs for select to authenticated using (auth.uid() = user_id);
create policy "own logs insert" on public.logs for insert to authenticated with check (auth.uid() = user_id);
create policy "own logs update" on public.logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own logs delete" on public.logs for delete to authenticated using (auth.uid() = user_id);

create or replace function public.logs_guard()
returns trigger language plpgsql set search_path = public, pg_catalog as $$
begin
  if not public.is_valid_timezone(new.timezone_at_entry) then
    raise exception 'Invalid timezone' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then
    new.revision = 1; new.created_at = now(); new.updated_at = now();
  else
    new.id = old.id; new.user_id = old.user_id; new.module_id = old.module_id;
    new.log_date = old.log_date; new.timezone_at_entry = old.timezone_at_entry;
    new.created_at = old.created_at; new.updated_at = now();
    new.revision = old.revision + 1;
  end if;
  return new;
end $$;
create trigger logs_guard before insert or update on public.logs for each row execute function public.logs_guard();

create or replace function public.modules_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.goal_id <> old.goal_id and exists (select 1 from public.logs l where l.module_id = old.id) then
    raise exception 'A module with logs cannot move to another goal' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger modules_guard before update on public.modules for each row execute function public.modules_guard();

-- weekly reviews
create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  week_start date not null check (extract(isodow from week_start) = 1),
  wins text not null default '' check (char_length(wins) <= 5000),
  skipped_and_why text not null default '' check (char_length(skipped_and_why) <= 5000),
  keep_tweak_drop text not null default '' check (char_length(keep_tweak_drop) <= 5000),
  next_week_focus text not null default '' check (char_length(next_week_focus) <= 5000),
  state public.review_state not null default 'draft',
  metrics_snapshot jsonb,
  snapshot_captured_at timestamptz,
  snapshot_timezone text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_unique_week unique (user_id, week_start)
);
grant select, insert, update on public.weekly_reviews to authenticated;
grant all on public.weekly_reviews to service_role;
alter table public.weekly_reviews enable row level security;
create policy "own reviews read" on public.weekly_reviews for select to authenticated using (auth.uid() = user_id);
create policy "own reviews insert" on public.weekly_reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "own reviews update" on public.weekly_reviews for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Snapshot fields are server-managed: clients cannot write them directly (Stage 4 adds a function).
create or replace function public.reviews_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_setting('app.snapshot_write', true) is distinct from 'on' then
    if tg_op = 'INSERT' then
      new.metrics_snapshot = null; new.snapshot_captured_at = null; new.snapshot_timezone = null;
      new.submitted_at = null; new.state = 'draft';
    else
      new.metrics_snapshot = old.metrics_snapshot; new.snapshot_captured_at = old.snapshot_captured_at;
      new.snapshot_timezone = old.snapshot_timezone; new.submitted_at = old.submitted_at; new.state = old.state;
    end if;
  end if;
  if tg_op = 'UPDATE' then new.id = old.id; new.user_id = old.user_id; new.week_start = old.week_start; end if;
  return new;
end $$;
create trigger reviews_guard before insert or update on public.weekly_reviews for each row execute function public.reviews_guard();
create trigger reviews_updated before update on public.weekly_reviews for each row execute function public.set_updated_at();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
