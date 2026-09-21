# G-Men Time — signup, rosters, enrichment pulls, attendance

Implementation plan. Written by Opus for execution by Sonnet.
Branch: `claude/gmen-student-signup-tracking-qwvy7w`. Supabase project
`jag-staff-portal` (`ucsiveyyygnxkkfvyvos`).

Read this whole file before touching code. Every decision below is settled —
the intent is that you implement, not re-litigate. Where something is genuinely
ambiguous it is marked **ASK**.

---

## 1. The problem

G-Men Time is a 32-minute enrichment block, 4th period, Tuesday/Wednesday/
Thursday. Every student is supposed to be in a G-Men class. Attendance is not
taken today because tracking who is *supposed* to be in the room is too hard —
students move constantly, and on enrichment days they get pulled to other
teachers' rooms.

Goal: a student signs up once per grading period, every teacher has a roster
they can trust, enrichment pulls are visible on that roster, and taking
attendance takes under fifteen seconds.

### The five requirements (verbatim from the user)

- **A.** Each teacher picks their G-Men class per grading period. It may change
  between periods or stay the same.
- **B.** Students sign up through a link. They do **not** see which teacher
  teaches a class. They pick option A and option B. They go into A if it has
  room (cap 20), otherwise B.
- **C.** Teachers get a roster and can see who is in the class.
- **D.** On one of the three days a teacher has an enrichment/meeting period
  instead of their class. That teacher requests students who need help (e.g.
  Mrs. Smith pulls students for Biology help on Thursday). Other teachers see
  that list and send those students.
- **E.** A requested student is obvious on their home teacher's roster. Mr. Hank
  sees Maggie is wanted by Mrs. Smith, taps her name, and she is marked sent.

---

## 2. Locked decisions

These were decided with the user. Do not change them without asking.

| Decision | Choice | Why |
|---|---|---|
| Student identity | Google school account; `auth.jwt() ->> 'email'` is the key | Stops students enrolling each other. Existing RLS already keys on it. |
| A/B assignment | Live first-come-first-served, decided server-side | Instant confirmation, matches the user's mental model, far less machinery than a lottery. |
| Enrichment pulls | **Per-day overlay. The enrollment row is never moved.** | If a pull mutates enrollment, the student is permanently on the wrong roster next Tuesday and period rosters rot. |

### The load-bearing idea: nobody is ever unassigned

Signup today is an INSERT, so "who hasn't signed up?" is a chase and a roster is
never trustworthy. Invert it:

> At the start of each grading period **every** student in `students` is seeded
> into a default "Commons" class. Signing up is a **move**, not an insert.

This gives you: complete rosters on day one, no empty-roster teachers, a real
denominator for attendance, mid-year arrivals handled by a sync, and
"who hasn't picked" reduced to `where class_id = <commons>`.

Build everything on this. It is the difference between a system that gets used
and another abandoned one.

---

## 3. Current state

### What already exists and works

- Tables `gmen_classes`, `gmen_enrollments`, `gmen_change_requests`,
  `gmen_settings`, `gmen_requests`.
- `src/components/GmenPeriod.jsx` (1023 lines) — tab shell, Today view, admin
  panel, and a genuinely good fullscreen projector/kiosk display. **Reuse the
  kiosk**, don't rebuild it.
- `src/components/GmenEnrollmentView.jsx` — student-facing signup page.
- `src/components/GmenClassManager.jsx` — exports `AddGmenClassForm` and
  `GmenRosterImport` (CSV/Google-Sheet import).
- `src/components/gmenImport.js` + `src/gmenImport.test.js` — `buildImportPlan`
  is pure and unit-tested. Keep it that way.
- Hooks in `src/supabase.js`: `useGmenRequests` (~721), `useGmenSettings`
  (~1240), `useGmenClasses` (~1477), `useGmenEnrollments` (~1519),
  `bulkEnrollGmen` (~1582), `useGmenChangeRequests` (~1590).

### What is broken right now

Live DB: `gmen_classes` 1 row, `gmen_enrollments` **0 rows**. Signup has never
once succeeded. Four blockers:

1. **`gmen_enrollments.student_id` is `NOT NULL`** and `enroll()`
   (`src/supabase.js:1539`) never sends it. Every signup throws a not-null
   violation. `bulkEnrollGmen` (`src/supabase.js:1582`) has the same defect, so
   the CSV import fails too.
2. **`gmen_classes.teacher_email` is `NOT NULL`** but `AddGmenClassForm`
   hardcodes `teacher_email: null` (`GmenClassManager.jsx:29`).
3. **`gmen_classes.request_day` has `CHECK (request_day IN ('Tuesday',
   'Wednesday','Thursday'))`** but that same form defaults to `""` and offers
   `""` as the first option (`GmenClassManager.jsx:12`, `:15`). Add Class fails
   twice over.
4. **`<GmenClassManager>` is referenced at `GmenPeriod.jsx:392` but never
   defined or imported.** Only `AddGmenClassForm` and `GmenRosterImport` are
   imported (`GmenPeriod.jsx:8`). Clicking "My Class" throws a ReferenceError.
   The teacher roster tab does not exist.

### The roster email gap

Only **91 of 398** students have `students.student_email` populated. With Google
sign-in the JWT email identifies the student fine, but it cannot be joined back
to the roster for the other 307.

There is already a solved-once pattern for this: `syncFromClassroom` at
`src/supabase.js:1875-1895` matches by name against students with a null email
and backfills, specifically to avoid creating duplicates. Its comment documents
a past incident where ~80 students ended up duplicated (one row with a grade and
no email, one with an email and no grade) and showed up twice in the hall-pass
kiosk. **Reuse that pattern. Do not write a second one.**

### Useful live schema facts

- `students`: `id uuid`, `first_name`, `last_name`, `grade`, `student_email`,
  `section`, `parent_email`. Hook shape is camelCase:
  `{ id, firstName, lastName, grade, studentEmail, parentEmail }`.
- `gmen_enrollments` unique constraint: `(student_email, grading_period)`.
- `gmen_classes` check: `grading_period BETWEEN 1 AND 4`.
- `gmen_enrollments.student_id` is **`text`**, but `students.id` is `uuid`.
  Since the table has **zero rows**, the type can be corrected for free.
- `is_staff_member()` is the staff RLS helper
  (`supabase/migrations/20260621_classroom_schema.sql:5`). `SECURITY DEFINER`
  RPC conventions to copy are in the same file around lines 180-205.

---

## 4. Target data model

```
gmen_classes        one row per teacher per grading period   (semester truth)
gmen_enrollments    one row per student per grading period   (semester truth)
gmen_pull_requests  one row per student per day per requester (day overlay)   NEW
gmen_attendance     one row per student per day               (day record)    NEW
```

The top two change rarely. The bottom two are written daily and never mutate the
top two. That separation is the whole design — keep it clean.

---

## 5. Phase 0 — unbreak it

No new features. Make the existing forms succeed against the live schema.
Roughly half a day. Nothing else can be tested until this lands.

**Migration** `supabase/migrations/<date>_gmen_phase0_fixes.sql`:

```sql
-- Safe: gmen_enrollments has zero rows.
alter table public.gmen_enrollments
  alter column student_id drop not null,
  alter column student_id type uuid using nullif(student_id, '')::uuid;

alter table public.gmen_enrollments
  add constraint gmen_enrollments_student_fk
  foreign key (student_id) references public.students(id) on delete set null;

-- Not every teacher has an enrichment day.
alter table public.gmen_classes alter column request_day drop not null;
```

**Code:**

- `src/supabase.js` `enroll()` (~1539) — accept and send `student_id`.
  `bulkEnrollGmen` (~1582) — same; rows without a resolvable student id still
  insert with `student_id: null` rather than failing the batch.
- `src/components/GmenClassManager.jsx` — `AddGmenClassForm` must send the
  signed-in teacher's email, not `null`. Add a `user` prop from
  `GmenPeriod.jsx`. Send `request_day: form.request_day || null`.
- `src/components/gmenImport.js` — `buildImportPlan` resolves each row to a
  `students.id` where it can and carries it on the enrollment objects. It stays
  pure; extend `src/gmenImport.test.js` alongside.
- **Build the missing `GmenClassManager` component** (Phase 2 makes it real —
  for now a working roster list is enough to clear the ReferenceError).

**Done when:** Add Class creates a row; the CSV import enrolls students; the
My Class tab renders without throwing; `gmen_enrollments` has rows.

---

## 6. Phase 1 — signup that holds

**Migration** `<date>_gmen_enrollment_engine.sql`:

```sql
alter table public.gmen_classes
  add column if not exists is_default boolean not null default false;

-- Exactly one Commons/overflow class per grading period.
create unique index if not exists gmen_one_default_per_period
  on public.gmen_classes (grading_period) where is_default;

alter table public.gmen_enrollments
  add column if not exists choice_rank text
    check (choice_rank in ('a','b','overflow','default','admin')),
  add column if not exists assigned_at timestamptz not null default now(),
  add column if not exists moved_by text,
  add column if not exists previous_class_id uuid references public.gmen_classes(id) on delete set null;
```

### The atomic assignment function

Client-side `seatCount()` (`src/supabase.js:1554`) **must not** decide
anything. Thirty students submitting in the same five seconds will all read
19/20 and oversubscribe. Seat checks belong in one transaction holding a lock on
the class row.

```sql
-- Returns true only if the caller may take a seat; caller must still be inside
-- the same transaction when it writes.
create or replace function public.gmen_claim_seat(p_class_id uuid, p_period int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_max int; v_taken int;
begin
  if p_class_id is null then return false; end if;
  select max_seats into v_max from public.gmen_classes
    where id = p_class_id and grading_period = p_period and is_open
    for update;                      -- serializes concurrent enrollers
  if not found then return false; end if;
  select count(*) into v_taken from public.gmen_enrollments
    where class_id = p_class_id and grading_period = p_period;
  return v_taken < v_max;
end $$;

create or replace function public.enroll_gmen(p_choice_a uuid, p_choice_b uuid default null)
returns table (class_id uuid, choice_rank text)
language plpgsql security definer set search_path = public as $$
declare
  v_email  text := auth.jwt() ->> 'email';
  v_period int; v_open boolean;
  v_stu    public.students;
  v_pick   uuid; v_rank text;
begin
  if coalesce(v_email, '') = '' then raise exception 'not signed in'; end if;

  select active_period, enrollment_open into v_period, v_open
    from public.gmen_settings where id = 1;
  if not v_open then raise exception 'enrollment is closed'; end if;

  select * into v_stu from public.students where student_email = v_email;
  if not found then raise exception 'not on the student roster'; end if;

  if public.gmen_claim_seat(p_choice_a, v_period) then
    v_pick := p_choice_a; v_rank := 'a';
  elsif public.gmen_claim_seat(p_choice_b, v_period) then
    v_pick := p_choice_b; v_rank := 'b';
  else
    select id into v_pick from public.gmen_classes
      where grading_period = v_period and is_default;
    if v_pick is null then raise exception 'no room and no overflow class is set'; end if;
    v_rank := 'overflow';
  end if;

  insert into public.gmen_enrollments
    (student_id, student_name, student_email, class_id, grading_period, choice_rank)
  values (v_stu.id, v_stu.first_name || ' ' || v_stu.last_name, v_email,
          v_pick, v_period, v_rank)
  on conflict (student_email, grading_period) do update
    set previous_class_id = public.gmen_enrollments.class_id,
        class_id          = excluded.class_id,
        choice_rank       = excluded.choice_rank,
        assigned_at       = now();

  return query select v_pick, v_rank;
end $$;

grant execute on function public.enroll_gmen(uuid, uuid) to authenticated;
```

Call it from the client with `supabase.rpc('enroll_gmen', {...})`.

### Seeding and syncing

An admin action (`gmen_seed_period(p_period int)`, staff-only) that inserts a
default-class enrollment for every student in `students` who has no enrollment
for that period, `choice_rank = 'default'`. Idempotent — running it twice is a
no-op. Run it at period start and whenever new students are imported.

### Student page changes — `GmenEnrollmentView.jsx`

- **Hide the teacher and room until after assignment.** The current cards render
  `cls.teacher_name` prominently. The user explicitly does not want students
  choosing by teacher. Show class name, description and a seats-remaining
  indicator only; reveal teacher and room on the confirmation screen
  ("You're in Sewing — Mrs. Smith, Room 212").
- Two selects: **First choice** and **Second choice**. Second must differ from
  first. Submit calls `enroll_gmen` once.
- Confirmation states the outcome honestly: first choice, second choice because
  the first filled, or placed in Commons because both filled.
- If the signed-in email is not on the roster, say so with a "tell the office"
  message rather than a generic failure.

**Done when:** two students racing for the last seat produce one enrollment and
one fallback, never two enrollments; a student with no choices left still ends
up in Commons; no student ever sees a teacher name before assignment.

---

## 7. Phase 2 — rosters and fifteen-second attendance

**Migration** `<date>_gmen_attendance.sql`:

```sql
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
```

### Teacher roster — the real `GmenClassManager`

The teacher's own class for the active period: class name, room, seats used,
enrichment day, open/closed, and **"copy from last grading period"** (most
teachers repeat; nobody should retype). Below it the roster, each student
showing when they joined and where they came from (`previous_class_id`,
`assigned_at`) — "students move so much" is the stated pain, so make movement
legible rather than something to reconstruct from memory.

### Attendance UI — speed is the entire specification

The user does not track attendance today because it is too hard. If this takes
longer than fifteen seconds it will not get used.

- Roster loads with **everyone defaulted to Present**. The teacher taps only the
  exceptions. One Submit stamps the whole roster in a single batch write.
- Students already marked `sent` on a pull are **pre-filled as `pulled`** — the
  teacher does nothing for them at all.
- A red dot on the G-Men tab until today's attendance is submitted.
- An admin view of which teachers have not submitted today. This is the part
  that actually changes behaviour in a building; do not cut it.

Skip attendance entirely on non-G-Men days (Mon/Fri) — the day check already
exists at `GmenPeriod.jsx:193`.

**Done when:** a full roster of 20 can be marked and submitted in under fifteen
seconds with no exceptions, and in under thirty with three.

---

## 8. Phase 3 — enrichment pulls

**Migration** `<date>_gmen_pull_requests.sql`:

```sql
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
```

This supersedes `gmen_requests`, which is a flat daily list with no lifecycle and
matches students by comparing name strings (`GmenPeriod.jsx:445`) — that breaks
on the first two students who share a first name and last initial.

**Leave `gmen_requests` in place and working until Phase 3 is fully shipped.**
The kiosk reads it. Migrate the kiosk, then drop the old table in a follow-up.

Three surfaces over the one table:

1. **Requesting teacher (enrichment day).** Search the roster, add students with
   a short reason, watch a live board: Requested → Sent → Arrived.
2. **Home teacher's roster.** The requested student's row carries a gold badge —
   "→ Smith · Biology". One tap sets `status = 'sent'`, stamps `sent_by`/
   `sent_at`, and writes that student's attendance as `pulled`. This is
   requirement E.
3. **Kiosk.** Repoint the existing display at the new table. Do not rewrite it.

**Never move the enrollment row on a pull.** The overlay is the design.

---

## 9. Conventions and guardrails

- **Migrations** live in `supabase/migrations/` AND are applied to the live
  project via the Supabase MCP. Per `CLAUDE.md` these are independent of git —
  a migration can be live before its frontend lands. Write the file *and* apply
  it, and say which you did.
- **Deploys.** Production is Vercel `jag-staff`, `main` only. This branch gets a
  preview deploy. Do not merge to main or deploy to production.
- **Do not touch** `claude/platform-feature-review-ujqg3y` or
  `claude/hopeful-feynman-kqwnew` (see `CLAUDE.md`).
- **RLS on every new table.** Staff-all via `is_staff_member()`; students get
  narrow own-row policies only where they genuinely need them. Students have no
  business reading `gmen_attendance` or `gmen_pull_requests` at all.
- **Style.** Match the surrounding code: inline styles, `GOLD` from
  `../constants.js`, `card`/`section-title`/`tag` classes, the existing
  realtime-channel-plus-refetch hook pattern in `src/supabase.js`.
- **Pure logic stays pure and tested.** `gmenImport.js` has real unit tests;
  put new decision logic in the same shape rather than burying it in components.
- Run `npm run lint` and `npm test` before committing. Dependencies are not
  installed in a fresh container — `npm install` first.

### Do not

- Decide seat availability on the client.
- Move an enrollment row for a pull.
- Create a second student-matching routine — reuse `supabase.js:1875-1895`.
- Drop `gmen_requests` before the kiosk is migrated.
- Show a student a teacher's name before they are assigned.

---

## 10. Known open items

- **The 307 missing roster emails.** With Google sign-in this is a launch
  prerequisite: a student whose roster row has no email cannot be matched by
  `enroll_gmen`, which raises 'not on the student roster'. Cheapest fix is one
  SIS export with an email column through the existing importer. Fallback, if
  that export proves painful: a one-time "which of these is you?" match on first
  sign-in that backfills the email, reusing the name-match pattern. **ASK the
  user before building the fallback** — the export may already be on its way.
- **Duplicate RLS policies.** `gmen_enrollments` and `gmen_change_requests` each
  carry two near-identical student policies, one on `{public}` and one on
  `{authenticated}` (e.g. "student enroll" vs "student insert own"). Harmless
  but confusing. Worth a tidy-up migration once Phase 1 is stable.
- **`gmen_enrollments` is world-readable to any authenticated user** ("authenticated
  read enrollments", `qual = true`) so the client can count seats. Once
  `gmen_claim_seat` owns seat decisions, this can be narrowed to a seat-count
  view and students restricted to their own row.
- **The 20-seat rush.** FCFS with hidden teachers means popular classes fill in
  about a minute. Recommend announcing a fixed open time. If it becomes a
  problem, a lottery mode over the same `choice_rank` data is the upgrade path.
