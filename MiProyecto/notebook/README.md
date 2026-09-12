# SmartTriage · Componente de Ciencia de Datos

Predicción del **nivel de urgencia** (1 = Alta, 2 = Media, 3 = Baja) en el triage
de la app SmartTriage, a partir de seis signos clínicos.

## Contenido

| Archivo | Descripción |
|---|---|
| [`SmartTriage_CienciaDeDatos.ipynb`](SmartTriage_CienciaDeDatos.ipynb) | Notebook completo: generación del dataset, ETL/limpieza, EDA, modelos, evaluación, importancia de variables y exportación. Se ejecuta de principio a fin en Google Colab sin archivos externos. |
| [`../data/generar_dataset.py`](../data/generar_dataset.py) | Script independiente que genera el dataset simulado (`pacientes_simulados.csv`) y contiene la regla lineal usada como baseline. |
| `pacientes_simulados.csv` | Dataset generado (se crea al correr el notebook o el script). |
| `modelo_urgencia.pkl` | Pipeline entrenado (preprocesamiento + Random Forest). Se crea al correr el notebook. |

## Cómo ejecutarlo

### Opción A — Google Colab (recomendada)

1. Sube `SmartTriage_CienciaDeDatos.ipynb` a [colab.research.google.com](https://colab.research.google.com).
2. `Entorno de ejecución → Ejecutar todo`.
3. Al terminar, descarga `pacientes_simulados.csv` y `modelo_urgencia.pkl` desde el panel de archivos y súbelos a esta carpeta si quieres versionarlos.

### Opción B — Local

```bash
pip install pandas numpy scikit-learn matplotlib seaborn joblib jupyter
cd MiProyecto/data && python generar_dataset.py     # genera el CSV
cd ../notebook && jupyter notebook                   # abre el .ipynb
```

## Cómo se conecta con la app

- El catálogo de síntomas y sus pesos coinciden con
  [`utils/priorityPrediction.ts`](../utils/priorityPrediction.ts) y con el `CHECK`
  de la columna `sintoma_principal` en
  [`database/03_patients.sql`](../database/03_patients.sql).
- El formulario de registro ([`components/PatientForm.tsx`](../components/PatientForm.tsx))
  captura las seis variables y muestra la urgencia sugerida.
- La app **no** carga el `.pkl`: usa una destilación ligera del modelo (una regla
  en `priorityPrediction.ts`) para funcionar sin backend. El `.pkl` queda como
  referencia y como base para servirlo desde un endpoint más adelante.
- La urgencia sugerida (`prediccionUrgencia`) y la confianza (`prediccionConfianza`)
  se guardan junto al paciente en Supabase. Al atender a un paciente, además se
  guarda `edad` (calculada en `utils/datetime.ts` -> `edadDesdeFecha`) en
  `appointment_history`, para tener la variable ya lista sin reparsear la fecha
  de nacimiento en cada consulta (ver `database/11_columnas_ml_historial.sql` y
  `database/12_edad_validacion.sql`).

## Reproducibilidad

Todo usa `random_state = 42`. El notebook y `generar_dataset.py` mantienen la
misma lógica de generación; si cambias una, actualiza la otra.
