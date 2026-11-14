-- Challenge scores are independent of imported/private history. All writes use RPCs.
create table public.study_challenges (
  id text primary key,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at)
);
insert into public.study_challenges values
  ('pre-thanksgiving-2026', '2026-11-14 00:00:00-05', '2026-11-26 00:00:00-05');
create table public.challenge_members (
  challenge_id text references public.study_challenges(id),
  user_id uuid references auth.users(id) on delete cascade,
  nickname text not null check (nickname ~ '^[A-Za-z0-9_ -]{3,20}$' and nickname = btrim(nickname)),
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create unique index challenge_nickname_unique on public.challenge_members(challenge_id, lower(nickname));
create table public.challenge_flights (
  id uuid primary key,
  challenge_id text not null,
  user_id uuid not null,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled boolean not null default false,
  foreign key (challenge_id, user_id) references public.challenge_members on delete cascade
);
create unique index one_active_challenge_flight on public.challenge_flights(user_id)
  where completed_at is null and not cancelled;
create index challenge_scores on public.challenge_flights(challenge_id, user_id) where completed_at is not null;
alter table public.study_challenges enable row level security;
alter table public.challenge_members enable row level security;
alter table public.challenge_flights enable row level security;
revoke all on public.study_challenges, public.challenge_members, public.challenge_flights from anon, authenticated;

create function public.join_study_challenge(p_nickname text) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.study_challenges; u uuid := auth.uid();
begin
  if u is null then raise exception 'Sign in to join.'; end if;
  select * into c from public.study_challenges where id = 'pre-thanksgiving-2026';
  if now() < c.starts_at or now() >= c.ends_at then raise exception 'Challenge is not open.'; end if;
  if p_nickname is null or btrim(p_nickname) !~ '^[A-Za-z0-9_ -]{3,20}$' then raise exception 'Use 3–20 letters, numbers, spaces, hyphens or underscores.'; end if;
  insert into public.challenge_members(challenge_id, user_id, nickname)
    values(c.id, u, btrim(p_nickname)) on conflict (challenge_id, user_id) do nothing;
end;
$$;

create function public.start_challenge_flight(p_id uuid, p_minutes integer) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.study_challenges; u uuid := auth.uid(); existing public.challenge_flights;
begin
  select * into c from public.study_challenges where id = 'pre-thanksgiving-2026';
  -- Lock enrollment: concurrent tabs cannot start or finish overlapping scores.
  perform 1 from public.challenge_members where challenge_id = c.id and user_id = u for update;
  if not found then raise exception 'Join the challenge before takeoff.'; end if;
  select * into existing from public.challenge_flights where id = p_id;
  if found then
    if existing.user_id = u and existing.duration_minutes = p_minutes then return; end if;
    raise exception 'Flight ID already used.';
  end if;
  if p_minutes is null or p_minutes not between 1 and 1440 then raise exception 'Invalid duration.'; end if;
  if now() < c.starts_at or now() + make_interval(mins => p_minutes) >= c.ends_at then
    raise exception 'Flight must finish before the challenge closes.';
  end if;
  update public.challenge_flights set cancelled = true where user_id = u and completed_at is null and not cancelled;
  insert into public.challenge_flights(id, challenge_id, user_id, duration_minutes) values(p_id, c.id, u, p_minutes);
end;
$$;

create function public.finish_challenge_flight(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare f public.challenge_flights; c public.study_challenges; u uuid := auth.uid();
begin
  perform 1 from public.challenge_members where challenge_id = 'pre-thanksgiving-2026' and user_id = u for update;
  select * into f from public.challenge_flights where id = p_id and user_id = u for update;
  if not found or f.cancelled then raise exception 'No eligible challenge flight.'; end if;
  if f.completed_at is not null then return; end if;
  select * into c from public.study_challenges where id = f.challenge_id;
  if now() >= c.ends_at then raise exception 'Challenge has closed.'; end if;
  if now() < f.started_at + make_interval(mins => f.duration_minutes) then raise exception 'Flight has not finished yet.'; end if;
  update public.challenge_flights set completed_at = now() where id = p_id;
end;
$$;

-- A single bounded response exposes nicknames/totals, never emails, user IDs or routes.
create function public.study_challenge_board() returns jsonb
language sql stable security definer set search_path = '' as $$
  with scores as (
    select m.user_id, m.nickname, m.joined_at, coalesce(sum(f.duration_minutes), 0)::bigint as minutes
    from public.challenge_members m left join public.challenge_flights f
      on f.challenge_id = m.challenge_id and f.user_id = m.user_id and f.completed_at is not null
    where m.challenge_id = 'pre-thanksgiving-2026' group by m.user_id, m.nickname, m.joined_at
  ), ranked as (
    select *, rank() over(order by minutes desc) as position from scores
  ), rows as (
    select nickname, minutes, position, user_id = auth.uid() as is_you
    from ranked order by minutes desc, joined_at, user_id limit 50
  )
  select jsonb_build_object(
    'starts_at', c.starts_at, 'ends_at', c.ends_at, 'server_now', now(),
    'entries', coalesce((select jsonb_agg(to_jsonb(rows)) from rows), '[]'::jsonb),
    'participant_count', (select count(*) from scores),
    'me', (select jsonb_build_object('nickname', nickname, 'minutes', minutes, 'position', position) from ranked where user_id = auth.uid())
  ) from public.study_challenges c where id = 'pre-thanksgiving-2026';
$$;
revoke all on function public.join_study_challenge(text), public.start_challenge_flight(uuid, integer), public.finish_challenge_flight(uuid), public.study_challenge_board() from public;
grant execute on function public.study_challenge_board() to anon, authenticated;
grant execute on function public.join_study_challenge(text), public.start_challenge_flight(uuid, integer), public.finish_challenge_flight(uuid) to authenticated;
