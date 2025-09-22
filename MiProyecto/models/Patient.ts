export interface Patient {
  id: string;
  nombre: string;
  fechaNacimiento: string;
  sintomas: string;
  urgencia: 1 | 2 | 3; // 1: alta, 2: media, 3: baja
  expediente: string;

    /** Timestamp de registro (ms). Opcional para compatibilidad con datos previos */
  queuedAt?: number;
}