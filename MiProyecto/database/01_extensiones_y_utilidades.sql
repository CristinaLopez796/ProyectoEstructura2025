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
