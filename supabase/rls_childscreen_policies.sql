-- Run this in the Supabase SQL editor after enabling RLS.
-- It allows the authenticated parent/child user to read the records needed by ChildScreen.

alter table public.patients enable row level security;
alter table public.patient_exercises enable row level security;
alter table public.patient_missions enable row level security;
alter table public.missions enable row level security;

drop policy if exists "patients_select_own" on public.patients;
create policy "patients_select_own"
on public.patients
for select
to authenticated
using (
  parent_user_id = auth.uid()
  or parent_user_id = current_setting('request.jwt.claim.sub', true)::uuid
);

drop policy if exists "patient_exercises_select_own" on public.patient_exercises;
create policy "patient_exercises_select_own"
on public.patient_exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.patients p
    where p.id = patient_exercises.patient_id
      and (
        p.parent_user_id = auth.uid()
        or p.parent_user_id = current_setting('request.jwt.claim.sub', true)::uuid
      )
  )
);

drop policy if exists "patient_exercises_update_own" on public.patient_exercises;
create policy "patient_exercises_update_own"
on public.patient_exercises
for update
to authenticated
using (
  exists (
    select 1
    from public.patients p
    where p.id = patient_exercises.patient_id
      and (
        p.parent_user_id = auth.uid()
        or p.parent_user_id = current_setting('request.jwt.claim.sub', true)::uuid
      )
  )
)
with check (
  exists (
    select 1
    from public.patients p
    where p.id = patient_exercises.patient_id
      and (
        p.parent_user_id = auth.uid()
        or p.parent_user_id = current_setting('request.jwt.claim.sub', true)::uuid
      )
  )
);

drop policy if exists "patient_missions_select_own" on public.patient_missions;
create policy "patient_missions_select_own"
on public.patient_missions
for select
to authenticated
using (
  exists (
    select 1
    from public.patients p
    where p.id = patient_missions.patient_id
      and (
        p.parent_user_id = auth.uid()
        or p.parent_user_id = current_setting('request.jwt.claim.sub', true)::uuid
      )
  )
);

  drop policy if exists "patient_missions_update_own" on public.patient_missions;
  create policy "patient_missions_update_own"
  on public.patient_missions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.patients p
      where p.id = patient_missions.patient_id
        and (
          p.parent_user_id = auth.uid()
          or p.parent_user_id = current_setting('request.jwt.claim.sub', true)::uuid
        )
    )
  )
  with check (
    exists (
      select 1
      from public.patients p
      where p.id = patient_missions.patient_id
        and (
          p.parent_user_id = auth.uid()
          or p.parent_user_id = current_setting('request.jwt.claim.sub', true)::uuid
        )
    )
  );

drop policy if exists "missions_select_authenticated" on public.missions;
create policy "missions_select_authenticated"
on public.missions
for select
to authenticated
using (true);
