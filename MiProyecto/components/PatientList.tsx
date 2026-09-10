import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, Pressable } from "react-native";
import { Patient } from "../models/Patient";
import { Palette } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { useResponsive } from "../theme/responsive";
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
function prioridadColor(p: 1 | 2 | 3, colors: Palette) {
  if (p === 1) return colors.priority.p1;
  if (p === 2) return colors.priority.p2;
  return colors.priority.p3;
}

export default function PatientList({ patients, onServeNext, onSelect }: Props) {
  const r = useResponsive();
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);
  const [query, setQuery] = useState("");

  // En pantallas anchas las tarjetas se reparten en varias columnas.
  const columns = r.columns;

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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        // FlatList necesita una key nueva cuando cambia numColumns
        // (p. ej. al rotar el dispositivo o redimensionar la ventana).
        key={`cols-${columns}`}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: r.gap } : undefined}
        data={filtered}
        keyExtractor={(item) => item.id}
        // El contenido se centra y se limita para que no se estire en escritorio.
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
            {/* Encabezado con CTA: en móvil se apila, en ancho va en una fila */}
            <View style={[styles.topCard, r.isWide ? styles.topCardWide : styles.topCardNarrow]}>
              <View style={styles.topCardTitleRow}>
                <Ionicons name="list-outline" size={22} color={colors.tabActive} />
                <View style={{ marginLeft: 10, flexShrink: 1 }}>
                  <Text style={[styles.topTitle, { fontSize: r.font.title }]}>Lista de espera</Text>
                  <Text style={[styles.topSub, { fontSize: r.font.small }]}>
                    En espera: {filtered.length}
                  </Text>
                </View>
              </View>
              {onServeNext && (
                <Pressable
                  onPress={onServeNext}
                  style={[styles.primaryBtn, !r.isWide && styles.primaryBtnBlock]}
                  accessibilityRole="button"
                >
                  <Ionicons name="play-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>Atender</Text>
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
            <Ionicons name="people-outline" size={22} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 8, textAlign: "center" }}>
              {query ? "No hay resultados para la búsqueda." : "No hay pacientes en espera."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.card,
              // maxWidth evita que la última tarjeta impar ocupe toda la fila.
              columns > 1 && { flex: 1, maxWidth: `${100 / columns}%` },
            ]}
            onPress={() => onSelect?.(item)}
          >
            <View style={styles.headerRow}>
              <Text style={[styles.name, { fontSize: r.font.subtitle }]} numberOfLines={2}>
                {item.nombre}
              </Text>
              <View style={[styles.badge, { backgroundColor: prioridadColor(item.urgencia, colors) }]}>
                <Ionicons
                  name={item.urgencia === 1 ? "alert" : item.urgencia === 2 ? "warning-outline" : "leaf-outline"}
                  size={12}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.badgeText}>{prioridadLabel(item.urgencia)}</Text>
              </View>
            </View>

            <Text style={[styles.meta, { fontSize: r.font.small }]}>Expediente: {item.expediente}</Text>
            {!!item.fechaNacimiento && (
              <Text style={[styles.meta, { fontSize: r.font.small }]}>
                Nacimiento: {formatDateISOToPretty(item.fechaNacimiento)}
              </Text>
            )}
            {!!item.queuedAt && (
              <Text style={[styles.meta, { fontSize: r.font.small }]}>
                Registrado: {formatDateTime(item.queuedAt)}
              </Text>
            )}
            <Text style={{ marginTop: 6, color: colors.text, fontSize: r.font.body }}>
              Síntomas: {item.sintomas}
            </Text>
          </Pressable>
        )}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const crearEstilos = (colors: Palette) =>
  StyleSheet.create({
  topCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  topCardWide: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topCardNarrow: { flexDirection: "column", alignItems: "stretch" },
  topCardTitleRow: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  topTitle: { fontWeight: "800", color: colors.text },
  topSub: { color: colors.textMuted, marginTop: 2 },

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

  primaryBtn: {
    backgroundColor: colors.tabActive,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },
  primaryBtnBlock: { justifyContent: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
});
