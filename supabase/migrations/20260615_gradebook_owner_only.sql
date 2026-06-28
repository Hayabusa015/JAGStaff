-- ─────────────────────────────────────────────────────────────────────────────
-- Gradebook is private to the owning teacher only — remove the admin override.
--
-- 20260615_owner_scoped_rls.sql made the gradebook_* tables owner-OR-admin.
-- Per request, the gradebook should be specific to the teacher's own account:
-- no admin (or anyone else) can read or write another teacher's gradebook.
--
-- Applied to project jag-staff-portal on 2026-06-15.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "owner or admin" on public.gradebook_assignments;
create policy "owner only" on public.gradebook_assignments for all
  using      (public.is_staff() and teacher_email = public.current_email())
  with check (public.is_staff() and teacher_email = public.current_email());

drop policy if exists "owner or admin" on public.gradebook_grades;
create policy "owner only" on public.gradebook_grades for all
  using      (public.is_staff() and teacher_email = public.current_email())
  with check (public.is_staff() and teacher_email = public.current_email());

drop policy if exists "owner or admin" on public.gradebook_profiles;
create policy "owner only" on public.gradebook_profiles for all
  using      (public.is_staff() and teacher_email = public.current_email())
  with check (public.is_staff() and teacher_email = public.current_email());

drop policy if exists "owner or admin" on public.gradebook_settings;
create policy "owner only" on public.gradebook_settings for all
  using      (public.is_staff() and teacher_email = public.current_email())
  with check (public.is_staff() and teacher_email = public.current_email());
