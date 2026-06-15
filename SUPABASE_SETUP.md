# Supabase Setup — JAG Staff Portal

This app uses **Supabase** (hosted Postgres + Realtime + Auth) to sync hall
pass state across every logged-in staff member in real time. When a student
signs out on the kiosk Chromebook, every teacher with the portal open sees
them in "Currently Out" within ~1 second.

Hall passes, infractions, gradebook, G-Men, the student roster, weekly events,
trip rosters, the CEU tracker, and the field-trip / requisition archives are all
wired to Supabase. Run the SQL blocks in this guide to create their tables; any
table you skip simply falls back to seeded in-memory mode (lost on refresh).

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

-- Helper: true only for verified school-domain users.
-- `set search_path = ''` pins the resolution path so the function can't be
-- hijacked by a role-local search_path (Supabase security linter 0011).
create or replace function public.is_staff()
returns boolean language sql stable set search_path = '' as $$
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

## Weekly Events, Trip Rosters, CEU & request archives

These five tabs used to keep everything in browser memory only, so a refresh
wiped them out. They now persist to Supabase. Run this in the SQL Editor (it
reuses the same `public.is_staff()` helper, so no extra setup):

```sql
-- ── Weekly Events (shared, school-wide) ──────────────────────────
create table public.weekly_events (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,
  title      text not null,
  date       date,
  time       text,
  details    text,
  created_at timestamptz not null default now()
);

-- ── Trip Rosters (shared, school-wide) ───────────────────────────
create table public.trip_rosters (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  title       text not null,
  teacher     text,
  date        date,
  depart      text,
  return_time text,
  notes       text,
  students    jsonb not null default '[]',   -- [{ name, grade }]
  created_at  timestamptz not null default now()
);

-- ── CEU entries (per teacher) ────────────────────────────────────
create table public.ceu_entries (
  id            uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  name          text not null,
  hours         numeric not null,
  entry_date    text,                         -- 'YYYY-MM'
  created_at    timestamptz not null default now()
);
create index on public.ceu_entries (teacher_email);

-- ── Tuition reimbursement expenses (per teacher) ─────────────────
create table public.ceu_reimbursements (
  id            uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  name          text not null,
  cost          numeric not null,
  created_at    timestamptz not null default now()
);
create index on public.ceu_reimbursements (teacher_email);

-- ── Field trip request archive (per teacher) ─────────────────────
create table public.field_trip_requests (
  id            uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  destination   text not null,
  trip_date     date,
  depart        text,
  return_time   text,
  grade         text,
  student_count integer,
  buses         boolean default false,
  needs_sub     boolean default false,
  chaperones    text,
  created_at    timestamptz not null default now()
);
create index on public.field_trip_requests (teacher_email);

-- ── Requisition archive (per teacher) ────────────────────────────
-- The full cart (vendors/items) is stored as JSONB. Quote files are kept by
-- name only — uploading the binaries would need a Supabase Storage bucket.
create table public.requisitions (
  id            uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  cart          jsonb not null default '[]',
  total         numeric default 0,
  created_at    timestamptz not null default now()
);
create index on public.requisitions (teacher_email);

-- ── Row Level Security ───────────────────────────────────────────
alter table public.weekly_events       enable row level security;
alter table public.trip_rosters        enable row level security;
alter table public.ceu_entries         enable row level security;
alter table public.ceu_reimbursements  enable row level security;
alter table public.field_trip_requests enable row level security;
alter table public.requisitions        enable row level security;

-- weekly_events + trip_rosters are genuinely school-wide: any signed-in staff
-- member may read + write them.
do $$
declare t text;
begin
  foreach t in array array['weekly_events','trip_rosters'] loop
    execute format('create policy "staff read %1$s"   on public.%1$I for select using (public.is_staff());', t);
    execute format('create policy "staff insert %1$s" on public.%1$I for insert with check (public.is_staff());', t);
    execute format('create policy "staff delete %1$s" on public.%1$I for delete using (public.is_staff());', t);
  end loop;
end $$;

-- Helpers used by the owner-scoped policies below (and by the gradebook_*
-- policies in supabase/migrations/20260615_owner_scoped_rls.sql).
create or replace function public.current_email()
returns text language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'email', '')
$$;

create or replace function public.is_admin()
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.staff_directory
    where email = coalesce(auth.jwt() ->> 'email', '') and is_admin = true
  )
$$;

-- ceu_entries / ceu_reimbursements / field_trip_requests / requisitions hold a
-- single teacher's private records, so they are OWNER-SCOPED: a teacher only
-- sees their own rows, and an admin (staff_directory.is_admin) sees all. The
-- client already filters by teacher_email; this enforces it at the database.
-- See supabase/migrations/20260615_owner_scoped_rls.sql for the gradebook_*
-- policies, which use these same helpers.
do $$
declare
  t text;
  owner_or_admin constant text :=
    'public.is_staff() and (teacher_email = public.current_email() or public.is_admin())';
begin
  foreach t in array array[
    'ceu_entries','ceu_reimbursements','field_trip_requests','requisitions'
  ] loop
    execute format('create policy "owner read %1$s"   on public.%1$I for select using (%2$s);', t, owner_or_admin);
    execute format('create policy "owner insert %1$s" on public.%1$I for insert with check (%2$s);', t, owner_or_admin);
    execute format('create policy "owner delete %1$s" on public.%1$I for delete using (%2$s);', t, owner_or_admin);
  end loop;
end $$;

-- ── Realtime (only the shared, school-wide tables need it) ────────
alter publication supabase_realtime add table public.weekly_events;
alter publication supabase_realtime add table public.trip_rosters;
```

> **Heads-up:** until you run the SQL above, these tabs fall back to the same
> in-memory behavior as before (seeded demo data, lost on refresh). Once the
> tables exist, everything persists and the shared tabs sync live across staff.
