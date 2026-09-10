// components/ResponsiveScreen.tsx
// Contenedor de pantalla que mantiene el fondo a todo lo ancho pero limita y
// centra el contenido, para que en tablet/escritorio no quede estirado.

import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StyleProp,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useResponsive } from "../theme/responsive";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  children: React.ReactNode;
  /** Envuelve el contenido en un ScrollView (para formularios y paneles). */
  scroll?: boolean;
  /** Centra verticalmente el contenido si sobra espacio (login, vacíos). */
  center?: boolean;
  /** Ancho máximo propio; por defecto usa el del breakpoint activo. */
  maxWidth?: number;
  /** Evita el teclado en iOS (útil en formularios). */
  avoidKeyboard?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
};

export default function ResponsiveScreen({
  children,
  scroll = false,
  center = false,
  maxWidth,
  avoidKeyboard = false,
  style,
  contentStyle,
  backgroundColor,
}: Props) {
  const r = useResponsive();
  const { colors } = useTheme();
  const limit = maxWidth ?? r.maxContentWidth;
  const fondo = backgroundColor ?? colors.bg;

  const inner = (
    <View
      style={[
        styles.inner,
        { maxWidth: limit, paddingHorizontal: r.gutter },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[
        styles.scrollContent,
        center && styles.centerContent,
        { paddingVertical: r.gutter },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={r.isWeb}
    >
      {inner}
    </ScrollView>
  ) : (
    <View style={[styles.fill, center && styles.centerContent]}>{inner}</View>
  );

  const root = (
    <View style={[styles.fill, { backgroundColor: fondo }, style]}>{body}</View>
  );

  if (!avoidKeyboard) return root;

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      {root}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  inner: { width: "100%", alignSelf: "center", flexGrow: 1 },
  scrollContent: { flexGrow: 1 },
  centerContent: { justifyContent: "center" },
});
