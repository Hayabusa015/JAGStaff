-- G-Men Period student access policies.
--
-- Without these, logged-in students see zero classes and can't enroll.
-- Seat counts also require reading all enrollments for a period.
--
-- gmen_settings already has an "anyone read" policy (baseline).
-- gmen_enrollments and gmen_change_requests already have staff-all policies;
-- these add the student-facing access layer.

-- 1. Let authenticated students read the class listing.
drop policy if exists "authenticated read" on public.gmen_classes;
create policy "authenticated read" on public.gmen_classes
  for select to authenticated using (true);

-- 2. Let authenticated students read all enrollments (needed for seat-count bars).
--    All columns (class_id, student_name, grading_period) are non-sensitive.
drop policy if exists "authenticated read enrollments" on public.gmen_enrollments;
create policy "authenticated read enrollments" on public.gmen_enrollments
  for select to authenticated using (true);

-- 3. Students may insert their own enrollment.
drop policy if exists "student enroll" on public.gmen_enrollments;
create policy "student enroll" on public.gmen_enrollments
  for insert to authenticated
  with check (student_email = auth.jwt() ->> 'email');

-- 4. Students may read their own change requests.
drop policy if exists "student read own requests" on public.gmen_change_requests;
create policy "student read own requests" on public.gmen_change_requests
  for select to authenticated
  using (student_email = auth.jwt() ->> 'email');

-- 5. Students may insert their own change requests.
drop policy if exists "student insert own requests" on public.gmen_change_requests;
create policy "student insert own requests" on public.gmen_change_requests
  for insert to authenticated
  with check (student_email = auth.jwt() ->> 'email');
