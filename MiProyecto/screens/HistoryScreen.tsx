import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, Pressable } from "react-native";
import { Patient } from "../models/Patient";
import { COLORS } from "../theme/colors";
import { formatDateTime } from "../utils/datetime";
import { Ionicons } from "@expo/vector-icons";

export type HistoryItem = {
  paciente: Patient;
  atendidoEn: number;
  waitedMs?: number;
};

function fmtMs(ms?: number) {
  if (!ms || !isFinite(ms) || ms <= 0) return "0m";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function prioridadColor(p: 1 | 2 | 3) {
  if (p === 1) return COLORS.priority.p1;
  if (p === 2) return COLORS.priority.p2;
  return COLORS.priority.p3;
}
function prioridadLabel(p: 1 | 2 | 3) {
  return p === 1 ? "Alta (1)" : p === 2 ? "Media (2)" : "Baja (3)";
}

export default function HistoryScreen({
  items, onUndo, canUndo, onSelect,
}: {
  items: HistoryItem[];
  onUndo?: () => void;
  canUndo?: boolean;
  onSelect?: (p: Patient, index: number) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.paciente.nombre.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header / métricas */}
      <View style={styles.headerCard}>
        <Ionicons name="time-outline" size={24} color={COLORS.tabActive} />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.headerTitle}>Historial de atenciones</Text>
          <Text style={styles.headerSub}>Total atendidos: {filtered.length}</Text>
        </View>

        {!!onUndo && (
          <Pressable
            onPress={onUndo}
            disabled={!canUndo}
            style={[styles.undoBtn, !canUndo && { opacity: 0.5 }]}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-undo-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.undoBtnText}>Deshacer</Text>
          </Pressable>
        )}
      </View>

      {/* Buscador */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Buscar por nombre..."
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(it) => `${it.paciente.id}-${it.atendidoEn}`}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={22} color={COLORS.textMuted} />
            <Text style={{ color: COLORS.textMuted, marginTop: 8 }}>
              {query ? "No hay resultados para la búsqueda." : "Aún no hay pacientes atendidos."}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const dt = formatDateTime(item.atendidoEn);
          const p = item.paciente;
          return (
            <Pressable style={styles.card} onPress={() => onSelect?.(p, index)}>
              <View style={styles.headerRow}>
                <Text style={styles.name}>{p.nombre}</Text>
                <View style={[styles.badge, { backgroundColor: prioridadColor(p.urgencia) }]}>
                  <Ionicons
                    name={p.urgencia === 1 ? "alert" : p.urgencia === 2 ? "warning-outline" : "leaf-outline"}
                    size={12}
                    color="#fff"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.badgeText}>{prioridadLabel(p.urgencia)}</Text>
                </View>
              </View>

              <Text style={styles.meta}>Expediente: {p.expediente}</Text>
              <Text style={styles.meta}>Atendido: {dt}</Text>
              {typeof item.waitedMs === "number" && (
                <Text style={styles.meta}>Espera aprox.: {fmtMs(item.waitedMs)}</Text>
              )}
              <Text style={{ marginTop: 6, color: COLORS.text }}>Síntomas: {p.sintomas}</Text>
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  headerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  undoBtn: {
    marginLeft: "auto",
    backgroundColor: COLORS.tabActive,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },
  undoBtnText: { color: "#fff", fontWeight: "800" },

  searchBox: {
    marginHorizontal: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: { flex: 1, color: COLORS.text },

  empty: { padding: 28, alignItems: "center" },

  card: {
    padding: 14,
    marginHorizontal: 10,
    marginVertical: 6,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontWeight: "700", fontSize: 16, color: COLORS.text },
  meta: { color: COLORS.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, flexDirection: "row", alignItems: "center" },
  badgeText: { color: "#fff", fontWeight: "800" },
});
