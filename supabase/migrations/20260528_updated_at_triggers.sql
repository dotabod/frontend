-- Keep users.updated_at / subscriptions.updated_at fresh on every UPDATE.
--
-- These columns are `@default(now())` in Prisma (DB default CURRENT_TIMESTAMP),
-- so they were frozen at creation and only bumped when a handler happened to set
-- them explicitly. The hourly HubSpot sync (cron.schedule 'hubspot-sync' →
-- supabase/functions/sync-hubspot) selects rows by `updated_at > now() - window`,
-- so it needs every change to bump the timestamp.
--
-- Implemented as a BEFORE UPDATE trigger rather than Prisma's `@updatedAt` so we
-- do NOT drop the existing `DEFAULT now()` (prisma db push would have) and so the
-- bump happens for ANY writer (Prisma, backend, raw SQL), not just Prisma.
-- Additive only — drops nothing pre-existing.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_users on public.users;
create trigger set_updated_at_users
  before update on public.users
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_updated_at_subscriptions on public.subscriptions;
create trigger set_updated_at_subscriptions
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();
