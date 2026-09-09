import { SintomaPrincipal } from "../utils/priorityPrediction";

export interface Patient {
  id: string;
  nombre: string;
  fechaNacimiento: string;
  sintomas: string;
  urgencia: 1 | 2 | 3; // 1: alta, 2: media, 3: baja

  // --- Campos del componente de Ciencia de Datos (dataset / predicción) ---
  // Todos opcionales para no romper registros/pantallas existentes.
  sintomaPrincipal?: SintomaPrincipal;
  nivelDolor?: 1 | 2 | 3;
  dificultadRespiratoria?: boolean;
  temperatura?: number;
  frecuenciaCardiaca?: number;

  /** Prioridad sugerida por el modelo de Ciencia de Datos (apoyo, no reemplazo). */
  prediccionUrgencia?: 1 | 2 | 3;
  /** Confianza heurística de la predicción (0-1). */
  prediccionConfianza?: number;

  expediente: string;

  /** Timestamp de registro (ms). Opcional para compatibilidad con datos previos */
  queuedAt?: number;
}
