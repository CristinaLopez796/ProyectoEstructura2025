# Configuración de Supabase

## Instalación

La dependencia de Supabase ya ha sido agregada a `package.json`. Para instalarla, ejecuta:

```bash
npm install
# o
yarn install
```

## Configuración de Credenciales

1. Ve a tu [dashboard de Supabase](https://supabase.com/dashboard)
2. Selecciona tu proyecto: `yntbwfyfiaseohgamnzu`
3. En **Settings > API**, copia tu **Anon Key**
4. Edita el archivo `.env.local` y reemplaza `EXPO_PUBLIC_SUPABASE_ANON_KEY` con tu clave:

```env
EXPO_PUBLIC_SUPABASE_URL=https://yntbwfyfiaseohgamnzu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_aqui
```

## Uso en tu Aplicación

### Importar el cliente de Supabase

```typescript
import { supabase } from './config/supabaseClient';
```

### Funciones de Autenticación

```typescript
import { supabaseAuth } from './utils/supabaseAuth';

// Registrarse
const { data, error } = await supabaseAuth.signUp('email@example.com', 'password');

// Iniciar sesión
const { data, error } = await supabaseAuth.signIn('email@example.com', 'password');

// Obtener usuario actual
const user = await supabaseAuth.getCurrentUser();

// Cerrar sesión
const { error } = await supabaseAuth.signOut();
```

### Operaciones de Base de Datos

```typescript
import { supabaseDb } from './utils/supabaseAuth';

// Insertar un paciente
const { data, error } = await supabaseDb.insertPatient({
  name: 'Juan',
  email: 'juan@example.com',
  phone: '123456789',
});

// Obtener todos los pacientes
const { data, error } = await supabaseDb.getPatients();

// Actualizar un paciente
const { data, error } = await supabaseDb.updatePatient(patientId, {
  name: 'Juan Updated',
});

// Eliminar un paciente
const { error } = await supabaseDb.deletePatient(patientId);
```

## Configuración en Supabase

Asegúrate de crear la tabla `patients` en Supabase con los campos necesarios para tu aplicación.

Estructura recomendada:
- `id` (UUID, Primary Key)
- `name` (Text)
- `email` (Text)
- `phone` (Text)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

## Notas

- `.env.local` no debe ser committeado al repositorio (ya está en `.gitignore`)
- Las variables de entorno deben comenzar con `EXPO_PUBLIC_` para ser expuestas al cliente en Expo
- Para desarrollo local, recuerda reiniciar el servidor de Expo después de cambiar `.env.local`
