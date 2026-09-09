alter table public."WebhookEvent"
  add column if not exists "billingFacts" jsonb;
