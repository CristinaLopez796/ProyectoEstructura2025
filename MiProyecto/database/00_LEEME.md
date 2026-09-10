# Base de datos — SmartTriage (Supabase / PostgreSQL)

Scripts SQL para crear las tablas que usa `utils/supabaseAuth.ts`.

## Orden de ejecución

Ejecútalos **en este orden**. El orden importa: `04` referencia a `03`, y
todos dependen de `auth.users`, que Supabase ya crea por ti.

| # | Archivo | Qué crea |
|---|---------|----------|
| 1 | `01_extensiones_y_utilidades.sql` | Extensiones y el trigger de `updated_at` |
| 2 | `02_user_profiles.sql` | Perfil del usuario (médico//recepcionista) |
| 3 | `03_patients.sql` | Cola de espera de pacientes |
| 4 | `04_appointment_history.sql` | Historial de atenciones |
| 5 | `05_user_settings.sql` | Preferencias (modo oscuro) |
| 6 | `06_statistics.sql` | Métricas acumuladas |
| 7 | `07_datos_de_prueba.sql` | *(Opcional)* Filas de ejemplo |

## Cómo ejecutarlos

1. Entra a tu proyecto en [supabase.com/dashboard](https://supabase.com/dashboard)
   (el tuyo es `yntbwfyfiaseohgamnzu`).
2. Menú lateral → **SQL Editor** → **New query**.
3. Copia y pega el contenido de un archivo, presiona **Run**.
4. Repite con el siguiente, en orden.

Todos los scripts usan `if not exists` / `drop policy if exists`, así que
puedes volver a ejecutarlos sin que truene si algo salió a medias.

---

## Tres decisiones de diseño que debes conocer

Estas no son arbitrarias: salen de cómo está escrito tu código hoy.

### 1. `queued_at` y `attended_at` son `bigint`, no `timestamp`

Tu app guarda esas fechas con `Date.now()`, que produce un **número**
(milisegundos desde 1970), no un texto de fecha:

```ts
// screens/HomeScreen.tsx
const item: HistoryItem = { paciente: next.value, atendidoEn: now, waitedMs };
```

Si estas columnas fueran `timestamptz`, PostgreSQL rechazaría el insert con
`invalid input syntax for type timestamp`. Con `bigint` funciona tal cual está
tu código. Para leerlas como fecha en SQL:

```sql
select to_timestamp(attended_at / 1000) as atendido_en from appointment_history;
```

### 2. `patient_id` NO tiene llave foránea

Parece un descuido pero es a propósito. Tu app **borra al paciente de la cola
en el momento de atenderlo**, y recién ahí escribe el historial:

```ts
setPatients((prev) => prev.filter((p) => p.id !== next.value.id)); // se va de la cola
// ...y después se guarda en el historial
```

Si `patient_id` tuviera `references patients(id)`, ese insert fallaría siempre,
porque la fila ya no existe. Se deja como `uuid` suelto: guarda la referencia
histórica sin bloquear la inserción.

### 3. `fecha_nacimiento` es `text`, no `date`

Tu formulario guarda la fecha como texto en formato `DD/MM/AAAA` (ver la
función `maskDDMMYYYY` en `components/PatientForm.tsx`). PostgreSQL espera
`AAAA-MM-DD` para un `date`. Se deja como `text` para que calce con lo que la
app envía hoy. Si algún día conviertes a `date`, tendrás que transformar con
`to_date(fecha, 'DD/MM/YYYY')`.

---

## Importante: la app todavía no usa estas tablas

Hoy tu proyecto guarda **todo en `AsyncStorage`** (el almacenamiento local del
teléfono/navegador). Lo puedes ver en `screens/HomeScreen.tsx`:

```ts
const STORAGE_KEY = "patients:v1";
await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
```

Las funciones `supabaseDb`, `appointmentHistory`, `userSettings`, `userProfile`
y `statistics` están escritas en `utils/supabaseAuth.ts` pero **nadie las
llama**. De Supabase solo se usa el login (`signIn` / `signUp`).

O sea: estas tablas quedan listas y esperando, pero crearlas **no cambia nada**
en el comportamiento de la app por sí solo. Para que la app realmente las use
hay que reemplazar las llamadas a `AsyncStorage` por las de `supabaseDb`.

## Seguridad (RLS)

Todas las tablas llevan **Row Level Security** activado: cada usuario solo ve y
modifica sus propias filas.

Esto no es opcional. Tu clave `EXPO_PUBLIC_SUPABASE_ANON_KEY` viaja dentro del
bundle de la app — cualquiera que abra tu web puede leerla. Sin RLS, esa clave
permitiría a cualquier persona leer **todos los expedientes de pacientes** de
todos los usuarios. Con RLS activado, la clave sola no sirve para nada sin una
sesión válida.
