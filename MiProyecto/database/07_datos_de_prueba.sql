-- =============================================================
-- 07 — Datos de prueba  (OPCIONAL)
--
-- Inserta 5 pacientes y 2 atenciones para que puedas ver la app con
-- contenido. Puedes saltarte este script sin problema.
--
-- COMO USARLO:
-- Debes estar logueado en la app al menos una vez, para que exista tu
-- usuario en auth.users. El script toma automaticamente el usuario mas
-- reciente. Si tienes varios y quieres uno especifico, reemplaza el
-- bloque de v_user_id por:
--     v_user_id := 'pega-aqui-tu-uuid';
-- (lo encuentras en Supabase -> Authentication -> Users)
-- =============================================================

do $$
declare
  v_user_id uuid;
  v_ahora   bigint := (extract(epoch from now()) * 1000)::bigint;
begin

  -- Usuario mas recientemente creado
  select id into v_user_id
  from auth.users
  order by created_at desc
  limit 1;

  if v_user_id is null then
    raise exception 'No hay usuarios en auth.users. Registrate en la app primero (boton "Crear Cuenta").';
  end if;

  raise notice 'Insertando datos de prueba para el usuario %', v_user_id;

  -- ---- Cola de espera ----
  -- Los queued_at van hacia atras en el tiempo para que se note el
  -- desempate por antiguedad a igual urgencia.
  insert into public.patients
    (user_id, nombre, fecha_nacimiento, sintomas, expediente, urgencia, queued_at,
     sintoma_principal, nivel_dolor, dificultad_respiratoria, temperatura, frecuencia_cardiaca,
     prediccion_urgencia, prediccion_confianza)
  values
    (v_user_id, 'Maria Fernanda Lopez', '05/09/1994', 'Dolor intenso en el pecho y sudoracion',
     'EXP-A1B2C3D4', 1, v_ahora - 2400000,
     'dolor_pecho', 3, true, 37.8, 122, 1, 0.910),

    (v_user_id, 'Carlos Martinez',      '17/03/1962', 'Dificultad para respirar desde anoche',
     'EXP-E5F6G7H8', 1, v_ahora - 1800000,
     'dificultad_respiratoria', 2, true, 38.6, 108, 1, 0.870),

    (v_user_id, 'Ana Sofia Ramirez',    '22/11/2001', 'Fractura en el antebrazo por caida',
     'EXP-I9J0K1L2', 2, v_ahora - 3600000,
     'fractura', 3, false, 36.8, 95, 2, 0.720),

    (v_user_id, 'Jose Luis Herrera',    '30/06/1988', 'Fiebre alta y dolor de cabeza',
     'EXP-M3N4O5P6', 2, v_ahora -  900000,
     'fiebre', 2, false, 39.1, 99, 2, 0.680),

    (v_user_id, 'Lucia Mendoza',        '14/02/1996', 'Herida superficial en la mano',
     'EXP-Q7R8S9T0', 3, v_ahora -  600000,
     'herida', 1, false, 36.5, 78, 3, 0.830);

  -- ---- Historial de atenciones ----
  insert into public.appointment_history
    (user_id, patient_id, patient_name, patient_birthday, symptoms, urgency,
     expediente, attended_at, waited_ms)
  values
    (v_user_id, gen_random_uuid(), 'Roberto Diaz',   '08/12/1975',
     'Dolor abdominal agudo', 1, 'EXP-U1V2W3X4', v_ahora - 5400000, 1200000),

    (v_user_id, gen_random_uuid(), 'Patricia Nunez', '25/07/1990',
     'Mareo y vision borrosa',  2, 'EXP-Y5Z6A7B8', v_ahora - 4200000, 2700000);

  raise notice 'Listo: 5 pacientes en espera y 2 atenciones en el historial.';

end $$;


-- -------------------------------------------------------------
-- Comprobacion: asi deberia verse la cola, en el mismo orden en que
-- la app la muestra (urgencia primero, luego el mas antiguo).
-- -------------------------------------------------------------
select
  nombre,
  case urgencia when 1 then 'Alta' when 2 then 'Media' else 'Baja' end as prioridad,
  expediente,
  to_timestamp(queued_at / 1000) as registrado_en
from public.patients
order by urgencia asc, queued_at asc;
