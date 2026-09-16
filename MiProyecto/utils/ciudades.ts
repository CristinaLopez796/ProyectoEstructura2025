// utils/ciudades.ts
// Ciudad de procedencia del paciente.
//
// Sirve para responder en Power BI de donde viene la demanda del hospital:
// que ciudad lo frecuenta mas y cuantos pacientes se atendieron de cada una
// por mes.
//
// El valor se guarda TAL CUAL se lee ("San Pedro Sula", no "san_pedro_sula"),
// a diferencia de sintoma_principal, que si usa slug. La razon es el destino:
// esta columna va directa al eje de una grafica de Power BI, y guardarla
// legible evita tener que mantener alli una tabla de traduccion. El CHECK de
// la columna solo admite estos textos exactos, asi que no se puede ensuciar
// desde la app.

// 'Otros' cubre a quien no viene de ninguna de las tres. Es un valor real, no
// un hueco: en Power BI 'Otros' significa "se pregunto y no es de aqui",
// mientras que NULL significa "no se capturo". Mezclarlos borraria esa
// diferencia, que es justamente la que distingue un dato ausente de uno
// presente.
export const CIUDADES = ['San Pedro Sula', 'Choloma', 'La Lima', 'Otros'] as const;

export type Ciudad = (typeof CIUDADES)[number];

/** Valor para pacientes de fuera del area de las tres ciudades. */
export const CIUDAD_OTROS: Ciudad = 'Otros';

/** Opciones para pintar el selector del formulario. */
export const OPCIONES_CIUDAD: { value: Ciudad; label: string }[] = CIUDADES.map((c) => ({
  value: c,
  label: c,
}));

/**
 * Valida lo que viene de la base. Devuelve undefined si la fila no tiene
 * ciudad (todas las anteriores a esta columna) o si trae un texto que ya no
 * esta en el catalogo, para que la app no muestre basura.
 */
export function ciudadValida(valor: unknown): Ciudad | undefined {
  return typeof valor === 'string' && (CIUDADES as readonly string[]).includes(valor)
    ? (valor as Ciudad)
    : undefined;
}
