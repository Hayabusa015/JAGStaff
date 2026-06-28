-- ─────────────────────────────────────────────────────────────────────────────
-- War-room security hardening (2026-06-27)
--
-- Two P0 problems fixed here:
--
-- 1. is_staff() was DOMAIN-ONLY: `email like '%@jagschools.org'`. In a Google
--    Workspace district, STUDENTS also have @jagschools.org addresses, so any
--    signed-in student could read every staff-only table gated by is_staff()
--    (students roster + guardian emails, infractions, hall_passes, weekly_events,
--    trip_rosters, ceu_*, etc.). We redefine is_staff() to require membership in
--    staff_directory — students are not members. This single change re-secures
--    every policy already built on is_staff() with no per-table edits.
--
-- 2. public.students and public.staff_directory were used throughout the client
--    but had no documented CREATE TABLE / RLS. A hand-created table defaults to
--    RLS-OFF, which would expose all guardian/student PII to the public anon key.
--    We create both (idempotently) and enable owner/admin-scoped RLS.
--
-- Provisioning note: because is_staff() now requires staff_directory membership,
-- staff must be SEEDED (the app no longer self-registers teachers — see
-- useStaffDirectory). Insert at least one admin before going live, e.g.:
--   insert into public.staff_directory (email, name, is_admin)
--   values ('teacher@jagschools.org', 'Teacher Name', true)
--   on conflict (email) do update set is_admin = excluded.is_admin;
-- ─────────────────────────────────────────────────────────────────────────────

-- staff_directory — the source of truth for "who is staff". ─────────────────────
create table if not exists public.staff_directory (
  email      text primary key,
  name       text,
  room       text,
  is_admin   boolean not null default false,
  last_seen  timestamptz,
  created_at timestamptz not null default now()
);
alter table public.staff_directory enable row level security;

-- 1. Harden is_staff(): domain AND actual staff_directory membership. ───────────
create or replace function public.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'email', '') like '%@jagschools.org'
     and exists (
       select 1 from public.staff_directory sd
       where sd.email = coalesce(auth.jwt() ->> 'email', '')
     )
$$;

-- staff_directory policies: any staff member may READ the directory (powers the
-- "send to teacher" dropdown); only admins may INSERT/UPDATE/DELETE. Clients can
-- no longer self-promote into staff. ──────────────────────────────────────────
drop policy if exists "staff read directory"   on public.staff_directory;
drop policy if exists "admin manage directory" on public.staff_directory;
create policy "staff read directory" on public.staff_directory
  for select using (public.is_staff());
create policy "admin manage directory" on public.staff_directory
  for all
  using      (public.is_admin())
  with check (public.is_admin());

-- public.students — school-wide roster (PII: guardian + student emails). ────────
create table if not exists public.students (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  last_name     text not null,
  grade         text,
  section       text,
  parent_email  text,
  student_email text,
  created_at    timestamptz not null default now()
);
alter table public.students enable row level security;
create index if not exists students_section on public.students (section);
create index if not exists students_email   on public.students (student_email);

-- Only staff may read or modify the roster. (No student-facing access — a
-- student reading their OWN grades goes through gradebook policies, not here.)
drop policy if exists "staff manage students" on public.students;
create policy "staff manage students" on public.students
  for all
  using      (public.is_staff())
  with check (public.is_staff());
