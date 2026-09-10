import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yntbwfyfiaseohgamnzu.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Sin la clave, createClient() lanza "supabaseKey is required." al importarse y
// la app entera queda en blanco antes de renderizar nada. Se avisa con un
// mensaje que dice exactamente como arreglarlo.
if (!SUPABASE_ANON_KEY) {
  throw new Error(
    'Falta EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
      'Crea el archivo MiProyecto/.env copiando .env.example y reinicia el servidor ' +
      '(las variables .env solo se leen al arrancar Expo).'
  );
}

// La app no tiene login: se conecta siempre como anonimo. Por eso no hay
// nada de sesion que guardar ni token que refrescar.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
