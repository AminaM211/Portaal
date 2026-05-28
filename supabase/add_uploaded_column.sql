alter table public.exercises
add column if not exists uploaded boolean not null default false;

update public.exercises
set uploaded = false
where uploaded is null;