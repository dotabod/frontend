create table public.win_loss_adjustments (
  id bigint generated always as identity primary key,
  user_id text not null references public.users(id) on delete cascade,
  lobby_type smallint not null,
  won boolean not null,
  delta smallint not null,
  created_at timestamptz not null default now(),
  constraint win_loss_adjustments_lobby_type_check check (lobby_type in (0, 7)),
  constraint win_loss_adjustments_delta_check check (delta in (-1, 1))
);

create index win_loss_adjustments_user_created_at_idx
  on public.win_loss_adjustments (user_id, created_at desc);

alter table public.win_loss_adjustments enable row level security;

revoke all on table public.win_loss_adjustments from public, anon, authenticated, service_role;
grant select on table public.win_loss_adjustments to service_role;
revoke all on sequence public.win_loss_adjustments_id_seq
  from public, anon, authenticated, service_role;

alter publication supabase_realtime add table public.win_loss_adjustments;
