-- ─────────────────────────────────────────────────────────────────────────────
-- Keep students (who share the @jagschools.org domain) out of the staff side.
--
-- Most tables already gate on is_staff_member() (staff_directory membership).
-- The gaps this closes:
--   1. Staff messaging tables were readable by ANY signed-in account
--      (policies were `to authenticated using (true)`), so a student could read
--      every staff conversation, and could add themselves to one.
--      → staff-only, and only conversations you are a member of.
--   2. staff_directory "staff update directory" let any staff member update
--      any row — including setting is_admin on themselves.
--      → staff may update only their own row, never is_admin; admins update any.
--   3. is_staff() was still domain-only (used by gradebook_roster).
--      → now means staff_directory membership, same as is_staff_member().
--   4. is_staff_member() is SECURITY DEFINER so policies on staff_directory
--      itself can call it without recursing through RLS.
--
-- Deliberately unchanged: students still read staff_directory (the student
-- hall pass picks a teacher from it) and gmen_enrollments (seat counts on the
-- student G-Men signup).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.is_staff_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_directory
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff_member()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_directory
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and is_admin = true
  )
$$;


-- Membership check that bypasses RLS on staff_conversation_members (a policy
-- on that table can't query itself without recursing).
create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_conversation_members
    where conversation_id = p_conversation_id
      and user_email = coalesce(auth.jwt() ->> 'email', '')
  )
$$;
revoke all on function public.is_conversation_member(uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid) to authenticated;

-- ── staff_directory ─────────────────────────────────────────────────────────
drop policy if exists "staff update directory"     on public.staff_directory;
drop policy if exists "staff update own directory" on public.staff_directory;
drop policy if exists "admin update directory"     on public.staff_directory;
create policy "staff update own directory" on public.staff_directory
  for update using (public.is_staff_member() and email = (auth.jwt() ->> 'email'))
  with check (email = (auth.jwt() ->> 'email'));
create policy "admin update directory" on public.staff_directory
  for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.staff_directory_guard_admin_flag()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_admin is distinct from old.is_admin and not public.is_admin()
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and auth.uid() is not null then
    raise exception 'Only an admin can change admin access.';
  end if;
  return new;
end $$;
drop trigger if exists staff_directory_guard_admin_flag on public.staff_directory;
create trigger staff_directory_guard_admin_flag
  before update on public.staff_directory
  for each row execute function public.staff_directory_guard_admin_flag();

-- ── staff_conversations ─────────────────────────────────────────────────────
drop policy if exists "authenticated can view conversations" on public.staff_conversations;
drop policy if exists "staff can create conversations"       on public.staff_conversations;
drop policy if exists "members view conversations"           on public.staff_conversations;
drop policy if exists "staff create conversations"           on public.staff_conversations;
create policy "members view conversations" on public.staff_conversations
  for select to authenticated
  using (public.is_staff_member()
         and (created_by = (auth.jwt() ->> 'email') or public.is_conversation_member(id)));
create policy "staff create conversations" on public.staff_conversations
  for insert to authenticated
  with check (public.is_staff_member() and created_by = (auth.jwt() ->> 'email'));

-- ── staff_conversation_members ──────────────────────────────────────────────
drop policy if exists "authenticated can view conversation members"   on public.staff_conversation_members;
drop policy if exists "staff can add conversation members"            on public.staff_conversation_members;
drop policy if exists "members can update their own last_read_at"     on public.staff_conversation_members;
drop policy if exists "members view conversation members"             on public.staff_conversation_members;
drop policy if exists "staff add conversation members"                on public.staff_conversation_members;
drop policy if exists "members update own last_read_at"               on public.staff_conversation_members;
create policy "members view conversation members" on public.staff_conversation_members
  for select to authenticated
  using (public.is_staff_member() and public.is_conversation_member(conversation_id));
create policy "staff add conversation members" on public.staff_conversation_members
  for insert to authenticated
  with check (public.is_staff_member() and (
    public.is_conversation_member(conversation_id)
    or exists (select 1 from public.staff_conversations c
               where c.id = conversation_id and c.created_by = (auth.jwt() ->> 'email'))
  ));
create policy "members update own last_read_at" on public.staff_conversation_members
  for update to authenticated
  using (public.is_staff_member() and user_email = (auth.jwt() ->> 'email'));

-- ── staff_messages ──────────────────────────────────────────────────────────
drop policy if exists "authenticated can read messages" on public.staff_messages;
drop policy if exists "members can send messages"       on public.staff_messages;
drop policy if exists "members read messages"           on public.staff_messages;
drop policy if exists "members send messages"           on public.staff_messages;
create policy "members read messages" on public.staff_messages
  for select to authenticated
  using (public.is_staff_member() and public.is_conversation_member(conversation_id));
create policy "members send messages" on public.staff_messages
  for insert to authenticated
  with check (public.is_staff_member()
              and sender_email = (auth.jwt() ->> 'email')
              and public.is_conversation_member(conversation_id));

-- ── staff_message_attachments ───────────────────────────────────────────────
drop policy if exists "authenticated can read attachments" on public.staff_message_attachments;
drop policy if exists "members can insert attachments"     on public.staff_message_attachments;
drop policy if exists "members read attachments"           on public.staff_message_attachments;
drop policy if exists "members add attachments"            on public.staff_message_attachments;
create policy "members read attachments" on public.staff_message_attachments
  for select to authenticated
  using (public.is_staff_member() and exists (
    select 1 from public.staff_messages m
    where m.id = message_id and public.is_conversation_member(m.conversation_id)));
create policy "members add attachments" on public.staff_message_attachments
  for insert to authenticated
  with check (public.is_staff_member() and exists (
    select 1 from public.staff_messages m
    where m.id = message_id and m.sender_email = (auth.jwt() ->> 'email')));
