-- Phase 0: unbreak G-Men signup and class creation.
-- gmen_enrollments has zero rows (signup has never once succeeded), so this
-- type change and the constraint fixes below are all safe.

-- student_id was text but students.id is uuid; enroll() never sent it because
-- the column was also NOT NULL. Fix both: make it nullable and correctly typed.
alter table public.gmen_enrollments
  alter column student_id drop not null,
  alter column student_id type uuid using nullif(student_id, '')::uuid;

alter table public.gmen_enrollments
  add constraint gmen_enrollments_student_fk
  foreign key (student_id) references public.students(id) on delete set null;

-- Not every teacher's G-Men class has an enrichment/request day.
alter table public.gmen_classes alter column request_day drop not null;
