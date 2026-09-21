-- Phase 2: fifteen-second attendance. One row per student per day, whichever
-- class actually marks them — a student pulled elsewhere for the day is
-- still one attendance record, not one per class that might have claimed
-- them (this is also what makes Phase 3's per-day pull overlay possible
-- without ever touching gmen_enrollments).
create table if not exists public.gmen_attendance (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.gmen_classes(id) on delete cascade,
  grading_period int not null,
  status text not null check (status in ('present','absent','tardy','pulled','commons')),
  marked_by text not null,
  marked_at timestamptz not null default now(),
  unique (date, student_id)
);
alter table public.gmen_attendance enable row level security;
create policy "staff all" on public.gmen_attendance
  for all using (public.is_staff_member()) with check (public.is_staff_member());
create index on public.gmen_attendance (date, class_id);
