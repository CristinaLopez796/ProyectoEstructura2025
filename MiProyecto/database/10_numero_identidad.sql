-- =============================================================
-- 10 — Numero de identidad del paciente
--
-- Ejecutar en: Supabase -> SQL Editor -> New query -> Run
--
-- POR QUE UNA COLUMNA NUEVA Y NO patient_id:
-- patient_id es de tipo uuid y tiene una llave foranea contra patients(id).
-- No puede guardar un numero de identidad (ni por tipo ni por la FK). Ademas
-- esa columna se pone en NULL sola al atender a un paciente, porque la FK es
-- ON DELETE SET NULL y la fila de la cola se borra en ese momento: por eso la
-- ves vacia en el Table Editor. Es su comportamiento normal, no un fallo.
--
-- numero_identidad guarda el dato real de la persona y sobrevive a todo eso,
-- asi que sirve para buscar en el historial y para cruzar visitas de un mismo
-- paciente en el analisis.
-- =============================================================

alter table public.patients
  add column if not exists numero_identidad text;

alter table public.appointment_history
  add column if not exists numero_identidad text;

comment on column public.patients.numero_identidad is
  'Numero de identidad del paciente. Identifica a la persona entre visitas.';
comment on column public.appointment_history.numero_identidad is
  'Copia del numero de identidad al momento de la atencion.';

-- Indices para que la busqueda por identidad sea rapida.
create index if not exists idx_patients_identidad
  on public.patients (numero_identidad);

create index if not exists idx_history_identidad
  on public.appointment_history (numero_identidad);

-- Refresca la cache de esquema del API. Sin esto PostgREST puede seguir
-- respondiendo "column not found" un rato aunque la columna ya exista.
notify pgrst, 'reload schema';

-- Comprobacion
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and column_name = 'numero_identidad'
order by table_name;
