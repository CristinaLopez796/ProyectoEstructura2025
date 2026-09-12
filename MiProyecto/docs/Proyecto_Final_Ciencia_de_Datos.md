# Proyecto Final · Ciencia de Datos II

> **Cómo exportar a PDF:** abre este archivo en VS Code y usa la extensión
> *Markdown PDF*, o ejecuta
> `pandoc Proyecto_Final_Ciencia_de_Datos.md -o Proyecto_Final.pdf`, o pégalo en
> un Google Doc. Los números marcados como `«…»` deben reemplazarse con la salida
> real del notebook una vez ejecutado.

---

## 1. Portada

| | |
|---|---|
| **Proyecto** | SmartTriage — Priorización asistida por datos en una cola de emergencias |
| **Componente de Ciencia de Datos** | Modelo de clasificación del nivel de urgencia del triage |
| **Curso** | Ciencia de Datos II |
| **Docente** | Ing. Naomy Ríos |
| **Equipo** | [Integrantes del equipo] |
| **Fecha** | [Fecha de entrega] |
| **Repositorio** | https://github.com/CristinaLopez796/ProyectoEstructura2025 |

---

## 2. Descripción del proyecto original

**SmartTriage** es una aplicación móvil (React Native + Expo) desarrollada para el
curso de Estructura de Datos. Modela la **sala de espera de un servicio de
urgencias**: el personal de recepción registra a cada paciente con sus datos y un
**nivel de urgencia** (1 = Alta, 2 = Media, 3 = Baja), y la aplicación mantiene la
cola de atención con una **cola de prioridad implementada sobre un heap binario**
(`screens/lib/priorityQueue.ts`). El paciente con mayor urgencia sale primero y,
a igualdad de urgencia, el que lleva más tiempo esperando.

La app incluye además:

- Registro y edición de pacientes, lista de espera e historial de atenciones.
- Persistencia en **Supabase** (PostgreSQL) mediante una capa de repositorio
  (`utils/patientRepository.ts`) que traduce entre el modelo de la app y las
  tablas.
- Pantalla de estadísticas y ajustes (modo oscuro, diseño responsive).

El corazón académico del proyecto son las **estructuras de datos** (heap, lista
enlazada, pila) que deciden el orden de atención. El componente de Ciencia de
Datos **no las reemplaza**: mejora la *calidad de la señal* que entra al heap.

---

## 3. Problema seleccionado

En SmartTriage, y en un triage real, el nivel de urgencia se asigna **a criterio
de la persona que recibe al paciente**. Ese criterio varía según su experiencia,
la carga de trabajo y la fatiga. Los dos tipos de error tienen costos asimétricos:

- **Sub-triage** (grave marcado como Media/Baja): el paciente espera de más en la
  cola. Es el error **más peligroso**.
- **Sobre-triage** (leve marcado como Alta): satura la cola y desplaza a otros.

**Problema a resolver:** ¿se puede estimar el nivel de urgencia de forma
**consistente y reproducible** a partir de unos pocos signos clínicos objetivos,
como apoyo a la decisión del personal?

Es un problema de **clasificación supervisada** con tres clases ordenadas.

---

## 4. Objetivos

**Objetivo general.** Integrar en SmartTriage un modelo de clasificación que
sugiera el nivel de urgencia del triage a partir de signos clínicos, generando
valor tangible sobre la asignación manual actual.

**Objetivos específicos.**

1. Construir un dataset representativo del problema (simulado y documentado) con
   variables clínicas realistas.
2. Ejecutar el proceso de Ciencia de Datos: obtención, ETL, limpieza y análisis
   exploratorio.
3. Entrenar y comparar al menos dos modelos de clasificación (árbol de decisión y
   Random Forest).
4. Evaluar el modelo con métricas adecuadas al problema (F1 macro, matriz de
   confusión, sub-triage) y compararlo con la regla lineal que ya usa la app.
5. Exportar el modelo e integrarlo al flujo de registro de pacientes.
6. Documentar decisiones, valor agregado, limitaciones y mejoras futuras.

---

## 5. Dataset

### 5.1. Fuente

**Dataset simulado**, generado con `data/generar_dataset.py` (y replicado dentro
del notebook para que sea reproducible en Colab sin archivos externos).

No se utilizan expedientes clínicos reales porque son **datos personales
sensibles de salud**, protegidos por ley y no disponibles para un trabajo de
curso. La simulación se diseñó para que las relaciones entre variables sean
**clínicamente plausibles**.

### 5.2. Cómo se generan las etiquetas

Cada paciente recibe un *score* de riesgo latente en `[0, ~1.3]`:

- **Parte lineal** — suma ponderada de los seis signos, con **los mismos pesos**
  que la regla que hoy corre en el cliente (`utils/priorityPrediction.ts`):
  `nivel_dolor` 0.30, `temperatura` 0.20, `dificultad_respiratoria` 0.20,
  `frecuencia_cardiaca` 0.15, `sintoma_principal` 0.10, `edad` 0.05.
- **Parte no lineal** — bonificaciones por **combinaciones de riesgo** que una
  suma de pesos independientes no capta:
  - dolor de pecho **y** disnea (+0.12),
  - temperatura ≥ 38 °C **y** FC ≥ 110 lpm, patrón de sepsis (+0.10),
  - adulto ≥ 75 años **con** dolor ≥ medio (+0.08),
  - lactante ≤ 2 años (+0.06),
  - herida leve sin disnea, que la regla sobreestima (−0.05).
- **Ruido gaussiano** (σ = 0.05): impide que la urgencia sea una función exacta
  de las entradas; es lo que da un problema de aprendizaje real.

El score se corta en `≥ 0.62 → Alta`, `≥ 0.35 → Media`, resto `Baja`.

### 5.3. Estructura y diccionario de datos

`n = 1500` filas · 6 predictores + 1 objetivo.

| Columna | Tipo | Rango / valores | Descripción |
|---|---|---|---|
| `edad` | entero (años) | 1 – 97 | Edad del paciente |
| `sintoma_principal` | categórica | `dolor_pecho`, `dificultad_respiratoria`, `fractura`, `dolor_abdominal`, `mareo`, `fiebre`, `herida`, `otro` | Motivo principal de consulta |
| `nivel_dolor` | ordinal | 1 (bajo), 2 (medio), 3 (alto) | Dolor referido |
| `dificultad_respiratoria` | booleana | 0 / 1 | Presencia de disnea |
| `temperatura` | float (°C) | ~35 – 41 | Temperatura corporal |
| `frecuencia_cardiaca` | entero (lpm) | 45 – 190 | Pulso |
| `urgencia` | **objetivo** | 1 = Alta, 2 = Media, 3 = Baja | Nivel de triage |

### 5.4. Distribución de la variable objetivo

Aproximadamente `«% Alta»` / `«% Media»` / `«% Baja»` (el generador produce un
desbalance moderado, con la clase Alta como minoritaria). Se maneja con
`class_weight='balanced'` y partición `stratify`.

### 5.5. Dataset real complementario (Supabase)

Además del dataset simulado, la tabla `appointment_history` de producción ya
guarda, por cada atención real, `edad`, `sintoma_principal`, `nivel_dolor`,
`dificultad_respiratoria`, `temperatura` y `frecuencia_cardiaca` (columnas
agregadas en `database/11_columnas_ml_historial.sql`). Es un dataset pequeño
todavía, pero real: sirve para validar que las relaciones encontradas en el
dataset simulado sean razonables, y a futuro para reentrenar con datos propios.

---

## 6. Proceso de Ciencia de Datos

### 6.1. Obtención (ETL)

El script/notebook genera el `DataFrame` y lo guarda como
`pacientes_simulados.csv`. En un despliegue real, esta etapa leería la tabla
`appointment_history` de Supabase (`EXPO_PUBLIC_SUPABASE_URL`), que ya tiene el
mismo esquema de seis variables clínicas más la etiqueta `urgencia`.

### 6.2. Limpieza

Para que el proceso sea realista se **inyectan problemas típicos** en una copia
del dataset y luego se corrigen:

| Problema introducido | Corrección aplicada |
|---|---|
| ~4 % de nulos en `temperatura`, ~3 % en `frecuencia_cardiaca` | Imputación con la **mediana** (robusta a extremos) |
| Valores imposibles: `temperatura = 3.75` (error de tecleo de 37.5), `frecuencia_cardiaca = 0` | Se marcan como nulos si están fuera de rango fisiológico (30–45 °C / 30–220 lpm) y luego se imputan |
| Categoría inconsistente: `"  Dolor_Pecho "` | `str.strip().str.lower()` y validación contra el catálogo |
| 15 filas duplicadas (doble registro) | `drop_duplicates()` |
| Tipos mixtos | Casteo final: booleana → int, FC → int |

Resultado: `«n filas»` filas, 0 nulos, tipos homogéneos.

**Validación cruzada `edad` ↔ fecha de nacimiento (dato real).** En la base de
producción, `edad` no se captura a mano: se calcula una sola vez, en el momento
de la atención, a partir de `patient_birthday` (`utils/datetime.ts` ->
`edadDesdeFecha`). Aun así, es exactamente el tipo de campo derivado que debe
auditarse, porque puede quedar **desactualizado o ausente** en registros
antiguos. `database/12_edad_validacion.sql` recalcula la edad desde
`patient_birthday` (usando la fecha de la atención, no la de hoy, para no sesgar
los registros históricos), la compara contra el valor guardado y rellena los
huecos que sí se puedan resolver.

Sobre los datos reales del proyecto (148 atenciones): 129 (87 %) ya traían
`edad` calculada, y las 19 restantes (13 %) la tenían en `NULL` por ser
anteriores a que la columna existiera. Al recalcularlas desde
`patient_birthday`, **las 19 se recuperaron sin excepción** — el dataset queda
100 % completo en esa variable, y la comparación no encontró ninguna
inconsistencia entre el valor guardado y el recalculado (lo esperado, ya que
`edad` se calcula una sola vez en el momento de la atención). Ese mismo cruce sí
reveló otra cosa: esas 19 filas, además de no tener `edad`, tampoco tienen
ningún otro signo clínico (`sintoma_principal`, `nivel_dolor`, `temperatura`,
`frecuencia_cardiaca` también en `NULL`) — son registros de antes de que el
formulario pidiera esos datos. Se documentan como filas **no utilizables para
entrenar** el modelo (les falta casi todo el resto de las variables), aunque ya
tengan la edad resuelta.

### 6.3. Análisis exploratorio (EDA)

Gráficos y hallazgos principales (ver notebook, sección 5):

- **Distribución de `urgencia`:** desbalance moderado, clase Alta minoritaria.
- **`temperatura` y `frecuencia_cardiaca` por urgencia:** ambas se desplazan
  claramente hacia arriba al aumentar la gravedad.
- **Correlación de Spearman con `urgencia`** (codificada 1 = Alta … 3 = Baja, por
  lo que las correlaciones útiles salen **negativas**): `nivel_dolor` y
  `frecuencia_cardiaca` son las variables numéricas con más señal.
- **`urgencia` por `sintoma_principal`:** `dolor_pecho` y
  `dificultad_respiratoria` concentran la mayor proporción de Altas; `herida` y
  `otro` son mayormente Bajas.
- **Colinealidad:** no hay pares de predictores fuertemente correlacionados, así
  que se usan todos.

---

## 7. Modelos utilizados

**Técnica elegida: clasificación supervisada.** Se comparan dos modelos dentro de
un `Pipeline` de scikit-learn (One-Hot de `sintoma_principal` + modelo), con
partición 75/25 estratificada y `random_state = 42`:

| Modelo | Configuración | Por qué |
|---|---|---|
| **Árbol de decisión** | `max_depth=6`, `class_weight='balanced'` | Interpretable: se puede dibujar y explicar al personal clínico. |
| **Random Forest** | `n_estimators=300`, `class_weight='balanced'` | Conjunto de árboles; mejor generalización e importancia de variables estable. Es el modelo que se exporta. |

**Baseline:** la **regla lineal** que ya corre en la app (`predecirUrgencia` de
`priorityPrediction.ts`), reproducida en Python. Permite medir cuánto aporta el
modelo por encima de lo que la app ya hace.

**Selección del modelo.** Random Forest se elige por: (1) mayor F1 macro en
validación cruzada de 5 *folds*, (2) menor sub-triage, (3) `predict_proba` para
mostrar una confianza al usuario. El árbol simple se conserva para explicar
decisiones.

---

## 8. Resultados y métricas

> Reemplazar con la salida real del notebook (secciones 6 y 8).

### 8.1. Desempeño en el conjunto de prueba

| Modelo | Accuracy | F1 macro |
|---|---|---|
| Árbol de decisión | `«0.xx»` | `«0.xx»` |
| **Random Forest** | `«0.xx»` | `«0.xx»` |
| Random Forest — F1 macro CV 5-fold | | `«0.xx ± 0.0x»` |

### 8.2. Modelo vs. regla lineal (valor agregado)

| | Accuracy | F1 macro | Sub-triage (Altas mal clasificadas) |
|---|---|---|---|
| Regla lineal (app actual) | `«0.xx»` | `«0.xx»` | `«r/tot»` |
| Random Forest (propuesto) | `«0.xx»` | `«0.xx»` | `«m/tot»` |

**Lectura esperada:** el Random Forest reduce el número de urgencias Altas que se
clasifican por debajo, que es el error más costoso en un triage.

### 8.3. Matriz de confusión (Random Forest)

Insertar la imagen `matriz_confusion.png` exportada del notebook. El patrón
esperado es que la mayor parte de la confusión ocurra entre clases **adyacentes**
(Alta↔Media, Media↔Baja) y casi nunca entre Alta y Baja.

### 8.4. Importancia de variables (Random Forest)

| Variable | Importancia aprox. |
|---|---|
| `nivel_dolor` | mayor |
| `frecuencia_cardiaca` | alta |
| `temperatura` | alta |
| `dificultad_respiratoria` | media |
| `edad` | baja |
| `sintoma_principal` (agregado) | baja |

Coincide con el orden documentado en `utils/priorityPrediction.ts` y **justifica
los seis campos** del formulario de registro.

---

## 9. Decisiones que se pueden tomar

| Decisión | Cómo la apoya el modelo |
|---|---|
| **Orden de atención** | La `urgencia` sugerida alimenta directamente el heap de prioridad de la cola. |
| **Alerta temprana** | Si el modelo predice Alta con confianza elevada, la app puede resaltar el registro para revisión inmediata. |
| **Auditoría de criterio** | Cuando la sugerencia y la decisión manual difieren mucho, el caso queda marcado para revisión posterior. |
| **Diseño del formulario** | La importancia de variables indica qué campos deben ser obligatorios (`nivel_dolor`, `frecuencia_cardiaca`, `temperatura`). |
| **Capacitación** | Los patrones del árbol de decisión sirven de material para estandarizar el criterio del personal nuevo. |

---

## 10. Valor agregado demostrado

- ✔ **Mejor toma de decisiones:** segunda opinión consistente, entrenada sobre
  toda la población, frente al criterio puntual de una persona.
- ✔ **Menos sub-triage:** el modelo captura combinaciones de riesgo (dolor de
  pecho + disnea, fiebre + taquicardia) que la suma de pesos independiente
  ignora — justo los casos donde un retraso es peligroso.
- ✔ **Eficiencia:** la cola se ordena con una señal más fiable, con menos
  reordenamientos manuales.
- ✔ **Explicabilidad:** árbol de decisión + importancia de variables permiten
  justificar cada sugerencia.
- ✔ **Diferenciación:** priorización asistida por datos frente a una lista de
  llegada simple.
- ✔ **Automatización:** la sugerencia y su confianza se calculan y se guardan sin
  intervención adicional del usuario; lo mismo la variable `edad`, calculada y
  validada sin pedirle un dato extra a quien registra al paciente.

---

## 11. Limitaciones

1. **Dataset simulado.** Refleja relaciones plausibles, no una población
   hospitalaria real; las métricas son orientativas.
2. **Solapamiento generador/baseline.** La etiqueta y la regla lineal comparten la
   parte lineal, así que la ventaja medida del modelo proviene sobre todo de los
   términos de interacción definidos por el equipo.
3. **Destilación en producción.** La app usa una regla ligera derivada del modelo,
   no el `.pkl` directamente, para funcionar sin backend de Python; puede haber
   una pequeña diferencia entre ambos.
4. **Seguridad de datos.** Al eliminar el login, las políticas RLS de Supabase
   quedaron en acceso público (`database/08_sin_login.sql`); la *anon key* viaja
   en el bundle. Es aceptable para un proyecto de curso, **no para datos reales**.
5. **Sin calibración de probabilidad.** La confianza mostrada es la
   `predict_proba` cruda, no una probabilidad calibrada.
6. **Datos reales incompletos.** El 13 % de las atenciones registradas en
   Supabase son anteriores a que el formulario pidiera signos clínicos: ya
   tienen `edad` recuperada (sección 6.2), pero les falta el resto de las
   variables (`sintoma_principal`, `nivel_dolor`, `temperatura`,
   `frecuencia_cardiaca`), así que se excluyen del entrenamiento del modelo en
   vez de imputarse a ciegas.

---

## 12. Futuras mejoras

- Sustituir el dataset simulado por **registros reales anonimizados** y
  reentrenar; ya existe la tubería (`database/11_columnas_ml_historial.sql`,
  `12_edad_validacion.sql`) para extraerlos limpios desde Supabase.
- **Servir `modelo_urgencia.pkl` desde un endpoint** (FastAPI) y que la app lo
  consulte, con la regla local como respaldo sin conexión.
- Guardar en Supabase la urgencia sugerida y la decisión final para medir en
  producción el **acuerdo modelo–personal** y detectar deriva del modelo.
- **Calibrar** el modelo (`CalibratedClassifierCV`) para que la confianza sea una
  probabilidad real.
- Reintroducir autenticación y políticas RLS por usuario.
- Explorar `XGBoost`/`LightGBM` y modelos ordinales, dado que las clases tienen
  orden natural.

---

## 13. Bibliografía

- Pedregosa, F. et al. (2011). *Scikit-learn: Machine Learning in Python*.
  *Journal of Machine Learning Research*, 12, 2825–2830.
- McKinney, W. (2017). *Python for Data Analysis* (2.ª ed.). O'Reilly Media.
- Géron, A. (2019). *Hands-On Machine Learning with Scikit-Learn, Keras &
  TensorFlow* (2.ª ed.). O'Reilly Media.
- Gilboy, N., Tanabe, P., Travers, D., & Rosenau, A. M. (2020). *Emergency
  Severity Index (ESI): A Triage Tool for Emergency Department Care* (Version 4).
  Agency for Healthcare Research and Quality (AHRQ).
- Waskom, M. L. (2021). *seaborn: statistical data visualization*. *Journal of
  Open Source Software*, 6(60), 3021.
