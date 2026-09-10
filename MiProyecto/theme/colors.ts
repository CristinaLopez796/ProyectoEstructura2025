// theme/colors.ts
// Dos paletas con las mismas claves. Los componentes piden los colores con
// useTheme() (ver theme/ThemeContext.tsx) y reciben una u otra segun el modo,
// por eso ninguna pantalla debe volver a escribir "#fff" a mano.

export type Palette = {
  bg: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;

  /** Fondo de inputs y chips sin seleccionar. */
  input: string;
  /** Fondo sutil para separadores y botones secundarios. */
  surface: string;

  tabActive: string;
  tabInactive: string;

  danger: string;
  dangerBg: string;
  dangerBorder: string;

  priority: { p1: string; p2: string; p3: string };

  /** Sombras: en oscuro se apagan casi por completo. */
  shadowOpacity: number;
};

export const LIGHT: Palette = {
  bg: "#F6F7FB",
  card: "#FFFFFF",
  border: "#EAECF0",
  text: "#0F172A",
  textMuted: "#667085",

  input: "#FFFFFF",
  surface: "#F1F5F9",

  tabActive: "#0EA5E9",
  tabInactive: "#94A3B8",

  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FECACA",

  priority: {
    p1: "#0284C7", // Alta (azul clínico)
    p2: "#8B5CF6", // Media (lavanda)
    p3: "#22C55E", // Baja (verde)
  },

  shadowOpacity: 0.06,
};

export const DARK: Palette = {
  bg: "#0B1220",
  card: "#151E30",
  border: "#26324A",
  text: "#E8EDF7",
  textMuted: "#94A3B8",

  input: "#1B2537",
  surface: "#1B2537",

  // Tonos mas claros que en modo claro: sobre fondo oscuro, los colores
  // saturados oscuros no alcanzan contraste suficiente para leerse.
  tabActive: "#38BDF8",
  tabInactive: "#64748B",

  danger: "#F87171",
  dangerBg: "#2A1416",
  dangerBorder: "#7F1D1D",

  priority: {
    p1: "#38BDF8",
    p2: "#A78BFA",
    p3: "#4ADE80",
  },

  shadowOpacity: 0,
};

/**
 * Compatibilidad: algun archivo puede seguir importando COLORS.
 * Apunta a la paleta clara; lo correcto es usar useTheme().
 */
export const COLORS = LIGHT;
