-- Turn cosmetic_loadouts from one-row-per-user into one-row-per-(user, hero) so a
-- streamer accumulates a browsable collection instead of overwriting the last hero.
--
-- The backend upsert moves from onConflict 'userId' to 'userId,heroId', so the
-- primary key has to widen to match. Existing rows already carry a heroId, so each
-- becomes that hero's first card — no data loss.
--
-- Columns are camelCase (Prisma fields without @map), so they must be quoted.
-- Idempotent + additive: re-runnable, drops nothing but the old PK it replaces.

alter table public.cosmetic_loadouts drop constraint if exists cosmetic_loadouts_pkey;
alter table public.cosmetic_loadouts add primary key ("userId", "heroId");
