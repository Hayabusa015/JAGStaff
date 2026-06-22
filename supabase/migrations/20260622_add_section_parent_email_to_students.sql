-- Add section and parent_email to students table.
-- section: class period label (e.g. "P2 · Honors Chemistry")
-- parent_email: for automated parent notifications via Gmail
alter table public.students add column if not exists section text;
alter table public.students add column if not exists parent_email text;
