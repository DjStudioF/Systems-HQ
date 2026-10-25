create or replace function public.restore_account_backup(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_goals int := 0;
  v_modules int := 0;
  v_logs int := 0;
  v_reviews int := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_backup is null or p_backup->>'app' is distinct from 'systems-hq' then
    raise exception 'Not a Systems HQ backup file' using errcode = '22023';
  end if;
  if p_backup->>'user_id' is distinct from v_uid::text then
    raise exception 'This backup belongs to a different account' using errcode = '22023';
  end if;

  -- profile preferences (backups never contain auth secrets)
  if p_backup ? 'profile' and p_backup->'profile' is not null then
    update public.profiles set
      display_name = coalesce(p_backup->'profile'->>'display_name', display_name),
      timezone = coalesce(p_backup->'profile'->>'timezone', timezone),
      theme = coalesce((p_backup->'profile'->>'theme')::public.theme_pref, theme),
      consistency_threshold = coalesce((p_backup->'profile'->>'consistency_threshold')::numeric, consistency_threshold),
      motto = coalesce(p_backup->'profile'->>'motto', motto)
    where id = v_uid;
  end if;

  -- goals: upsert by id, ownership forced to the caller, no-op when identical
  with src as (
    select * from jsonb_populate_recordset(null::public.goals, p_backup->'goals')
  ), ups as (
    insert into public.goals (id, user_id, name, why, mode, start_date, deadline, outcome_notes, lifecycle, sort_order, created_at)
    select id, v_uid, name, why, mode, start_date, deadline, outcome_notes, lifecycle, sort_order, created_at from src
    on conflict (id) do update set
      name = excluded.name, why = excluded.why, mode = excluded.mode,
      start_date = excluded.start_date, deadline = excluded.deadline,
      outcome_notes = excluded.outcome_notes, lifecycle = excluded.lifecycle,
      sort_order = excluded.sort_order
    where public.goals.user_id = v_uid and (
      public.goals.name is distinct from excluded.name or
      public.goals.why is distinct from excluded.why or
      public.goals.mode is distinct from excluded.mode or
      public.goals.start_date is distinct from excluded.start_date or
      public.goals.deadline is distinct from excluded.deadline or
      public.goals.outcome_notes is distinct from excluded.outcome_notes or
      public.goals.lifecycle is distinct from excluded.lifecycle or
      public.goals.sort_order is distinct from excluded.sort_order)
    returning 1
  ) select count(*) into v_goals from ups;

  -- modules: composite FK (goal_id, user_id) keeps ownership consistent
  with src as (
    select * from jsonb_populate_recordset(null::public.modules, p_backup->'modules')
  ), ups as (
    insert into public.modules (id, user_id, goal_id, name, trigger, action, minimum, days, archived_at, sort_order, created_at)
    select id, v_uid, goal_id, name, trigger, action, minimum, days, archived_at, sort_order, created_at from src
    on conflict (id) do update set
      name = excluded.name, trigger = excluded.trigger, action = excluded.action,
      minimum = excluded.minimum, days = excluded.days,
      archived_at = excluded.archived_at, sort_order = excluded.sort_order
    where public.modules.user_id = v_uid and (
      public.modules.name is distinct from excluded.name or
      public.modules.trigger is distinct from excluded.trigger or
      public.modules.action is distinct from excluded.action or
      public.modules.minimum is distinct from excluded.minimum or
      public.modules.days is distinct from excluded.days or
      public.modules.archived_at is distinct from excluded.archived_at or
      public.modules.sort_order is distinct from excluded.sort_order)
    returning 1
  ) select count(*) into v_modules from ups;

  -- logs: natural key (user_id, module_id, log_date); identical rows untouched
  with src as (
    select * from jsonb_populate_recordset(null::public.logs, p_backup->'logs')
  ), ups as (
    insert into public.logs (id, user_id, module_id, log_date, status, timezone_at_entry, created_at)
    select id, v_uid, module_id, log_date, status, timezone_at_entry, created_at from src
    on conflict (user_id, module_id, log_date) do update set status = excluded.status
    where public.logs.status is distinct from excluded.status
    returning 1
  ) select count(*) into v_logs from ups;

  -- reviews: snapshot fields need the same session flag the review functions use
  perform set_config('app.snapshot_write', 'on', true);
  with src as (
    select * from jsonb_populate_recordset(null::public.weekly_reviews, p_backup->'weekly_reviews')
  ), ups as (
    insert into public.weekly_reviews (id, user_id, week_start, wins, skipped_and_why, keep_tweak_drop, next_week_focus, state, metrics_snapshot, snapshot_captured_at, snapshot_timezone, submitted_at, created_at)
    select id, v_uid, week_start, wins, skipped_and_why, keep_tweak_drop, next_week_focus, state, metrics_snapshot, snapshot_captured_at, snapshot_timezone, submitted_at, created_at from src
    on conflict (user_id, week_start) do update set
      wins = excluded.wins, skipped_and_why = excluded.skipped_and_why,
      keep_tweak_drop = excluded.keep_tweak_drop, next_week_focus = excluded.next_week_focus,
      state = excluded.state, metrics_snapshot = excluded.metrics_snapshot,
      snapshot_captured_at = excluded.snapshot_captured_at,
      snapshot_timezone = excluded.snapshot_timezone, submitted_at = excluded.submitted_at
    where public.weekly_reviews.wins is distinct from excluded.wins or
      public.weekly_reviews.skipped_and_why is distinct from excluded.skipped_and_why or
      public.weekly_reviews.keep_tweak_drop is distinct from excluded.keep_tweak_drop or
      public.weekly_reviews.next_week_focus is distinct from excluded.next_week_focus or
      public.weekly_reviews.state is distinct from excluded.state or
      public.weekly_reviews.metrics_snapshot is distinct from excluded.metrics_snapshot or
      public.weekly_reviews.submitted_at is distinct from excluded.submitted_at
    returning 1
  ) select count(*) into v_reviews from ups;

  return jsonb_build_object(
    'goals', v_goals, 'modules', v_modules, 'logs', v_logs, 'reviews', v_reviews);
end $$;

revoke execute on function public.restore_account_backup(jsonb) from public, anon;
grant execute on function public.restore_account_backup(jsonb) to authenticated;