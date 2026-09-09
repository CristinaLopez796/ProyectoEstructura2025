/**
 * Predicción de prioridad (urgencia) — Componente de Ciencia de Datos de SmartTriage
 * ---------------------------------------------------------------------------------
 * Este archivo NO reemplaza el modelo entrenado (Random Forest / Decision Tree que
 * viven en notebook/SmartTriage_CienciaDeDatos.ipynb y notebook/modelo_urgencia.pkl).
 * Es una versión simplificada, ejecutable en el dispositivo (sin backend adicional),
 * derivada de la importancia de variables que arrojó el modelo real:
 *
 *   nivel_dolor              0.2955   (la más importante)
 *   dificultad_respiratoria  0.1795
 *   frecuencia_cardiaca      0.1696
 *   temperatura              0.1619
 *   edad                     0.1191
 *   sintoma_principal        0.0743
 *
 * Por qué esta decisión: dado el plazo de entrega, desplegar y mantener un backend
 * (FastAPI + modelo .pkl) agrega una pieza de infraestructura adicional a mantener.
 * Ejecutar la regla en el cliente permite mostrar la sugerencia de inmediato y sin
 * dependencias nuevas. Queda documentado en el informe (sección "Limitaciones") como
 * una aproximación: para producción real se recomienda servir el modelo completo
 * desde un endpoint (ver README, sección "Cómo evolucionar esto a producción").
 *
 * La predicción es siempre una SUGERENCIA: el usuario conserva el control total y
 * puede aceptarla o cambiarla al elegir la urgencia manualmente.
 */

export type SintomaPrincipal =
  | "dolor_pecho"
  | "fiebre"
  | "fractura"
  | "dificultad_respiratoria"
  | "dolor_abdominal"
  | "herida"
  | "mareo"
  | "otro";

export const SINTOMAS_PRINCIPALES: { value: SintomaPrincipal; label: string }[] = [
  { value: "dolor_pecho", label: "Dolor de pecho" },
  { value: "dificultad_respiratoria", label: "Dificultad respiratoria" },
  { value: "fractura", label: "Fractura / trauma" },
  { value: "dolor_abdominal", label: "Dolor abdominal" },
  { value: "mareo", label: "Mareo / desmayo" },
  { value: "fiebre", label: "Fiebre" },
  { value: "herida", label: "Herida / sangrado" },
  { value: "otro", label: "Otro" },
];

// Peso de riesgo por síntoma, igual al usado para generar el dataset de entrenamiento
// (data/generar_dataset.py) — mantiene consistencia entre el dataset y esta regla.
const PESO_SINTOMA: Record<SintomaPrincipal, number> = {
  dolor_pecho: 0.95,
  dificultad_respiratoria: 0.9,
  fractura: 0.55,
  dolor_abdominal: 0.45,
  mareo: 0.4,
  herida: 0.3,
  fiebre: 0.35,
  otro: 0.25,
};

export interface DatosClinicosPaciente {
  edad: number; // años
  sintomaPrincipal: SintomaPrincipal;
  nivelDolor: 1 | 2 | 3; // 1 bajo, 2 medio, 3 alto
  dificultadRespiratoria: boolean;
  temperatura: number; // °C
  frecuenciaCardiaca: number; // lpm
}

export interface PrediccionUrgencia {
  urgencia: 1 | 2 | 3;
  confianza: number; // 0-1, qué tan lejos del umbral está el score (heurístico)
  score: number;
  explicacion: string[];
}

/**
 * Calcula un score de riesgo 0-1.4 con la misma fórmula usada para generar el
 * dataset simulado, y lo traduce a una categoría de urgencia (1/2/3).
 */
export function predecirUrgencia(datos: DatosClinicosPaciente): PrediccionUrgencia {
  const {
    edad,
    sintomaPrincipal,
    nivelDolor,
    dificultadRespiratoria,
    temperatura,
    frecuenciaCardiaca,
  } = datos;

  const explicacion: string[] = [];

  let score = 0;

  const aporteDolor = ((nivelDolor - 1) / 2) * 0.3;
  score += aporteDolor;
  if (nivelDolor === 3) explicacion.push("Nivel de dolor alto");

  const aporteTemp = clamp01((temperatura - 36.5) / 4) * 0.2;
  score += aporteTemp;
  if (temperatura >= 38.5) explicacion.push(`Temperatura elevada (${temperatura.toFixed(1)}°C)`);

  const aporteFc = clamp01((frecuenciaCardiaca - 70) / 80) * 0.15;
  score += aporteFc;
  if (frecuenciaCardiaca >= 110) explicacion.push(`Frecuencia cardíaca elevada (${frecuenciaCardiaca} lpm)`);

  const aporteDisnea = (dificultadRespiratoria ? 1 : 0) * 0.2;
  score += aporteDisnea;
  if (dificultadRespiratoria) explicacion.push("Presenta dificultad respiratoria");

  const aporteSintoma = (PESO_SINTOMA[sintomaPrincipal] ?? 0.25) * 0.1;
  score += aporteSintoma;

  const aporteEdad = clamp01((edad - 60) / 40) * 0.05;
  score += aporteEdad;
  if (edad >= 65) explicacion.push("Paciente adulto mayor");

  let urgencia: 1 | 2 | 3;
  let distanciaUmbral: number;
  if (score >= 0.62) {
    urgencia = 1;
    distanciaUmbral = score - 0.62;
  } else if (score >= 0.35) {
    urgencia = 2;
    distanciaUmbral = Math.min(score - 0.35, 0.62 - score);
  } else {
    urgencia = 3;
    distanciaUmbral = 0.35 - score;
  }

  // Heurístico simple de confianza: más lejos del umbral de decisión -> más confianza.
  const confianza = round(0.55 + clamp01(distanciaUmbral / 0.3) * 0.4, 3);

  if (explicacion.length === 0) explicacion.push("Signos vitales y síntomas dentro de rangos leves");

  return { urgencia, confianza, score: round(score, 3), explicacion };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function round(x: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(x * f) / f;
}
