-- English nickname moderation, enforced for RPC and direct database writes.
-- Keep mild/ambiguous words token-based to avoid rejecting names such as
-- Scunthorpe, Cassandra, Dickinson, and CockpitCaptain.
create or replace function public.challenge_nickname_allowed(value text) returns boolean
language sql immutable parallel safe set search_path = '' as $$
  with normalized as (
    select translate(lower(coalesce(value, '')), '0134578', 'oieastb') as name,
      regexp_replace(lower(coalesce(value, '')), '[0-9]', ' ', 'g') as raw_tokens
  ), forms as (
    select name || ' ' || raw_tokens as name, regexp_replace(name, '[^a-z]', '', 'g') as compact from normalized
  )
  select not (
    replace(compact, 'scunthorpe', '') ~ '(fuck|phuck|fuk|fck|shit|cunt|nigg(er|a)|fagg?ot|bitch|biatch|pussy|motherfucker)'
    or name ~ '(^|[^a-z])(ass|asshole|arse|bastard|bollocks|bullshit|cock|crap|damn|dick|douche|fag|goddamn|hell|jerkoff|kike|piss|prick|retard|retarded|slut|spic|tits|twat|wank|whore)([^a-z]|$)'
    or compact ~ '^(ass|asshole|arse|bastard|bollocks|cock|crap|damn|dick|douche|fag|goddamn|hell|jerkoff|kike|piss|prick|retard|retarded|slut|spic|tits|twat|wank|whore)$'
  ) from forms;
$$;
revoke all on function public.challenge_nickname_allowed(text) from public, anon, authenticated;
-- Constraint evaluation by authenticated inserts must be able to invoke the pure validator.
grant execute on function public.challenge_nickname_allowed(text) to authenticated;

-- Preserve enrollment, scores, and flights; replace only disallowed public names.
-- The random alias is independent of the user's account identifier.
update public.challenge_members
set nickname = 'Traveler-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 11)
where not public.challenge_nickname_allowed(nickname);

alter table public.challenge_members add constraint challenge_nickname_appropriate
  check (public.challenge_nickname_allowed(nickname));
