// screens/SettingsScreen.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Switch, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ResponsiveScreen from "../components/ResponsiveScreen";
import { Palette } from "../theme/colors";
import { useResponsive } from "../theme/responsive";
import { useTheme } from "../theme/ThemeContext";

export default function SettingsScreen({
  isDark,
  onToggleDark,
  onLogout,
}: {
  isDark: boolean;
  onToggleDark: (value: boolean) => void;
  onLogout?: () => void;
}) {
  const r = useResponsive();
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);

  return (
    <ResponsiveScreen scroll maxWidth={r.pick({ xs: 9999, md: 640 })}>
      <Text style={[styles.sectionTitle, { fontSize: r.font.title }]}>Apariencia</Text>

      <View style={styles.row}>
        <View style={styles.rowLabel}>
          <Ionicons
            name={isDark ? "moon" : "moon-outline"}
            size={18}
            color={colors.tabActive}
          />
          <Text style={[styles.label, { fontSize: r.font.subtitle }]}>Modo oscuro</Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={onToggleDark}
          trackColor={{ false: colors.border, true: colors.tabActive }}
          thumbColor={Platform.OS === "android" ? "#fff" : undefined}
        />
      </View>

      <Text style={[styles.hint, { fontSize: r.font.small }]}>
        Cambia los colores de toda la app. La preferencia se guarda en Supabase,
        así que se mantiene aunque cierres y vuelvas a abrir.
      </Text>

      <Text style={[styles.sectionTitle, styles.sectionSpacing, { fontSize: r.font.title }]}>
        Diseño
      </Text>
      <View style={styles.row}>
        <View style={styles.rowLabel}>
          <Ionicons name="resize-outline" size={18} color={colors.tabActive} />
          <Text style={[styles.label, { fontSize: r.font.subtitle }]}>Tamaño de pantalla</Text>
        </View>
        <Text style={[styles.value, { fontSize: r.font.small }]}>
          {Math.round(r.width)} × {Math.round(r.height)} · {r.bp}
        </Text>
      </View>
      <Text style={[styles.hint, { fontSize: r.font.small }]}>
        La interfaz se adapta automáticamente:{" "}
        {r.isPhone ? "teléfono" : r.isTablet ? "tablet" : "escritorio"} ({r.columns}{" "}
        {r.columns === 1 ? "columna" : "columnas"} en las listas).
      </Text>

      {!!onLogout && (
        <>
          <Text style={[styles.sectionTitle, styles.sectionSpacing, { fontSize: r.font.title }]}>
            Cuenta
          </Text>
          <Pressable onPress={onLogout} style={styles.logoutBtn} accessibilityRole="button">
            <Ionicons name="log-out-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </>
      )}
    </ResponsiveScreen>
  );
}

const crearEstilos = (c: Palette) =>
  StyleSheet.create({
    sectionTitle: { fontWeight: "800", marginBottom: 10, color: c.text },
    sectionSpacing: { marginTop: 24 },
    row: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    rowLabel: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
    label: { fontWeight: "600", color: c.text },
    value: { color: c.textMuted, fontVariant: ["tabular-nums"] },
    hint: { marginTop: 10, color: c.textMuted },

    logoutBtn: {
      backgroundColor: c.danger,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
    },
    logoutText: { color: "#fff", fontWeight: "800" },
  });
