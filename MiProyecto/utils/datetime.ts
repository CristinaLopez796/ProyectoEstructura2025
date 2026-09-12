export function formatDateTime(ts: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(ts);
  } catch {
    const d = new Date(ts);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

export function formatDateISOToPretty(iso: string) {
  // cambio de año-mes-dia por dia-mes-año
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Edad en años a partir de una fecha "DD/MM/AAAA".
 * Devuelve null si la cadena no tiene ese formato o la fecha no existe.
 *
 * Vive aqui, y no dentro del formulario, porque tambien la necesita
 * patientRepository para llenar la columna `edad` de appointment_history
 * (el dataset de Ciencia de Datos la usa como variable).
 */
export function edadDesdeFecha(fecha: string): number | null {
  const texto = (fecha ?? "").trim();

  // Se aceptan los dos formatos que conviven en la base: "DD/MM/AAAA" (lo que
  // escribe el formulario) y "AAAA-MM-DD" (filas insertadas por SQL). Sin esto
  // la edad salia null para la mitad de los pacientes.
  let dia: number, mes: number, anio: number;

  const latino = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);

  if (latino) {
    dia = Number(latino[1]);
    mes = Number(latino[2]);
    anio = Number(latino[3]);
  } else if (iso) {
    anio = Number(iso[1]);
    mes = Number(iso[2]);
    dia = Number(iso[3]);
  } else {
    return null;
  }

  const nacimiento = new Date(anio, mes - 1, dia);
  // Rechaza fechas que el constructor "corrige" sola (31/02 -> 03/03).
  if (
    nacimiento.getDate() !== dia ||
    nacimiento.getMonth() !== mes - 1 ||
    nacimiento.getFullYear() !== anio
  ) {
    return null;
  }

  const hoy = new Date();
  let edad = hoy.getFullYear() - anio;
  // Resta un año si todavia no ha llegado el cumpleaños.
  const yaCumplio =
    hoy.getMonth() > mes - 1 || (hoy.getMonth() === mes - 1 && hoy.getDate() >= dia);
  if (!yaCumplio) edad -= 1;

  return edad >= 0 ? edad : null;
}
