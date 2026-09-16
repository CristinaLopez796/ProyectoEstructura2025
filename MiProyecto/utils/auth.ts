// utils/auth.ts
// Login propio (usuario + PIN de 5 digitos), no Supabase Auth.
//
// La verificacion pasa siempre por la funcion Postgres iniciar_sesion()
// (definida en el proyecto de Supabase): el cliente nunca ve ni compara el
// hash del PIN, solo manda usuario+PIN en claro por HTTPS y recibe si es
// valido o no.
//
// La sesion (quien entro) se guarda en AsyncStorage para no pedir login cada
// vez que se abre la app. No es un token: es solo un recordatorio local, del
// mismo nivel de seguridad que "recordar mi sesion" en un dispositivo
// compartido de recepcion.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabaseClient';

export type SesionStaff = {
  usuario: string;
  nombre: string | null;
  rol: string | null;
};

const CLAVE_SESION = 'smarttriage:sesion';

/** Error legible para mostrar en la pantalla de login. */
export class LoginError extends Error {}

/**
 * Verifica usuario+PIN contra la base. Devuelve la sesion si son correctos,
 * o lanza LoginError con un mensaje para mostrar en pantalla.
 */
export async function verificarLogin(usuario: string, pin: string): Promise<SesionStaff> {
  const usuarioLimpio = usuario.trim();
  if (!usuarioLimpio) {
    throw new LoginError('Escribe tu usuario.');
  }
  if (!/^\d{5}$/.test(pin)) {
    throw new LoginError('El PIN debe tener exactamente 5 dígitos numéricos.');
  }

  const { data, error } = await supabase.rpc('iniciar_sesion', {
    p_usuario: usuarioLimpio,
    p_pin: pin,
  });

  if (error) {
    throw new LoginError(error.message || 'No se pudo verificar el acceso.');
  }
  if (!data || data.length === 0) {
    throw new LoginError('Usuario o PIN incorrectos.');
  }

  const sesion: SesionStaff = {
    usuario: data[0].usuario,
    nombre: data[0].nombre ?? null,
    rol: data[0].rol ?? null,
  };
  await guardarSesion(sesion);
  return sesion;
}

async function guardarSesion(sesion: SesionStaff): Promise<void> {
  await AsyncStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
}

/** Lee la sesion guardada al abrir la app. null si nadie ha iniciado sesion. */
export async function leerSesion(): Promise<SesionStaff | null> {
  try {
    const texto = await AsyncStorage.getItem(CLAVE_SESION);
    if (!texto) return null;
    const datos = JSON.parse(texto);
    if (typeof datos?.usuario !== 'string') return null;
    return { usuario: datos.usuario, nombre: datos.nombre ?? null, rol: datos.rol ?? null };
  } catch {
    // AsyncStorage corrupto o no disponible: mejor pedir login de nuevo que
    // tronar el arranque de la app.
    return null;
  }
}

export async function cerrarSesion(): Promise<void> {
  await AsyncStorage.removeItem(CLAVE_SESION);
}
