alter table public.tournament_participants
  add column if not exists role text not null default 'member';

update public.tournament_participants participant
set role = 'admin'
from public.tournaments tournament
where participant.tournament_id = tournament.id
  and participant.user_id = tournament.creator_id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tournament_participants_role_check'
      and conrelid = 'public.tournament_participants'::regclass
  ) then
    alter table public.tournament_participants
      add constraint tournament_participants_role_check
      check (role in ('admin', 'member'));
  end if;
end $$;

create index if not exists tournament_participants_role_idx
  on public.tournament_participants (tournament_id, role);
