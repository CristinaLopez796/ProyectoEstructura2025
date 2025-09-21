import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { Patient } from "../models/Patient";


interface Props {
  patients: Patient[];
    onServeNext?: () => void;
}

function prioridadLabel(p: 1 | 2 | 3) {
  if (p === 1) return "Alta";
  if (p === 2) return "Media";
  return "Baja";
}

function prioridadColor(p: 1 | 2 | 3) {
  if (p === 1) return "#0E7490"; // turquesa oscuro
  if (p === 2) return "#A78BFA"; // lavanda
  return "#86EFAC";             // menta
}

export default function PatientList({ patients }: Props) {
  // Orden por prioridad (1->3) y, opcionalmente, podríamos luego desempatar por fecha.
  const sorted = [...patients].sort((a, b) => a.urgencia - b.urgencia);

  return (
    <FlatList
      data={sorted}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={{ color: "#666" }}>No hay pacientes en espera.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.name}>{item.nombre}</Text>
            <View style={[styles.badge, { backgroundColor: prioridadColor(item.urgencia) }]}>
              <Text style={styles.badgeText}>{prioridadLabel(item.urgencia)}</Text>
            </View>
          </View>
          <Text style={styles.meta}>Expediente: {item.expediente}</Text>
          {!!item.fechaNacimiento && (
            <Text style={styles.meta}>Nacimiento: {item.fechaNacimiento}</Text>
          )}
          <Text style={{ marginTop: 6 }}>Síntomas: {item.sintomas}</Text>
        </View>
      )}
      contentContainerStyle={{ paddingBottom: 40 }}
    />
  );
}

const styles = StyleSheet.create({
  empty: { padding: 20, alignItems: "center" },
  card: {
    padding: 14,
    marginHorizontal: 6,
    marginVertical: 6,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontWeight: "600", fontSize: 16 },
  meta: { color: "#555", marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: "#0a0a0a", fontWeight: "600" },
});
