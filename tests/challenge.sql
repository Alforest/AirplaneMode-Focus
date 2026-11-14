-- Run against a disposable PostgreSQL database: psql -v ON_ERROR_STOP=1 -f tests/challenge.sql
-- Minimal Supabase auth fixtures; every change rolls back.
\set ON_ERROR_STOP on
begin;
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
\ir ../supabase/migrations/202611140002_thanksgiving_challenge.sql
-- Make tests independent of today's date.
update public.study_challenges set starts_at = now() - interval '1 day', ends_at = now() + interval '1 day';
create function pg_temp.assert_true(value boolean, message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAILED: %', message; end if; end;
$$;
create function pg_temp.expect_error(statement text, message text) returns void language plpgsql as $$
begin
  begin execute statement; exception when others then return; end;
  raise exception 'FAILED (unexpected success): %', message;
end;
$$;
set local role anon;
select pg_temp.assert_true(public.study_challenge_board()->'entries' = '[]'::jsonb, 'guest can read empty board');
select pg_temp.expect_error('select * from public.challenge_members', 'guest cannot read private membership');
select pg_temp.expect_error($q$select public.join_study_challenge('Guest')$q$, 'guest cannot join');
reset role;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.expect_error($q$select public.start_challenge_flight('10000000-0000-4000-8000-000000000001', 1)$q$, 'must join before takeoff');
select pg_temp.expect_error($q$select public.join_study_challenge('<script>')$q$, 'invalid nickname');
select public.join_study_challenge('Cloud Scholar');
select public.join_study_challenge('Another Name');
select pg_temp.assert_true(public.study_challenge_board()->'me'->>'nickname' = 'Cloud Scholar', 'joining is idempotent');
select pg_temp.expect_error($q$select public.start_challenge_flight('10000000-0000-4000-8000-000000000001', 0)$q$, 'duration cannot be zero');
select pg_temp.expect_error($q$select public.start_challenge_flight('10000000-0000-4000-8000-000000000001', 1440)$q$, 'cannot finish after deadline');
select public.start_challenge_flight('10000000-0000-4000-8000-000000000001', 1);
select public.start_challenge_flight('10000000-0000-4000-8000-000000000001', 1);
select pg_temp.expect_error($q$select public.finish_challenge_flight('10000000-0000-4000-8000-000000000001')$q$, 'cannot complete early');
select pg_temp.expect_error('select * from public.challenge_flights', 'cannot access raw flights');
select pg_temp.expect_error($q$update public.challenge_flights set started_at = now() - interval '1 hour'$q$, 'cannot forge elapsed time');
reset role;
update public.challenge_flights set started_at = now() - interval '2 minutes';
set local role authenticated;
select public.finish_challenge_flight('10000000-0000-4000-8000-000000000001');
select public.finish_challenge_flight('10000000-0000-4000-8000-000000000001');
select pg_temp.assert_true((public.study_challenge_board()->'me'->>'minutes')::int = 1, 'completion counted exactly once');
select public.start_challenge_flight('10000000-0000-4000-8000-000000000002', 1);
select public.start_challenge_flight('10000000-0000-4000-8000-000000000003', 1);
select pg_temp.expect_error($q$select public.finish_challenge_flight('10000000-0000-4000-8000-000000000002')$q$, 'new flight cancels overlapping flight');
reset role;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
set local role authenticated;
select pg_temp.expect_error($q$select public.join_study_challenge('cloud scholar')$q$, 'nicknames unique ignoring case');
select public.join_study_challenge('Sky Reader');
select pg_temp.expect_error($q$select public.finish_challenge_flight('10000000-0000-4000-8000-000000000003')$q$, 'cannot finish another account flight');
select pg_temp.expect_error($q$select public.start_challenge_flight('10000000-0000-4000-8000-000000000003', 1)$q$, 'cannot reuse another account flight ID');
select public.start_challenge_flight('20000000-0000-4000-8000-000000000001', 1);
reset role;
update public.challenge_flights set started_at = now() - interval '2 minutes' where user_id = '00000000-0000-4000-8000-000000000002';
set local role authenticated;
select public.finish_challenge_flight('20000000-0000-4000-8000-000000000001');
select pg_temp.assert_true((public.study_challenge_board()->'me'->>'position')::int = 1, 'equal totals share rank');
select public.start_challenge_flight('20000000-0000-4000-8000-000000000002', 1);
reset role;
update public.study_challenges set ends_at = now() - interval '1 second';
set local role authenticated;
select pg_temp.expect_error($q$select public.finish_challenge_flight('20000000-0000-4000-8000-000000000002')$q$, 'closed event rejects completion');
select pg_temp.expect_error($q$select public.start_challenge_flight('20000000-0000-4000-8000-000000000003', 1)$q$, 'closed event rejects start');
select pg_temp.expect_error($q$select public.join_study_challenge('Late Entry')$q$, 'closed event rejects enrollment');
reset role;
set local request.jwt.claim.sub = '';
set local role anon;
select pg_temp.assert_true(public.study_challenge_board()->'me' = 'null'::jsonb, 'guest has no account result');
select pg_temp.assert_true((public.study_challenge_board()->>'participant_count')::int = 2, 'final standings remain public');
select pg_temp.assert_true(not ((public.study_challenge_board()->'entries'->0) ?| array['user_id', 'email', 'joined_at']), 'public board hides identifiers');
reset role;
rollback;
\echo 'Challenge scoring and access tests passed.'
