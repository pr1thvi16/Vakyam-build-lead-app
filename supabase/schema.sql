-- Leads table for the Nest Dubai lead qualification app.
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- Access model:
--   * Public visitors never touch this table directly. The lead form calls the
--     `submitLead` server action, which inserts with the server-only secret key
--     (service role), so no public insert policy is needed.
--   * Signed-in agents (Supabase Auth users) can read all leads and change only the
--     `status` column.
--   * Anonymous users have no access at all.

create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  -- Answers from the 6-step form
  intent        text    not null check (intent in ('buyer', 'offplan', 'tenant', 'landlord', 'office')),
  budget_aed    bigint  not null check (budget_aed between 0 and 1000000000),
  people_count  integer check (people_count between 1 and 100000),   -- office leads only
  timeline      text    not null check (timeline in ('immediate', '1-3m', '3-6m', '6m+')),
  area          text    not null check (char_length(area) between 2 and 120),
  name          text    not null check (char_length(name) between 1 and 120),
  phone         text    not null check (char_length(phone) between 7 and 40),
  notes         text    check (char_length(notes) <= 2000),
  lang          text    not null default 'en' check (lang in ('en', 'ar')),

  -- Computed by lib/scoring.ts
  score         integer not null default 0 check (score between 0 and 100),
  band          text    not null default 'cold' check (band in ('hot', 'warm', 'cold')),
  reasons       text[]  not null default '{}',

  -- Optional AI output (empty string when ANTHROPIC_API_KEY is not set)
  ai_summary    text    not null default '',
  next_action   text    not null default '',

  -- Agent workflow
  status        text    not null default 'new' check (status in ('new', 'contacted', 'viewing', 'closed'))
);

create index if not exists leads_inbox_order_idx
  on public.leads (score desc, created_at desc);

alter table public.leads enable row level security;

-- Start from a clean slate, then grant only what the inbox needs.
revoke all on table public.leads from anon, authenticated;
grant select on table public.leads to authenticated;
grant update (status) on table public.leads to authenticated;

drop policy if exists leads_agents_read on public.leads;
create policy leads_agents_read
  on public.leads
  for select
  to authenticated
  using (true);

drop policy if exists leads_agents_update_status on public.leads;
create policy leads_agents_update_status
  on public.leads
  for update
  to authenticated
  using (true)
  with check (true);  -- column grant above restricts updates to `status` only

-- Note: every authenticated user is treated as an agent. In Supabase, go to
-- Authentication -> Providers -> Email and turn off "Allow new users to sign up",
-- then create agent accounts manually.
