-- =============================================================
-- 11 — Columnas de Ciencia de Datos que faltan en appointment_history
--
-- POR QUE HACE FALTA ESTE SCRIPT (URGENTE):
-- utils/patientRepository.ts -> historyRepo.add() ya inserta estas columnas
-- en appointment_history (para armar el dataset de ML y para Power BI):
--   edad, sintoma_principal, nivel_dolor, dificultad_respiratoria,
--   temperatura, frecuencia_cardiaca, queued_at, fecha_llegada,
--   fecha_atencion, prediccion_urgencia, prediccion_confianza
--
-- Pero NINGUN script de esta carpeta las agrego a appointment_history (solo
-- se agregaron a `patients` en 09_agregar_columnas_faltantes.sql). Sin este
-- script, "Atender siguiente" en la app falla con:
--   "Could not find the 'edad' column of 'appointment_history' in the schema cache"
-- porque el INSERT manda una columna que la tabla real no tiene.
--
-- Usa ADD COLUMN IF NOT EXISTS: es seguro ejecutarlo varias veces y no toca
-- filas ni columnas existentes.
-- =============================================================

alter table public.appointment_history
  add column if not exists edad                    integer,
  add column if not exists sintoma_principal        text,
  add column if not exists nivel_dolor              smallint,
  add column if not exists dificultad_respiratoria  boolean,
  add column if not exists temperatura              numeric(4,1),
  add column if not exists frecuencia_cardiaca      integer,
  add column if not exists queued_at                bigint,
  add column if not exists fecha_llegada            timestamptz,
  add column if not exists fecha_atencion           timestamptz,
  add column if not exists prediccion_urgencia      smallint,
  add column if not exists prediccion_confianza     numeric(4,3);

comment on column public.appointment_history.edad is
  'Edad en anios, calculada con edadDesdeFecha() en el momento de la atencion '
  '(utils/datetime.ts). Variable numerica lista para ML: evita volver a parsear '
  'patient_birthday en cada consulta.';
comment on column public.appointment_history.fecha_llegada  is 'Igual que queued_at, en timestamptz (para SQL/Power BI).';
comment on column public.appointment_history.fecha_atencion is 'Igual que attended_at, en timestamptz (para SQL/Power BI).';

-- Los CHECK van aparte de la definicion de columna: si se ponen en el ADD
-- COLUMN y la tabla ya tuviera filas con datos que no cumplen la regla,
-- fallaria el script entero.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'appointment_history_sintoma_principal_check') then
    alter table public.appointment_history add constraint appointment_history_sintoma_principal_check
      check (sintoma_principal is null or sintoma_principal in (
        'dolor_pecho', 'fiebre', 'fractura', 'dificultad_respiratoria',
        'dolor_abdominal', 'herida', 'mareo', 'otro'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'appointment_history_nivel_dolor_check') then
    alter table public.appointment_history add constraint appointment_history_nivel_dolor_check
      check (nivel_dolor is null or nivel_dolor in (1, 2, 3));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'appointment_history_edad_check') then
    alter table public.appointment_history add constraint appointment_history_edad_check
      check (edad is null or edad between 0 and 120);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'appointment_history_prediccion_urgencia_check') then
    alter table public.appointment_history add constraint appointment_history_prediccion_urgencia_check
      check (prediccion_urgencia is null or prediccion_urgencia in (1, 2, 3));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'appointment_history_prediccion_confianza_check') then
    alter table public.appointment_history add constraint appointment_history_prediccion_confianza_check
      check (prediccion_confianza is null or prediccion_confianza between 0 and 1);
  end if;
end $$;

-- Refresca la cache de esquema de PostgREST. Sin esto la API puede seguir
-- respondiendo "column not found" un rato aunque la columna ya exista.
notify pgrst, 'reload schema';

-- Comprobacion
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'appointment_history'
order by ordinal_position;
