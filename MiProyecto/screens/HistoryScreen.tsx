import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, Button, TextInput } from "react-native";
import { Patient } from "../models/Patient";

export type HistoryItem = {
  paciente: Patient;
  atendidoEn: number;
  waitedMs?: number; //  agregado tiempo de espera (ms) desde el registro hasta la atención
};

function fmtMs(ms?: number) {
  if (!ms || !isFinite(ms) || ms <= 0) return "0m";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function HistoryScreen({
  items,
  onUndo,
  canUndo,
}: {
  items: HistoryItem[];
  onUndo?: () => void;
  canUndo?: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.paciente.nombre.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Atendidos: {filtered.length}</Text>
        {onUndo && <Button title="Deshacer último" onPress={onUndo} disabled={!canUndo} />}
      </View>

      <View style={styles.searchBox}>
        <TextInput
          placeholder="Buscar por nombre..."
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(it) => `${it.paciente.id}-${it.atendidoEn}`}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: "#666" }}>
              {query ? "No hay resultados para la búsqueda." : "Aún no hay pacientes atendidos."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const dt = new Date(item.atendidoEn).toLocaleString();
          return (
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.name}>{item.paciente.nombre}</Text>
                <Text style={styles.badge}>P{item.paciente.urgencia}</Text>
              </View>

              <Text style={styles.meta}>Expediente: {item.paciente.expediente}</Text>
              <Text style={styles.meta}>Atendido: {dt}</Text>
              {/*  mostrado solo si existe waitedMs */}
              {typeof item.waitedMs === "number" && (
                <Text style={styles.meta}>Espera aprox.: {fmtMs(item.waitedMs)}</Text>
              )}

              <Text style={{ marginTop: 6 }}>Síntomas: {item.paciente.sintomas}</Text>
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  topBarTitle: { fontSize: 16, fontWeight: "600" },
  searchBox: { paddingHorizontal: 12, paddingBottom: 6 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
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
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#eaeaea"
  },
  badgeText: { color: "#0a0a0a", fontWeight: "600" },
});
