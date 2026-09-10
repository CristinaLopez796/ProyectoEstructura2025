-- ==========================================================
-- SmartTriage - Creacion completa de la base de datos
-- Pegar TODO esto en: Supabase -> SQL Editor -> New query -> Run
-- Se puede volver a ejecutar sin problema (usa IF NOT EXISTS).
-- Los datos de prueba van aparte, en 07_datos_de_prueba.sql
-- ==========================================================

-- =============================================================
-- 01 — Extensiones y utilidades compartidas
-- Ejecutar PRIMERO. Los demas scripts dependen de esto.
-- =============================================================

-- gen_random_uuid() para las llaves primarias.
-- En Supabase suele venir activa; se deja por si el proyecto es nuevo.
create extension if not exists pgcrypto;


-- -------------------------------------------------------------
-- Trigger para mantener updated_at al dia automaticamente.
--
-- Tu codigo ya manda updated_at a mano en varios lugares, por ejemplo:
--   .update({ ...updates, updated_at: new Date().toISOString() })
-- Este trigger es una red de seguridad: si algun update se hace desde el
-- panel de Supabase o desde otro lado que lo olvide, la columna igual
-- queda correcta.
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Pone updated_at = now() en cada UPDATE. Se engancha por tabla en los scripts 02-06.';


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


-- =============================================================
-- 03 — patients  (cola de espera)
--
-- Usado por: supabaseDb.* en utils/supabaseAuth.ts
--
-- Nombres de columna OBLIGATORIOS (tu codigo ya los usa literalmente):
--   urgencia    -> .order('urgencia')  y  .eq('urgencia', urgency)
--   queued_at   -> .order('queued_at')
--   user_id     -> .insert([{ ...patient, user_id: user.id }])
--   updated_at  -> .update({ ...updates, updated_at: ... })
-- Si les cambias el nombre, esas consultas dejan de funcionar.
--
-- El resto de columnas corresponde a la interfaz Patient
-- (models/Patient.ts), en snake_case, que es la convencion de PostgreSQL.
-- =============================================================

create table if not exists public.patients (
  id                       uuid        primary key default gen_random_uuid(),
  user_id                  uuid        not null references auth.users(id) on delete cascade,

  -- ---- Datos basicos del paciente ----
  nombre                   text        not null,
  -- text y no date: la app guarda "DD/MM/AAAA" (ver maskDDMMYYYY en PatientForm.tsx)
  fecha_nacimiento         text,
  sintomas                 text        not null,
  expediente               text        not null,

  -- 1 = Alta, 2 = Media, 3 = Baja
  urgencia                 smallint    not null check (urgencia in (1, 2, 3)),

  -- bigint: la app manda Date.now(), que es un numero en milisegundos.
  -- Con timestamptz el insert fallaria.
  queued_at                bigint      not null,

  -- ---- Signos clinicos (componente de Ciencia de Datos) ----
  -- Todos opcionales: los pacientes se pueden registrar sin ellos.
  sintoma_principal        text        check (sintoma_principal in (
                             'dolor_pecho',
                             'fiebre',
                             'fractura',
                             'dificultad_respiratoria',
                             'dolor_abdominal',
                             'herida',
                             'mareo',
                             'otro'
                           )),
  nivel_dolor              smallint    check (nivel_dolor in (1, 2, 3)),
  dificultad_respiratoria  boolean     default false,
  temperatura              numeric(4,1),   -- ej. 37.5
  frecuencia_cardiaca      integer     check (frecuencia_cardiaca > 0),

  -- ---- Salida del modelo de prediccion ----
  prediccion_urgencia      smallint    check (prediccion_urgencia in (1, 2, 3)),
  prediccion_confianza     numeric(4,3) check (prediccion_confianza between 0 and 1),

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table  public.patients is 'Cola de espera. Una fila por paciente pendiente de atencion.';
comment on column public.patients.urgencia  is '1=Alta, 2=Media, 3=Baja. La cola de prioridad ordena por esto.';
comment on column public.patients.queued_at is 'Milisegundos epoch (Date.now()). Desempata a igual urgencia: el mas antiguo primero.';

-- -------------------------------------------------------------
-- Indices
-- El compuesto (urgencia, queued_at) calza exactamente con el orden
-- que pide getPatients():  .order('urgencia').order('queued_at')
-- -------------------------------------------------------------
create index if not exists idx_patients_user_id
  on public.patients (user_id);

create index if not exists idx_patients_prioridad
  on public.patients (user_id, urgencia asc, queued_at asc);

create index if not exists idx_patients_expediente
  on public.patients (expediente);

-- updated_at automatico
drop trigger if exists trg_patients_updated_at on public.patients;
create trigger trg_patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();


-- -------------------------------------------------------------
-- Row Level Security
-- Datos medicos: sin esto, la anon key (que va publica en el bundle)
-- dejaria leer los expedientes de cualquier usuario.
-- -------------------------------------------------------------
alter table public.patients enable row level security;

drop policy if exists patients_select_own on public.patients;
create policy patients_select_own on public.patients
  for select using (auth.uid() = user_id);

drop policy if exists patients_insert_own on public.patients;
create policy patients_insert_own on public.patients
  for insert with check (auth.uid() = user_id);

drop policy if exists patients_update_own on public.patients;
create policy patients_update_own on public.patients
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists patients_delete_own on public.patients;
create policy patients_delete_own on public.patients
  for delete using (auth.uid() = user_id);


-- =============================================================
-- 04 — appointment_history  (historial de atenciones)
--
-- Usado por: appointmentHistory.* en utils/supabaseAuth.ts
--
-- Los nombres de columna aqui NO son negociables: tu codigo los escribe
-- uno por uno en addHistory(). Fijate que esta tabla usa ingles
-- (urgency, symptoms) mientras patients usa espanol (urgencia, sintomas).
-- Es una inconsistencia de tu codigo actual, pero el SQL debe respetarla
-- o los inserts truenan.
-- =============================================================

create table if not exists public.appointment_history (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users(id) on delete cascade,

  -- SIN llave foranea a patients(id) — a proposito.
  -- La app borra al paciente de la cola ANTES de escribir el historial,
  -- asi que la fila ya no existe y un FK haria fallar todo insert.
  -- Se guarda el uuid solo como referencia historica.
  patient_id         uuid,

  patient_name       text        not null,
  patient_birthday   text,       -- "DD/MM/AAAA", igual que en patients
  symptoms           text,
  urgency            smallint    check (urgency in (1, 2, 3)),
  expediente         text,

  -- bigint: la app manda Date.now() (milisegundos), no una fecha ISO.
  attended_at        bigint      not null,

  -- Cuanto espero el paciente, en milisegundos. Puede ser null en
  -- registros viejos que no traian queuedAt.
  waited_ms          bigint      check (waited_ms >= 0),

  created_at         timestamptz not null default now()
);

comment on table  public.appointment_history is 'Registro historico de pacientes ya atendidos.';
comment on column public.appointment_history.patient_id  is 'UUID del paciente original. Sin FK: la fila en patients ya fue borrada al atenderlo.';
comment on column public.appointment_history.attended_at is 'Milisegundos epoch. Leer con to_timestamp(attended_at/1000).';
comment on column public.appointment_history.waited_ms   is 'Espera en ms, desde queued_at hasta attended_at.';

-- -------------------------------------------------------------
-- Indices
-- getHistory() ordena por attended_at descendente.
-- -------------------------------------------------------------
create index if not exists idx_history_user_fecha
  on public.appointment_history (user_id, attended_at desc);

create index if not exists idx_history_patient_id
  on public.appointment_history (patient_id);


-- -------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------
alter table public.appointment_history enable row level security;

drop policy if exists history_select_own on public.appointment_history;
create policy history_select_own on public.appointment_history
  for select using (auth.uid() = user_id);

drop policy if exists history_insert_own on public.appointment_history;
create policy history_insert_own on public.appointment_history
  for insert with check (auth.uid() = user_id);

drop policy if exists history_update_own on public.appointment_history;
create policy history_update_own on public.appointment_history
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists history_delete_own on public.appointment_history;
create policy history_delete_own on public.appointment_history
  for delete using (auth.uid() = user_id);


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


-- =============================================================
-- 06 — statistics  (metricas acumuladas)
--
-- Usado por: statistics.* en utils/supabaseAuth.ts
--
-- Igual que user_settings, getStatistics() usa .single(), asi que
-- user_id lleva UNIQUE: una sola fila de metricas por usuario.
--
-- NOTA: createStatistics() solo inserta { user_id }, sin mas columnas.
-- Por eso todo lo demas tiene DEFAULT 0: la fila se crea vacia y se va
-- actualizando. Las columnas concretas son una propuesta basada en lo
-- que StatsScreen.tsx ya calcula en memoria; ajusta si necesitas otras.
-- =============================================================

create table if not exists public.statistics (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null unique references auth.users(id) on delete cascade,

  -- Totales
  total_atendidos       integer     not null default 0 check (total_atendidos >= 0),
  total_en_espera       integer     not null default 0 check (total_en_espera >= 0),

  -- Desglose de atendidos por prioridad
  atendidos_alta        integer     not null default 0 check (atendidos_alta  >= 0),
  atendidos_media       integer     not null default 0 check (atendidos_media >= 0),
  atendidos_baja        integer     not null default 0 check (atendidos_baja  >= 0),

  -- Tiempos de espera en milisegundos (misma unidad que waited_ms)
  promedio_espera_ms    bigint      not null default 0 check (promedio_espera_ms >= 0),
  espera_maxima_ms      bigint      not null default 0 check (espera_maxima_ms   >= 0),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table  public.statistics is 'Metricas acumuladas por usuario. Una sola fila por usuario.';
comment on column public.statistics.promedio_espera_ms is 'Milisegundos. Equivale al avgWaitAll que calcula StatsScreen.tsx.';

-- updated_at automatico
drop trigger if exists trg_statistics_updated_at on public.statistics;
create trigger trg_statistics_updated_at
  before update on public.statistics
  for each row execute function public.set_updated_at();


-- -------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------
alter table public.statistics enable row level security;

drop policy if exists statistics_select_own on public.statistics;
create policy statistics_select_own on public.statistics
  for select using (auth.uid() = user_id);

drop policy if exists statistics_insert_own on public.statistics;
create policy statistics_insert_own on public.statistics
  for insert with check (auth.uid() = user_id);

drop policy if exists statistics_update_own on public.statistics;
create policy statistics_update_own on public.statistics
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists statistics_delete_own on public.statistics;
create policy statistics_delete_own on public.statistics
  for delete using (auth.uid() = user_id);


-- -------------------------------------------------------------
-- BONUS: vista que calcula las metricas en vivo desde el historial,
-- sin depender de que alguien mantenga la tabla statistics al dia.
-- Consultala con:  select * from public.v_estadisticas;
-- -------------------------------------------------------------
create or replace view public.v_estadisticas as
select
  h.user_id,
  count(*)                                                   as total_atendidos,
  count(*) filter (where h.urgency = 1)                      as atendidos_alta,
  count(*) filter (where h.urgency = 2)                      as atendidos_media,
  count(*) filter (where h.urgency = 3)                      as atendidos_baja,
  coalesce(round(avg(h.waited_ms)), 0)                       as promedio_espera_ms,
  coalesce(max(h.waited_ms), 0)                              as espera_maxima_ms
from public.appointment_history h
group by h.user_id;

comment on view public.v_estadisticas is
  'Metricas calculadas al vuelo desde appointment_history. Alternativa a mantener la tabla statistics.';


