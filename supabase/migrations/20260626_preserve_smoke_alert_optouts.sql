-- Preserve explicit "team smoke alert" opt-outs across the smokeActivated setting move.
--
-- The roast moved from a chatter (chatters.smokeActivated.enabled, default on) to a top-level
-- tri-state setting `smokeActivated` (null = follow autoOptInNewFeatures, which defaults on).
-- After the move, a user's old nested value is orphaned, so anyone who had explicitly DISABLED
-- the roast would silently get it back (null -> follow master -> on).
--
-- Copy only the explicit `false` opt-outs to the new top-level key so their choice survives.
-- We deliberately do NOT migrate `true`: a stored `true` is almost always the persisted default
-- (ChatterCard writes the whole chatters object when any chatter is toggled), not a deliberate
-- "force on", and leaving it null keeps following the master as intended.
--
-- Columns are camelCase (Prisma fields without @map), so "userId" must be quoted. The value
-- column is jsonb, so the boolean is written as 'false'::jsonb. Idempotent: the NOT EXISTS
-- guard (plus the (key, userId) unique constraint) makes re-runs a no-op and never clobbers a
-- top-level smokeActivated row the user has set since the deploy.

insert into public.settings (id, key, value, "userId", created_at, updated_at)
select gen_random_uuid(), 'smokeActivated', 'false'::jsonb, s."userId", now(), now()
from public.settings s
where s.key = 'chatters'
  and s.value -> 'smokeActivated' ->> 'enabled' = 'false'
  and not exists (
    select 1
    from public.settings t
    where t."userId" = s."userId"
      and t.key = 'smokeActivated'
  );
