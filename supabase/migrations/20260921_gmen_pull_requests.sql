-- Phase 3: enrichment pulls. Supersedes gmen_requests, which matches
-- students by comparing name strings and has no lifecycle beyond a single
-- "arrived" boolean. gmen_requests is left in place and untouched — its
-- table isn't dropped here, only the app code stops using it. Dropping the
-- old table is a deliberate later follow-up, not part of this migration.
create table if not exists public.gmen_pull_requests (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  student_id uuid not null references public.students(id) on delete cascade,
  student_name text not null,
  requested_by_email text not null,
  requested_by_name  text not null,
  to_class_id uuid references public.gmen_classes(id) on delete set null,
  to_room text,
  reason text,
  status text not null default 'requested'
    check (status in ('requested','sent','arrived','declined','no_show')),
  sent_by text, sent_at timestamptz, arrived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (date, student_id, requested_by_email)
);
alter table public.gmen_pull_requests enable row level security;
create policy "staff all" on public.gmen_pull_requests
  for all using (public.is_staff_member()) with check (public.is_staff_member());
create index on public.gmen_pull_requests (date, status);
