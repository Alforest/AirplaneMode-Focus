-- Preferences exist independently of profiles: setting a goal never requires
-- choosing a public nickname or enrolling in a challenge. Null is a removal marker.
create table public.weekly_study_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal_minutes integer,
  revision uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  constraint weekly_goal_valid check (goal_minutes is null or
    (goal_minutes between 30 and 10080 and goal_minutes % 30 = 0))
);
alter table public.weekly_study_goals enable row level security;
revoke all on public.weekly_study_goals from anon, authenticated;
grant select on public.weekly_study_goals to authenticated;
create policy "Read own weekly goal" on public.weekly_study_goals for select to authenticated
  using ((select auth.uid()) = user_id);

create function public.save_weekly_study_goal(p_owner uuid, p_minutes integer, p_expected_revision uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result public.weekly_study_goals; changed boolean := false;
begin
  if auth.uid() is null or auth.uid() <> p_owner or p_owner is null then
    raise exception 'Sign in to the matching account to save your goal.';
  end if;
  if p_minutes is not null and (p_minutes < 30 or p_minutes > 10080 or p_minutes % 30 <> 0) then
    raise exception 'Choose a goal in half-hour steps from 0.5 to 168 hours.';
  end if;
  -- Serializes first saves and account deletion along with later revision checks.
  perform 1 from auth.users where id = p_owner for update;
  select * into result from public.weekly_study_goals where user_id = p_owner;
  if not found then
    if p_expected_revision is not null then raise exception 'Goal was removed with its account data. Refresh before saving.'; end if;
    insert into public.weekly_study_goals(user_id, goal_minutes) values(p_owner, p_minutes) returning * into result;
    changed := true;
  elsif result.revision = p_expected_revision then
    update public.weekly_study_goals set goal_minutes = p_minutes, revision = gen_random_uuid(), updated_at = now()
      where user_id = p_owner returning * into result;
    changed := true;
  end if;
  return jsonb_build_object('applied', changed, 'goal_minutes', result.goal_minutes, 'revision', result.revision);
end;
$$;
revoke all on function public.save_weekly_study_goal(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.save_weekly_study_goal(uuid, integer, uuid) to authenticated;
