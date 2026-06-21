-- ─────────────────────────────────────────────────────────────────────────────
-- Owner-scoped RLS for per-teacher tables + harden is_staff()
--
-- Problem: gradebook_*, ceu_*, field_trip_requests and requisitions were
-- protected only by is_staff(), so ANY @jagschools.org account could read or
-- write ANY other teacher's grades, students' grade data, CEU records,
-- reimbursement amounts, field-trip plans and purchase requisitions. The app
-- already filters these by teacher_email client-side; this enforces it server
-- side. Owners see/edit their own rows; admins (staff_directory.is_admin) see all.
--
-- Applied to project jag-staff-portal on 2026-06-15.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helpers ─────────────────────────────────────────────────────────────────────
-- Pin search_path on is_staff() (was role-mutable; security linter 0011).
create or replace function public.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'email', '') like '%@jagschools.org'
$$;

-- The signed-in user's email (empty string when unauthenticated).
create or replace function public.current_email()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'email', '')
$$;

-- True when the signed-in user is flagged is_admin in the staff directory.
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_directory
    where email = coalesce(auth.jwt() ->> 'email', '')
      and is_admin = true
  )
$$;

-- Gradebook (ALL-command tables) ──────────────────────────────────────────────
drop policy if exists "staff all" on public.gradebook_assignments;
create policy "owner or admin" on public.gradebook_assignments for all
  using      (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()))
  with check (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));

drop policy if exists "staff all" on public.gradebook_grades;
create policy "owner or admin" on public.gradebook_grades for all
  using      (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()))
  with check (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));

drop policy if exists "staff all" on public.gradebook_profiles;
create policy "owner or admin" on public.gradebook_profiles for all
  using      (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()))
  with check (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));

drop policy if exists "staff all" on public.gradebook_settings;
create policy "owner or admin" on public.gradebook_settings for all
  using      (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()))
  with check (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));

-- CEU entries (read / insert / delete) ────────────────────────────────────────
drop policy if exists "staff read ceu_entries"   on public.ceu_entries;
drop policy if exists "staff insert ceu_entries" on public.ceu_entries;
drop policy if exists "staff delete ceu_entries" on public.ceu_entries;
create policy "owner read ceu_entries"   on public.ceu_entries for select
  using      (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));
create policy "owner insert ceu_entries" on public.ceu_entries for insert
  with check (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));
create policy "owner delete ceu_entries" on public.ceu_entries for delete
  using      (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));

-- CEU reimbursements (read / insert / delete) ─────────────────────────────────
drop policy if exists "staff read ceu_reimbursements"   on public.ceu_reimbursements;
drop policy if exists "staff insert ceu_reimbursements" on public.ceu_reimbursements;
drop policy if exists "staff delete ceu_reimbursements" on public.ceu_reimbursements;
create policy "owner read ceu_reimbursements"   on public.ceu_reimbursements for select
  using      (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));
create policy "owner insert ceu_reimbursements" on public.ceu_reimbursements for insert
  with check (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));
create policy "owner delete ceu_reimbursements" on public.ceu_reimbursements for delete
  using      (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));

-- Field trip requests (read / insert / delete) ────────────────────────────────
drop policy if exists "staff read field_trip_requests"   on public.field_trip_requests;
drop policy if exists "staff insert field_trip_requests" on public.field_trip_requests;
drop policy if exists "staff delete field_trip_requests" on public.field_trip_requests;
create policy "owner read field_trip_requests"   on public.field_trip_requests for select
  using      (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));
create policy "owner insert field_trip_requests" on public.field_trip_requests for insert
  with check (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));
create policy "owner delete field_trip_requests" on public.field_trip_requests for delete
  using      (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));

-- Requisitions (read / insert / delete) ───────────────────────────────────────
drop policy if exists "staff read requisitions"   on public.requisitions;
drop policy if exists "staff insert requisitions" on public.requisitions;
drop policy if exists "staff delete requisitions" on public.requisitions;
create policy "owner read requisitions"   on public.requisitions for select
  using      (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));
create policy "owner insert requisitions" on public.requisitions for insert
  with check (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));
create policy "owner delete requisitions" on public.requisitions for delete
  using      (public.is_staff() and (teacher_email = public.current_email() or public.is_admin()));
