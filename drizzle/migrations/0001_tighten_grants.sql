revoke all on public.profiles, public.goals, public.modules, public.logs, public.weekly_reviews from anon;
revoke all on public.profiles, public.goals, public.modules, public.logs, public.weekly_reviews from authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.goals, public.modules, public.weekly_reviews to authenticated;
grant select, insert, update, delete on public.logs to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
