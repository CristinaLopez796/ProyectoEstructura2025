-- =============================================================
-- 12 — Validacion y respaldo de `edad` contra `patient_birthday`
--
-- REQUIERE haber corrido antes 11_columnas_ml_historial.sql (crea la columna
-- appointment_history.edad).
--
-- POR QUE ESTE SCRIPT:
-- `edad` ya se calcula sola en el momento de la atencion (utils/datetime.ts,
-- edadDesdeFecha, llamada desde patientRepository.ts -> historyRepo.add()). No
-- se captura a mano, asi que no se puede "escribir mal". Pero SI puede faltar:
--   - patient_birthday vacio, con formato invalido, o una fecha imposible
--     (31/02/2020) -> edadDesdeFecha() devuelve null -> edad queda NULL.
--   - filas de antes de que la columna existiera (datos de prueba insertados
--     por SQL, o atenciones muy viejas) -> edad quedo NULL para siempre, aunque
--     patient_birthday si tenga un valor usable.
--
-- Este script separa esos dos casos: al segundo lo puede arreglar solo
-- (recalculando desde patient_birthday); al primero lo deja documentado como
-- limitacion, porque no hay de donde sacar el dato.
--
-- Es la demostracion de limpieza y validacion de datos para el dataset de ML:
-- "la variable que le conviene al modelo" (edad, numerica, lista para usar) se
-- valida contra su fuente original (patient_birthday) en vez de confiar en
-- ella a ciegas.
-- =============================================================


-- -------------------------------------------------------------
-- 1) Funcion de apoyo: parsear "DD/MM/AAAA" o "AAAA-MM-DD" de forma segura
--    (ambos formatos conviven en patient_birthday, ver utils/datetime.ts) y
--    calcular la edad a una fecha de referencia. Nunca lanza error: si el
--    texto no es una fecha valida, devuelve NULL.
-- -------------------------------------------------------------
create or replace function public.edad_desde_texto(
  fecha_texto      text,
  fecha_referencia date default current_date
)
returns integer
language plpgsql
as $$
declare
  fecha_nac date;
  texto     text := btrim(coalesce(fecha_texto, ''));
begin
  if texto = '' then
    return null;
  end if;

  begin
    if texto ~ '^\d{2}/\d{2}/\d{4}$' then
      fecha_nac := to_date(texto, 'DD/MM/YYYY');
    elsif texto ~ '^\d{4}-\d{2}-\d{2}$' then
      fecha_nac := to_date(texto, 'YYYY-MM-DD');
    else
      return null;
    end if;
  exception when others then
    return null; -- ej. "31/02/2020": fecha que no existe
  end;

  if fecha_nac > fecha_referencia
     or fecha_nac < fecha_referencia - interval '120 years' then
    return null; -- fecha futura o mas de 120 anios: dato invalido
  end if;

  return date_part('year', age(fecha_referencia, fecha_nac))::int;
end;
$$;

comment on function public.edad_desde_texto(text, date) is
  'Edad en anios completos a fecha_referencia, calculada desde un texto '
  '"DD/MM/AAAA" o "AAAA-MM-DD". Devuelve NULL si el texto es invalido, vacio, '
  'una fecha futura, o implica mas de 120 anios.';


-- -------------------------------------------------------------
-- 2) Diagnostico ANTES de tocar nada: cuantas filas de appointment_history
--    tienen edad, cuantas la tienen NULL pero se podria calcular, y cuantas
--    no tienen forma de saberla.
-- -------------------------------------------------------------
select
  count(*) filter (where edad is not null)                                                     as con_edad,
  count(*) filter (where edad is null and public.edad_desde_texto(
      patient_birthday, to_timestamp(attended_at / 1000)::date) is not null)                   as recuperable,
  count(*) filter (where edad is null and public.edad_desde_texto(
      patient_birthday, to_timestamp(attended_at / 1000)::date) is null)                       as sin_dato_valido,
  count(*)                                                                                       as total
from public.appointment_history;


-- -------------------------------------------------------------
-- 3) Recalcular y corregir SOLO donde falta: no se pisa ningun valor que ya
--    exista (la edad calculada en el momento de la atencion es la fuente de
--    verdad; esto solo rellena huecos, como los de datos de prueba o
--    registros anteriores a la columna).
-- -------------------------------------------------------------
update public.appointment_history
set edad = public.edad_desde_texto(patient_birthday, to_timestamp(attended_at / 1000)::date)
where edad is null
  and public.edad_desde_texto(patient_birthday, to_timestamp(attended_at / 1000)::date) is not null;


-- -------------------------------------------------------------
-- 4) Coherencia: recalcular la edad YA guardada y comparar. Como edad se
--    calcula en el momento de la atencion (no con CURRENT_DATE), esto deberia
--    dar CERO inconsistencias; si aparece alguna, apunta a un bug real (por
--    ejemplo, patient_birthday editado despues de la atencion).
-- -------------------------------------------------------------
select
  id,
  patient_birthday,
  attended_at,
  edad                                                                                    as edad_guardada,
  public.edad_desde_texto(patient_birthday, to_timestamp(attended_at / 1000)::date)        as edad_recalculada
from public.appointment_history
where edad is not null
  and edad is distinct from
      public.edad_desde_texto(patient_birthday, to_timestamp(attended_at / 1000)::date);


-- -------------------------------------------------------------
-- 5) Lo que queda sin poder resolverse: se documenta como limitacion del
--    dataset (ver docs/Proyecto_Final_Ciencia_de_Datos.md, seccion 11) en vez
--    de imputarse a ciegas.
-- -------------------------------------------------------------
select id, patient_name, patient_birthday, attended_at
from public.appointment_history
where edad is null;

notify pgrst, 'reload schema';
