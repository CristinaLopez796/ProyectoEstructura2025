-- =============================================================
-- 05 — user_settings  (preferencias de la app)
--
-- Usado por: userSettings.* en utils/supabaseAuth.ts
--
-- Columna obligatoria: dark_mode
--   userSettings.toggleDarkMode() hace update({ dark_mode: isDark })
--
-- getSettings() usa .single(), que da error si hay 0 o mas de 1 fila.
-- Por eso user_id lleva UNIQUE: una sola fila de ajustes por usuario.
-- =============================================================

create table if not exists public.user_settings (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null unique references auth.users(id) on delete cascade,

  -- Espeja el estado que hoy vive en AsyncStorage bajo "settings:darkMode"
  dark_mode    boolean     not null default false,

  -- Espacio para futuras preferencias
  idioma       text        not null default 'es' check (idioma in ('es', 'en')),
  notificaciones boolean   not null default true,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table  public.user_settings is 'Preferencias por usuario. Maximo una fila por usuario (user_id es UNIQUE).';
comment on column public.user_settings.user_id   is 'UNIQUE a proposito: getSettings() usa .single() y falla si hay duplicados.';
comment on column public.user_settings.dark_mode is 'Equivalente en la nube de la clave "settings:darkMode" de AsyncStorage.';

-- updated_at automatico
drop trigger if exists trg_user_settings_updated_at on public.user_settings;
create trigger trg_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();


-- -------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------
alter table public.user_settings enable row level security;

drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_settings_delete_own on public.user_settings;
create policy user_settings_delete_own on public.user_settings
  for delete using (auth.uid() = user_id);
