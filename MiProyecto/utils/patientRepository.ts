// utils/patientRepository.ts
// Capa de datos contra Supabase. Reemplaza al AsyncStorage que se usaba antes.
//
// La app no tiene login: se conecta como anonimo. Para que esto funcione, las
// politicas RLS de las tablas deben permitir acceso publico; el script
// database/08_sin_login.sql se encarga de eso.
//
// Aqui la traduccion entre el modelo Patient (camelCase) y las columnas de
// PostgreSQL (snake_case) es explicita: un insert con las claves en camelCase
// fallaria, porque las columnas se llaman fecha_nacimiento, queued_at, etc.

import { supabase } from '../config/supabaseClient';
import { Patient } from '../models/Patient';
import { HistoryItem } from '../screens/HistoryScreen';
import { SintomaPrincipal } from './priorityPrediction';

// ---------------------------------------------------------------
// Traduccion entre la fila de PostgreSQL y el modelo de la app
// ---------------------------------------------------------------

type PatientRow = {
  id: string;
  nombre: string;
  fecha_nacimiento: string | null;
  sintomas: string;
  expediente: string;
  urgencia: 1 | 2 | 3;
  queued_at: number | string;
  sintoma_principal: SintomaPrincipal | null;
  nivel_dolor: 1 | 2 | 3 | null;
  dificultad_respiratoria: boolean | null;
  temperatura: number | string | null;
  frecuencia_cardiaca: number | null;
  prediccion_urgencia: 1 | 2 | 3 | null;
  prediccion_confianza: number | string | null;
};

// PostgreSQL devuelve bigint y numeric como string para no perder precision
// en JavaScript. Hay que convertirlos a numero antes de usarlos.
const num = (v: number | string | null | undefined): number | undefined => {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : undefined;
};

function rowToPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    nombre: row.nombre,
    fechaNacimiento: row.fecha_nacimiento ?? '',
    sintomas: row.sintomas,
    expediente: row.expediente,
    urgencia: row.urgencia,
    queuedAt: num(row.queued_at),
    sintomaPrincipal: row.sintoma_principal ?? undefined,
    nivelDolor: row.nivel_dolor ?? undefined,
    dificultadRespiratoria: row.dificultad_respiratoria ?? undefined,
    temperatura: num(row.temperatura),
    frecuenciaCardiaca: row.frecuencia_cardiaca ?? undefined,
    prediccionUrgencia: row.prediccion_urgencia ?? undefined,
    prediccionConfianza: num(row.prediccion_confianza),
  };
}

function patientToRow(p: Patient, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    nombre: p.nombre,
    fecha_nacimiento: p.fechaNacimiento || null,
    sintomas: p.sintomas,
    expediente: p.expediente,
    urgencia: p.urgencia,
    queued_at: p.queuedAt ?? Date.now(),
    sintoma_principal: p.sintomaPrincipal ?? null,
    nivel_dolor: p.nivelDolor ?? null,
    dificultad_respiratoria: p.dificultadRespiratoria ?? false,
    temperatura: p.temperatura ?? null,
    frecuencia_cardiaca: p.frecuenciaCardiaca ?? null,
    prediccion_urgencia: p.prediccionUrgencia ?? null,
    prediccion_confianza: p.prediccionConfianza ?? null,
  };
}

/** Error legible para mostrar al usuario. */
export class RepoError extends Error {}

// La app no tiene login, asi que no hay un auth.uid() real que poner en la
// columna user_id. Se usa un UUID fijo que identifica "esta instalacion".
// La columna se conserva porque las tablas la declaran NOT NULL y porque deja
// la puerta abierta a reintroducir usuarios mas adelante sin migrar datos.
export const APP_USER_ID = '00000000-0000-0000-0000-000000000001';

// ---------------------------------------------------------------
// Cola de espera (tabla patients)
// ---------------------------------------------------------------

export const patientsRepo = {
  /** Trae la cola completa, ya ordenada por prioridad y antiguedad. */
  async list(): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('urgencia', { ascending: true })
      .order('queued_at', { ascending: true });

    if (error) throw new RepoError(`No se pudo cargar la cola: ${error.message}`);
    return (data ?? []).map(rowToPatient);
  },

  async add(p: Patient): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .insert([patientToRow(p, APP_USER_ID)])
      .select()
      .single();

    if (error) throw new RepoError(`No se pudo registrar el paciente: ${error.message}`);
    return rowToPatient(data);
  },

  async remove(patientId: string): Promise<void> {
    const { error } = await supabase.from('patients').delete().eq('id', patientId);
    if (error) throw new RepoError(`No se pudo quitar de la cola: ${error.message}`);
  },
};

// ---------------------------------------------------------------
// Historial (tabla appointment_history)
//
// Ojo: esta tabla usa nombres en ingles (urgency, symptoms, attended_at)
// mientras que patients usa espanol. Asi estaba definido el esquema.
// ---------------------------------------------------------------

type HistoryRow = {
  id: string;
  patient_id: string | null;
  patient_name: string;
  patient_birthday: string | null;
  symptoms: string | null;
  urgency: 1 | 2 | 3;
  expediente: string | null;
  attended_at: number | string;
  waited_ms: number | string | null;
};

function rowToHistory(row: HistoryRow): HistoryItem {
  return {
    id: row.id,
    // El historial guarda una foto del paciente, no una referencia viva: cuando
    // se atiende a alguien su fila en `patients` se borra.
    paciente: {
      id: row.patient_id ?? row.id,
      nombre: row.patient_name,
      fechaNacimiento: row.patient_birthday ?? '',
      sintomas: row.symptoms ?? '',
      urgencia: row.urgency,
      expediente: row.expediente ?? '',
    },
    atendidoEn: num(row.attended_at) ?? 0,
    waitedMs: num(row.waited_ms),
  };
}

export const historyRepo = {
  /** Trae el historial en el mismo orden que la app lo muestra: mas viejo primero. */
  async list(): Promise<HistoryItem[]> {
    const { data, error } = await supabase
      .from('appointment_history')
      .select('*')
      .order('attended_at', { ascending: true });

    if (error) throw new RepoError(`No se pudo cargar el historial: ${error.message}`);
    return (data ?? []).map(rowToHistory);
  },

  /** Guarda una atencion y devuelve el item con el id que asigno la base. */
  async add(item: HistoryItem): Promise<HistoryItem> {
    const p = item.paciente;

    const { data, error } = await supabase
      .from('appointment_history')
      .insert([
        {
          user_id: APP_USER_ID,
          patient_id: p.id,
          patient_name: p.nombre,
          patient_birthday: p.fechaNacimiento || null,
          symptoms: p.sintomas,
          urgency: p.urgencia,
          expediente: p.expediente,
          attended_at: item.atendidoEn,
          waited_ms: item.waitedMs ?? null,
        },
      ])
      .select()
      .single();

    if (error) throw new RepoError(`No se pudo guardar en el historial: ${error.message}`);
    return { ...item, id: data.id };
  },

  async remove(historyId: string): Promise<void> {
    const { error } = await supabase.from('appointment_history').delete().eq('id', historyId);
    if (error) throw new RepoError(`No se pudo deshacer: ${error.message}`);
  },
};

// ---------------------------------------------------------------
// Preferencias (tabla user_settings)
//
// La fila se crea sola la primera vez. user_id es UNIQUE, asi que upsert
// sobre esa columna actualiza en vez de duplicar.
// ---------------------------------------------------------------

export const settingsRepo = {
  async getDarkMode(): Promise<boolean> {
    // Se filtra por APP_USER_ID y se limita a una fila.
    //
    // Antes esto usaba .maybeSingle() sin filtro, apoyandose en que RLS dejaba
    // ver solo las filas propias. Al abrir las politicas, la consulta empezo a
    // ver tambien la fila que quedo del usuario de cuando habia login, y
    // maybeSingle() revienta si vuelve mas de una: "JSON object requested,
    // multiple (or no) rows returned".
    const { data, error } = await supabase
      .from('user_settings')
      .select('dark_mode')
      .eq('user_id', APP_USER_ID)
      .limit(1);

    if (error) throw new RepoError(`No se pudieron leer los ajustes: ${error.message}`);
    return data?.[0]?.dark_mode ?? false;
  },

  async setDarkMode(isDark: boolean): Promise<void> {
    // update y, si no habia fila, insert. No se usa upsert porque
    // onConflict:'user_id' exige una restriccion UNIQUE sobre esa columna, y
    // la tabla pudo crearse antes sin ella.
    const { data, error } = await supabase
      .from('user_settings')
      .update({ dark_mode: isDark })
      .eq('user_id', APP_USER_ID)
      .select('id');

    if (error) throw new RepoError(`No se pudieron guardar los ajustes: ${error.message}`);
    if (data && data.length > 0) return;

    const { error: errIns } = await supabase
      .from('user_settings')
      .insert([{ user_id: APP_USER_ID, dark_mode: isDark }]);

    if (errIns) throw new RepoError(`No se pudieron guardar los ajustes: ${errIns.message}`);
  },
};
