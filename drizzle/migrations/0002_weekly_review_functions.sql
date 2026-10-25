create or replace function public.start_weekly_review(p_week_start date, p_timezone text)
returns public.weekly_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.weekly_reviews;
  v_snapshot jsonb;
  v_threshold numeric;
begin
  -- get-or-create: one review per account per week, never a duplicate
  select * into v_review from public.weekly_reviews
   where user_id = auth.uid() and week_start = p_week_start;
  if found then return v_review; end if;

  if extract(isodow from p_week_start) <> 1 then
    raise exception 'week_start must be a Monday' using errcode = '22023';
  end if;
  if not public.is_valid_timezone(p_timezone) then
    raise exception 'Invalid timezone' using errcode = '22023';
  end if;

  select consistency_threshold into v_threshold from public.profiles where id = auth.uid();

  -- frozen snapshot: current goals, routines, schedules and this week's results
  with mods as (
    select m.goal_id, m.id, m.name, m.days,
      coalesce(array_length(m.days, 1), 0) as target,
      (select count(*) from public.logs l
        where l.module_id = m.id and l.user_id = m.user_id
          and l.log_date between p_week_start and p_week_start + 6
          and l.status in ('done', 'minimum')) as successes
    from public.modules m
    where m.user_id = auth.uid() and m.archived_at is null
  ),
  goal_rows as (
    select g.id, g.name, g.mode,
      (select coalesce(jsonb_agg(jsonb_build_object(
          'id', mods.id, 'name', mods.name, 'days', mods.days,
          'target', mods.target, 'successes', mods.successes,
          'ratio', case when mods.target = 0 then null
                        else least(mods.successes::numeric / mods.target, 1) end
        ) order by mods.name), '[]'::jsonb)
       from mods where mods.goal_id = g.id) as modules
    from public.goals g
    where g.user_id = auth.uid() and g.lifecycle <> 'archived'
  )
  select jsonb_build_object(
      'week_start', p_week_start,
      'week_end', p_week_start + 6,
      'threshold', coalesce(v_threshold, 0.8),
      'goals', coalesce(jsonb_agg(jsonb_build_object(
          'id', id, 'name', name, 'mode', mode,
          'modules', modules,
          'consistency', (
            select avg(r) from (
              select (m->>'ratio')::numeric as r
              from jsonb_array_elements(modules) as m
              where m->>'ratio' is not null
            ) ratios
          )
        ) order by name), '[]'::jsonb)
    ) into v_snapshot
  from goal_rows;

  perform set_config('app.snapshot_write', 'on', true);
  insert into public.weekly_reviews (user_id, week_start, metrics_snapshot, snapshot_captured_at, snapshot_timezone)
  values (auth.uid(), p_week_start, v_snapshot, now(), p_timezone)
  on conflict (user_id, week_start) do nothing
  returning * into v_review;

  if not found then
    select * into v_review from public.weekly_reviews
     where user_id = auth.uid() and week_start = p_week_start;
  end if;
  return v_review;
end $$;

create or replace function public.submit_weekly_review(p_week_start date)
returns public.weekly_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.weekly_reviews;
begin
  perform set_config('app.snapshot_write', 'on', true);
  update public.weekly_reviews
     set state = 'submitted', submitted_at = now()
   where user_id = auth.uid() and week_start = p_week_start and state = 'draft'
  returning * into v_review;
  if not found then
    select * into v_review from public.weekly_reviews
     where user_id = auth.uid() and week_start = p_week_start;
    if not found then
      raise exception 'No review exists for this week' using errcode = '22023';
    end if;
  end if;
  return v_review;
end $$;

revoke execute on function public.start_weekly_review(date, text) from public, anon;
revoke execute on function public.submit_weekly_review(date) from public, anon;
grant execute on function public.start_weekly_review(date, text) to authenticated;
grant execute on function public.submit_weekly_review(date) to authenticated;