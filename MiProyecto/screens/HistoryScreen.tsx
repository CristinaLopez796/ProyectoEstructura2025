import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, Pressable } from "react-native";
import { Patient } from "../models/Patient";
import { Palette } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { useResponsive } from "../theme/responsive";
import { formatDateTime } from "../utils/datetime";
import { Ionicons } from "@expo/vector-icons";

export type HistoryItem = {
  /** id de la fila en appointment_history. Necesario para poder deshacer. */
  id?: string;
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

function prioridadColor(p: 1 | 2 | 3, colors: Palette) {
  if (p === 1) return colors.priority.p1;
  if (p === 2) return colors.priority.p2;
  return colors.priority.p3;
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
  const r = useResponsive();
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);
  const [query, setQuery] = useState("");
  const columns = r.columns;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.paciente.nombre.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        // Se fuerza el remontaje al cambiar el número de columnas.
        key={`cols-${columns}`}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: r.gap } : undefined}
        data={filtered}
        keyExtractor={(it) => `${it.paciente.id}-${it.atendidoEn}`}
        contentContainerStyle={{
          width: "100%",
          maxWidth: r.maxContentWidth,
          alignSelf: "center",
          paddingHorizontal: r.gutter,
          paddingBottom: 40,
          gap: r.gap,
        }}
        ListHeaderComponent={
          <View style={{ gap: r.gap, paddingTop: r.gutter }}>
            {/* Header / métricas */}
            <View style={[styles.headerCard, r.isWide ? styles.headerCardWide : styles.headerCardNarrow]}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="time-outline" size={24} color={colors.tabActive} />
                <View style={{ marginLeft: 10, flexShrink: 1 }}>
                  <Text style={[styles.headerTitle, { fontSize: r.font.title }]}>
                    Historial de atenciones
                  </Text>
                  <Text style={[styles.headerSub, { fontSize: r.font.small }]}>
                    Total atendidos: {filtered.length}
                  </Text>
                </View>
              </View>

              {!!onUndo && (
                <Pressable
                  onPress={onUndo}
                  disabled={!canUndo}
                  style={[styles.undoBtn, !r.isWide && styles.undoBtnBlock, !canUndo && { opacity: 0.5 }]}
                  accessibilityRole="button"
                >
                  <Ionicons name="arrow-undo-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.undoBtnText}>Deshacer</Text>
                </Pressable>
              )}
            </View>

            {/* Buscador */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Buscar por nombre..."
                value={query}
                onChangeText={setQuery}
                style={[styles.searchInput, { fontSize: r.font.body }]}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={22} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 8, textAlign: "center" }}>
              {query ? "No hay resultados para la búsqueda." : "Aún no hay pacientes atendidos."}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const dt = formatDateTime(item.atendidoEn);
          const p = item.paciente;
          return (
            <Pressable
              style={[
                styles.card,
                columns > 1 && { flex: 1, maxWidth: `${100 / columns}%` },
              ]}
              onPress={() => onSelect?.(p, index)}
            >
              <View style={styles.headerRow}>
                <Text style={[styles.name, { fontSize: r.font.subtitle }]} numberOfLines={2}>
                  {p.nombre}
                </Text>
                <View style={[styles.badge, { backgroundColor: prioridadColor(p.urgencia, colors) }]}>
                  <Ionicons
                    name={p.urgencia === 1 ? "alert" : p.urgencia === 2 ? "warning-outline" : "leaf-outline"}
                    size={12}
                    color="#fff"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.badgeText}>{prioridadLabel(p.urgencia)}</Text>
                </View>
              </View>

              <Text style={[styles.meta, { fontSize: r.font.small }]}>Expediente: {p.expediente}</Text>
              <Text style={[styles.meta, { fontSize: r.font.small }]}>Atendido: {dt}</Text>
              {typeof item.waitedMs === "number" && (
                <Text style={[styles.meta, { fontSize: r.font.small }]}>
                  Espera aprox.: {fmtMs(item.waitedMs)}
                </Text>
              )}
              <Text style={{ marginTop: 6, color: colors.text, fontSize: r.font.body }}>
                Síntomas: {p.sintomas}
              </Text>
            </Pressable>
          );
        }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const crearEstilos = (colors: Palette) =>
  StyleSheet.create({
  headerCard: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  headerCardWide: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerCardNarrow: { flexDirection: "column", alignItems: "stretch" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  headerTitle: { fontWeight: "800", color: colors.text },
  headerSub: { color: colors.textMuted, marginTop: 2 },
  undoBtn: {
    backgroundColor: colors.tabActive,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },
  undoBtnBlock: { justifyContent: "center" },
  undoBtnText: { color: "#fff", fontWeight: "800" },

  searchBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: { flex: 1, color: colors.text },

  empty: { padding: 28, alignItems: "center" },

  card: {
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: colors.shadowOpacity,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  name: { fontWeight: "700", color: colors.text, flexShrink: 1 },
  meta: { color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, flexDirection: "row", alignItems: "center" },
  badgeText: { color: "#fff", fontWeight: "800" },
});
