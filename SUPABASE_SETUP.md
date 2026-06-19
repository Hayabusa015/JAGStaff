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
alter table public.gradebook_settings    add column if not exists auto_zero_missing boolean not null default false;
alter table public.gradebook_settings    add column if not exists auto_zero_grace_days integer not null default 0;
```

These back the drag-drop column ordering, per-criterion rubric comments, and the
auto-zero-missing-work policy respectively.
