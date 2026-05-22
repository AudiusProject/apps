-- Migration requests for the Audius track migration tool.
-- One row per submitted migration; status drives the approval workflow.

create extension if not exists "pgcrypto";

create table if not exists migration_requests (
  id                uuid primary key default gen_random_uuid(),
  new_user_id       text not null,
  new_user_handle   text not null,
  old_handle        text not null,
  status            text not null default 'pending'
                    check (status in ('pending','approved','running','completed','failed','rejected')),
  tracks            jsonb not null,
  results           jsonb,
  rejection_reason  text,
  failure_reason    text,
  created_at        timestamptz not null default now(),
  approved_at       timestamptz,
  completed_at      timestamptz
);

create index if not exists migration_requests_status_idx
  on migration_requests (status, created_at desc);

create index if not exists migration_requests_new_user_idx
  on migration_requests (new_user_id);

-- RLS stays off: every API call hits the service role key from a Vercel
-- function. Browsers never touch this table directly. Re-enable RLS and
-- write policies if that ever changes.
alter table migration_requests disable row level security;
