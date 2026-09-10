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
