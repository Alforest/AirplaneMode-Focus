-- Apply in Supabase SQL Editor, or with `supabase db push` on a linked project.
create table public.flight_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  flight jsonb not null,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint flight_is_object check (jsonb_typeof(flight) = 'object'),
  constraint flight_id_matches check (flight->>'id' is not null and flight->>'id' = id::text),
  constraint flight_size check (octet_length(flight::text) <= 8192),
  constraint flight_required_fields check (
    flight ?& array['departure','destination','durationMinutes','distanceKm','date','flightNumber','airline']
    and jsonb_typeof(flight->'departure') = 'object'
    and jsonb_typeof(flight->'destination') = 'object'
    and jsonb_typeof(flight->'durationMinutes') = 'number'
    and jsonb_typeof(flight->'distanceKm') = 'number'
  )
);

alter table public.flight_history enable row level security;
revoke all on public.flight_history from anon, authenticated;
grant select, insert, update on public.flight_history to authenticated;

create policy "Read own flights" on public.flight_history
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own flights" on public.flight_history
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own flights" on public.flight_history
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Tombstones are permanent. An offline upload cannot resurrect deleted history.
-- Completed flights are immutable; updates can only mark them deleted.
create function public.protect_completed_flight() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.user_id := old.user_id;
  new.id := old.id;
  new.flight := old.flight;
  new.created_at := old.created_at;
  new.deleted := old.deleted or new.deleted;
  return new;
end;
$$;
create trigger protect_completed_flight before update on public.flight_history
  for each row execute function public.protect_completed_flight();
