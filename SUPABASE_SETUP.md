# Supabase Setup — JAG Staff Portal

This app uses **Supabase** (hosted Postgres + Realtime + Auth) to sync hall
pass state across every logged-in staff member in real time. When a student
signs out on the kiosk Chromebook, every teacher with the portal open sees
them in "Currently Out" within ~1 second.

Right now only hall passes are wired to Supabase — the rest of the app (CEU,
requisitions, field trips, weekly events, rosters) is still local-only. The
same pattern extends to those easily when you're ready.

> **Why Supabase over Firebase?** It's the same batteries-included experience
> (database + auth + realtime + free tier) but on top of real Postgres, so the
> admin reporting you'll inevitably want — "every student who left class 5+
> times this month, by teacher" — stays easy with plain SQL.

---

## 1. Create a Supabase project

1. Go to https://supabase.com → **New project**
2. Name it `jag-staff-portal`, pick a strong database password, choose a
   region close to your school (e.g. `East US`)
3. Wait ~2 minutes for it to provision

## 2. Get your API credentials

1. **Project Settings → API**
2. Copy the **Project URL** and the **anon / public** key
3. In your project root, copy `.env.example` to `.env.local` and paste them in:

   ```bash
   cp .env.example .env.local
   ```

   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

   The anon key is **safe to ship in the browser** — Row Level Security (step
   4) is what actually protects the data. `.env.local` is gitignored.

## 3. Create the tables

Open **SQL Editor → New query**, paste this, and **Run**:

```sql
-- Active passes: one row per student currently OUT
create table public.hall_passes (
  id            uuid primary key default gen_random_uuid(),
  student_id    text not null,
  student_name  text not null,
  destination   text not null,
  out_time      timestamptz not null default now(),
  teacher_name  text,
  teacher_email text,
  room          text,
  created_at    timestamptz not null default now()
);

-- Completed trips: immutable historical log
create table public.hall_pass_log (
  id            uuid primary key default gen_random_uuid(),
  student_id    text not null,
  student_name  text not null,
  destination   text not null,
  out_time      timestamptz not null,
  return_time   timestamptz not null,
  duration      integer,          -- minutes
  teacher_name  text,
  room          text,
  created_at    timestamptz not null default now()
);

-- Helpful indexes for reporting later
create index on public.hall_pass_log (student_id);
create index on public.hall_pass_log (created_at);
```

## 4. Row Level Security (RLS)

This restricts all access to signed-in `@jagschools.org` accounts. Run in the
SQL Editor:

```sql
alter table public.hall_passes   enable row level security;
alter table public.hall_pass_log enable row level security;

-- Helper: true only for verified school-domain users
create or replace function public.is_staff()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') like '%@jagschools.org'
$$;

-- hall_passes: staff can read, create, and remove (sign back in)
create policy "staff read passes"   on public.hall_passes
  for select using (public.is_staff());
create policy "staff create passes" on public.hall_passes
  for insert with check (public.is_staff());
create policy "staff delete passes" on public.hall_passes
  for delete using (public.is_staff());

-- hall_pass_log: staff can read and append; log rows are immutable
create policy "staff read log"   on public.hall_pass_log
  for select using (public.is_staff());
create policy "staff append log" on public.hall_pass_log
  for insert with check (public.is_staff());
-- (no update/delete policies => nobody can alter or remove log rows)
```

**What this does:** only users signed in with a verified `@jagschools.org`
Google account can touch the data, even if they have the URL and anon key.

## 5. Enable Realtime on the tables

1. **Database → Replication** (or **Realtime** in newer dashboards)
2. Add `hall_passes` and `hall_pass_log` to the `supabase_realtime`
   publication, or run:

   ```sql
   alter publication supabase_realtime add table public.hall_passes;
   alter publication supabase_realtime add table public.hall_pass_log;
   ```

This is what makes one teacher's sign-out appear instantly on every other
open portal and on the kiosk.

## 6. Enable Google Sign-In (recommended)

If `jagschools.org` is a Google Workspace district, staff are already signed
into Google — no new passwords.

1. **Authentication → Providers → Google** → enable
2. Create OAuth credentials in Google Cloud Console, paste the Client ID +
   Secret, and add Supabase's callback URL (shown on the provider page) to the
   Google OAuth "Authorized redirect URIs"
3. **Authentication → URL Configuration** → add your deployed site URL to the
   redirect allow-list

> The portal currently uses an email-only login stub (`LoginScreen` in
> `src/App.jsx`). When you go live, swap it for
> `supabase.auth.signInWithOAuth({ provider: 'google' })`. The session token
> Supabase issues is what the RLS policies above check, so once real auth is
> wired in, the database locks down automatically.

## 7. Restrict to your school domain (belt + suspenders)

The RLS policy already blocks non-school accounts at the database. The JSX
keeps a client-side `@jagschools.org` check in `LoginScreen` too. Leave both.

## 8. Run locally

```bash
npm install
npm run dev
```

You'll see a green **● Live Sync** pill on the Hall Pass tab when Supabase is
reachable, or an amber **● Local Only** pill when env vars are missing.

## 9. Deploy

Supabase hosts your data, not your static site. Build the front-end and deploy
the `dist/` folder to any static host — **Vercel**, **Netlify**, or
**Cloudflare Pages** all work and have free tiers:

```bash
npm run build      # outputs to dist/
```

Set the same two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in
your host's dashboard, then point the classroom Chromebooks at the deployed
URL. On the Hall Pass tab → **Launch Kiosk Mode** → press Ctrl+Shift+F for
fullscreen (or set it as a kiosk app via the Google Admin Console).

---

## Data model

```
hall_passes (table)                  ← active passes (student is OUT)
  id (uuid)
  student_id, student_name
  destination
  out_time (timestamptz)
  teacher_name, teacher_email, room  ← room of origin
  created_at

hall_pass_log (table)                ← completed trips (immutable)
  id (uuid)
  student_id, student_name
  destination
  out_time, return_time (timestamptz)
  duration (minutes)
  teacher_name, room
  created_at
```

When a student returns, a `hall_pass_log` row is written and the `hall_passes`
row is deleted (two client calls in `src/supabase.js`). For strict atomicity,
move both into a Postgres function and call it via `supabase.rpc(...)`.

## Reporting (the payoff for using Postgres)

Because this is real SQL, admin reports are one query — e.g. chronic hall-pass
users this month:

```sql
select student_name, count(*) as trips, sum(duration) as total_minutes
from public.hall_pass_log
where created_at >= date_trunc('month', now())
group by student_name
having count(*) >= 5
order by trips desc;
```

## Optional: nightly cleanup

If you don't want `hall_pass_log` to grow forever, schedule a job with the
**pg_cron** extension to delete rows older than 90 days. Skip it unless it
actually becomes an issue — the free tier handles a year of this easily.

## Troubleshooting

- **Amber "● Local Only" pill:** env vars missing/misspelled. They must start
  with `VITE_` and live in `.env.local`; restart `npm run dev` after editing.
- **Rows insert but nothing syncs to other browsers:** Realtime publication
  not enabled on the tables (step 5).
- **"new row violates row-level security policy":** the signed-in account
  isn't `@jagschools.org`, or real auth isn't wired up yet so there's no JWT
  for `is_staff()` to read. During early local testing you can temporarily
  loosen the policies, but re-tighten before go-live.
- **Cost:** realistic load (200 staff × 50 sign-outs/day) sits well inside the
  Supabase free tier.
```

---

## Infractions table

Run this in the SQL Editor after the hall pass setup:

```sql
create table public.infractions (
  id           uuid primary key default gen_random_uuid(),
  student_id   text not null,
  student_name text not null,
  type         text not null,
  notes        text,
  teacher_name text not null,
  room         text,
  created_at   timestamptz not null default now()
);

create index on public.infractions (student_id);
create index on public.infractions (created_at);

alter table public.infractions enable row level security;

create policy "staff read infractions"
  on public.infractions for select using (public.is_staff());

create policy "staff insert infractions"
  on public.infractions for insert with check (public.is_staff());
-- No update/delete — log rows are immutable.

alter publication supabase_realtime add table public.infractions;
```

The `public.is_staff()` function was created in the hall pass setup step — it
already covers this table without any changes.

---

## Gradebook tables

The gradebook (`useGradebook` in `src/supabase.js`) syncs four tables per teacher,
scoped by `teacher_email`. If Supabase is not configured the gradebook still works
fully in local React state; these tables are only needed for cross-device sync.

```sql
-- Weighted-category / scale configuration -----------------------------------
create table if not exists public.gradebook_profiles (
  id           uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  name         text not null,
  categories   jsonb not null default '[]',   -- [{ name, weight, color, drop_lowest }]
  is_active    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.gradebook_assignments (
  id            uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  name          text not null,
  category      text not null,
  grading_period int not null,                -- 1-4 = periods, 5 = midterm, 6 = final
  max_points    numeric not null default 100,
  due_date      date,
  description   text,
  extra_credit  boolean not null default false,
  rubric        jsonb,                         -- [{ id, criterion, description, max_points }]
  sort_order    integer,                       -- manual column ordering (drag-drop)
  created_at    timestamptz not null default now()
);

create table if not exists public.gradebook_grades (
  id              uuid primary key default gen_random_uuid(),
  teacher_email   text not null,
  assignment_id   uuid not null references public.gradebook_assignments(id) on delete cascade,
  student_id      text not null,
  student_name    text,
  points_earned   numeric,
  excused         boolean not null default false,
  missing         boolean not null default false,
  late            boolean not null default false,
  retake_score    numeric,
  retake_policy   text default 'higher',
  rubric_scores   jsonb,                       -- { criterion_id: score }
  rubric_comments jsonb,                       -- { criterion_id: comment text }
  notes           text,
  graded_at       timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists public.gradebook_settings (
  teacher_email       text primary key,
  grading_scale       jsonb,                   -- [{ letter, min }]
  period_weights      jsonb,                   -- { 1:20, 2:20, 3:20, 4:20, midterm:10, final:10 }
  auto_email_fail     boolean not null default true,
  auto_email_drop     boolean not null default true,
  auto_zero_missing   boolean not null default false,
  auto_zero_grace_days integer not null default 0,
  late_penalty_pct    integer not null default 0,
  updated_at          timestamptz,
  updated_by          text
);

create index if not exists gradebook_assignments_teacher on public.gradebook_assignments (teacher_email);
create index if not exists gradebook_grades_teacher on public.gradebook_grades (teacher_email);
create index if not exists gradebook_grades_assignment on public.gradebook_grades (assignment_id);
create index if not exists gradebook_profiles_teacher on public.gradebook_profiles (teacher_email);

alter table public.gradebook_profiles    enable row level security;
alter table public.gradebook_assignments enable row level security;
alter table public.gradebook_grades      enable row level security;
alter table public.gradebook_settings    enable row level security;

-- Staff may read/write only their own gradebook rows.
do $$
declare t text;
begin
  foreach t in array array['gradebook_profiles','gradebook_assignments','gradebook_grades','gradebook_settings']
  loop
    execute format('create policy "staff manage %1$s" on public.%1$s for all using (public.is_staff() and teacher_email = auth.jwt()->>''email'') with check (public.is_staff() and teacher_email = auth.jwt()->>''email'');', t);
  end loop;
end $$;

alter publication supabase_realtime add table public.gradebook_profiles;
alter publication supabase_realtime add table public.gradebook_assignments;
alter publication supabase_realtime add table public.gradebook_grades;
alter publication supabase_realtime add table public.gradebook_settings;
```

### Migration — gradebook revamp columns

If your gradebook tables predate the revamp, add the new columns. All are additive and
nullable/defaulted, so existing rows are unaffected:

```sql
alter table public.gradebook_assignments add column if not exists sort_order integer;
alter table public.gradebook_grades      add column if not exists rubric_comments jsonb;
alter table public.gradebook_grades      add column if not exists late boolean not null default false;
alter table public.gradebook_settings    add column if not exists auto_zero_missing boolean not null default false;
alter table public.gradebook_settings    add column if not exists auto_zero_grace_days integer not null default 0;
alter table public.gradebook_settings    add column if not exists late_penalty_pct integer not null default 0;
```

These back the drag-drop column ordering, per-criterion rubric comments, and the
auto-zero-missing-work policy respectively.

---

## Classroom ("My Classroom" zone) tables

The Classroom zone (ported from ClassOS) is backed by eight `teacher_email`-scoped
tables, a `classroom-materials` Storage bucket, and a small set of `SECURITY DEFINER`
RPCs. The RPCs are the **only** path that moves Mole Dollars, so a student can never
write their own balance. Teacher-only writes are gated on `public.is_staff_member()`
(real `staff_directory` membership) because `public.is_staff()` is a domain check that
is also true for students (they share `@jagschools.org`).

Run this once in the SQL Editor (safe to re-run except the realtime `add table` lines
at the bottom — skip any that error with "already a member"). Depends on
`public.staff_directory` existing.

```sql
-- =============================================================================
--  CLASSROOM ("My Classroom" zone) — tables, RLS, RPCs, storage, realtime.
-- =============================================================================

-- 0) Helpers ------------------------------------------------------------------
-- Domain check (TRUE for students too — they share @jagschools.org).
create or replace function public.is_staff()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') like '%@jagschools.org'
$$;

-- TEACHER check — actual staff_directory membership (students are NOT members).
create or replace function public.is_staff_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_directory sd
                 where sd.email = auth.jwt() ->> 'email');
$$;

-- 1) Tables -------------------------------------------------------------------
create table if not exists public.classroom_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  name text not null, subject text, period integer, room text,
  created_at timestamptz not null default now()
);

create table if not exists public.classroom_students (
  id uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  class_id uuid not null references public.classroom_classes(id) on delete cascade,
  student_email text not null, student_name text not null, avatar text,
  is_demo boolean not null default false,
  balance integer not null default 0,
  locked_balance integer not null default 0,
  wizard_complete boolean not null default false,
  gizmo jsonb not null default '{}'::jsonb,     -- { username, password }
  safety jsonb not null default '{}'::jsonb,     -- { signedName, signedAt }
  guardian jsonb not null default '{}'::jsonb,    -- { name, phone, email }
  created_at timestamptz not null default now(),
  unique (class_id, student_email)
);

create table if not exists public.classroom_units (
  id uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  class_id uuid not null references public.classroom_classes(id) on delete cascade,
  title text not null, description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.classroom_materials (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.classroom_units(id) on delete cascade,
  teacher_email text not null,
  type text not null default 'other', title text not null, description text,
  study_content text,
  key_terms jsonb not null default '[]'::jsonb,   -- [{ term, definition }]
  extracted_text text,
  has_file boolean not null default false,
  file_name text, file_type text, file_size integer, storage_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.mole_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  class_id uuid references public.classroom_classes(id) on delete cascade,
  student_id uuid references public.classroom_students(id) on delete cascade,
  student_email text not null, student_name text,
  item text not null, cost integer not null check (cost >= 0),
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  note text, created_at timestamptz not null default now(),
  reviewed_at timestamptz, reviewed_by text
);

create table if not exists public.help_tickets (
  id uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  class_id uuid references public.classroom_classes(id) on delete cascade,
  student_id uuid references public.classroom_students(id) on delete cascade,
  student_email text not null, student_name text,
  category text not null, details text,
  status text not null default 'submitted' check (status in ('submitted','in_progress','completed')),
  archived boolean not null default false,
  created_at timestamptz not null default now(), completed_at timestamptz
);

create table if not exists public.classroom_emails (
  id uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  class_id uuid references public.classroom_classes(id) on delete set null,
  student_email text, to_email text not null, subject text,
  sent_at timestamptz not null default now(), status text not null default 'sent'
);

create table if not exists public.classroom_notifications (
  id uuid primary key default gen_random_uuid(),
  teacher_email text not null, student_email text not null,
  kind text, tone text, text text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) Indexes ------------------------------------------------------------------
create index if not exists classroom_students_class  on public.classroom_students (class_id);
create index if not exists classroom_students_email  on public.classroom_students (student_email);
create index if not exists classroom_units_class     on public.classroom_units (class_id);
create index if not exists classroom_materials_unit  on public.classroom_materials (unit_id);
create index if not exists mole_requests_teacher     on public.mole_requests (teacher_email);
create index if not exists mole_requests_student     on public.mole_requests (student_email);
create index if not exists help_tickets_teacher      on public.help_tickets (teacher_email);
create index if not exists help_tickets_student      on public.help_tickets (student_email);
create index if not exists classroom_notif_student   on public.classroom_notifications (student_email);

-- 3) RLS ----------------------------------------------------------------------
alter table public.classroom_classes       enable row level security;
alter table public.classroom_students       enable row level security;
alter table public.classroom_units          enable row level security;
alter table public.classroom_materials       enable row level security;
alter table public.mole_requests             enable row level security;
alter table public.help_tickets              enable row level security;
alter table public.classroom_emails          enable row level security;
alter table public.classroom_notifications   enable row level security;

-- Teacher owns rows by teacher_email AND must be a staff_directory member.
do $policies$
declare t text;
begin
  foreach t in array array[
    'classroom_classes','classroom_students','classroom_units','classroom_materials',
    'mole_requests','help_tickets','classroom_emails','classroom_notifications'
  ] loop
    execute format('drop policy if exists "teacher manage %1$s" on public.%1$s;', t);
    execute format(
      'create policy "teacher manage %1$s" on public.%1$s for all '
      'using (public.is_staff_member() and teacher_email = auth.jwt() ->> ''email'') '
      'with check (public.is_staff_member() and teacher_email = auth.jwt() ->> ''email'');', t);
  end loop;
end $policies$;

-- Student read/own policies (combined OR with the teacher policies above).
drop policy if exists "student reads own profile" on public.classroom_students;
create policy "student reads own profile" on public.classroom_students
  for select using (student_email = auth.jwt() ->> 'email');

drop policy if exists "student reads enrolled class" on public.classroom_classes;
create policy "student reads enrolled class" on public.classroom_classes
  for select using (exists (select 1 from public.classroom_students cs
    where cs.class_id = classroom_classes.id and cs.student_email = auth.jwt() ->> 'email'));

drop policy if exists "student reads enrolled units" on public.classroom_units;
create policy "student reads enrolled units" on public.classroom_units
  for select using (exists (select 1 from public.classroom_students cs
    where cs.class_id = classroom_units.class_id and cs.student_email = auth.jwt() ->> 'email'));

drop policy if exists "student reads enrolled materials" on public.classroom_materials;
create policy "student reads enrolled materials" on public.classroom_materials
  for select using (exists (
    select 1 from public.classroom_units u
    join public.classroom_students cs on cs.class_id = u.class_id
    where u.id = classroom_materials.unit_id and cs.student_email = auth.jwt() ->> 'email'));

drop policy if exists "student reads own tickets" on public.help_tickets;
create policy "student reads own tickets" on public.help_tickets
  for select using (student_email = auth.jwt() ->> 'email');
drop policy if exists "student creates own tickets" on public.help_tickets;
create policy "student creates own tickets" on public.help_tickets
  for insert with check (student_email = auth.jwt() ->> 'email');

drop policy if exists "student reads own mole requests" on public.mole_requests;
create policy "student reads own mole requests" on public.mole_requests
  for select using (student_email = auth.jwt() ->> 'email');

drop policy if exists "student reads own notifications" on public.classroom_notifications;
create policy "student reads own notifications" on public.classroom_notifications
  for select using (student_email = auth.jwt() ->> 'email');
drop policy if exists "student updates own notifications" on public.classroom_notifications;
create policy "student updates own notifications" on public.classroom_notifications
  for update using (student_email = auth.jwt() ->> 'email')
  with check (student_email = auth.jwt() ->> 'email');

-- 4) RPCs — the only path that moves Mole Dollars (SECURITY DEFINER) ----------
create or replace function public.submit_mole_request(p_student_id uuid, p_item text, p_cost integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_email text := auth.jwt() ->> 'email'; v_row public.classroom_students; v_id uuid;
begin
  select * into v_row from public.classroom_students where id = p_student_id;
  if not found or v_row.student_email <> v_email then raise exception 'not your account'; end if;
  if p_cost < 0 or v_row.balance < p_cost then raise exception 'insufficient balance'; end if;
  update public.classroom_students set balance = balance - p_cost,
         locked_balance = locked_balance + p_cost where id = p_student_id;
  insert into public.mole_requests (teacher_email, class_id, student_id, student_email, student_name, item, cost, status)
  values (v_row.teacher_email, v_row.class_id, v_row.id, v_row.student_email, v_row.student_name, p_item, p_cost, 'pending')
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.approve_mole_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := auth.jwt() ->> 'email'; v_req public.mole_requests;
begin
  select * into v_req from public.mole_requests where id = p_request_id;
  if not found then raise exception 'no such request'; end if;
  if not public.is_staff_member() or v_req.teacher_email <> v_email then raise exception 'not authorized'; end if;
  if v_req.status <> 'pending' then return; end if;
  update public.classroom_students set locked_balance = greatest(0, locked_balance - v_req.cost)
    where id = v_req.student_id;
  update public.mole_requests set status='approved', reviewed_at=now(), reviewed_by=v_email where id = p_request_id;
  insert into public.classroom_notifications (teacher_email, student_email, kind, tone, text)
  values (v_req.teacher_email, v_req.student_email, 'mole', 'success',
          format('Your "%s" redemption was approved! 🎉', v_req.item));
end $$;

create or replace function public.deny_mole_request(p_request_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := auth.jwt() ->> 'email'; v_req public.mole_requests;
begin
  select * into v_req from public.mole_requests where id = p_request_id;
  if not found then raise exception 'no such request'; end if;
  if not public.is_staff_member() or v_req.teacher_email <> v_email then raise exception 'not authorized'; end if;
  if v_req.status <> 'pending' then return; end if;
  update public.classroom_students set balance = balance + v_req.cost,
         locked_balance = greatest(0, locked_balance - v_req.cost) where id = v_req.student_id;
  update public.mole_requests set status='denied', note=p_note, reviewed_at=now(), reviewed_by=v_email where id = p_request_id;
  insert into public.classroom_notifications (teacher_email, student_email, kind, tone, text)
  values (v_req.teacher_email, v_req.student_email, 'mole', 'warning',
          format('Your "%s" redemption was denied.%s', v_req.item,
                 case when p_note is not null then ' Note: '||p_note else '' end));
end $$;

create or replace function public.grant_mole_dollars(p_student_id uuid, p_amount integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := auth.jwt() ->> 'email'; v_row public.classroom_students;
begin
  select * into v_row from public.classroom_students where id = p_student_id;
  if not found then raise exception 'no such student'; end if;
  if not public.is_staff_member() or v_row.teacher_email <> v_email then raise exception 'not authorized'; end if;
  update public.classroom_students set balance = greatest(0, balance + p_amount) where id = p_student_id;
end $$;

create or replace function public.complete_wizard(p_student_id uuid, p_gizmo jsonb, p_guardian jsonb, p_signed_name text)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := auth.jwt() ->> 'email'; v_row public.classroom_students;
begin
  select * into v_row from public.classroom_students where id = p_student_id;
  if not found or v_row.student_email <> v_email then raise exception 'not your account'; end if;
  update public.classroom_students
     set wizard_complete = true, gizmo = coalesce(p_gizmo, gizmo),
         guardian = coalesce(p_guardian, guardian),
         safety = jsonb_build_object('signedName', p_signed_name, 'signedAt', now())
   where id = p_student_id;
end $$;

grant execute on function
  public.submit_mole_request(uuid, text, integer),
  public.approve_mole_request(uuid),
  public.deny_mole_request(uuid, text),
  public.grant_mole_dollars(uuid, integer),
  public.complete_wizard(uuid, jsonb, jsonb, text),
  public.is_staff_member()
to authenticated;

-- 5) Storage — material files -------------------------------------------------
insert into storage.buckets (id, name, public)
values ('classroom-materials', 'classroom-materials', false)
on conflict (id) do nothing;

drop policy if exists "staff write classroom materials" on storage.objects;
create policy "staff write classroom materials" on storage.objects
  for all using (bucket_id = 'classroom-materials' and public.is_staff_member())
  with check (bucket_id = 'classroom-materials' and public.is_staff_member());

drop policy if exists "school reads classroom materials" on storage.objects;
create policy "school reads classroom materials" on storage.objects
  for select using (bucket_id = 'classroom-materials' and public.is_staff());

-- 6) Realtime (run once; skip lines that error "already a member") ------------
alter publication supabase_realtime add table public.classroom_classes;
alter publication supabase_realtime add table public.classroom_students;
alter publication supabase_realtime add table public.classroom_units;
alter publication supabase_realtime add table public.classroom_materials;
alter publication supabase_realtime add table public.mole_requests;
alter publication supabase_realtime add table public.help_tickets;
alter publication supabase_realtime add table public.classroom_emails;
alter publication supabase_realtime add table public.classroom_notifications;
```

### Classroom data model (camelCase ↔ column mapping)

The app maps snake_case rows to the shapes the ported views expect (mirrors the
gradebook's `useGradebook`): `classroom_students` → `{ classId, studentName,
balance, lockedBalance, wizardComplete, gizmo, safety, guardian }`; `mole_requests` →
`{ studentId, item, cost, status, note }`; `help_tickets` → `{ studentId, category,
details, status, archived }`. Metrics (approved Mole $, completed tasks) are computed
from `mole_requests` + `help_tickets`; the dashboard layout stays in `localStorage`.
