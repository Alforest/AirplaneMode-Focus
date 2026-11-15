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
-- Seed a legacy inappropriate nickname before the moderation migration.
insert into public.challenge_members(challenge_id, user_id, nickname)
values ('pre-thanksgiving-2026', '00000000-0000-4000-8000-000000000001', 'Sh1t Pilot');
\ir ../supabase/migrations/202611150001_nickname_moderation.sql
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
select pg_temp.assert_true((select nickname ~ '^Traveler-[a-f0-9]{11}$' from public.challenge_members limit 1), 'legacy profanity receives neutral alias');
select pg_temp.assert_true((select count(*) = 1 from public.challenge_members), 'moderation preserves membership');
delete from public.challenge_members; -- disposable fixture only
select pg_temp.assert_true(not public.challenge_nickname_allowed(name), 'blocked variant: ' || name)
from unnest(array['fuck', 'FuCkPilot', 'f_u_c_k', 'f u c k', 'f4gg0t', 'sh1t', 'b1tch', 'n1gger', 'n i g g a', 'ass', 'dick123', 'slut', 'whore', 'phuck', 'PussyPilot']) as name;
select pg_temp.assert_true(public.challenge_nickname_allowed(name), 'allowed innocent name: ' || name)
from unnest(array['Cloud Scholar', 'Sky Reader', 'Scunthorpe', 'Cassandra', 'Dickinson', 'CockpitCaptain', 'ClassicPilot', 'BassPlayer', 'HelloThere', 'Ash123', 'Traveler-1234']) as name;
set local role anon;
select pg_temp.assert_true(public.study_challenge_board()->'entries' = '[]'::jsonb, 'guest can read empty board');
select pg_temp.expect_error('select * from public.challenge_members', 'guest cannot read private membership');
select pg_temp.expect_error($q$select public.join_study_challenge('Guest')$q$, 'guest cannot join');
reset role;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.expect_error($q$select public.start_challenge_flight('10000000-0000-4000-8000-000000000001', 1)$q$, 'must join before takeoff');
select pg_temp.expect_error($q$select public.join_study_challenge('<script>')$q$, 'invalid nickname');
select pg_temp.expect_error($q$select public.join_study_challenge('Sh1t Pilot')$q$, 'RPC rejects profanity');
select pg_temp.expect_error($q$select public.join_study_challenge('f_u_c_k')$q$, 'RPC rejects separated profanity');
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
select pg_temp.expect_error($q$update public.challenge_members set nickname = 'b1tch'$q$, 'constraint rejects direct nickname updates');
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
\ir ../supabase/migrations/202611150002_traveler_profiles.sql
select pg_temp.assert_true((select count(*) = 2 from public.user_profiles), 'existing challenge identities become profiles');
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.user_profiles), 'profile reads isolated to account');
select public.save_study_profile('Cloud Captain', 'jfk');
select pg_temp.assert_true((select home_airport = 'JFK' from public.user_profiles), 'home airport normalized and saved');
select pg_temp.assert_true(public.study_challenge_board()->'me'->>'nickname' = 'Cloud Captain', 'nickname updates leaderboard');
select pg_temp.assert_true((public.study_challenge_board()->'me'->>'minutes')::int = 1, 'profile changes preserve score');
select pg_temp.expect_error($q$select public.save_study_profile('sky reader', 'JFK')$q$, 'global nickname uniqueness ignores case');
select pg_temp.expect_error($q$select public.save_study_profile('Sh1t Pilot', 'JFK')$q$, 'profile profanity rejected');
select pg_temp.expect_error($q$select public.save_study_profile('Cloud Captain', 'ZZZ')$q$, 'unknown airport rejected');
select pg_temp.expect_error($q$select public.save_study_profile('Cloud Captain', 'XXXX')$q$, 'malformed airport rejected');
select pg_temp.expect_error($q$select public.save_study_profile('ab', null)$q$, 'short nickname rejected');
select pg_temp.assert_true((select nickname = 'Cloud Captain' and home_airport = 'JFK' from public.user_profiles), 'invalid saves retain previous profile');
select pg_temp.expect_error($q$update public.user_profiles set nickname = 'Bypass'$q$, 'profile writes must use validated RPC');
select public.save_study_profile('Cloud Captain', '');
select pg_temp.assert_true((select home_airport is null from public.user_profiles), 'home airport can be cleared');
reset role;
insert into auth.users values ('00000000-0000-4000-8000-000000000003');
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
set local role authenticated;
select public.save_study_profile('New Traveler', 'LHR');
select pg_temp.assert_true(public.study_challenge_board()->'me' = 'null'::jsonb, 'saving profile does not enroll in challenge');
reset role;
update public.study_challenges set ends_at = now() + interval '1 day';
set local role authenticated;
select public.join_study_challenge('Different Name');
select pg_temp.assert_true(public.study_challenge_board()->'me'->>'nickname' = 'New Traveler', 'enrollment uses saved profile identity');
select pg_temp.assert_true((select home_airport = 'LHR' from public.user_profiles), 'joining preserves home airport');
reset role;
set local request.jwt.claim.sub = '';
set local role anon;
select pg_temp.expect_error('select * from public.user_profiles', 'guest cannot read profiles');
select pg_temp.expect_error($q$select public.save_study_profile('Guest', 'JFK')$q$, 'guest cannot save profile');
reset role;
-- Account deletion removes profile, enrollment, and flights.
delete from auth.users where id = '00000000-0000-4000-8000-000000000003';
select pg_temp.assert_true((select count(*) = 2 from public.user_profiles), 'account deletion cascades to profile');
rollback;
\echo 'Challenge scoring and access tests passed.'
