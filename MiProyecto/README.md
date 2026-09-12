# SmartTriage

App de **cola de espera priorizada para un servicio de urgencias**, con un
**componente de Ciencia de Datos** que sugiere el nivel de urgencia del triage.

- **Estructura de Datos:** el orden de atención lo decide una cola de prioridad
  sobre un heap binario.
- **Ciencia de Datos II:** un modelo de clasificación estima la urgencia
  (1 = Alta, 2 = Media, 3 = Baja) a partir de seis signos clínicos.

## Estructura del repositorio

```
MiProyecto/
├── App.tsx, index.ts        Punto de entrada (Expo / React Native)
├── components/              UI: PatientForm, DateField, listas, modales…
├── screens/                 Pantallas + screens/lib/priorityQueue.ts (el heap)
├── models/Patient.ts        Modelo de datos del paciente
├── utils/
│   ├── priorityPrediction.ts   Regla ligera de urgencia que corre en el cliente
│   └── patientRepository.ts    Capa de datos contra Supabase
├── config/supabaseClient.ts
├── database/               Esquema SQL, datos de prueba y políticas (ver 00_LEEME.md)
├── data/generar_dataset.py     Generador del dataset simulado + regla baseline
├── notebook/
│   ├── SmartTriage_CienciaDeDatos.ipynb   Proceso completo de CD (Colab-ready)
│   └── README.md
└── docs/
    ├── Proyecto_Final_Ciencia_de_Datos.md   Documento (13 secciones) → exportar a PDF
    └── Presentacion_Final.md                Guion de la presentación
```

## Cómo correr la app

```bash
cd MiProyecto
npm install
# Crea .env a partir de .env.example con tu URL y anon key de Supabase
npx expo start -c
```

Detalles de Supabase en [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md). El esquema de la
base y las políticas de acceso están en [`database/`](database/00_LEEME.md).

## Cómo correr el componente de Ciencia de Datos

Sube [`notebook/SmartTriage_CienciaDeDatos.ipynb`](notebook/SmartTriage_CienciaDeDatos.ipynb)
a Google Colab y ejecuta todo. Genera `pacientes_simulados.csv`, entrena los
modelos y exporta `modelo_urgencia.pkl`. Guía completa en
[`notebook/README.md`](notebook/README.md).

## Entregables del proyecto de Ciencia de Datos

| Entregable | Ubicación |
|---|---|
| Documento (PDF) | [`docs/Proyecto_Final_Ciencia_de_Datos.md`](docs/Proyecto_Final_Ciencia_de_Datos.md) → exportar a PDF |
| Demo / notebook | [`notebook/SmartTriage_CienciaDeDatos.ipynb`](notebook/SmartTriage_CienciaDeDatos.ipynb) |
| Repositorio | este repo |
| Presentación | [`docs/Presentacion_Final.md`](docs/Presentacion_Final.md) |

## Notas

- `.env` es personal y no se versiona; usa `.env.example` como plantilla.
- La app abre directo en el registro de pacientes (sin login). Por eso las
  políticas RLS están en acceso público — aceptable para un proyecto de curso,
  no para datos reales.
