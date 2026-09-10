-- =============================================================
-- 09 — Agregar las columnas que faltan
--
-- POR QUE HACE FALTA ESTE SCRIPT:
-- Tus tablas ya existian antes (con una version reducida). Los scripts
-- anteriores usan "create table IF NOT EXISTS", que al encontrar la tabla ya
-- creada NO hace nada: no compara columnas ni agrega las que falten, se salta
-- el bloque entero en silencio. Por eso el registro fallaba con
--   "Could not find the 'dificultad_respiratoria' column"
--
-- Este script si usa ALTER TABLE ... ADD COLUMN IF NOT EXISTS, que agrega solo
-- lo que falta y respeta lo que ya esta. Es seguro ejecutarlo varias veces.
--
-- Columnas detectadas como faltantes en tu base:
--   patients             -> las 7 clinicas y de prediccion
--   appointment_history  -> expediente
--   user_settings        -> idioma, notificaciones
--   statistics           -> todas las metricas
-- =============================================================


-- -------------------------------------------------------------
-- patients: signos clinicos y salida del modelo de prediccion
-- Todas nullables: hay pacientes ya registrados sin estos datos.
-- -------------------------------------------------------------
alter table public.patients
  add column if not exists sintoma_principal       text,
  add column if not exists nivel_dolor             smallint,
  add column if not exists dificultad_respiratoria boolean default false,
  add column if not exists temperatura             numeric(4,1),
  add column if not exists frecuencia_cardiaca     integer,
  add column if not exists prediccion_urgencia     smallint,
  add column if not exists prediccion_confianza    numeric(4,3);

-- Los CHECK van aparte: si se ponen en el ADD COLUMN y la tabla ya tuviera
-- datos invalidos, fallaria todo el script.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'patients_sintoma_principal_check') then
    alter table public.patients add constraint patients_sintoma_principal_check
      check (sintoma_principal is null or sintoma_principal in (
        'dolor_pecho','fiebre','fractura','dificultad_respiratoria',
        'dolor_abdominal','herida','mareo','otro'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'patients_nivel_dolor_check') then
    alter table public.patients add constraint patients_nivel_dolor_check
      check (nivel_dolor is null or nivel_dolor in (1,2,3));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'patients_prediccion_urgencia_check') then
    alter table public.patients add constraint patients_prediccion_urgencia_check
      check (prediccion_urgencia is null or prediccion_urgencia in (1,2,3));
  end if;
end $$;


-- -------------------------------------------------------------
-- appointment_history: falta el numero de expediente
-- -------------------------------------------------------------
alter table public.appointment_history
  add column if not exists expediente text;


-- -------------------------------------------------------------
-- user_settings: preferencias adicionales
-- -------------------------------------------------------------
alter table public.user_settings
  add column if not exists idioma         text    not null default 'es',
  add column if not exists notificaciones boolean not null default true;


-- -------------------------------------------------------------
-- statistics: metricas acumuladas
-- -------------------------------------------------------------
alter table public.statistics
  add column if not exists total_atendidos    integer not null default 0,
  add column if not exists total_en_espera    integer not null default 0,
  add column if not exists atendidos_alta     integer not null default 0,
  add column if not exists atendidos_media    integer not null default 0,
  add column if not exists atendidos_baja     integer not null default 0,
  add column if not exists promedio_espera_ms bigint  not null default 0,
  add column if not exists espera_maxima_ms   bigint  not null default 0;


-- -------------------------------------------------------------
-- Refrescar la cache de esquema de PostgREST.
-- Sin esto, la API puede seguir diciendo "column not found" durante un rato
-- aunque la columna ya exista (es justo el error que te salio).
-- -------------------------------------------------------------
notify pgrst, 'reload schema';


-- -------------------------------------------------------------
-- Comprobacion: deberian aparecer las 17 columnas de patients.
-- -------------------------------------------------------------
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'patients'
order by ordinal_position;
