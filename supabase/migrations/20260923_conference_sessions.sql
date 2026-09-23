-- ─────────────────────────────────────────────────────────────────────────────
-- Conference nights are set by the office, not by teachers.
--
-- An admin creates a conference_session (date, window, slot length, optional
-- break). The app then creates that night's slots for every participating
-- teacher, located in their staff_directory room. Teachers only see and
-- manage their own schedule; admins see everyone's (for the mailbox print run).
--
-- Also: conference_bookings.confirmation_sent_at, so the confirmation-email
-- function sends at most once per booking.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.conference_sessions (
  id           uuid primary key default gen_random_uuid(),
  label        text not null check (char_length(label) between 1 and 80),
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  slot_minutes int  not null check (slot_minutes between 5 and 60),
  break_start  time,
  break_end    time,
  created_by   text,
  created_at   timestamptz not null default now(),
  check (end_time > start_time)
);
alter table public.conference_sessions enable row level security;

drop policy if exists "staff read sessions"   on public.conference_sessions;
drop policy if exists "admin manage sessions" on public.conference_sessions;
create policy "staff read sessions" on public.conference_sessions
  for select using (public.is_staff_member());
create policy "admin manage sessions" on public.conference_sessions
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.conference_slots
  add column if not exists session_id uuid references public.conference_sessions(id) on delete cascade;
create index if not exists conference_slots_session on public.conference_slots (session_id);

-- Admins create/remove slots for any teacher (generating a night for all staff).
drop policy if exists "admin manages all slots" on public.conference_slots;
create policy "admin manages all slots" on public.conference_slots
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin deletes bookings" on public.conference_bookings;
create policy "admin deletes bookings" on public.conference_bookings
  for delete using (public.is_admin());

alter table public.conference_bookings
  add column if not exists confirmation_sent_at timestamptz;

revoke all on public.conference_sessions from anon;
