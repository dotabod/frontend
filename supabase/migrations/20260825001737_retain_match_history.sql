-- Match rows are the source for public streamer history and per-hero win rates.
-- The old jobs deleted them after two days and then ran a blocking VACUUM FULL,
-- which made durable history impossible. PostgreSQL autovacuum handles routine
-- cleanup; the two composite indexes keep the growing read paths bounded.

do $$
declare
  legacy_job record;
begin
  for legacy_job in
    select jobid, jobname
    from cron.job
    where jobname in ('delete-old-bets', 'nightly-vacuum')
  loop
    begin
      perform cron.unschedule(legacy_job.jobid);
    exception
      when insufficient_privilege then
        raise warning 'could not remove cron job % as %; remove it as its owner',
          legacy_job.jobname, current_user;
    end;
  end loop;
end;
$$;

drop index if exists public.matches_user_history_idx;

create index if not exists matches_user_resolved_history_idx
  on public.matches ("userId", created_at desc, id desc)
  where won is not null;

create index if not exists matches_user_hero_result_idx
  on public.matches ("userId", hero_name, won);
