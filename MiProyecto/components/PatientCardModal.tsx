import React, { useEffect, useMemo, useState } from "react";
import { Modal, View, Text, TextInput, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Patient } from "../models/Patient";
import { COLORS } from "../theme/colors";

type Mode = "queue" | "history";

type Props = {
  visible: boolean;
  mode: Mode;
  patient: Patient | null;   // si viene de historial: usa item.paciente
  onClose: () => void;
  onSave: (updated: Patient) => void;   // editar/guardar
  onDelete?: (patientId: string) => void; // eliminar (en cola) o quitar del historial
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

function prioridadColor(p: 1 | 2 | 3) {
  if (p === 1) return COLORS.priority.p1;
  if (p === 2) return COLORS.priority.p2;
  return COLORS.priority.p3;
}

export default function PatientCardModal({ visible, mode, patient, onClose, onSave, onDelete }: Props) {
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="id-card-outline" size={22} color={COLORS.tabActive} />
            <Text style={styles.title}>
              {mode === "queue" ? "Paciente en espera" : "Paciente atendido"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} style={{ marginLeft: "auto" }}>
              <Ionicons name="close" size={22} color={COLORS.text} />
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
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>Fecha nacimiento (DD/MM/AAAA)</Text>
          <TextInput
            value={fechaNacimiento}
            onChangeText={(t) => setFechaNacimiento(maskDDMMYYYY(t))}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            style={styles.input}
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>Síntomas*</Text>
          <TextInput
            value={sintomas}
            onChangeText={setSintomas}
            placeholder="Síntomas…"
            style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
            multiline
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>Urgencia</Text>
          <View style={styles.chipsRow} accessible accessibilityRole="radiogroup">
            {[1, 2, 3].map((p) => {
              const active = urgencia === p;
              const color = prioridadColor(p as 1 | 2 | 3);
              return (
                <Pressable
                  key={p}
                  onPress={() => setUrgencia(p as 1 | 2 | 3)}
                  style={[
                    styles.chip,
                    { borderColor: color, backgroundColor: active ? color : "#fff" },
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
              <Text style={[styles.btnText, { color: COLORS.text }]}>Cancelar</Text>
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 28 : 18,
    borderWidth: 1, borderColor: COLORS.border,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  label: { marginTop: 10, marginBottom: 6, fontWeight: "700", color: COLORS.text },
  meta: { color: COLORS.textMuted },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", color: COLORS.text,
  },
  chipsRow: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5,
  },
  chipText: { fontWeight: "700", color: COLORS.text },

  actionsRow: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 10 },
  btn: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
  },
  btnDanger: { backgroundColor: "#ef4444" },
  btnPrimary: { backgroundColor: COLORS.tabActive },
  btnGhost: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: COLORS.border },
  btnText: { color: "#fff", fontWeight: "800" },
});
