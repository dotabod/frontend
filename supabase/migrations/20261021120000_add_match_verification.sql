-- The dota service checks each finished match against Valve's match data and records
-- the outcome here, so a match is checked once: confirmed, resolved (filled in),
-- corrected, not_scored, not_found, team_unknown, or team_mismatch. Null means not
-- checked yet; the partial index keeps the verifier's "recent and unchecked" scan small.

alter table public.matches
  add column if not exists verified_at timestamp(3) without time zone,
  add column if not exists verification text;

create index if not exists matches_unverified_created_at_idx
  on public.matches (created_at)
  where verified_at is null;
