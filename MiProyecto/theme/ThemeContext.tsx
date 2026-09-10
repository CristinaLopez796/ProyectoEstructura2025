// theme/ThemeContext.tsx
// Reparte la paleta activa a toda la app. Los componentes llaman useTheme()
// y reciben los colores del modo vigente, sin saber cual es.

import React, { createContext, useContext, useMemo } from "react";
import { StyleSheet } from "react-native";
import { DARK, LIGHT, Palette } from "./colors";

type ThemeValue = {
  colors: Palette;
  isDark: boolean;
};

// Por defecto claro: si algun componente quedara fuera del provider, seguiria
// pintando bien en vez de reventar.
const ThemeContext = createContext<ThemeValue>({ colors: LIGHT, isDark: false });

export function ThemeProvider({
  isDark,
  children,
}: {
  isDark: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo<ThemeValue>(
    () => ({ colors: isDark ? DARK : LIGHT, isDark }),
    [isDark]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

/**
 * Crea los estilos a partir de la paleta y los memoriza por paleta.
 *
 * StyleSheet.create() se ejecuta una sola vez al cargar el modulo, asi que no
 * sirve para colores que cambian. Con esto cada pantalla define sus estilos
 * como una funcion de la paleta y solo se recalculan cuando el modo cambia.
 *
 *   const styles = useThemedStyles(crearEstilos);
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: Palette) => T
): T {
  const { colors } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors, factory]);
}
