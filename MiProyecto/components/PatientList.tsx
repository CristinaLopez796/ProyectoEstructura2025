import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, Button, TextInput, Pressable, } from "react-native";
import { Patient } from "../models/Patient";
import { COLORS } from "../theme/colors";
import { formatDateISOToPretty, formatDateTime } from "../utils/datetime";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  patients: Patient[];
  onServeNext?: () => void;
  onSelect?: (p: Patient) => void;
}

function prioridadLabel(p: 1 | 2 | 3) {
  if (p === 1) return "Alta";
  if (p === 2) return "Media";
  return "Baja";
}
function prioridadColor(p: 1 | 2 | 3) {
  if (p === 1) return COLORS.priority.p1;
  if (p === 2) return COLORS.priority.p2;
  return COLORS.priority.p3;
}

export default function PatientList({ patients, onServeNext, onSelect }: Props) {
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    return [...patients].sort((a, b) => {
      if (a.urgencia !== b.urgencia) return a.urgencia - b.urgencia;
      const qa = a.queuedAt ?? 0;
      const qb = b.queuedAt ?? 0;
      return qa - qb;
    });
  }, [patients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [sorted, query]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Top con CTA */}
      <View style={styles.topCard}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="list-outline" size={22} color={COLORS.tabActive} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.topTitle}>Lista de espera</Text>
            <Text style={styles.topSub}>En espera: {filtered.length}</Text>
          </View>
        </View>
        {onServeNext && (
          <Pressable onPress={onServeNext} style={styles.primaryBtn}>
            <Ionicons name="play-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>Atender</Text>
          </Pressable>
        )}
      </View>

      {/* Search */}
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
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={22} color={COLORS.textMuted} />
            <Text style={{ color: COLORS.textMuted, marginTop: 8 }}>
              {query ? "No hay resultados para la búsqueda." : "No hay pacientes en espera."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onSelect?.(item)}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>{item.nombre}</Text>
              <View style={[styles.badge, { backgroundColor: prioridadColor(item.urgencia) }]}>
                <Ionicons
                  name={item.urgencia === 1 ? "alert" : item.urgencia === 2 ? "warning-outline" : "leaf-outline"}
                  size={12}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.badgeText}>{prioridadLabel(item.urgencia)}</Text>
              </View>
            </View>

            <Text style={styles.meta}>Expediente: {item.expediente}</Text>
            {!!item.fechaNacimiento && (
              <Text style={styles.meta}>Nacimiento: {formatDateISOToPretty(item.fechaNacimiento)}</Text>
            )}
            {!!item.queuedAt && <Text style={styles.meta}>Registrado: {formatDateTime(item.queuedAt)}</Text>}
            <Text style={{ marginTop: 6, color: COLORS.text }}>Síntomas: {item.sintomas}</Text>
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topCard: {
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: { fontWeight: "800", fontSize: 16, color: COLORS.text },
  topSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

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

  primaryBtn: {
    backgroundColor: COLORS.tabActive,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
});
