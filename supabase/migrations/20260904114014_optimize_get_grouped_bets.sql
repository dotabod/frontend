-- WL windows can now span up to 365 days. Keep the RPC bounded as match history grows:
-- unresolved matches never belong in a W/L record, the users join was redundant, and the
-- won predicate lets Postgres use matches_user_resolved_history_idx for selective windows.

create or replace function public.get_grouped_bets(
  channel_id text,
  start_date timestamp without time zone
)
returns table(
  won boolean,
  lobby_type integer,
  is_party boolean,
  is_doubledown boolean,
  _count_won bigint,
  _count_is_party bigint,
  _count_is_doubledown bigint
)
language sql
stable
as $$
  select
    b.won::boolean,
    b.lobby_type::integer,
    b.is_party::boolean,
    b.is_doubledown::boolean,
    count(*)::bigint as _count_won,
    count(*) filter (where b.is_party = true)::bigint as _count_is_party,
    count(*) filter (where b.is_doubledown = true)::bigint as _count_is_doubledown
  from public.matches b
  join public.accounts a on b."userId" = a."userId"
  where
    b.won is not null
    and b.lobby_type in (0, 7)
    and a.provider = 'twitch'
    and a."providerAccountId" = channel_id
    and b.created_at >= coalesce(start_date, current_timestamp - interval '12 hours')
  group by b.won, b.lobby_type, b.is_party, b.is_doubledown;
$$;
