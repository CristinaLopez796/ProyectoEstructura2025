// screens/SettingsScreen.tsx
import React from "react";
import { View, Text, StyleSheet, Switch } from "react-native";

export default function SettingsScreen({
  isDark,
  onToggleDark,
}: {
  isDark: boolean;
  onToggleDark: (value: boolean) => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Apariencia</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Modo oscuro</Text>
        <Switch value={isDark} onValueChange={onToggleDark} />
      </View>

      <Text style={styles.hint}>
        (Beta) Cambia los colores de la navegación y fondos de pantalla.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontWeight: "800", fontSize: 16, marginBottom: 10 },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { fontSize: 15, fontWeight: "600" },
  hint: { marginTop: 10, color: "#6b7280", fontSize: 12 },
});
