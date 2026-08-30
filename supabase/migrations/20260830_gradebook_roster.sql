-- ─────────────────────────────────────────────────────────────────────────────
-- Per-teacher Gradebook roster
--
-- Problem: the Gradebook currently receives the ENTIRE shared `students` table
-- (the same school-wide table Hall Pass/G-Men/Infractions use) with no
-- per-teacher ownership at all, so every teacher's gradebook shows every
-- student in the district. Ownership can't be a single column on `students`
-- either, because a real student takes multiple teachers' classes at once —
-- it has to be a many-to-many join.
--
-- gradebook_roster says "this student is on this teacher's gradebook", with
-- an optional per-teacher `section` label (e.g. "P3 Chemistry"). Removing a
-- student from a teacher's roster deletes ONLY this join row — the shared
-- `students` row and every `gradebook_grades` row are completely untouched,
-- so nothing is ever lost and re-adding a student brings their full grade
-- history right back.
--
-- Backfill (below, run once): seeded from each teacher's own Google
-- Classroom-synced roster (classroom_students, matched to students by
-- email) — the one existing signal that already reflects "these are
-- actually my students." As a safety net, any student a teacher has
-- already graded is also kept even if they have no classroom_students
-- match, so no existing grade history can become invisible. As of this
-- migration classroom_students and gradebook_grades are both empty on
-- production, so this backfill is a no-op today and every teacher starts
-- with a roster they build via Classroom sync or by adding students —
-- never with the whole school.
--
-- Applied to project jag-staff-portal on 2026-08-30.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.gradebook_roster (
  id uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  student_id uuid not null references public.students(id) on delete cascade,
  section text,
  source text not null default 'manual', -- 'manual' | 'classroom_sync' | 'backfill_classroom_sync' | 'backfill_existing_grades'
  created_at timestamptz not null default now(),
  unique (teacher_email, student_id)
);

create index if not exists gradebook_roster_teacher on public.gradebook_roster (teacher_email);
create index if not exists gradebook_roster_student on public.gradebook_roster (student_id);

alter table public.gradebook_roster enable row level security;

-- Owner-only, matching the gradebook_* pattern from 20260615_gradebook_owner_only.sql —
-- no admin override, a teacher's roster is theirs alone.
drop policy if exists "owner only" on public.gradebook_roster;
create policy "owner only" on public.gradebook_roster for all
  using      (public.is_staff() and teacher_email = public.current_email())
  with check (public.is_staff() and teacher_email = public.current_email());

alter publication supabase_realtime add table public.gradebook_roster;

-- ─── Backfill ──────────────────────────────────────────────────────────────

-- 1. Each teacher's Google-Classroom-synced roster, matched to the shared
--    students table by email. (classroom_students is empty as of this
--    migration, so this inserts nothing today — it exists for any teacher
--    who syncs via "My Classroom" before this migration runs elsewhere.)
insert into public.gradebook_roster (teacher_email, student_id, section, source)
select distinct cs.teacher_email, s.id,
       nullif('Period ' || coalesce(cc.period, ''), 'Period '),
       'backfill_classroom_sync'
from public.classroom_students cs
join public.classroom_classes cc on cc.id = cs.class_id
join public.students s on s.student_email = cs.student_email
where cs.student_email is not null and cs.student_email <> ''
on conflict (teacher_email, student_id) do nothing;

-- 2. Safety net: any student a teacher has already graded, even without a
--    classroom_students match (e.g. graded before Classroom sync existed,
--    or via a manual/CSV roster). gradebook_grades.student_id is `text`,
--    so match by text — never cast it to uuid (a malformed value would
--    error the whole insert instead of just failing to match).
insert into public.gradebook_roster (teacher_email, student_id, section, source)
select distinct gg.teacher_email, s.id, null, 'backfill_existing_grades'
from public.gradebook_grades gg
join public.students s on s.id::text = gg.student_id
on conflict (teacher_email, student_id) do nothing;
