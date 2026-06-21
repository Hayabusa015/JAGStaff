-- Classroom zone ("My Classroom") schema.
-- Run this after the base setup in SUPABASE_SETUP.md.
-- See the "Classroom zone" section of SUPABASE_SETUP.md for full commentary.

create or replace function public.is_staff_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_directory sd
                 where sd.email = coalesce(auth.jwt() ->> 'email', ''));
$$;
grant execute on function public.is_staff_member() to authenticated;

create table if not exists public.classroom_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_email text not null, name text not null,
  subject text, period integer, room text,
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
  gizmo jsonb not null default '{}'::jsonb,
  safety jsonb not null default '{}'::jsonb,
  guardian jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (class_id, student_email)
);

create table if not exists public.classroom_units (
  id uuid primary key default gen_random_uuid(),
  teacher_email text not null,
  class_id uuid not null references public.classroom_classes(id) on delete cascade,
  title text not null, description text, sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.classroom_materials (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.classroom_units(id) on delete cascade,
  teacher_email text not null, type text not null default 'other',
  title text not null, description text, study_content text,
  key_terms jsonb not null default '[]'::jsonb, extracted_text text,
  has_file boolean not null default false, file_name text, file_type text,
  file_size integer, storage_path text, sort_order integer not null default 0,
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

-- Indexes
create index if not exists classroom_students_class  on public.classroom_students (class_id);
create index if not exists classroom_students_email  on public.classroom_students (student_email);
create index if not exists classroom_units_class     on public.classroom_units (class_id);
create index if not exists classroom_materials_unit  on public.classroom_materials (unit_id);
create index if not exists mole_requests_teacher     on public.mole_requests (teacher_email);
create index if not exists mole_requests_student     on public.mole_requests (student_email);
create index if not exists help_tickets_teacher      on public.help_tickets (teacher_email);
create index if not exists help_tickets_student      on public.help_tickets (student_email);
create index if not exists classroom_notif_student   on public.classroom_notifications (student_email);

-- RLS
do $e$ begin
  alter table public.classroom_classes       enable row level security;
  alter table public.classroom_students      enable row level security;
  alter table public.classroom_units         enable row level security;
  alter table public.classroom_materials     enable row level security;
  alter table public.mole_requests           enable row level security;
  alter table public.help_tickets            enable row level security;
  alter table public.classroom_emails        enable row level security;
  alter table public.classroom_notifications enable row level security;
exception when others then null; end $e$;

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

drop policy if exists "student reads own profile"         on public.classroom_students;
create policy "student reads own profile" on public.classroom_students
  for select using (student_email = auth.jwt() ->> 'email');

drop policy if exists "student reads enrolled class"      on public.classroom_classes;
create policy "student reads enrolled class" on public.classroom_classes
  for select using (exists (select 1 from public.classroom_students cs
    where cs.class_id = classroom_classes.id and cs.student_email = auth.jwt() ->> 'email'));

drop policy if exists "student reads enrolled units"      on public.classroom_units;
create policy "student reads enrolled units" on public.classroom_units
  for select using (exists (select 1 from public.classroom_students cs
    where cs.class_id = classroom_units.class_id and cs.student_email = auth.jwt() ->> 'email'));

drop policy if exists "student reads enrolled materials"  on public.classroom_materials;
create policy "student reads enrolled materials" on public.classroom_materials
  for select using (exists (
    select 1 from public.classroom_units u
    join public.classroom_students cs on cs.class_id = u.class_id
    where u.id = classroom_materials.unit_id and cs.student_email = auth.jwt() ->> 'email'));

drop policy if exists "student reads own tickets"         on public.help_tickets;
create policy "student reads own tickets" on public.help_tickets
  for select using (student_email = auth.jwt() ->> 'email');
drop policy if exists "student creates own tickets"       on public.help_tickets;
create policy "student creates own tickets" on public.help_tickets
  for insert with check (student_email = auth.jwt() ->> 'email');

drop policy if exists "student reads own mole requests"   on public.mole_requests;
create policy "student reads own mole requests" on public.mole_requests
  for select using (student_email = auth.jwt() ->> 'email');

drop policy if exists "student reads own notifications"   on public.classroom_notifications;
create policy "student reads own notifications" on public.classroom_notifications
  for select using (student_email = auth.jwt() ->> 'email');
drop policy if exists "student updates own notifications" on public.classroom_notifications;
create policy "student updates own notifications" on public.classroom_notifications
  for update using (student_email = auth.jwt() ->> 'email')
  with check (student_email = auth.jwt() ->> 'email');

-- RPCs
create or replace function public.submit_mole_request(p_student_id uuid, p_item text, p_cost integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_email text := auth.jwt() ->> 'email'; v_row public.classroom_students; v_id uuid;
begin
  select * into v_row from public.classroom_students where id = p_student_id;
  if not found or v_row.student_email <> v_email then raise exception 'not your account'; end if;
  if p_cost < 0 or v_row.balance < p_cost then raise exception 'insufficient balance'; end if;
  update public.classroom_students set balance = balance - p_cost, locked_balance = locked_balance + p_cost where id = p_student_id;
  insert into public.mole_requests (teacher_email, class_id, student_id, student_email, student_name, item, cost, status)
  values (v_row.teacher_email, v_row.class_id, v_row.id, v_row.student_email, v_row.student_name, p_item, p_cost, 'pending') returning id into v_id;
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
  update public.classroom_students set locked_balance = greatest(0, locked_balance - v_req.cost) where id = v_req.student_id;
  update public.mole_requests set status = 'approved', reviewed_at = now(), reviewed_by = v_email where id = p_request_id;
  insert into public.classroom_notifications (teacher_email, student_email, kind, tone, text)
  values (v_req.teacher_email, v_req.student_email, 'mole', 'success', format('Your "%s" redemption was approved! 🎉', v_req.item));
end $$;

create or replace function public.deny_mole_request(p_request_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text := auth.jwt() ->> 'email'; v_req public.mole_requests;
begin
  select * into v_req from public.mole_requests where id = p_request_id;
  if not found then raise exception 'no such request'; end if;
  if not public.is_staff_member() or v_req.teacher_email <> v_email then raise exception 'not authorized'; end if;
  if v_req.status <> 'pending' then return; end if;
  update public.classroom_students set balance = balance + v_req.cost, locked_balance = greatest(0, locked_balance - v_req.cost) where id = v_req.student_id;
  update public.mole_requests set status = 'denied', note = p_note, reviewed_at = now(), reviewed_by = v_email where id = p_request_id;
  insert into public.classroom_notifications (teacher_email, student_email, kind, tone, text)
  values (v_req.teacher_email, v_req.student_email, 'mole', 'warning',
    format('Your "%s" redemption was denied.%s', v_req.item, case when p_note is not null then ' Note: ' || p_note else '' end));
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
declare v_email text := auth.jwt() ->> 'email';
begin
  if not exists (select 1 from public.classroom_students where id = p_student_id and student_email = v_email) then
    raise exception 'not your account';
  end if;
  update public.classroom_students
     set wizard_complete = true,
         gizmo     = coalesce(p_gizmo, gizmo),
         guardian  = coalesce(p_guardian, guardian),
         safety    = jsonb_build_object('signedName', p_signed_name, 'signedAt', now())
   where id = p_student_id;
end $$;

grant execute on function
  public.submit_mole_request(uuid, text, integer),
  public.approve_mole_request(uuid),
  public.deny_mole_request(uuid, text),
  public.grant_mole_dollars(uuid, integer),
  public.complete_wizard(uuid, jsonb, jsonb, text)
to authenticated;

-- Storage
insert into storage.buckets (id, name, public)
values ('classroom-materials', 'classroom-materials', false)
on conflict (id) do nothing;

drop policy if exists "staff write classroom materials"  on storage.objects;
create policy "staff write classroom materials" on storage.objects
  for all using (bucket_id = 'classroom-materials' and public.is_staff_member())
  with check (bucket_id = 'classroom-materials' and public.is_staff_member());

drop policy if exists "school reads classroom materials" on storage.objects;
create policy "school reads classroom materials" on storage.objects
  for select using (
    bucket_id = 'classroom-materials'
    and coalesce(auth.jwt() ->> 'email', '') like '%@jagschools.org');

-- Realtime
alter publication supabase_realtime add table public.classroom_classes;
alter publication supabase_realtime add table public.classroom_students;
alter publication supabase_realtime add table public.classroom_units;
alter publication supabase_realtime add table public.classroom_materials;
alter publication supabase_realtime add table public.mole_requests;
alter publication supabase_realtime add table public.help_tickets;
alter publication supabase_realtime add table public.classroom_emails;
alter publication supabase_realtime add table public.classroom_notifications;
