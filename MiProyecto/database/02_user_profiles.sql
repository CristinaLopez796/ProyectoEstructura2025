-- =============================================================
-- 02 — user_profiles
-- Perfil del personal que usa la app (no del paciente).
--
-- Usado por: userProfile.getProfile / createProfile / updateProfile
-- en utils/supabaseAuth.ts
--
-- OJO: aqui la llave primaria ES el id del usuario de auth, no una
-- columna user_id aparte. Tu codigo lo inserta asi:
--     .insert([{ id: user.id, ...profile }])
-- y lo consulta asi:
--     .eq('id', user.id)
-- =============================================================

create table if not exists public.user_profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,

  nombre       text,
  rol          text        default 'recepcion'
                           check (rol in ('recepcion', 'enfermeria', 'medico', 'admin')),
  hospital     text,
  telefono     text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table  public.user_profiles is 'Perfil del usuario que opera la app (recepcion, enfermeria, medico).';
comment on column public.user_profiles.id is 'Mismo UUID que auth.users.id. No es un id nuevo.';

-- updated_at automatico
drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();


-- -------------------------------------------------------------
-- Row Level Security: cada quien solo ve su propio perfil.
-- Aqui se compara contra "id" porque esa es la columna del usuario.
-- -------------------------------------------------------------
alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own on public.user_profiles
  for select using (auth.uid() = id);

drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own on public.user_profiles
  for insert with check (auth.uid() = id);

drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own on public.user_profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists user_profiles_delete_own on public.user_profiles;
create policy user_profiles_delete_own on public.user_profiles
  for delete using (auth.uid() = id);
