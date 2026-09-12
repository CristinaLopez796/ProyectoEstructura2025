# Presentación final · SmartTriage — Componente de Ciencia de Datos

**Duración objetivo:** 10–12 min · **Formato sugerido:** 12 diapositivas ·
~50 s por diapositiva + 2 min de demo.

> Guion pensado para 2–3 personas. Cada diapositiva lleva *qué se ve* y *qué se
> dice*. Exporta las figuras del notebook (matriz de confusión, importancia de
> variables, EDA) para pegarlas.

---

## 1 · Portada (20 s)

**Se ve:** nombre del proyecto, equipo, curso, docente.
**Se dice:** "SmartTriage es una app de cola de emergencias; le agregamos un
modelo que sugiere el nivel de urgencia."

## 2 · El proyecto original (45 s)

**Se ve:** captura de la app (lista de espera) + esquema del heap.
**Se dice:** qué hace la app, que el orden de atención lo decide una cola de
prioridad sobre un heap, y que la urgencia hoy se asigna a mano.

## 3 · El problema (60 s)

**Se ve:** dos cajas — *Sub-triage* (grave marcado leve → espera de más) y
*Sobre-triage* (leve marcado grave → satura la cola).
**Se dice:** el criterio manual varía por experiencia y fatiga; el sub-triage es
el error más caro. Pregunta: ¿podemos estimar la urgencia de forma consistente
con pocos signos objetivos?

## 4 · La solución de Ciencia de Datos (45 s)

**Se ve:** diagrama `6 signos clínicos → modelo → urgencia sugerida + confianza →
heap`.
**Se dice:** clasificación supervisada de 3 clases; la sugerencia es de apoyo, el
personal siempre confirma.

## 5 · Dataset (60 s)

**Se ve:** tabla del diccionario de datos + nota "simulado, n = 1500".
**Se dice:** por qué simulado (datos de salud sensibles), cómo se genera la
etiqueta (regla lineal + interacciones de riesgo + ruido), y que la misma lógica
está en `data/generar_dataset.py`. Mencionar que además hay un dataset real
(pequeño) en Supabase, con las mismas columnas.

## 6 · ETL y limpieza (60 s)

**Se ve:** tabla "problema introducido → corrección" (nulos, temperatura 3.75,
FC 0, categoría `"  Dolor_Pecho "`, duplicados) + el hallazgo real de `edad`.
**Se dice:** se ensucia el dataset simulado a propósito y se limpia paso a paso;
imputación con mediana, validación de rangos fisiológicos. En los datos reales,
se valida `edad` contra `patient_birthday` calculando la edad al momento de la
atención (no la de hoy): 129 de 148 registros (87 %) ya la traían, y los 19
restantes (13 %, anteriores a la funcionalidad) se recalcularon y se
recuperaron los 19 sin excepción — 100 % completo en esa variable. Esas mismas
19 filas, eso sí, no tienen ningún otro signo clínico, así que igual quedan
fuera del entrenamiento del modelo.

## 7 · EDA — hallazgos (60 s)

**Se ve:** 2 figuras — distribución de urgencia + boxplots de temperatura/FC por
urgencia.
**Se dice:** clase Alta minoritaria (se usa `class_weight='balanced'`);
temperatura y FC suben claramente con la gravedad; dolor de pecho y disnea
concentran las Altas.

## 8 · Modelos (45 s)

**Se ve:** tabla Árbol de decisión vs Random Forest + mención del baseline
(regla lineal de la app).
**Se dice:** Pipeline con One-Hot; partición estratificada 75/25; se compara
contra la regla que la app ya usa para medir el valor agregado.

## 9 · Resultados (75 s)

**Se ve:** matriz de confusión del Random Forest + tabla de métricas
(accuracy, F1 macro, CV).
**Se dice:** F1 macro ≈ `«0.xx»`; la confusión ocurre entre clases adyacentes,
casi nunca Alta↔Baja.

## 10 · Valor agregado (60 s)

**Se ve:** tabla modelo vs regla lineal, con la columna **sub-triage** resaltada
+ figura de importancia de variables.
**Se dice:** el modelo baja el sub-triage porque capta combinaciones
(pecho+disnea, fiebre+taquicardia) que la suma de pesos ignora. La importancia de
variables justifica los 6 campos del formulario.

## 11 · Demo (2 min)

**Se ve:** la app en vivo.
**Se hace:**
1. Registrar un paciente con signos graves → aparece "Prioridad sugerida: Alta"
   con su confianza.
2. Mostrar el botón "Usar esta sugerencia" y que el personal puede cambiarla.
3. Ver el paciente encabezando la lista de espera.
4. (Opcional) notebook en Colab: celda de predicción de un paciente.

## 12 · Conclusiones y recomendaciones (45 s)

**Se dice:**
- Un modelo sencillo sobre 6 variables ordena la cola mejor que la regla lineal,
  sobre todo bajando el sub-triage.
- Limitaciones: dataset simulado, RLS en acceso público, sin calibración, 13 %
  de datos históricos sin signos clínicos.
- Siguiente paso: datos reales anonimizados + servir el modelo desde un endpoint
  y medir el acuerdo modelo–personal en producción.

---

## Respuestas a las preguntas guía de la rúbrica

1. **¿Qué decisión permite el modelo?** El orden de atención de la cola y la
   alerta temprana de casos graves.
2. **¿Qué valor agrega sobre el proyecto original?** Sustituye una asignación
   manual variable por una sugerencia consistente que reduce el sub-triage.
3. **¿Está fundamentada la selección del modelo?** Sí: Random Forest gana en F1
   macro (CV 5-fold), reduce el sub-triage y ofrece `predict_proba`; el árbol
   simple se conserva para explicabilidad.
4. **¿Se puede escalar/mejorar?** Sí: datos reales, endpoint FastAPI, calibración,
   registro de acuerdo modelo–personal para monitoreo.
5. **¿Los resultados se comunican con claridad?** Matriz de confusión, F1 macro,
   comparación explícita contra el baseline y métrica de sub-triage.
