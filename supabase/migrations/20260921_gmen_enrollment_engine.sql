-- Phase 1: signup that holds — atomic seat assignment, the Commons/overflow
-- invariant, and backfilling the 307-student email gap inline at signup.

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

-- Returns true only if the caller may take a seat; caller must still be
-- inside the same transaction when it writes (enroll_gmen calls this).
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

-- p_given_name / p_family_name / p_full_name come from the Google profile
-- (user.user_metadata on the client) and exist solely to resolve the
-- students whose roster row predates emails being tracked.
create or replace function public.enroll_gmen(
  p_choice_a uuid, p_choice_b uuid default null,
  p_given_name text default null, p_family_name text default null, p_full_name text default null
)
returns table (class_id uuid, choice_rank text)
language plpgsql security definer set search_path = public as $$
declare
  v_email  text := auth.jwt() ->> 'email';
  v_period int; v_open boolean;
  v_stu    public.students;
  v_pick   uuid; v_rank text;
  v_first  text; v_last text; v_matches int;
begin
  if coalesce(v_email, '') = '' then raise exception 'not signed in'; end if;

  select active_period, enrollment_open into v_period, v_open
    from public.gmen_settings where id = 1;
  if not v_open then raise exception 'enrollment is closed'; end if;

  select * into v_stu from public.students where student_email = v_email;

  -- Not matched by email yet: very likely a roster row that predates
  -- emails, not a student who doesn't belong on the roster at all. Match
  -- by name against email-less rows and backfill, once — but only on a
  -- unique match. An empty or ambiguous match still fails below exactly
  -- like an unmatched email always would; this never silently guesses
  -- which real student was meant.
  if not found then
    v_first := coalesce(nullif(trim(p_given_name), ''), split_part(trim(coalesce(p_full_name, '')), ' ', 1));
    v_last  := coalesce(nullif(trim(p_family_name), ''), trim(substring(trim(coalesce(p_full_name, '')) from length(v_first) + 1)));

    select count(*) into v_matches from public.students
      where student_email is null
        and lower(trim(first_name)) = lower(v_first) and lower(trim(last_name)) = lower(v_last);

    if v_matches = 1 then
      update public.students set student_email = v_email
        where student_email is null
          and lower(trim(first_name)) = lower(v_first) and lower(trim(last_name)) = lower(v_last)
        returning * into v_stu;
    end if;
  end if;

  if v_stu.id is null then raise exception 'not on the student roster'; end if;

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

grant execute on function public.enroll_gmen(uuid, uuid, text, text, text) to authenticated;

-- Staff-only. Seeds every student who has an email on file and no
-- enrollment yet this period into the period's Commons/default class.
-- Idempotent: re-running only ever adds the still-missing rows. Students
-- with no email yet aren't seeded until they either sign up themselves
-- (which backfills their email via enroll_gmen above) or their email is
-- otherwise added to the roster.
create or replace function public.gmen_seed_period(p_period int)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_default_class uuid;
  v_count int;
begin
  if not public.is_staff_member() then raise exception 'not authorized'; end if;

  select id into v_default_class from public.gmen_classes
    where grading_period = p_period and is_default;
  if v_default_class is null then
    raise exception 'no Commons/default class is set for period %', p_period;
  end if;

  insert into public.gmen_enrollments
    (student_id, student_name, student_email, class_id, grading_period, choice_rank)
  select s.id, s.first_name || ' ' || s.last_name, s.student_email, v_default_class, p_period, 'default'
  from public.students s
  where s.student_email is not null
    and not exists (
      select 1 from public.gmen_enrollments e
      where e.student_email = s.student_email and e.grading_period = p_period
    )
  on conflict (student_email, grading_period) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function public.gmen_seed_period(int) to authenticated;
