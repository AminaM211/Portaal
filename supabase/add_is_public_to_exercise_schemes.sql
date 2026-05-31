-- Add public/private support for exercise schemes.
-- Run this once in the Supabase SQL editor.

alter table public.exercise_schemes
add column if not exists is_public boolean not null default false;

update public.exercise_schemes
set is_public = false
where is_public is null;

alter table public.exercise_schemes enable row level security;

drop policy if exists "exercise_schemes_select_own_or_public" on public.exercise_schemes;
create policy "exercise_schemes_select_own_or_public"
on public.exercise_schemes
for select
using (
  created_by = auth.uid()
  or is_public = true
);
