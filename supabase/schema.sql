-- ============================================================
--  Leerpret – databaseschema voor Supabase
--  Plak dit in Supabase → SQL Editor → New query → Run.
--  Veilig om meerdere keren uit te voeren.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Scholen ----------
create table if not exists public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

-- ---------- Profielen (1 per login) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,                          -- kopie van auth.users.email, zodat het beheerdersscherm het kan tonen
  role        text not null default 'teacher' check (role in ('teacher','admin')),
  school_id   uuid references public.schools(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------- Klassen ----------
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  name        text not null,                 -- bv. '3A'
  grade       int  not null check (grade between 1 and 6),
  pupils      jsonb not null default '[]'::jsonb,   -- ["George","Alvin", ...] enkel voornamen
  created_at  timestamptz not null default now()
);
alter table public.profiles add column if not exists email text;
-- e-mails aanvullen voor bestaande gebruikers (veilig om te herhalen)
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is distinct from u.email;

create index if not exists classes_school_idx on public.classes(school_id);

-- ---------- Quizzen ----------
-- school_id NULL  = beschikbaar voor alle scholen (beheerd door Leerpret)
-- school_id gezet = eigen quiz van die school
create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid references public.schools(id) on delete cascade,
  title       text not null,
  theme       text,                          -- bv. 'Ruimte', 'Rekenen'
  emoji       text default '🎯',
  grade_min   int not null default 1 check (grade_min between 1 and 6),
  grade_max   int not null default 6 check (grade_max between 1 and 6),
  questions   jsonb not null default '[]'::jsonb,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists quizzes_school_idx on public.quizzes(school_id);

-- ---------- Automatisch profiel bij nieuwe gebruiker ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

-- ---------- Hulpfuncties voor de toegangsregels ----------
create or replace function public.my_school() returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where id = auth.uid()
$$;
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- ---------- Row Level Security ----------
alter table public.schools  enable row level security;
alter table public.profiles enable row level security;
alter table public.classes  enable row level security;
alter table public.quizzes  enable row level security;

-- schools: je ziet je eigen school; admin ziet en beheert alles
drop policy if exists schools_select on public.schools;
create policy schools_select on public.schools for select to authenticated
  using (id = public.my_school() or public.is_admin());
drop policy if exists schools_admin on public.schools;
create policy schools_admin on public.schools for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles: eigen profiel lezen/aanpassen (niet je rol of school); admin alles
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role() and school_id is not distinct from public.my_school());
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- classes: alles binnen je eigen school; admin overal
drop policy if exists classes_school on public.classes;
create policy classes_school on public.classes for all to authenticated
  using (school_id = public.my_school() or public.is_admin())
  with check (school_id = public.my_school() or public.is_admin());

-- quizzes: algemene quizzen (school_id null) + die van je school lezen; eigen schoolquizzen beheren; admin alles
drop policy if exists quizzes_select on public.quizzes;
create policy quizzes_select on public.quizzes for select to authenticated
  using (published and (school_id is null or school_id = public.my_school()) or public.is_admin());
drop policy if exists quizzes_school_write on public.quizzes;
create policy quizzes_school_write on public.quizzes for all to authenticated
  using (school_id = public.my_school() or public.is_admin())
  with check (school_id = public.my_school() or public.is_admin());
