// utils/permissions.ts
// Que puede hacer cada rol dentro de la app.
//
// La separacion es la del flujo real de urgencias: quien recibe al paciente no
// es quien lo atiende.
//
//   - Registrar paciente  -> admin y recepcion (trabajo administrativo)
//   - Atender paciente    -> medico y enfermeria (trabajo clinico)
//
// Ningun rol tiene los dos permisos: son excluyentes a proposito.
//
// El rol viene de la tabla del login por PIN (ver utils/auth.ts), que vive en
// el proyecto de Supabase y no esta versionada aqui. Por eso la comparacion no
// es contra cadenas exactas: se normaliza (sin tildes, en minusculas) y se
// buscan raices, para que 'Médico', 'medico general', 'Dra.' o 'Enfermera'
// caigan todos del lado correcto sin tener que migrar la base.

import { SesionStaff } from './auth';

export type Permisos = {
  /** Puede dar de alta pacientes en la cola de espera. */
  registrar: boolean;
  /** Puede sacar al siguiente paciente de la cola y pasarlo al historial. */
  atender: boolean;
};

/** Sin permisos. Es lo que recibe un rol que no se reconoce o que viene vacio. */
const NINGUNO: Permisos = { registrar: false, atender: false };

/** Raices de los roles clinicos: atienden, no registran. */
const RAICES_CLINICAS = ['medic', 'doctor', 'enferm'];

/** Raices de los roles administrativos: registran, no atienden. */
const RAICES_ADMIN = ['admin', 'recep', 'secretar'];

/**
 * Abreviaturas que son el rol completo ('Dra.', 'MD'). Se comparan como
 * palabra entera y no como raiz: usar 'dr' como raiz haria que un rol como
 * 'Adrian' o 'drenaje' contara como personal medico.
 */
const ABREVIATURAS_CLINICAS = ['dr', 'dra', 'md', 'enf'];

/** Minusculas y sin tildes, para que 'Médico' y 'medico' sean lo mismo. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Parte el rol en palabras, ignorando puntos, guiones y espacios extra. */
function palabras(rol: string): string[] {
  return normalizar(rol)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function coincide(rol: string, raices: string[], abreviaturas: string[] = []): boolean {
  return palabras(rol).some(
    (palabra) =>
      raices.some((raiz) => palabra.startsWith(raiz)) || abreviaturas.includes(palabra)
  );
}

/**
 * Traduce el rol de la sesion a permisos concretos.
 *
 * Un rol desconocido o vacio no recibe ningun permiso: puede consultar la
 * lista, el historial y las estadisticas, pero no modificar la cola. Se
 * prefiere eso a conceder permisos por defecto, porque registrar y atender son
 * las dos acciones que cambian datos de pacientes.
 */
export function permisosDe(sesion?: SesionStaff | null): Permisos {
  const rol = sesion?.rol;
  if (!rol) return NINGUNO;

  if (coincide(rol, RAICES_CLINICAS, ABREVIATURAS_CLINICAS)) {
    return { registrar: false, atender: true };
  }
  if (coincide(rol, RAICES_ADMIN)) {
    return { registrar: true, atender: false };
  }
  return NINGUNO;
}

/** Texto corto para explicar en Ajustes por que faltan pestañas. */
export function descripcionPermisos(permisos: Permisos): string {
  if (permisos.registrar && permisos.atender) return 'Registrar y atender pacientes';
  if (permisos.registrar) return 'Registrar pacientes';
  if (permisos.atender) return 'Atender pacientes';
  return 'Solo consulta';
}
