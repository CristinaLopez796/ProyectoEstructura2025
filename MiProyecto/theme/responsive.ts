// theme/responsive.ts
// Sistema responsive de la app: puntos de corte, hook de dimensiones y helpers
// para elegir un valor distinto según el ancho de la ventana.
//
// Funciona igual en móvil (Expo Go / build nativa) y en web (expo start --web),
// porque todo se basa en useWindowDimensions(), que se actualiza al rotar el
// dispositivo o al redimensionar la ventana del navegador.

import { useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";

/** Anchos (en dp/px) a partir de los cuales cambia el layout. */
export const BREAKPOINTS = {
  xs: 0, // teléfono en vertical
  sm: 480, // teléfono grande / vertical amplio
  md: 768, // tablet vertical
  lg: 1024, // tablet horizontal / laptop
  xl: 1440, // escritorio amplio
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

const ORDER: Breakpoint[] = ["xs", "sm", "md", "lg", "xl"];

/** Devuelve el breakpoint activo para un ancho dado. */
export function breakpointForWidth(width: number): Breakpoint {
  let active: Breakpoint = "xs";
  for (const bp of ORDER) {
    if (width >= BREAKPOINTS[bp]) active = bp;
  }
  return active;
}

/**
 * Valores por breakpoint. Solo hace falta declarar los que cambian:
 * se hereda el del breakpoint anterior (mobile-first).
 * Ej: pick({ xs: 1, md: 2, lg: 3 }, "sm") -> 1
 */
export type ResponsiveValue<T> = { xs: T } & Partial<Record<Breakpoint, T>>;

export function pick<T>(values: ResponsiveValue<T>, bp: Breakpoint): T {
  let result = values.xs;
  for (const key of ORDER) {
    if (values[key] !== undefined) result = values[key] as T;
    if (key === bp) break;
  }
  return result;
}

export type Responsive = {
  width: number;
  height: number;
  bp: Breakpoint;
  isLandscape: boolean;
  /** < 768: teléfono */
  isPhone: boolean;
  /** 768 - 1023: tablet */
  isTablet: boolean;
  /** >= 1024: laptop / escritorio */
  isDesktop: boolean;
  /** >= 768: hay espacio para layouts de varias columnas */
  isWide: boolean;
  /** Corriendo en navegador */
  isWeb: boolean;
  /** Columnas recomendadas para rejillas de tarjetas */
  columns: number;
  /** Ancho máximo del contenido para no estirarlo en pantallas grandes */
  maxContentWidth: number;
  /** Padding horizontal exterior */
  gutter: number;
  /** Separación entre tarjetas de una rejilla */
  gap: number;
  /** Tamaños de fuente adaptados */
  font: { title: number; subtitle: number; body: number; small: number };
  /** Atajo para elegir valores por breakpoint sin repetir el bp */
  pick: <T>(values: ResponsiveValue<T>) => T;
};

/**
 * Hook principal. Se vuelve a evaluar automáticamente al rotar la pantalla
 * o al redimensionar la ventana del navegador.
 */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const bp = breakpointForWidth(width);
    const isPhone = width < BREAKPOINTS.md;
    const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
    const isDesktop = width >= BREAKPOINTS.lg;

    const p = <T,>(values: ResponsiveValue<T>) => pick(values, bp);

    return {
      width,
      height,
      bp,
      isLandscape: width > height,
      isPhone,
      isTablet,
      isDesktop,
      isWide: width >= BREAKPOINTS.md,
      isWeb: Platform.OS === "web",
      columns: p({ xs: 1, md: 2, lg: 2, xl: 3 }),
      maxContentWidth: p({ xs: 9999, md: 760, lg: 1040, xl: 1280 }),
      gutter: p({ xs: 12, sm: 14, md: 20, lg: 28, xl: 32 }),
      gap: p({ xs: 12, md: 14, lg: 16 }),
      font: {
        title: p({ xs: 16, md: 18, lg: 20 }),
        subtitle: p({ xs: 14, md: 15, lg: 16 }),
        body: p({ xs: 14, md: 15, lg: 15 }),
        small: p({ xs: 12, md: 12, lg: 13 }),
      },
      pick: p,
    };
  }, [width, height]);
}
