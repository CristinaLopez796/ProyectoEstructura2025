-- =============================================================
-- 08 — Quitar la dependencia del login
--
-- Ejecutar DESPUES de los scripts 01-06.
--
-- Que hace y por que:
-- Las politicas originales decian "auth.uid() = user_id", o sea: solo ves tus
-- filas si iniciaste sesion. Ahora la app no tiene login y se conecta como
-- anonimo, asi que auth.uid() es NULL y ninguna fila pasa el filtro: la cola
-- sale vacia y los inserts fallan.
--
-- Este script:
--   1. Quita las llaves foraneas a auth.users (ya no hay usuarios reales).
--   2. Reemplaza las politicas por unas abiertas al rol anonimo.
--
-- La columna user_id se conserva y la app escribe en ella un UUID fijo
-- ('00000000-0000-0000-0000-000000000001', ver APP_USER_ID en
-- utils/patientRepository.ts). Asi la estructura no cambia y se puede volver
-- a poner login mas adelante sin migrar datos.
--
-- ⚠ ADVERTENCIA DE SEGURIDAD
-- Al terminar, cualquiera que tenga tu anon key (que viaja dentro del bundle
-- de la app, o sea: publica) puede leer, modificar y borrar TODOS los
-- registros de pacientes. Es aceptable para un proyecto de clase o una demo.
-- No lo es para datos medicos reales. Para revertir esto, vuelve a ejecutar
-- los scripts 02-06, que restauran las politicas por usuario.
-- =============================================================


-- -------------------------------------------------------------
-- 1. Quitar las llaves foraneas hacia auth.users
-- -------------------------------------------------------------
alter table public.patients            drop constraint if exists patients_user_id_fkey;
alter table public.appointment_history  drop constraint if exists appointment_history_user_id_fkey;
alter table public.user_settings        drop constraint if exists user_settings_user_id_fkey;
alter table public.statistics           drop constraint if exists statistics_user_id_fkey;
alter table public.user_profiles        drop constraint if exists user_profiles_id_fkey;


-- -------------------------------------------------------------
-- 2. Politicas abiertas (acceso sin sesion)
--
-- Se borran TODAS las politicas anteriores de cada tabla, incluyendo las
-- variantes _all_own y las separadas por operacion (_select_own, _insert_own,
-- _update_own, _delete_own), segun cual de los dos scripts hayas corrido.
-- -------------------------------------------------------------

-- ---- patients ----
drop policy if exists patients_all_own    on public.patients;
drop policy if exists patients_select_own on public.patients;
drop policy if exists patients_insert_own on public.patients;
drop policy if exists patients_update_own on public.patients;
drop policy if exists patients_delete_own on public.patients;

create policy patients_acceso_publico on public.patients
  for all to anon, authenticated
  using (true) with check (true);

-- ---- appointment_history ----
drop policy if exists history_all_own    on public.appointment_history;
drop policy if exists history_select_own on public.appointment_history;
drop policy if exists history_insert_own on public.appointment_history;
drop policy if exists history_update_own on public.appointment_history;
drop policy if exists history_delete_own on public.appointment_history;

create policy history_acceso_publico on public.appointment_history
  for all to anon, authenticated
  using (true) with check (true);

-- ---- user_settings ----
drop policy if exists user_settings_all_own    on public.user_settings;
drop policy if exists user_settings_select_own on public.user_settings;
drop policy if exists user_settings_insert_own on public.user_settings;
drop policy if exists user_settings_update_own on public.user_settings;
drop policy if exists user_settings_delete_own on public.user_settings;

create policy user_settings_acceso_publico on public.user_settings
  for all to anon, authenticated
  using (true) with check (true);

-- ---- statistics ----
drop policy if exists statistics_all_own    on public.statistics;
drop policy if exists statistics_select_own on public.statistics;
drop policy if exists statistics_insert_own on public.statistics;
drop policy if exists statistics_update_own on public.statistics;
drop policy if exists statistics_delete_own on public.statistics;

create policy statistics_acceso_publico on public.statistics
  for all to anon, authenticated
  using (true) with check (true);

-- ---- user_profiles ----
drop policy if exists user_profiles_all_own    on public.user_profiles;
drop policy if exists user_profiles_select_own on public.user_profiles;
drop policy if exists user_profiles_insert_own on public.user_profiles;
drop policy if exists user_profiles_update_own on public.user_profiles;
drop policy if exists user_profiles_delete_own on public.user_profiles;

create policy user_profiles_acceso_publico on public.user_profiles
  for all to anon, authenticated
  using (true) with check (true);


-- -------------------------------------------------------------
-- 3. Comprobacion
-- Deberia listar una politica "..._acceso_publico" por cada tabla.
-- -------------------------------------------------------------
select tablename, policyname, roles
from pg_policies
where schemaname = 'public'
order by tablename;
