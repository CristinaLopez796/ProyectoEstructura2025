import React, { useEffect, useMemo, useState } from "react";
import { Modal, View, Text, TextInput, StyleSheet, Pressable, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Patient } from "../models/Patient";
import { Palette } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { useResponsive } from "../theme/responsive";

type Mode = "queue" | "history";

type Props = {
  visible: boolean;
  mode: Mode;
  patient: Patient | null;
  onClose: () => void;
  onSave: (updated: Patient) => void;
  onDelete?: (patientId: string) => void;
};

const onlyDigits = (s: string) => s.replace(/[^\d]/g, "");
function maskDDMMYYYY(input: string) {
  const d = onlyDigits(input).slice(0, 8);
  const parts: string[] = [];
  if (d.length >= 2) parts.push(d.slice(0, 2));
  if (d.length >= 4) parts.push(d.slice(2, 4));
  if (d.length > 4) parts.push(d.slice(4));
  if (parts.length === 0) return d;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]}/${parts[1]}`;
  return `${parts[0]}/${parts[1]}/${parts[2]}`;
}

function prioridadColor(p: 1 | 2 | 3, colors: Palette) {
  if (p === 1) return colors.priority.p1;
  if (p === 2) return colors.priority.p2;
  return colors.priority.p3;
}

export default function PatientCardModal({ visible, mode, patient, onClose, onSave, onDelete }: Props) {
  const r = useResponsive();
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);
  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [urgencia, setUrgencia] = useState<1 | 2 | 3>(3);

  useEffect(() => {
    if (patient) {
      setNombre(patient.nombre ?? "");
      setFechaNacimiento(patient.fechaNacimiento ?? "");
      setSintomas(patient.sintomas ?? "");
      setUrgencia(patient.urgencia ?? 3);
    }
  }, [patient]);

  const puedeGuardar = useMemo(() => nombre.trim().length > 0 && sintomas.trim().length > 0, [nombre, sintomas]);

  if (!patient) return null;

  // En móvil se comporta como hoja inferior; en pantallas anchas, como un
  // diálogo centrado con ancho limitado.
  const asDialog = r.isWide;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={asDialog ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, asDialog ? styles.backdropCentered : styles.backdropBottom]}>
        <View style={[styles.card, asDialog && styles.cardDialog]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
          >
          <View style={styles.header}>
            <Ionicons name="id-card-outline" size={22} color={colors.tabActive} />
            <Text style={styles.title}>
              {mode === "queue" ? "Paciente en espera" : "Paciente atendido"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} style={{ marginLeft: "auto" }}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <Text style={styles.label}>Expediente</Text>
          <Text style={styles.meta}>{patient.expediente}</Text>

          <Text style={styles.label}>Nombre*</Text>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre completo"
            style={styles.input}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Fecha nacimiento (DD/MM/AAAA)</Text>
          <TextInput
            value={fechaNacimiento}
            onChangeText={(t) => setFechaNacimiento(maskDDMMYYYY(t))}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            style={styles.input}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Síntomas*</Text>
          <TextInput
            value={sintomas}
            onChangeText={setSintomas}
            placeholder="Síntomas…"
            style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
            multiline
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Urgencia</Text>
          <View style={styles.chipsRow} accessible accessibilityRole="radiogroup">
            {[1, 2, 3].map((p) => {
              const active = urgencia === p;
              const color = prioridadColor(p as 1 | 2 | 3, colors);
              return (
                <Pressable
                  key={p}
                  onPress={() => setUrgencia(p as 1 | 2 | 3)}
                  style={[
                    styles.chip,
                    { borderColor: color, backgroundColor: active ? color : colors.input },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={p === 1 ? "alert" : p === 2 ? "warning-outline" : "leaf-outline"}
                    size={14}
                    color={active ? "#fff" : color}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.chipText, active && { color: "#fff" }]}>
                    {p === 1 ? "Alta (1)" : p === 2 ? "Media (2)" : "Baja (3)"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actionsRow}>
            {onDelete && (
              <Pressable
                onPress={() => onDelete(patient.id)}
                style={[styles.btn, styles.btnDanger]}
              >
                <Ionicons name="trash-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnText}>Eliminar</Text>
              </Pressable>
            )}

            <View style={{ flex: 1 }} />

            <Pressable onPress={onClose} style={[styles.btn, styles.btnGhost]}>
              <Text style={[styles.btnText, { color: colors.text }]}>Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                puedeGuardar &&
                onSave({
                  ...patient,
                  nombre: nombre.trim(),
                  fechaNacimiento: fechaNacimiento.trim(),
                  sintomas: sintomas.trim(),
                  urgencia,
                })
              }
              disabled={!puedeGuardar}
              style={[styles.btn, styles.btnPrimary, !puedeGuardar && { opacity: 0.6 }]}
            >
              <Ionicons name="save-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Guardar</Text>
            </Pressable>
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const crearEstilos = (colors: Palette) =>
  StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
  backdropBottom: { justifyContent: "flex-end" },
  backdropCentered: { justifyContent: "center", alignItems: "center", padding: 24 },
  card: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 28 : 18,
    borderWidth: 1, borderColor: colors.border,
    maxHeight: "90%",
  },
  cardDialog: {
    width: "100%",
    maxWidth: 560,
    borderRadius: 20,
    paddingBottom: 18,
    maxHeight: "85%",
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  title: { fontSize: 16, fontWeight: "800", color: colors.text },
  label: { marginTop: 10, marginBottom: 6, fontWeight: "700", color: colors.text },
  meta: { color: colors.textMuted },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.card, color: colors.text,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5,
  },
  chipText: { fontWeight: "700", color: colors.text },

  actionsRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 14, gap: 10 },
  btn: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
  },
  btnDanger: { backgroundColor: colors.danger },
  btnPrimary: { backgroundColor: colors.tabActive },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnText: { color: "#fff", fontWeight: "800" },
});
