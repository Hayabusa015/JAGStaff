-- ─────────────────────────────────────────────────────────────────────────────
-- 1. app_settings — building-wide toggles an admin controls from Admin
--    Settings. Starts with hidden_tabs: school-zone tab keys to hide from
--    everyone (Infractions is hidden by default).
--
-- 2. Parent-teacher conferences — teachers publish time slots, parents book
--    one from a public page (/conferences) WITHOUT an account.
--
--    Parents never touch the tables directly. anon has no table grants at all;
--    everything public goes through three SECURITY DEFINER functions that
--    expose only what a parent needs:
--      conference_teachers()       teachers with open future slots (name + email)
--      conference_open_slots(t)    that teacher's unbooked future slots
--      conference_book(...)        claim one slot → returns a cancel token
--      conference_cancel(token)    parent cancels their own booking
--    Nothing a parent submits can be read back by the public: bookings are
--    visible only to the teacher who owns the slot (and admins).
--
--    Membership checks use staff_directory directly rather than is_staff(),
--    because the live is_staff() is still domain-only (students share the
--    @jagschools.org domain).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.is_staff_member()
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.staff_directory
    where email = coalesce(auth.jwt() ->> 'email', '')
  )
$$;

-- ── app_settings ────────────────────────────────────────────────────────────
create table if not exists public.app_settings (
  id          int primary key default 1 check (id = 1),
  hidden_tabs text[] not null default '{infractions}',
  updated_at  timestamptz not null default now(),
  updated_by  text
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;
alter table public.app_settings enable row level security;

drop policy if exists "staff read app settings"  on public.app_settings;
drop policy if exists "admin update app settings" on public.app_settings;
create policy "staff read app settings" on public.app_settings
  for select using (public.is_staff_member());
create policy "admin update app settings" on public.app_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- ── conference_slots ────────────────────────────────────────────────────────
create table if not exists public.conference_slots (
  id            uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  teacher_name  text,
  starts_at     timestamptz not null,
  duration_min  int not null default 15 check (duration_min between 5 and 120),
  location      text check (char_length(location) <= 120),
  created_at    timestamptz not null default now(),
  unique (teacher_email, starts_at)
);
create index if not exists conference_slots_teacher_time
  on public.conference_slots (teacher_email, starts_at);
alter table public.conference_slots enable row level security;

drop policy if exists "teacher manages own slots" on public.conference_slots;
drop policy if exists "admin reads all slots"     on public.conference_slots;
create policy "teacher manages own slots" on public.conference_slots
  for all
  using      (public.is_staff_member() and teacher_email = (auth.jwt() ->> 'email'))
  with check (public.is_staff_member() and teacher_email = (auth.jwt() ->> 'email'));
create policy "admin reads all slots" on public.conference_slots
  for select using (public.is_admin());

-- ── conference_bookings ─────────────────────────────────────────────────────
create table if not exists public.conference_bookings (
  id           uuid primary key default gen_random_uuid(),
  slot_id      uuid not null unique references public.conference_slots(id) on delete cascade,
  parent_name  text not null check (char_length(parent_name)  between 1 and 100),
  parent_email text          check (char_length(parent_email) <= 200),
  parent_phone text          check (char_length(parent_phone) <= 40),
  student_name text not null check (char_length(student_name) between 1 and 100),
  reason       text not null check (reason in ('check_in','struggling','concerns','other')),
  notes        text          check (char_length(notes) <= 1000),
  cancel_token uuid not null default gen_random_uuid() unique,
  created_at   timestamptz not null default now()
);
alter table public.conference_bookings enable row level security;

-- Teacher sees and can remove (cancel) bookings on their own slots. No insert
-- policy: bookings are created only by conference_book().
drop policy if exists "teacher reads own bookings"   on public.conference_bookings;
drop policy if exists "teacher deletes own bookings" on public.conference_bookings;
drop policy if exists "admin reads all bookings"     on public.conference_bookings;
create policy "teacher reads own bookings" on public.conference_bookings
  for select using (exists (
    select 1 from public.conference_slots s
    where s.id = slot_id and s.teacher_email = (auth.jwt() ->> 'email')
  ) and public.is_staff_member());
create policy "teacher deletes own bookings" on public.conference_bookings
  for delete using (exists (
    select 1 from public.conference_slots s
    where s.id = slot_id and s.teacher_email = (auth.jwt() ->> 'email')
  ) and public.is_staff_member());
create policy "admin reads all bookings" on public.conference_bookings
  for select using (public.is_admin());

revoke all on public.conference_slots, public.conference_bookings, public.app_settings from anon;

-- ── Public RPCs ─────────────────────────────────────────────────────────────
create or replace function public.conference_teachers()
returns table (teacher_email text, teacher_name text, open_slots bigint)
language sql stable security definer set search_path = public as $$
  select s.teacher_email,
         coalesce(max(sd.name), max(s.teacher_name), split_part(s.teacher_email, '@', 1)),
         count(*)
  from public.conference_slots s
  left join public.conference_bookings b on b.slot_id = s.id
  left join public.staff_directory sd on sd.email = s.teacher_email
  where s.starts_at > now() and b.id is null
  group by s.teacher_email
  order by 2
$$;

create or replace function public.conference_open_slots(p_teacher_email text)
returns table (id uuid, starts_at timestamptz, duration_min int, location text)
language sql stable security definer set search_path = public as $$
  select s.id, s.starts_at, s.duration_min, s.location
  from public.conference_slots s
  where s.teacher_email = lower(trim(p_teacher_email))
    and s.starts_at > now()
    and not exists (select 1 from public.conference_bookings b where b.slot_id = s.id)
  order by s.starts_at
$$;

create or replace function public.conference_book(
  p_slot_id uuid, p_parent_name text, p_parent_email text, p_parent_phone text,
  p_student_name text, p_reason text, p_notes text
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_slot  public.conference_slots;
  v_token uuid;
  v_email text := nullif(lower(trim(p_parent_email)), '');
  v_phone text := nullif(trim(p_parent_phone), '');
begin
  if nullif(trim(p_parent_name), '') is null or nullif(trim(p_student_name), '') is null then
    raise exception 'Parent and student names are required.';
  end if;
  if v_email is null and v_phone is null then
    raise exception 'Please leave an email or phone number so the teacher can reach you.';
  end if;

  select * into v_slot from public.conference_slots where id = p_slot_id for update;
  if not found or v_slot.starts_at <= now() then
    raise exception 'That time is no longer available.';
  end if;

  -- Light abuse guard: one contact can hold at most 3 slots per teacher.
  if (select count(*) from public.conference_bookings b
        join public.conference_slots s on s.id = b.slot_id
       where s.teacher_email = v_slot.teacher_email and s.starts_at > now()
         and (b.parent_email = v_email or b.parent_phone = v_phone)) >= 3 then
    raise exception 'You already have the maximum number of conferences booked with this teacher.';
  end if;

  begin
    insert into public.conference_bookings
      (slot_id, parent_name, parent_email, parent_phone, student_name, reason, notes)
    values
      (p_slot_id, trim(p_parent_name), v_email, v_phone, trim(p_student_name),
       p_reason, nullif(trim(p_notes), ''))
    returning cancel_token into v_token;
  exception when unique_violation then
    raise exception 'Someone just booked that time — please pick another.';
  end;
  return v_token;
end $$;

create or replace function public.conference_cancel(p_token uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  delete from public.conference_bookings b
   using public.conference_slots s
   where b.cancel_token = p_token and s.id = b.slot_id and s.starts_at > now();
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

revoke all on function public.conference_teachers()                                         from public;
revoke all on function public.conference_open_slots(text)                                   from public;
revoke all on function public.conference_book(uuid, text, text, text, text, text, text)     from public;
revoke all on function public.conference_cancel(uuid)                                       from public;
grant execute on function public.conference_teachers()                                      to anon, authenticated;
grant execute on function public.conference_open_slots(text)                                to anon, authenticated;
grant execute on function public.conference_book(uuid, text, text, text, text, text, text)  to anon, authenticated;
grant execute on function public.conference_cancel(uuid)                                    to anon, authenticated;
