import React from "react";
import { View, Text, FlatList, StyleSheet, Button } from "react-native";
import { Patient } from "../models/Patient";

export type HistoryItem = {
  paciente: Patient;
  atendidoEn: number;
};

export default function HistoryScreen({
  items,
  onUndo,
  canUndo,
}: {
  items: HistoryItem[];
  onUndo?: () => void;
  canUndo?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Atendidos: {items.length}</Text>
        {onUndo && (
          <Button title="Deshacer último" onPress={onUndo} disabled={!canUndo} />
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => `${it.paciente.id}-${it.atendidoEn}`}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: "#666" }}>Aún no hay pacientes atendidos.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const dt = new Date(item.atendidoEn).toLocaleString();
          return (
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.name}>{item.paciente.nombre}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>P{item.paciente.urgencia}</Text>
                </View>
              </View>
              <Text style={styles.meta}>Expediente: {item.paciente.expediente}</Text>
              <Text style={styles.meta}>Atendido: {dt}</Text>
              <Text style={{ marginTop: 6 }}>Síntomas: {item.paciente.sintomas}</Text>
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  topBarTitle: { fontSize: 16, fontWeight: "600" },
  empty: { padding: 20, alignItems: "center" },
  card: {
    padding: 14, marginHorizontal: 6, marginVertical: 6,
    backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#eee",
    shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8, elevation: 2,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontWeight: "600", fontSize: 16 },
  meta: { color: "#555", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, backgroundColor: "#eaeaea" },
  badgeText: { color: "#0a0a0a", fontWeight: "600" },
});
