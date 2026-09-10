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
