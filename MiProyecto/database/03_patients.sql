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
